// Local preview: a stand-in for Google Docs and google.script.run.
// It runs the real engine and the real planning code (src/server/plan.ts)
// against a fake Article Draft doc holding the jazz festival story.

import { SAMPLE_DRAFT } from '../src/engine/fixtures/sample';
import { DEFAULT_SETTINGS, type Settings } from '../src/engine/types';
import type { DocsDocument, DocsStructuralElement } from '../src/server/flatten';
import { EMPTY_STORE, collectSuggestionIds, finishCheck, planCheck, type DocStore } from '../src/server/plan';
import type { CardIssue, CheckMode } from '../src/shared/types';
import { createLauncher } from '../src/extension/launcher';

declare const BEE_CSS: string;

interface Pending { id: string; start: number; end: number; replacement: string }

const HEADER = ['Article Draft', '2026-2027', 'Article Draft', 'Write your article here, do not indent and press enter instead.'];
const FOOTER = ['Otter link + Notes', 'Otter Links: (interview recordings)'];

const model = {
  story: SAMPLE_DRAFT + '\n', // plain story text, accepted changes applied
  pending: [] as Pending[], // suggestions waiting for accept/reject, in story offsets
  store: JSON.parse(JSON.stringify(EMPTY_STORE)) as DocStore,
  settings: { ...DEFAULT_SETTINGS } as Settings,
  nextId: 1,
};

/** Build a Docs API-shaped document, with pending suggestions as inline runs. */
function buildDoc(): { doc: DocsDocument; toStory: (docIndex: number) => number | null } {
  let index = 1;
  const content: DocsStructuralElement[] = [];
  const normal: Array<{ docStart: number; storyStart: number; length: number }> = [];
  const para = (runs: Array<{ text: string; ins?: string; del?: string; story?: number }>) => {
    const start = index;
    const elements = runs.filter((r) => r.text).map((r) => {
      const s = index;
      index += r.text.length;
      if (r.story !== undefined) normal.push({ docStart: s, storyStart: r.story, length: r.text.length });
      return {
        startIndex: s, endIndex: index,
        textRun: { content: r.text, ...(r.ins ? { suggestedInsertionIds: [r.ins] } : {}), ...(r.del ? { suggestedDeletionIds: [r.del] } : {}) },
      };
    });
    content.push({ startIndex: start, endIndex: index, paragraph: { elements } });
  };
  for (const line of HEADER) para([{ text: line + '\n' }]);

  const pending = [...model.pending].sort((a, b) => a.start - b.start);
  let lineStart = 0;
  for (const line of model.story.split('\n').slice(0, -1)) {
    const lineEnd = lineStart + line.length + 1;
    const runs: Array<{ text: string; ins?: string; del?: string; story?: number }> = [];
    let at = lineStart;
    for (const p of pending.filter((p) => p.start >= lineStart && p.start < lineEnd)) {
      runs.push({ text: model.story.slice(at, p.start), story: at });
      runs.push({ text: model.story.slice(p.start, p.end), del: p.id });
      runs.push({ text: p.replacement, ins: p.id });
      at = p.end;
    }
    runs.push({ text: model.story.slice(at, lineEnd), story: at });
    para(runs);
    lineStart = lineEnd;
  }
  for (const line of FOOTER) para([{ text: line + '\n' }]);

  const toStory = (docIndex: number) => {
    const seg = normal.find((n) => docIndex >= n.docStart && docIndex <= n.docStart + n.length);
    return seg ? seg.storyStart + (docIndex - seg.docStart) : null;
  };
  return { doc: { documentId: 'preview', revisionId: 'r', body: { content } }, toStory };
}

/** Selection in the fake doc, as story offsets. */
function storySelection(): { start: number; end: number } | null {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || !sel.rangeCount) return null;
  const range = sel.getRangeAt(0);
  const offsetOf = (node: Node, offset: number) => {
    const span = (node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as Element))?.closest<HTMLElement>('[data-story]');
    return span ? Number(span.dataset.story) + (node.nodeType === Node.TEXT_NODE ? offset : 0) : null;
  };
  const a = offsetOf(range.startContainer, range.startOffset);
  const b = offsetOf(range.endContainer, range.endOffset);
  return a === null || b === null || b <= a ? null : { start: a, end: b };
}

function runCheck(mode: CheckMode) {
  const { doc, toStory } = buildDoc();
  let range: { startIndex: number; endIndex: number } | undefined;
  if (mode === 'selection') {
    const sel = storySelection();
    if (!sel) throw new Error('Select some text in the doc first.');
    // Map story offsets to doc indexes by scanning.
    let startIndex = -1;
    let endIndex = -1;
    for (let i = 1; i < 100000 && (startIndex < 0 || endIndex < 0); i++) {
      const s = toStory(i);
      if (s === sel.start && startIndex < 0) startIndex = i;
      if (s === sel.end && endIndex < 0) endIndex = i;
      if (s === null && i > 50000) break;
    }
    range = { startIndex, endIndex };
  }
  const plan = planCheck(doc, { mode, range, settings: model.settings, store: model.store });
  // Pretend to be the Docs API: every replace becomes a suggestion.
  const ids = plan.toSuggest.map((card) => {
    const start = toStory(card.docStart!);
    const end = toStory(card.docEnd!);
    if (start === null || end === null) return [];
    const id = `suggest.preview${model.nextId++}`;
    model.pending.push({ id, start, end, replacement: card.replacement ?? '' });
    return [id];
  });
  const response = { suggestionResponses: plan.owners.map((owner) => ({ createdSuggestionIds: ids[owner] })) };
  const { result, store } = finishCheck(plan, collectSuggestionIds(response, plan.owners, plan.toSuggest.length), mode, new Date());
  model.store = store;
  renderDoc();
  return result;
}

function resolve(ids: string[] | 'all', accept: boolean) {
  const chosen = model.pending.filter((p) => ids === 'all' || ids.includes(p.id)).sort((a, b) => b.start - a.start);
  for (const p of chosen) {
    if (accept) {
      model.story = model.story.slice(0, p.start) + p.replacement + model.story.slice(p.end);
      const shift = p.replacement.length - (p.end - p.start);
      for (const q of model.pending) if (q.start > p.start) { q.start += shift; q.end += shift; }
    }
    model.pending.splice(model.pending.indexOf(p), 1);
  }
  renderDoc();
}

// ------------------------------------------------------------------ fake doc page

const escapeHtml = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);

function renderDoc() {
  const host = document.getElementById('fake-doc-story');
  if (!host) return;
  const pending = [...model.pending].sort((a, b) => a.start - b.start);
  let html = '';
  let lineStart = 0;
  for (const line of model.story.split('\n').slice(0, -1)) {
    const lineEnd = lineStart + line.length;
    let at = lineStart;
    let p = '';
    for (const s of pending.filter((s) => s.start >= lineStart && s.start <= lineEnd)) {
      p += `<span data-story="${at}">${escapeHtml(model.story.slice(at, s.start))}</span>`;
      p += `<span class="sugg" data-id="${s.id}" title="Buzzword suggestion"><del>${escapeHtml(model.story.slice(s.start, s.end))}</del><ins>${escapeHtml(s.replacement)}</ins><span class="sugg-actions"><button data-accept="${s.id}" aria-label="Accept">✓</button><button data-reject="${s.id}" aria-label="Reject">✕</button></span></span>`;
      at = s.end;
    }
    p += `<span data-story="${at}">${escapeHtml(model.story.slice(at, lineEnd))}</span>`;
    html += `<p>${p}</p>`;
    lineStart = lineEnd + 1;
  }
  host.innerHTML = html;
  const count = document.getElementById('pending-count');
  if (count) count.textContent = model.pending.length ? `${model.pending.length} suggestion${model.pending.length === 1 ? '' : 's'} from Buzzword` : 'No suggestions';
}

document.addEventListener('click', (e) => {
  const t = e.target as HTMLElement;
  if (t.dataset.accept) resolve([t.dataset.accept], true);
  if (t.dataset.reject) resolve([t.dataset.reject], false);
  if (t.id === 'accept-all') resolve('all', true);
  if (t.id === 'reject-all') resolve('all', false);
  if (t.id === 'reset-doc') {
    model.story = SAMPLE_DRAFT + '\n';
    model.pending = [];
    model.store = JSON.parse(JSON.stringify(EMPTY_STORE));
    renderDoc();
  }
});

// ------------------------------------------------------------------ google.script.run stand-in

const server: Record<string, (...args: any[]) => unknown> = {
  getInitialState: () => ({ settings: model.settings }),
  hasSelection: () => storySelection() !== null,
  saveSettings: (s: Settings) => (model.settings = { ...model.settings, ...s }),
  runCheck: (mode: CheckMode) => runCheck(mode),
  ignoreFlag: (fp: string) => { model.store.ignored.push(fp); },
  suggestOne: (card: CardIssue) => {
    const { toStory } = buildDoc();
    const start = toStory(card.docStart!);
    const end = toStory(card.docEnd!);
    if (start === null || end === null) throw new Error('The text has changed since the last check. Run the check again.');
    const id = `suggest.preview${model.nextId++}`;
    model.pending.push({ id, start, end, replacement: card.replacement ?? '' });
    model.store.tracked.push({ i: [id], f: card.fp, r: card.ruleId });
    renderDoc();
    return { ...card, status: 'suggested' };
  },
  showInDoc: (card: CardIssue) => {
    const host = document.getElementById('fake-doc-story')!;
    const spans = host.querySelectorAll<HTMLElement>('[data-story], .sugg');
    for (const el of spans) {
      const text = el.textContent ?? '';
      const target = card.status === 'suggested' ? card.original : card.original;
      const at = text.indexOf(target);
      if (at < 0 || !el.firstChild) continue;
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      el.classList.add('flash');
      setTimeout(() => el.classList.remove('flash'), 1200);
      return true;
    }
    return false;
  },
};

function makeRunner(success?: (v: unknown) => void, failure?: (e: Error) => void): any {
  return new Proxy({}, {
    get(_t, name: string) {
      if (name === 'withSuccessHandler') return (fn: (v: unknown) => void) => makeRunner(fn, failure);
      if (name === 'withFailureHandler') return (fn: (e: Error) => void) => makeRunner(success, fn);
      return (...args: unknown[]) => {
        // Simulate the round trip to Google, slower for checks so the bee gets to fly.
        const delay = name === 'runCheck' ? 900 : name === 'hasSelection' ? 0 : 150;
        setTimeout(() => {
          try {
            success?.(server[name](...args));
          } catch (err) {
            failure?.(err as Error);
          }
        }, delay);
      };
    },
  });
}

(window as any).google = { script: { run: makeRunner() } };

// The same floating bee as the extension, with the app mounted straight into its popup.
const launcher = createLauncher(BEE_CSS, () => undefined);
const appEl = document.createElement('main');
appEl.id = 'app';
appEl.className = 'app';
launcher.mount(appEl);
(window as any).buzzHost = launcher;
// The real extension can't move the cursor, so mirror its "Find in doc" behavior: highlight instead.
document.addEventListener('DOMContentLoaded', renderDoc);
