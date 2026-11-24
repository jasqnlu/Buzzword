// Sidebar behavior. Runs in the browser inside Google Docs (HtmlService), and
// in the local preview with a stand-in for google.script.run.

import type { Settings } from '../engine/types';
import type { CardIssue, CheckMode, CheckResult, InitialState } from '../shared/types';
import { MASCOT_SVG } from './mascot';

declare const google: {
  script: {
    run: {
      withSuccessHandler(fn: (value: any) => void): any;
      withFailureHandler(fn: (err: Error) => void): any;
      [name: string]: any;
    };
  };
};

/** Promise wrapper around google.script.run. */
function call<T>(name: string, ...args: unknown[]): Promise<T> {
  return new Promise((resolve, reject) => {
    google.script.run.withSuccessHandler(resolve).withFailureHandler(reject)[name](...args);
  });
}

type View =
  | { kind: 'start' }
  | { kind: 'checking'; mode: CheckMode }
  | { kind: 'result'; result: CheckResult }
  | { kind: 'error'; message: string; last?: CheckResult };

const state = {
  view: { kind: 'start' } as View,
  settings: { percentStyle: 'word', fillerStyle: 'delete' } as Settings,
  hasSelection: false,
  collapsed: new Set<string>(['suggested']),
};

const $ = <T extends HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector(sel) as T;
const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

// ------------------------------------------------------------------ rendering

function render() {
  const app = $('#app');
  const v = state.view;
  const last = v.kind === 'result' ? v.result : v.kind === 'error' ? v.last : undefined;
  const busy = v.kind === 'checking';

  app.innerHTML = `
    <header class="masthead">
      ${MASCOT_SVG}
      <div>
        <h1 class="wordmark">Buzzword</h1>
        <p class="tagline"><img src="${LOGO_SRC}" alt="">AP and B style check</p>
      </div>
    </header>

    <div class="actions">
      <button class="btn btn-primary" data-act="check-story" ${busy ? 'disabled' : ''}>
        ${busy && v.mode === 'story' ? 'Checking the story…' : 'Check whole story'}
      </button>
      <button class="btn btn-secondary" data-act="check-selection" ${busy || !state.hasSelection ? 'disabled' : ''}
        aria-describedby="sel-hint">
        ${busy && v.mode === 'selection' ? 'Checking the selection…' : 'Check selection'}
      </button>
      ${state.hasSelection ? '' : '<p class="btn-hint" id="sel-hint">Select some text in the doc to check just that part.</p>'}
    </div>

    <div aria-live="polite">${renderStatus(v)}</div>
    ${last ? renderGroups(last) : ''}
    ${renderSettings()}
    ${last ? `<p class="meta">Last checked ${formatTime(last.checkedAt)} (${last.wordCount.toLocaleString()} words${last.mode === 'selection' ? ' selected' : ''})</p>` : ''}
  `;

  const bee = $('.bee', app);
  bee.classList.toggle('is-checking', busy);
  bee.classList.toggle('is-ready', v.kind === 'result' && v.result.openCount === 0);

  // Tell the floating bee (extension or preview) how things stand.
  host()?.update({ busy, openCount: busy ? null : last?.openCount ?? null });
}

interface Host { update(state: { busy: boolean; openCount: number | null }): void }
const host = (): Host | undefined => (window as unknown as { buzzHost?: Host }).buzzHost;

function renderStatus(v: View): string {
  if (v.kind === 'start') {
    return `<p class="empty">Buzzword reads your story for AP style and The B’s house rules. Fixes show up as suggestions you accept or reject in the doc. Anything that needs your judgment is listed here.</p>`;
  }
  if (v.kind === 'checking') return `<p class="sr-only">Checking…</p>`;
  if (v.kind === 'error') {
    return `<div class="status is-error"><p class="headline">That check didn’t finish.</p><p class="detail">${esc(v.message)}</p></div>`;
  }
  const r = v.result;
  if (r.openCount === 0) {
    return `<div class="status is-ready">
      <p class="headline">AP-ready. 0 issues.</p>
      <p class="detail">${r.mode === 'selection' ? 'This selection is clean.' : 'Ready to send to editors.'}${resolvedLine(r)}</p>
    </div>`;
  }
  const parts: string[] = [];
  if (r.suggested.length) parts.push(`Added ${plural(r.suggested.length, 'suggestion')} to the doc.`);
  if (r.flags.length) parts.push(`${plural(r.flags.length, 'thing')} ${r.flags.length === 1 ? 'needs' : 'need'} you.`);
  if (!parts.length && r.pendingEarlier) parts.push('No new issues.');
  const pending = r.pendingEarlier + r.suggested.length;
  const detail = [
    pending ? `Accept or reject ${pending === 1 ? 'the suggestion' : `the ${pending} suggestions`} in the doc, then check again.` : '',
    resolvedLine(r),
    !r.foundTemplate && r.mode === 'story' ? 'This doc doesn’t use the Article Draft template, so Buzzword checked all of it (except tables).' : '',
    r.warning ?? '',
  ].filter(Boolean).join(' ');
  return `<div class="status">
    <p class="headline">${parts.join(' ')}</p>
    <p class="detail">${esc(detail)} ${plural(r.openCount, 'open issue')} left.</p>
  </div>`;
}

function resolvedLine(r: CheckResult): string {
  const { accepted, rejected } = r.resolved;
  if (!accepted && !rejected) return '';
  const bits = [];
  if (accepted) bits.push(`${accepted} accepted`);
  if (rejected) bits.push(`${rejected} rejected`);
  return ` Since last check: ${bits.join(', ')}.`;
}

function renderGroups(r: CheckResult): string {
  return [
    group('flags', 'Needs you', r.flags, 'Buzzword can’t fix these on its own. Edit them in the doc, or ignore them.'),
    group('suggested', 'Suggested in the doc', r.suggested, 'Accept or reject these with the ✓ and ✕ on each suggestion in the doc.'),
  ].join('');
}

function group(key: string, title: string, cards: CardIssue[], note: string): string {
  if (!cards.length) return '';
  const collapsed = state.collapsed.has(key);
  return `<section class="group ${collapsed ? 'is-collapsed' : ''}" data-group="${key}">
    <button class="group-head" data-act="toggle" data-key="${key}" aria-expanded="${!collapsed}">
      <h2>${title}<span class="chev" aria-hidden="true">▾</span></h2>
      <span class="count">${cards.length}</span>
    </button>
    ${collapsed ? '' : `<p class="group-note">${note}</p>`}
    <ul class="cards">${cards.map((c, i) => card(c, key, i)).join('')}</ul>
  </section>`;
}

function card(c: CardIssue, key: string, i: number): string {
  const id = `${key}-${i}`;
  const packLabel = c.pack === 'ap' ? 'AP' : 'The B';
  const canSuggest = c.status === 'flag' && c.replacement !== null && c.docStart !== undefined;
  return `<li class="card" data-key="${key}" data-i="${i}">
    <div class="card-top">
      <h3 class="card-title">${esc(c.title)}</h3>
      <span class="pack ${c.pack === 'house' ? 'pack-house' : ''}" title="${c.pack === 'ap' ? 'AP Stylebook rule' : 'The B house-style rule'}">${packLabel}</span>
    </div>
    <p class="snippet">${snippet(c)}</p>
    <p class="reason">${esc(c.reason)}</p>
    ${c.hint ? `<p class="hint">${esc(c.hint)}</p>` : ''}
    <p class="why" id="why-${id}" hidden>${esc(c.why)}</p>
    <div class="card-actions">
      <button class="link" data-act="why" data-target="why-${id}" aria-expanded="false" aria-controls="why-${id}">Why?</button>
      <button class="link" data-act="show">${IS_POPUP ? 'Find in doc' : 'Show in doc'}</button>
      ${canSuggest ? '<button class="link link-strong" data-act="suggest">Suggest this fix</button>' : ''}
      ${c.status === 'flag' ? '<button class="link" data-act="ignore">Ignore</button>' : ''}
    </div>
  </li>`;
}

/** before + struck original + inserted fix + after, like a copy editor's marks. */
function snippet(c: CardIssue): string {
  const show = (s: string) => esc(s).replace(/\n/g, ' ');
  const visibleSpace = (s: string) => (/^\s+$/.test(s) ? `<span class="space">${s.replace(/ /g, '·')}</span>` : show(s));
  const original = visibleSpace(c.original);
  let middle: string;
  if (c.replacement === null) middle = `<mark>${original}</mark>`;
  else if (c.replacement === '' ) middle = `<del>${original}</del>`;
  else middle = `<del>${original}</del><ins>${visibleSpace(c.replacement)}</ins>`;
  return `${show(c.before)}${middle}${show(c.after)}`;
}

function renderSettings(): string {
  const s = state.settings;
  const radio = (name: string, value: string, label: string, checked: boolean) =>
    `<label><input type="radio" name="${name}" value="${value}" ${checked ? 'checked' : ''}> ${label}</label>`;
  return `<details class="settings">
    <summary>Style settings</summary>
    <fieldset>
      <legend>Percentages</legend>
      ${radio('percentStyle', 'word', '45 percent (The B guide)', s.percentStyle === 'word')}
      ${radio('percentStyle', 'symbol', '45% (AP since 2019)', s.percentStyle === 'symbol')}
    </fieldset>
    <fieldset>
      <legend>Um and uh in quotes</legend>
      ${radio('fillerStyle', 'delete', 'Delete them (The B)', s.fillerStyle === 'delete')}
      ${radio('fillerStyle', 'ellipsis', 'Replace with ... (AP)', s.fillerStyle === 'ellipsis')}
    </fieldset>
    <p class="note">Settings apply to your next check.</p>
  </details>`;
}

// ------------------------------------------------------------------ actions

async function runCheck(mode: CheckMode) {
  const last = state.view.kind === 'result' ? state.view.result : undefined;
  state.view = { kind: 'checking', mode };
  render();
  try {
    const result = await call<CheckResult>('runCheck', mode);
    state.view = { kind: 'result', result };
    if (result.flags.length === 0) state.collapsed.delete('suggested');
  } catch (err) {
    state.view = { kind: 'error', message: messageOf(err), last };
  }
  render();
}

function currentCards(key: string): CardIssue[] {
  const v = state.view;
  const r = v.kind === 'result' ? v.result : v.kind === 'error' ? v.last : undefined;
  if (!r) return [];
  return key === 'flags' ? r.flags : r.suggested;
}

document.addEventListener('click', async (event) => {
  const btn = (event.target as HTMLElement).closest<HTMLElement>('[data-act]');
  if (!btn) return;
  const act = btn.dataset.act;
  if (act === 'check-story') return runCheck('story');
  if (act === 'check-selection') return runCheck('selection');
  if (act === 'toggle') {
    const key = btn.dataset.key!;
    if (state.collapsed.has(key)) state.collapsed.delete(key);
    else state.collapsed.add(key);
    return render();
  }
  if (act === 'why') {
    const target = document.getElementById(btn.dataset.target!)!;
    target.hidden = !target.hidden;
    btn.setAttribute('aria-expanded', String(!target.hidden));
    return;
  }

  const li = btn.closest<HTMLElement>('.card');
  if (!li) return;
  const key = li.dataset.key!;
  const cards = currentCards(key);
  const c = cards[Number(li.dataset.i)];
  if (!c) return;

  if (act === 'show') {
    // The add-on selects the text (true). The extension can't, so it copies it and returns how to find it.
    const found = await call<boolean | string>('showInDoc', c).catch(() => false);
    if (typeof found === 'string') flash(li, found, 'note');
    else if (!found) flash(li, 'Couldn’t find this text. It may have been edited.');
  } else if (act === 'ignore') {
    await call('ignoreFlag', c.fp).catch(() => undefined);
    cards.splice(cards.indexOf(c), 1);
    adjustOpen(-1);
    render();
  } else if (act === 'suggest') {
    btn.textContent = 'Suggesting…';
    try {
      const updated = await call<CardIssue>('suggestOne', c);
      const r = state.view.kind === 'result' ? state.view.result : undefined;
      cards.splice(cards.indexOf(c), 1);
      r?.suggested.unshift(updated);
      render();
    } catch (err) {
      flash(li, messageOf(err));
      btn.textContent = 'Suggest this fix';
    }
  }
});

document.addEventListener('change', async (event) => {
  const input = event.target as HTMLInputElement;
  if (input.name !== 'percentStyle' && input.name !== 'fillerStyle') return;
  state.settings = { ...state.settings, [input.name]: input.value };
  state.settings = await call<Settings>('saveSettings', state.settings).catch(() => state.settings);
});

function adjustOpen(delta: number) {
  if (state.view.kind === 'result') state.view.result.openCount = Math.max(0, state.view.result.openCount + delta);
}

function flash(li: HTMLElement, message: string, kind: 'error' | 'note' = 'error') {
  let p = li.querySelector<HTMLElement>('.flash');
  if (!p) {
    p = document.createElement('p');
    li.appendChild(p);
  }
  p.className = kind === 'note' ? 'note-line flash' : 'hint flash';
  p.textContent = message;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
const messageOf = (err: unknown) => (err instanceof Error ? err.message : String((err as { message?: string })?.message ?? err));

function formatTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes();
  // AP style, of course.
  const hour = h % 12 || 12;
  const half = h < 12 ? 'a.m.' : 'p.m.';
  if (h === 12 && m === 0) return 'at noon';
  if (h === 0 && m === 0) return 'at midnight';
  return `at ${hour}${m ? `:${String(m).padStart(2, '0')}` : ''} ${half}`;
}

// Selection polling: the "Check selection" button is only active with a selection.
async function pollSelection() {
  if (document.visibilityState === 'visible' && state.view.kind !== 'checking') {
    const has = await call<boolean>('hasSelection').catch(() => state.hasSelection);
    if (has !== state.hasSelection) {
      state.hasSelection = has;
      render();
    }
  }
  setTimeout(pollSelection, 1500);
}

declare const LOGO_SRC: string;
const IS_POPUP = document.documentElement.classList.contains('is-popup');

async function start() {
  render();
  try {
    const init = await call<InitialState>('getInitialState');
    state.settings = init.settings;
    render();
  } catch {
    /* keep defaults */
  }
  pollSelection();
}

start();
