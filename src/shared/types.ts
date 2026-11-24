// Types shared by the Apps Script server code and the sidebar.
import type { Category, Issue, Pack, Settings } from '../engine/types';

export type CheckMode = 'story' | 'selection';

/** One card in the sidebar. */
export interface CardIssue {
  /** Stable fingerprint: rule + text + a little context. Used for ignore and accept/reject tracking. */
  fp: string;
  ruleId: string;
  pack: Pack;
  category: Category;
  title: string;
  reason: string;
  why: string;
  original: string;
  replacement: string | null;
  hint?: string;
  /** A few words before and after, for the card's snippet. */
  before: string;
  after: string;
  /** suggested = a Docs suggestion now exists; flag = needs a person. */
  status: 'suggested' | 'flag';
  /** Document positions (for "Suggest this fix" on flags). */
  docStart?: number;
  docEnd?: number;
}

export interface CheckResult {
  mode: CheckMode;
  /** false when the Article Draft template wasn't found and the whole doc was checked. */
  foundTemplate: boolean;
  /** Suggestions created by this check. */
  suggested: CardIssue[];
  /** Flags that need a person. */
  flags: CardIssue[];
  /** Buzzword suggestions from earlier checks that are still waiting for accept/reject. */
  pendingEarlier: number;
  /** Earlier suggestions that were accepted / rejected since the last check. */
  resolved: { accepted: number; rejected: number };
  /** Open issues: pending suggestions + flags. 0 = AP-ready. */
  openCount: number;
  wordCount: number;
  checkedAt: string;
  warning?: string;
}

export interface InitialState {
  settings: Settings;
  userEmail?: string;
}

export function toCard(issue: Issue, text: string, status: CardIssue['status'], extra: Partial<CardIssue> = {}): CardIssue {
  const before = snippetBefore(text, issue.start);
  const after = snippetAfter(text, issue.end);
  return {
    fp: fingerprint(issue.ruleId, issue.original, text.slice(Math.max(text.lastIndexOf('\n', issue.start - 1) + 1, issue.start - 24), issue.start)),
    ruleId: issue.ruleId,
    pack: issue.pack,
    category: issue.category,
    title: issue.title,
    reason: issue.reason,
    why: issue.why,
    original: issue.original,
    replacement: issue.replacement,
    hint: issue.hint,
    before,
    after,
    status,
    ...extra,
  };
}

/** Short stable id for an issue: rule + text + a little context, hashed so it fits in document properties. */
export function fingerprint(ruleId: string, original: string, context: string): string {
  const key = `${ruleId}|${original}|${context.replace(/\s+/g, ' ').trim()}`;
  let h = 0x811c9dc5; // FNV-1a
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}

function snippetBefore(text: string, start: number): string {
  const lineStart = text.lastIndexOf('\n', start - 1) + 1;
  let s = text.slice(Math.max(lineStart, start - 40), start);
  if (start - 40 > lineStart) s = '…' + s.replace(/^\S*\s/, '');
  return s.replace(/\uFFFC/g, '');
}

function snippetAfter(text: string, end: number): string {
  let lineEnd = text.indexOf('\n', end);
  if (lineEnd < 0) lineEnd = text.length;
  let s = text.slice(end, Math.min(lineEnd, end + 40));
  if (end + 40 < lineEnd) s = s.replace(/\s\S*$/, '') + '…';
  return s.replace(/\uFFFC/g, '');
}
