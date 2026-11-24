// The floating bee button and its popup frame. Used by the Chrome extension's
// content script (on Google Docs) and by the local preview.
// Everything lives in a shadow root so Google Docs' CSS can't touch it.

import { MASCOT_SVG } from '../sidebar/mascot';

export interface HostState {
  busy: boolean;
  /** Open issues after the last check, or null before any check. */
  openCount: number | null;
}

export interface Launcher {
  /** Put the popup's content in place: an iframe in the extension, the app itself in the preview. */
  mount(el: HTMLElement): void;
  update(state: HostState): void;
  open(): void;
  close(): void;
}

const LAUNCHER_CSS = /* css */ `
:host { all: initial; }
* { box-sizing: border-box; }

.dock {
  position: fixed;
  right: 24px;
  bottom: 92px; /* clear of Docs' own bottom-right buttons */
  z-index: 2147483000;
  font: 13px/1.4 'Libre Franklin', Arial, sans-serif;
}

.bee-button {
  position: relative;
  width: 62px;
  height: 62px;
  border-radius: 50%;
  border: 2px solid #000;
  background: #fff;
  padding: 0;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(60, 64, 67, .35);
  display: grid;
  place-items: center;
  transition: transform .15s ease, box-shadow .15s ease;
}
.bee-button:hover { transform: translateY(-2px) rotate(-4deg); box-shadow: 0 4px 12px rgba(60, 64, 67, .35); }
.bee-button:focus-visible { outline: 3px solid var(--b-red); outline-offset: 3px; }
.bee-button .bee { width: 54px; height: auto; margin: 2px 0 0 -2px; }

.badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  border-radius: 11px;
  border: 2px solid #fff;
  background: var(--b-red);
  color: #fff;
  font: 700 12px/18px 'Libre Franklin', Arial, sans-serif;
  text-align: center;
}
.badge[hidden] { display: none; }
.badge.is-zero { background: #000; color: var(--honey); }

.popup {
  position: absolute;
  right: 0;
  bottom: 76px;
  width: 340px;
  height: min(620px, calc(100vh - 200px));
  background: #fff;
  border: 1px solid #dadce0;
  border-radius: 12px;
  box-shadow: 0 8px 28px rgba(60, 64, 67, .3);
  overflow: hidden;
  transform-origin: 100% 100%;
}
.popup[hidden] { display: none; }
@media (prefers-reduced-motion: no-preference) {
  .popup:not([hidden]) { animation: pop .16s ease-out; }
}
@keyframes pop { from { opacity: 0; transform: scale(.92) translateY(8px); } }

.close {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 2;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: #5f6368;
  font: 18px/28px Arial, sans-serif;
  cursor: pointer;
}
.close:hover { background: #f1f3f4; color: #202124; }
.slot { display: block; width: 100%; height: 100%; overflow: auto; }
::slotted(*) { display: block; width: 100%; min-height: 100%; border: 0; }
::slotted(iframe) { height: 100%; }

@media (max-width: 420px) {
  .dock { right: 12px; }
  .popup { width: calc(100vw - 24px); }
}
`;

export function createLauncher(beeCss: string, onFirstOpen: (mount: (el: HTMLElement) => void) => void): Launcher {
  const host = document.createElement('div');
  host.id = 'buzzword-launcher';
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `
    <style>${beeCss}${LAUNCHER_CSS}</style>
    <div class="dock">
      <div class="popup" id="bz-popup" role="dialog" aria-label="Buzzword" hidden>
        <button class="close" type="button" aria-label="Close Buzzword">✕</button>
        <div class="slot"><slot name="panel"></slot></div>
      </div>
      <button class="bee-button" type="button" aria-expanded="false" aria-controls="bz-popup" title="Buzzword: check AP and B style">
        ${MASCOT_SVG}
        <span class="badge" hidden></span>
      </button>
    </div>`;
  document.body.appendChild(host);

  const button = root.querySelector<HTMLButtonElement>('.bee-button')!;
  const popup = root.querySelector<HTMLElement>('.popup')!;
  // Content is a light-DOM child shown through the named slot, so the page's own CSS and scripts reach it.
  const mount = (el: HTMLElement) => {
    el.slot = 'panel';
    host.appendChild(el);
  };
  const badge = root.querySelector<HTMLElement>('.badge')!;
  const bee = button.querySelector<SVGElement>('.bee')!;
  bee.removeAttribute('aria-labelledby');
  bee.setAttribute('aria-hidden', 'true');
  let opened = false;

  const open = () => {
    if (!opened) {
      opened = true;
      onFirstOpen(mount);
    }
    popup.hidden = false;
    button.setAttribute('aria-expanded', 'true');
  };
  const close = () => {
    popup.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    button.focus();
  };

  button.addEventListener('click', () => (popup.hidden ? open() : close()));
  root.querySelector('.close')!.addEventListener('click', close);
  root.addEventListener('keydown', (e) => {
    if ((e as KeyboardEvent).key === 'Escape' && !popup.hidden) close();
  });

  return {
    mount,
    open,
    close,
    update({ busy, openCount }) {
      bee.classList.toggle('is-checking', busy);
      bee.classList.toggle('is-ready', openCount === 0 && !busy);
      if (openCount === null) {
        badge.hidden = true;
      } else {
        badge.hidden = false;
        badge.textContent = openCount === 0 ? '✓' : String(openCount);
        badge.classList.toggle('is-zero', openCount === 0);
        button.title = openCount === 0 ? 'Buzzword: AP-ready' : `Buzzword: ${openCount} open issue${openCount === 1 ? '' : 's'}`;
      }
    },
  };
}
