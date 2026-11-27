// Background service worker: the extension's "server". It signs in with Google,
// reads the doc through the Docs API, runs the rule engine, and creates suggestions.
// Same planning code as the Apps Script add-on (src/server/plan.ts).

import { DEFAULT_SETTINGS, type Settings } from '../engine/types';
import { findTextRange, textAt, type DocsDocument } from '../server/flatten';
import { EMPTY_STORE, buildSuggestRequests, collectSuggestionIds, finishCheck, planCheck, type DocStore } from '../server/plan';
import type { CardIssue, CheckMode, CheckResult, InitialState } from '../shared/types';
import { clearToken, getToken } from './auth';

/** The "Web application" OAuth client ID, put in by scripts/build.mjs from extension.config.json. */
declare const WEB_CLIENT_ID: string;

const DOCS_API = 'https://docs.googleapis.com/v1/documents/';

type Handler = (docId: string, ...args: any[]) => Promise<unknown>;

const handlers: Record<string, Handler> = {
  async getInitialState(): Promise<InitialState> {
    return { settings: await loadSettings() };
  },

  async saveSettings(_docId, settings: Settings): Promise<Settings> {
    const clean: Settings = {
      percentStyle: settings.percentStyle === 'symbol' ? 'symbol' : 'word',
      fillerStyle: settings.fillerStyle === 'ellipsis' ? 'ellipsis' : 'delete',
    };
    await chrome.storage.sync.set({ settings: clean });
    return clean;
  },

  async runCheck(docId, mode: CheckMode, selectedText?: string): Promise<CheckResult> {
    return withDocLock(docId, async () => {
      const doc = await getDoc(docId);
      let range: { startIndex: number; endIndex: number } | undefined;
      if (mode === 'selection') {
        range = findTextRange(doc, selectedText ?? '') ?? undefined;
        if (!range) throw new Error('Buzzword couldn’t find the selected text in the doc. Select it again and retry.');
      }
      const plan = planCheck(doc, { mode, range, settings: await loadSettings(), store: await loadStore(docId) });
      let ids: string[][] = [];
      if (plan.requests.length) {
        const response = await batchUpdate(docId, plan.requests, doc.revisionId);
        ids = collectSuggestionIds(response, plan.owners, plan.toSuggest.length);
      }
      const { result, store } = finishCheck(plan, ids, mode, new Date());
      await saveStore(docId, store);
      return result;
    });
  },

  async suggestOne(docId, card: CardIssue): Promise<CardIssue> {
    if (card.docStart === undefined || card.docEnd === undefined || card.replacement === null) {
      throw new Error('This one needs a rewrite, so Buzzword can’t suggest a fix. Edit it in the doc.');
    }
    const doc = await getDoc(docId);
    if (textAt(doc, card.docStart, card.docEnd) !== card.original) {
      throw new Error('The text has changed since the last check. Run the check again.');
    }
    const { requests, owners } = buildSuggestRequests([card]);
    const [ids] = collectSuggestionIds(await batchUpdate(docId, requests, doc.revisionId), owners, 1);
    if (!ids.length) throw new Error('Google Docs didn’t save the suggestion. Try again, or make the change by hand.');
    const store = await loadStore(docId);
    store.tracked.push({ i: ids, f: card.fp, r: card.ruleId });
    await saveStore(docId, store);
    return { ...card, status: 'suggested' };
  },

  async ignoreFlag(docId, fp: string): Promise<void> {
    const store = await loadStore(docId);
    store.ignored.push(fp);
    await saveStore(docId, store);
  },
};

chrome.runtime.onMessage.addListener((msg: { fn?: string; args?: unknown[]; docId?: string }, _sender, reply) => {
  const handler = msg?.fn ? handlers[msg.fn] : undefined;
  if (!handler || !msg.docId) return false;
  handler(msg.docId, ...(msg.args ?? []))
    .then((value) => reply({ ok: true, value }))
    .catch((err: unknown) => {
      console.error('Buzzword', msg.fn, err);
      reply({ ok: false, error: err instanceof Error ? err.message : String(err) });
    });
  return true; // reply asynchronously
});

// ------------------------------------------------------------------ Docs API

async function getDoc(docId: string): Promise<DocsDocument> {
  return (await callDocs('GET', `${encodeURIComponent(docId)}?suggestionsViewMode=SUGGESTIONS_INLINE`)) as DocsDocument;
}

interface BatchResponse { suggestionResponses?: Array<{ createdSuggestionIds?: string[] }> }

async function batchUpdate(docId: string, requests: object[], revisionId?: string): Promise<BatchResponse> {
  const writeControl: Record<string, string> = { writeMode: 'SUGGEST' };
  if (revisionId) writeControl.requiredRevisionId = revisionId;
  return (await callDocs('POST', `${encodeURIComponent(docId)}:batchUpdate`, { requests, writeControl })) as BatchResponse;
}

async function callDocs(method: 'GET' | 'POST', path: string, body?: unknown, retried = false): Promise<unknown> {
  const token = await getToken(WEB_CLIENT_ID);
  console.log(`Buzzword: Docs API ${method} ${path.split('?')[0]}…`);
  const res = await fetch(DOCS_API + path, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401 && !retried) {
    await clearToken();
    return callDocs(method, path, body, true);
  }
  const text = await res.text();
  if (!res.ok) {
    console.error(`Docs API ${method} ${path} -> ${res.status}: ${text}`);
    if (res.status === 400 && /revision/i.test(text)) throw new Error('The doc changed while Buzzword was checking it. Run the check again.');
    if (res.status === 403) throw new Error('Buzzword can’t edit this doc. You need edit access, and you need to be signed in to Chrome with the same Google account.');
    if (res.status === 404) throw new Error('Buzzword can’t open this doc with your Google account. Make sure Chrome is signed in to the account that can edit it.');
    throw new Error(`Google Docs returned an error (${res.status}). Try again; if it keeps happening, tell the Buzzword maintainer.`);
  }
  return JSON.parse(text);
}

// ------------------------------------------------------------------ storage

async function loadSettings(): Promise<Settings> {
  const { settings } = await chrome.storage.sync.get('settings');
  return { ...DEFAULT_SETTINGS, ...(settings ?? {}) };
}

async function loadStore(docId: string): Promise<DocStore> {
  const key = `store:${docId}`;
  const data = await chrome.storage.local.get(key);
  return { ...JSON.parse(JSON.stringify(EMPTY_STORE)), ...(data[key] ?? {}) };
}

async function saveStore(docId: string, store: DocStore): Promise<void> {
  await chrome.storage.local.set({ [`store:${docId}`]: store });
}

// One check at a time per doc, so two clicks can't create duplicate suggestions.
const running = new Map<string, Promise<unknown>>();
async function withDocLock<T>(docId: string, fn: () => Promise<T>): Promise<T> {
  if (running.has(docId)) throw new Error('Buzzword is already checking this doc. Give it a few seconds.');
  const p = fn();
  running.set(docId, p);
  try {
    return await p;
  } finally {
    running.delete(docId);
  }
}
