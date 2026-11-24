// Runs inside the extension's panel page, before the sidebar app. It stands in
// for google.script.run: calls go to the background worker, which talks to the
// Google Docs API. It also tells the floating bee what's happening.

import type { CardIssue } from '../shared/types';

const PAGE_ORIGIN = 'https://docs.google.com';
const docId = new URLSearchParams(location.search).get('doc') ?? '';
document.documentElement.classList.add('is-popup');

const toPage = (msg: object) => window.parent.postMessage({ source: 'buzzword-panel', ...msg }, PAGE_ORIGIN);

(window as unknown as { buzzHost: object }).buzzHost = {
  update(state: { busy: boolean; openCount: number | null }) {
    toPage({ type: 'state', ...state });
  },
};

let nextId = 1;
function pageSelection(): Promise<string> {
  const id = nextId++;
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(''), 1500);
    const onMessage = (event: MessageEvent) => {
      const msg = event.data as { source?: string; type?: string; id?: number; text?: string };
      if (event.origin !== PAGE_ORIGIN || msg?.source !== 'buzzword-page' || msg.id !== id) return;
      clearTimeout(timer);
      window.removeEventListener('message', onMessage);
      resolve(msg.text ?? '');
    };
    window.addEventListener('message', onMessage);
    toPage({ type: 'get-selection', id });
  });
}

async function background<T>(fn: string, args: unknown[]): Promise<T> {
  const reply = await chrome.runtime.sendMessage({ fn, args, docId });
  if (!reply) throw new Error('Buzzword’s background helper didn’t answer. Reload the doc and try again.');
  if (!reply.ok) throw new Error(reply.error);
  return reply.value as T;
}

const isMac = /Mac|iPhone|iPad/.test(navigator.userAgent);

const local: Record<string, (...args: any[]) => Promise<unknown>> = {
  // The selection button stays on: Docs doesn't announce selection changes.
  hasSelection: async () => true,

  runCheck: async (mode: 'story' | 'selection') => {
    if (mode === 'story') return background('runCheck', ['story']);
    let text = await pageSelection();
    let fromClipboard = false;
    if (!text) {
      text = (await navigator.clipboard.readText().catch(() => '')).trim();
      fromClipboard = true;
    }
    if (!text) throw new Error('Select some text in the doc first. If Buzzword still can’t see it, copy it (⌘C or Ctrl+C) and click again.');
    const result = await background<{ warning?: string }>('runCheck', ['selection', text]);
    if (fromClipboard) result.warning = [result.warning, 'Checked the text you copied.'].filter(Boolean).join(' ');
    return result;
  },

  // An extension can't move the cursor in Docs, so copy the text for the reporter to find.
  showInDoc: async (card: CardIssue) => {
    const text = card.status === 'suggested' && card.replacement ? card.replacement : card.original;
    await navigator.clipboard.writeText(text.trim());
    return `Copied “${text.trim()}.” Press ${isMac ? '⌘F' : 'Ctrl+F'} in the doc, paste, and press Enter.`;
  },
};

function makeRunner(success?: (v: unknown) => void, failure?: (e: Error) => void): unknown {
  return new Proxy({}, {
    get(_t, name: string) {
      if (name === 'withSuccessHandler') return (fn: (v: unknown) => void) => makeRunner(fn, failure);
      if (name === 'withFailureHandler') return (fn: (e: Error) => void) => makeRunner(success, fn);
      return (...args: unknown[]) => {
        const run = local[name] ?? ((...a: unknown[]) => background(name, a));
        run(...args).then((v) => success?.(v), (e) => failure?.(e instanceof Error ? e : new Error(String(e))));
      };
    },
  });
}

(window as unknown as { google: object }).google = { script: { run: makeRunner() } };
