// Writes the Chrome Web Store promo tile pages to release/store-assets/:
//   promo-honey.html, promo-red.html   (440x280; screenshot them to PNG)
// Buzz comes from the real mascot SVG, so the tile always matches the extension.

import { build } from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const root = new URL('..', import.meta.url).pathname;
const r = (p) => root + p;

const { MASCOT_SVG } = await import('data:text/javascript,' + encodeURIComponent(
  (await build({ entryPoints: [r('src/sidebar/mascot.ts')], bundle: true, write: false, format: 'esm' })).outputFiles[0].text,
));
// Only the colors and shapes; no animation in a still image.
const beeCss = (await readFile(r('src/sidebar/bee.css'), 'utf8')).replace(/@media[\s\S]*$/, '');
const bee = MASCOT_SVG.replace('<svg class="bee"', '<svg class="bee is-ready"');

// Honeycomb grid that matches the 56x100 background pattern below:
// a cell's center is (28 + 56i, 33 + 100j) on even rows, (56i, 83 + 100j) on odd rows.
const HEX = 'M0 -33 L28 -17 L28 17 L0 33 L-28 17 L-28 -17 Z';
const cell = (col, row) => (row % 2 === 0 ? [28 + 56 * col, 33 + 50 * row] : [56 * col, 33 + 50 * row]);
const cells = (list, cls) =>
  list.map(([c, rw]) => { const [x, y] = cell(c, rw); return `<path class="${cls}" transform="translate(${x} ${y})" d="${HEX}"/>`; }).join('');

// A honey drip hanging from the bottom point of a cell.
const drip = (c, rw, len) => {
  const [x, y] = cell(c, rw);
  const top = y + 26;
  return `<path class="drip" d="M${x - 9} ${top} C${x - 8} ${top + len * 0.6} ${x - 7} ${top + len} ${x} ${top + len} C${x + 7} ${top + len} ${x + 8} ${top + len * 0.6} ${x + 9} ${top} Z"/>`;
};

function page({ name, bg, line, full, half, dripColor, title, sub, pillBg, pillFg, badge }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Buzzword promo tile (${name})</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Libre+Franklin:wght@600;800;900&display=swap">
<style>
${beeCss}
html, body { margin: 0; padding: 0; background: ${bg}; }
.tile { position: relative; width: 440px; height: 280px; overflow: hidden; background: ${bg}; font-family: 'Libre Franklin', Arial, sans-serif; }
.art { position: absolute; inset: 0; }
.comb { fill: none; stroke: ${line}; stroke-width: 2; }
.full { fill: ${full}; stroke: ${line}; stroke-width: 2; }
.half { fill: ${half}; stroke: ${line}; stroke-width: 2; }
.drip { fill: ${dripColor}; }
.trail { fill: none; stroke: ${title}; stroke-width: 2.2; stroke-dasharray: 2 7; stroke-linecap: round; opacity: .55; }
.badge { position: absolute; left: 22px; top: 54px; width: 172px; height: 172px; border-radius: 50%; background: ${badge}; border: 3px solid #000; box-shadow: 6px 6px 0 rgba(0,0,0,.18); }
.bee-wrap { position: absolute; left: 18px; top: 66px; width: 186px; transform: rotate(-6deg); }
.bee-wrap svg { width: 100%; height: auto; display: block; }
.text { position: absolute; left: 214px; top: 84px; right: 18px; }
.word { margin: 0; font-weight: 900; font-size: 44px; letter-spacing: -1.5px; line-height: 1; color: ${title}; }
.sub { margin: 10px 0 14px; font-weight: 600; font-size: 15.5px; line-height: 1.3; color: ${sub}; }
.pill { display: inline-block; padding: 5px 11px 5px; border-radius: 999px; background: ${pillBg}; color: ${pillFg}; font-weight: 800; font-size: 11.5px; letter-spacing: .6px; text-transform: uppercase; border: 2px solid #000; }
</style>
</head>
<body>
<div class="tile">
  <svg class="art" viewBox="0 0 440 280" width="440" height="280" aria-hidden="true">
    <defs>
      <pattern id="comb" width="56" height="100" patternUnits="userSpaceOnUse">
        <path class="comb" d="M28 66L0 50L0 16L28 0L56 16L56 50L28 66L28 100"/>
      </pattern>
    </defs>
    <rect width="440" height="280" fill="url(#comb)"/>
    <!-- filled cells: top right corner, dripping; and a few at the bottom left -->
    ${cells([[7, 0], [6, 0], [7, 1], [8, 1], [5, 0]], 'full')}
    ${cells([[6, 1], [4, 0]], 'half')}
    ${drip(6, 0, 30)}${drip(7, 1, 22)}${drip(4, 0, 16)}
    ${cells([[0, 4], [0, 5], [1, 5], [-1, 5]], 'full')}
    ${cells([[1, 4]], 'half')}
    <!-- Buzz's flight path, looping in from the left edge -->
    <path class="trail" d="M-10 30 C40 10 70 50 60 70 C52 88 30 76 40 60 C52 42 100 38 128 58"/>
  </svg>
  <div class="badge"></div>
  <div class="bee-wrap">${bee}</div>
  <div class="text">
    <p class="word">Buzzword</p>
    <p class="sub">AP and house style checks<br>for Google Docs drafts</p>
    <span class="pill">The Burlingame B</span>
  </div>
</div>
</body>
</html>
`;
}

await mkdir(r('release/store-assets'), { recursive: true });
await writeFile(r('release/store-assets/promo-honey.html'), page({
  name: 'honey', bg: '#ffc629', line: 'rgba(120, 70, 0, .22)', full: '#e68a00', half: '#f5a300', dripColor: '#e68a00',
  title: '#111', sub: '#3d2a00', pillBg: '#e0262d', pillFg: '#fff', badge: '#fff',
}));
await writeFile(r('release/store-assets/promo-red.html'), page({
  name: 'red', bg: '#e0262d', line: 'rgba(255, 255, 255, .16)', full: '#f5b301', half: '#ffcf4a', dripColor: '#f5b301',
  title: '#fff', sub: '#ffe3e3', pillBg: '#f5b301', pillFg: '#111', badge: '#fff',
}));
console.log('Wrote release/store-assets/promo-honey.html and promo-red.html');
