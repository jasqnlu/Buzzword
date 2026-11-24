// Pure planning for a check: which issues become suggestions, which become
// sidebar flags, and what happened to earlier suggestions. No Apps Script calls.

import { check } from '../engine/engine';
import type { Settings } from '../engine/types';
import { toCard, type CardIssue, type CheckMode, type CheckResult } from '../shared/types';
import { countWords, flattenDocument, type DocsDocument } from './flatten';

/** What Buzzword remembers per document (stored in document properties). */
export interface DocStore {
  /** Suggestions Buzzword created that haven't been accepted or rejected yet. i = suggestion ids, f = fingerprint, r = rule. */
  tracked: Array<{ i: string[]; f: string; r: string }>;
  /** Flags someone chose to ignore. */
  ignored: string[];
  /** Suggestions someone rejected: never suggest them again. */
  rejected: string[];
  /** Accept/reject counts per rule: the labels for measuring precision later. */
  stats: Record<string, { a: number; r: number }>;
}

export const EMPTY_STORE: DocStore = { tracked: [], ignored: [], rejected: [], stats: {} };

const LIMITS = { tracked: 90, ignored: 120, rejected: 120 };

export interface CheckPlan {
  requests: object[];
  /** For each request, the index of the card it belongs to. */
  owners: number[];
  toSuggest: CardIssue[];
  flags: CardIssue[];
  store: DocStore;
  resolved: { accepted: number; rejected: number };
  pendingEarlier: number;
  foundTemplate: boolean;
  wordCount: number;
}

export function planCheck(
  doc: DocsDocument,
  opts: { mode: CheckMode; range?: { startIndex: number; endIndex: number }; settings: Settings; store: DocStore },
): CheckPlan {
  const flat = flattenDocument(doc, { mode: opts.mode, range: opts.range });
  const issues = check(flat.text, { settings: opts.settings });
  const cards = issues.map((issue) => {
    const pos = flat.toDoc(issue.start, issue.end);
    // A fix that crosses a paragraph break or a pending suggestion can't be suggested safely.
    const canSuggest = issue.safe && pos !== null && !issue.original.includes('\n');
    return toCard(issue, flat.text, canSuggest ? 'suggested' : 'flag', pos ?? {});
  });
  const foundFps = new Set(cards.map((c) => c.fp));

  // What happened to suggestions from earlier checks?
  const store: DocStore = JSON.parse(JSON.stringify(opts.store));
  const resolved = { accepted: 0, rejected: 0 };
  const stillPending: DocStore['tracked'] = [];
  for (const t of store.tracked) {
    if (t.i.some((id) => flat.suggestionIds.has(id))) {
      stillPending.push(t);
      continue;
    }
    // Only a whole-story check sees enough text to tell accepted from rejected.
    if (opts.mode !== 'story') {
      stillPending.push(t);
      continue;
    }
    const stat = (store.stats[t.r] ??= { a: 0, r: 0 });
    if (foundFps.has(t.f)) {
      resolved.rejected++;
      stat.r++;
      store.rejected.push(t.f);
    } else {
      resolved.accepted++;
      stat.a++;
    }
  }
  store.tracked = stillPending;
  const pendingEarlier = stillPending.filter((t) => t.i.some((id) => flat.suggestionIds.has(id))).length;

  const ignored = new Set(store.ignored);
  const rejected = new Set(store.rejected);
  const toSuggest = cards.filter((c) => c.status === 'suggested' && !rejected.has(c.fp));
  const flags = cards.filter((c) => c.status === 'flag' && !ignored.has(c.fp) && !rejected.has(c.fp));

  const { requests, owners } = buildSuggestRequests(toSuggest);
  trimStore(store);
  return {
    requests, owners, toSuggest, flags, store, resolved, pendingEarlier,
    foundTemplate: flat.foundTemplate, wordCount: countWords(flat.text),
  };
}

/**
 * One replace = insert the new text after the old text, then delete the old text.
 * Docs shows that as "old (struck) new", like a person's own suggestion.
 * Requests run from the end of the doc backward so earlier positions don't move.
 */
export function buildSuggestRequests(cards: CardIssue[]): { requests: object[]; owners: number[] } {
  const order = cards
    .map((card, index) => ({ card, index }))
    .filter(({ card }) => card.docStart !== undefined && card.docEnd !== undefined)
    .sort((a, b) => b.card.docStart! - a.card.docStart!);
  const requests: object[] = [];
  const owners: number[] = [];
  for (const { card, index } of order) {
    if (card.replacement) {
      requests.push({ insertText: { text: card.replacement, location: { index: card.docEnd } } });
      owners.push(index);
    }
    requests.push({ deleteContentRange: { range: { startIndex: card.docStart, endIndex: card.docEnd } } });
    owners.push(index);
  }
  return { requests, owners };
}

/** Read the batchUpdate response: which cards got suggestion ids. */
export function collectSuggestionIds(
  response: { suggestionResponses?: Array<{ createdSuggestionIds?: string[] }> },
  owners: number[],
  count: number,
): string[][] {
  const ids: string[][] = Array.from({ length: count }, () => []);
  (response.suggestionResponses ?? []).forEach((r, i) => {
    const owner = owners[i];
    if (owner === undefined) return;
    for (const id of r?.createdSuggestionIds ?? []) if (!ids[owner].includes(id)) ids[owner].push(id);
  });
  return ids;
}

export function finishCheck(plan: CheckPlan, ids: string[][], mode: CheckMode, now: Date): { result: CheckResult; store: DocStore } {
  const store = plan.store;
  const suggested: CardIssue[] = [];
  const failed: CardIssue[] = [];
  plan.toSuggest.forEach((card, i) => {
    if (ids[i]?.length) {
      suggested.push(card);
      store.tracked.push({ i: ids[i], f: card.fp, r: card.ruleId });
    } else {
      failed.push({ ...card, status: 'flag' });
    }
  });
  trimStore(store);
  const flags = [...failed, ...plan.flags];
  const pendingEarlier = plan.pendingEarlier;
  const result: CheckResult = {
    mode,
    foundTemplate: plan.foundTemplate,
    suggested,
    flags,
    pendingEarlier,
    resolved: plan.resolved,
    openCount: pendingEarlier + suggested.length + flags.length,
    wordCount: plan.wordCount,
    checkedAt: now.toISOString(),
    warning: failed.length && plan.toSuggest.length
      ? 'Google Docs didn’t save some suggestions, so they’re listed below as cards instead.'
      : undefined,
  };
  return { result, store };
}

function trimStore(store: DocStore) {
  store.tracked = store.tracked.slice(-LIMITS.tracked);
  store.ignored = [...new Set(store.ignored)].slice(-LIMITS.ignored);
  store.rejected = [...new Set(store.rejected)].slice(-LIMITS.rejected);
}
