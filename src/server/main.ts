// Apps Script entry points. Everything here talks to Google; the logic lives in
// plan.ts and the engine, which are tested locally.

import { DEFAULT_SETTINGS, type Settings } from '../engine/types';
import type { CardIssue, CheckMode, CheckResult, InitialState } from '../shared/types';
import { textAt, type DocsDocument } from './flatten';
import { EMPTY_STORE, buildSuggestRequests, collectSuggestionIds, finishCheck, planCheck, type DocStore } from './plan';

const DOCS_API = 'https://docs.googleapis.com/v1/documents/';
const STORE_KEY = 'buzzword.store';
const SETTINGS_KEY = 'buzzword.settings';

// ----------------------------------------------------------------- menu and sidebar

export function onOpen(): void {
  DocumentApp.getUi().createAddonMenu().addItem('Open Buzzword', 'showSidebar').addToUi();
}

export function onInstall(): void {
  onOpen();
}

export function showSidebar(): void {
  const html = HtmlService.createHtmlOutputFromFile('Sidebar').setTitle('Buzzword');
  DocumentApp.getUi().showSidebar(html);
}

export function getInitialState(): InitialState {
  return { settings: loadSettings() };
}

export function hasSelection(): boolean {
  const sel = DocumentApp.getActiveDocument().getSelection();
  return !!sel && sel.getRangeElements().length > 0;
}

export function saveSettings(settings: Settings): Settings {
  const clean: Settings = {
    percentStyle: settings.percentStyle === 'symbol' ? 'symbol' : 'word',
    fillerStyle: settings.fillerStyle === 'ellipsis' ? 'ellipsis' : 'delete',
  };
  PropertiesService.getUserProperties().setProperty(SETTINGS_KEY, JSON.stringify(clean));
  return clean;
}

// ----------------------------------------------------------------- checking

export function runCheck(mode: CheckMode): CheckResult {
  const lock = LockService.getDocumentLock();
  if (!lock.tryLock(15000)) throw new Error('Another Buzzword check is running on this doc. Try again in a few seconds.');
  const docId = DocumentApp.getActiveDocument().getId();
  let selectionName: string | null = null;
  try {
    if (mode === 'selection') {
      selectionName = markSelection();
      if (!selectionName) throw new Error('Select some text in the doc first.');
    }
    const doc = getDoc(docId);
    const range = selectionName ? namedRangeSpan(doc, selectionName) : undefined;
    if (mode === 'selection' && !range) throw new Error('Buzzword couldn’t read the selection. Select the text again and retry.');

    const plan = planCheck(doc, { mode, range, settings: loadSettings(), store: loadStore() });
    let ids: string[][] = [];
    if (plan.requests.length) {
      const response = batchUpdate(docId, plan.requests, { suggest: true, revisionId: doc.revisionId });
      ids = collectSuggestionIds(response, plan.owners, plan.toSuggest.length);
    }
    const { result, store } = finishCheck(plan, ids, mode, new Date());
    saveStore(store);
    return result;
  } finally {
    if (selectionName) {
      try {
        batchUpdate(docId, [{ deleteNamedRange: { name: selectionName } }], { suggest: false });
      } catch (e) {
        console.warn('Could not remove the temporary selection marker', e);
      }
    }
    lock.releaseLock();
  }
}

/** Turn one sidebar card into a suggestion (for flags that have a fix but need a person to decide). */
export function suggestOne(card: CardIssue): CardIssue {
  if (card.docStart === undefined || card.docEnd === undefined || card.replacement === null) {
    throw new Error('This one needs a rewrite, so Buzzword can’t suggest a fix. Edit it in the doc.');
  }
  const docId = DocumentApp.getActiveDocument().getId();
  const doc = getDoc(docId);
  if (textAt(doc, card.docStart, card.docEnd) !== card.original) {
    throw new Error('The text has changed since the last check. Run the check again.');
  }
  const { requests, owners } = buildSuggestRequests([card]);
  const response = batchUpdate(docId, requests, { suggest: true, revisionId: doc.revisionId });
  const [ids] = collectSuggestionIds(response, owners, 1);
  if (!ids.length) throw new Error('Google Docs didn’t save the suggestion. Try again, or make the change by hand.');
  const store = loadStore();
  store.tracked.push({ i: ids, f: card.fp, r: card.ruleId });
  saveStore(store);
  return { ...card, status: 'suggested' };
}

export function ignoreFlag(fp: string): void {
  const store = loadStore();
  store.ignored.push(fp);
  saveStore(store);
}

/** Select the issue's text in the doc so the reporter can see it. */
export function showInDoc(card: Pick<CardIssue, 'original' | 'before' | 'replacement' | 'status'>): boolean {
  const doc = DocumentApp.getActiveDocument();
  const body = doc.getBody();
  const lead = card.before.replace(/^…/, '').slice(-12);
  const attempts: Array<[string, number]> = [
    [escapeForFind(lead + card.original), lead.length],
    [escapeForFind(card.original), 0],
  ];
  if (card.status === 'suggested' && card.replacement) attempts.push([escapeForFind(card.replacement), 0]);
  for (const [pattern, skip] of attempts) {
    if (!pattern) continue;
    const found = body.findText(pattern);
    if (!found) continue;
    const text = found.getElement().asText();
    const start = found.getStartOffset() + skip;
    const end = found.getEndOffsetInclusive();
    if (end < start) continue;
    doc.setSelection(doc.newRange().addElement(text, start, end).build());
    return true;
  }
  return false;
}

// ----------------------------------------------------------------- Docs API

function getDoc(docId: string): DocsDocument {
  return callDocs('get', `${encodeURIComponent(docId)}?suggestionsViewMode=SUGGESTIONS_INLINE`) as DocsDocument;
}

interface BatchResponse { suggestionResponses?: Array<{ createdSuggestionIds?: string[] }> }

function batchUpdate(docId: string, requests: object[], opts: { suggest: boolean; revisionId?: string }): BatchResponse {
  const writeControl: Record<string, string> = {};
  if (opts.suggest) writeControl.writeMode = 'SUGGEST';
  if (opts.revisionId) writeControl.requiredRevisionId = opts.revisionId;
  const body: Record<string, unknown> = { requests };
  if (Object.keys(writeControl).length) body.writeControl = writeControl;
  return callDocs('post', `${encodeURIComponent(docId)}:batchUpdate`, body) as BatchResponse;
}

function callDocs(method: 'get' | 'post', path: string, body?: unknown): unknown {
  const response = UrlFetchApp.fetch(DOCS_API + path, {
    method,
    contentType: 'application/json',
    headers: { Authorization: `Bearer ${ScriptApp.getOAuthToken()}` },
    payload: body === undefined ? undefined : JSON.stringify(body),
    muteHttpExceptions: true,
  });
  const code = response.getResponseCode();
  const text = response.getContentText();
  if (code >= 300) {
    console.error(`Docs API ${method} ${path} -> ${code}: ${text}`);
    if (code === 400 && /revision/i.test(text)) throw new Error('The doc changed while Buzzword was checking it. Run the check again.');
    if (code === 403) throw new Error('Buzzword doesn’t have permission to edit this doc. You need edit access.');
    throw new Error(`Google Docs returned an error (${code}). Try again; if it keeps happening, tell the Buzzword maintainer.`);
  }
  return JSON.parse(text);
}

// ----------------------------------------------------------------- selection

/** Marks the current selection with a temporary named range so the Docs API can see its exact position. */
function markSelection(): string | null {
  const doc = DocumentApp.getActiveDocument();
  const sel = doc.getSelection();
  if (!sel) return null;
  const builder = doc.newRange();
  for (const re of sel.getRangeElements()) {
    const el = re.getElement();
    if (re.isPartial()) builder.addElement(el.asText(), re.getStartOffset(), re.getEndOffsetInclusive());
    else builder.addElement(el);
  }
  const name = `buzzword-selection-${Date.now()}`;
  doc.addNamedRange(name, builder.build());
  doc.saveAndClose(); // flush so the Docs API sees the marker
  return name;
}

function namedRangeSpan(doc: DocsDocument, name: string): { startIndex: number; endIndex: number } | undefined {
  const ranges = (doc.namedRanges?.[name]?.namedRanges ?? []).flatMap((n) => n.ranges ?? []);
  if (!ranges.length) return undefined;
  return {
    startIndex: Math.min(...ranges.map((r) => r.startIndex ?? 0)),
    endIndex: Math.max(...ranges.map((r) => r.endIndex ?? 0)),
  };
}

// ----------------------------------------------------------------- storage

function loadSettings(): Settings {
  const raw = PropertiesService.getUserProperties().getProperty(SETTINGS_KEY);
  try {
    return { ...DEFAULT_SETTINGS, ...(raw ? JSON.parse(raw) : {}) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function loadStore(): DocStore {
  const raw = PropertiesService.getDocumentProperties().getProperty(STORE_KEY);
  try {
    return { ...EMPTY_STORE, ...(raw ? JSON.parse(raw) : {}) };
  } catch {
    return JSON.parse(JSON.stringify(EMPTY_STORE));
  }
}

function saveStore(store: DocStore): void {
  PropertiesService.getDocumentProperties().setProperty(STORE_KEY, JSON.stringify(store));
}

function escapeForFind(s: string): string {
  return s.replace(/[\\^$.|?*+()[\]{}]/g, '\\$&');
}
