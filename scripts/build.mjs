// Builds:
//   dist-extension/       the Chrome extension (load it unpacked from chrome://extensions)
//   dist/                 the Apps Script add-on version (Code.js, Sidebar.html, appsscript.json)
//   preview/index.html    a local preview: fake doc + floating bee (serve the folder and open it)

import { build } from 'esbuild';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const root = new URL('..', import.meta.url).pathname;
const r = (p) => root + p;

const bundle = async (entry, target = 'es2020') =>
  (await build({ entryPoints: [r(entry)], bundle: true, write: false, format: 'iife', target, charset: 'utf8', legalComments: 'none' }))
    .outputFiles[0].text.replace(/<\/script/gi, '<\\/script');

const logo = `data:image/jpeg;base64,${(await readFile(r('assets/burlingame-b-logo.jpg'))).toString('base64')}`;
const beeCss = await readFile(r('src/sidebar/bee.css'), 'utf8');
const css = (await readFile(r('src/sidebar/styles.css'), 'utf8')) + '\n' + beeCss;
const appJs = `var LOGO_SRC = ${JSON.stringify(logo)};\n${await bundle('src/sidebar/app.ts', 'es2019')}`;
const fonts = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Libre+Franklin:wght@400;600;700;800&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&display=swap">`;

// ------------------------------------------------------------------ Chrome extension

const config = JSON.parse(await readFile(r('extension.config.json'), 'utf8'));
await mkdir(r('dist-extension/icons'), { recursive: true });

const manifest = {
  manifest_version: 3,
  name: 'Buzzword',
  version: JSON.parse(await readFile(r('package.json'), 'utf8')).version,
  description: 'AP and Burlingame B style checks for Google Docs drafts, as suggestions you accept or reject.',
  key: config.publicKey,
  icons: { 16: 'icons/bee-16.png', 32: 'icons/bee-32.png', 48: 'icons/bee-48.png', 128: 'icons/bee-128.png' },
  permissions: ['identity', 'storage', 'clipboardWrite', 'clipboardRead'],
  host_permissions: ['https://docs.googleapis.com/*'],
  background: { service_worker: 'background.js' },
  content_scripts: [{ matches: ['https://docs.google.com/document/d/*'], js: ['content.js'], run_at: 'document_idle' }],
  web_accessible_resources: [{ resources: ['panel.html'], matches: ['https://docs.google.com/*'] }],
  oauth2: {
    client_id: config.oauthClientId || 'MISSING-see-README.apps.googleusercontent.com',
    scopes: ['https://www.googleapis.com/auth/documents'],
  },
};
await writeFile(r('dist-extension/manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
await writeFile(r('dist-extension/background.js'), await bundle('src/extension/background.ts'));
await writeFile(r('dist-extension/content.js'), `var BEE_CSS = ${JSON.stringify(beeCss)};\n${await bundle('src/extension/content.ts')}`);
// Extension pages can't run inline scripts, so the panel loads panel.js. The bridge must run first.
await writeFile(r('dist-extension/panel.js'), `${await bundle('src/extension/bridge.ts')}\n${appJs}`);
await writeFile(
  r('dist-extension/panel.html'),
  `<!doctype html>
<html lang="en" class="is-popup">
<head>
<meta charset="utf-8">
<title>Buzzword</title>
${fonts}
<style>${css}</style>
</head>
<body>
<main id="app" class="app"></main>
<script src="panel.js"></script>
</body>
</html>
`,
);

// Icons: Buzz on a red circle, like the B logo. Rendered from SVG with macOS's sips.
const { MASCOT_SVG } = await import('data:text/javascript,' + encodeURIComponent(
  (await build({ entryPoints: [r('src/sidebar/mascot.ts')], bundle: true, write: false, format: 'esm' })).outputFiles[0].text,
));
// sips doesn't understand CSS variables or display:none, so the icon gets plain colors and no hidden parts.
const flatCss = beeCss
  .replace(/var\(--honey\)/g, '#f5b301')
  .replace(/var\(--b-red\)/g, '#e0262d')
  .replace(/@media[\s\S]*$/, '');
const iconMascot = MASCOT_SVG
  .replace(/<g class="eyes-happy">[\s\S]*?<\/g>/, '')
  .replace(/<g class="bee-sparkle">[\s\S]*?<\/g>/, '');
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="512" height="512">
<style>${flatCss}</style>
<circle cx="80" cy="80" r="78" fill="#e0262d"/>
<circle cx="80" cy="80" r="64" fill="#fff"/>
<g transform="translate(14 20) scale(0.82)">${iconMascot.replace('<svg class="bee"', '<svg class="bee" width="160" height="140"').replace(/<title[^>]*>.*?<\/title>/, '')}</g>
</svg>`;
await writeFile(r('assets/buzz-icon.svg'), iconSvg);
if (!existsSync(r('assets/buzz-icon-512.png'))) {
  try {
    execFileSync('sips', ['-s', 'format', 'png', r('assets/buzz-icon.svg'), '--out', r('assets/buzz-icon-512.png')], { stdio: 'ignore' });
  } catch {
    console.warn('Could not render the icon with sips; add assets/buzz-icon-512.png by hand.');
  }
}
for (const size of [16, 32, 48, 128]) {
  const out = r(`dist-extension/icons/bee-${size}.png`);
  if (existsSync(r('assets/buzz-icon-512.png'))) {
    execFileSync('sips', ['-z', String(size), String(size), r('assets/buzz-icon-512.png'), '--out', out], { stdio: 'ignore' });
  }
}

// ------------------------------------------------------------------ Apps Script add-on

await mkdir(r('dist'), { recursive: true });
const SERVER_EXPORTS = ['onOpen', 'onInstall', 'showSidebar', 'getInitialState', 'hasSelection', 'saveSettings', 'runCheck', 'suggestOne', 'ignoreFlag', 'showInDoc'];
const server = await build({
  entryPoints: [r('src/server/main.ts')], bundle: true, write: false, format: 'iife', globalName: '__buzzword',
  target: 'es2020', charset: 'utf8', legalComments: 'none',
});
const glue = SERVER_EXPORTS.map((name) => `function ${name}(a, b) { return __buzzword.${name}(a, b); }`).join('\n');
await writeFile(r('dist/Code.js'), `// Built by scripts/build.mjs. Edit src/, not this file.\n${server.outputFiles[0].text}\n${glue}\n`);
await writeFile(
  r('dist/Sidebar.html'),
  `<!doctype html>
<html lang="en">
<head>
<base target="_top">
<meta charset="utf-8">
${fonts}
<style>${css}</style>
</head>
<body>
<main id="app" class="app"></main>
<script>${appJs}</script>
</body>
</html>
`,
);
await copyFile(r('appsscript.json'), r('dist/appsscript.json'));

// ------------------------------------------------------------------ preview

const template = await readFile(r('preview/template.html'), 'utf8');
// The preview mounts the same floating bee as the extension, with a stand-in for Google.
const previewJs = `var BEE_CSS = ${JSON.stringify(beeCss)};\n${await bundle('preview/mock.ts', 'es2019')}`;
await writeFile(
  r('preview/index.html'),
  template
    .replace('/*SIDEBAR_CSS*/', () => css)
    .replace('/*MOCK_JS*/', () => previewJs)
    .replace('/*SIDEBAR_JS*/', () => appJs),
);

console.log(`Built dist-extension/ (ID ${config.extensionId}${config.oauthClientId ? '' : ', no OAuth client ID yet'}), dist/ and preview/index.html`);
