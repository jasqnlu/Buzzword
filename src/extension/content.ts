// Content script: runs on Google Docs pages. Adds the floating bee, and opens
// the Buzzword panel (an extension page) in a popup frame when it's clicked.

import { createLauncher } from './launcher';

declare const BEE_CSS: string;

const EXTENSION_ORIGIN = new URL(chrome.runtime.getURL('')).origin;
const docId = location.pathname.match(/\/document\/d\/([^/]+)/)?.[1];

if (docId && !document.getElementById('buzzword-launcher')) {
  let frame: HTMLIFrameElement | null = null;
  const launcher = createLauncher(BEE_CSS, (mount) => {
    frame = document.createElement('iframe');
    frame.src = chrome.runtime.getURL(`panel.html?doc=${encodeURIComponent(docId)}`);
    frame.title = 'Buzzword';
    frame.allow = 'clipboard-write; clipboard-read';
    frame.style.cssText = 'width:100%;height:100%;border:0;display:block;';
    mount(frame);
  });

  window.addEventListener('message', (event) => {
    if (event.origin !== EXTENSION_ORIGIN || !frame || event.source !== frame.contentWindow) return;
    const msg = event.data as { source?: string; type?: string; id?: number; busy?: boolean; openCount?: number | null };
    if (msg?.source !== 'buzzword-panel') return;
    if (msg.type === 'state') launcher.update({ busy: !!msg.busy, openCount: msg.openCount ?? null });
    if (msg.type === 'close') launcher.close();
    if (msg.type === 'get-selection') {
      frame.contentWindow?.postMessage({ source: 'buzzword-page', type: 'selection', id: msg.id, text: selectedText() }, EXTENSION_ORIGIN);
    }
  });
}

/**
 * The text the reporter has selected. Google Docs draws the page on a canvas, but it
 * keeps the current selection in a hidden editable frame (that's how copy works).
 */
function selectedText(): string {
  const candidates: string[] = [];
  const iframe = document.querySelector<HTMLIFrameElement>('iframe.docs-texteventtarget-iframe');
  try {
    const target = iframe?.contentDocument?.querySelector<HTMLElement>('[contenteditable="true"]') ?? iframe?.contentDocument?.body;
    if (target?.innerText) candidates.push(target.innerText);
  } catch {
    /* frame not readable */
  }
  const sel = window.getSelection()?.toString();
  if (sel) candidates.push(sel);
  return candidates.map((t) => t.replace(/​/g, '').trim()).sort((a, b) => b.length - a.length)[0] ?? '';
}
