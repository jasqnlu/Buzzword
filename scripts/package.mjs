// Makes the zip to upload to the Chrome Web Store: release/buzzword-<version>.zip
//
// It copies dist-extension/ and removes the manifest's "key" field, which the store
// rejects ("key field is not allowed in manifest"). The store keeps its own key for the item.
// dist-extension/ itself keeps "key", so the unpacked extension keeps a fixed ID for local testing.
//
// Run `npm run build` first (the `package` npm script does this for you).

import { cp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const root = new URL('..', import.meta.url).pathname;
const r = (p) => root + p;

const manifest = JSON.parse(await readFile(r('dist-extension/manifest.json'), 'utf8'));
const { key, ...storeManifest } = manifest;

const staging = r('release/store');
const zipPath = r(`release/buzzword-${manifest.version}.zip`);

await rm(staging, { recursive: true, force: true });
await mkdir(r('release'), { recursive: true });
await cp(r('dist-extension'), staging, { recursive: true });
await writeFile(`${staging}/manifest.json`, JSON.stringify(storeManifest, null, 2) + '\n');

if (existsSync(zipPath)) await rm(zipPath);
// Zip the folder's contents (not the folder), so manifest.json is at the top of the zip.
// -X leaves out macOS extra file attributes.
execFileSync('zip', ['-r', '-X', '-q', zipPath, '.'], { cwd: staging });
await rm(staging, { recursive: true, force: true });

console.log(`Packed release/buzzword-${manifest.version}.zip (manifest without "key").`);
const config = JSON.parse(await readFile(r('extension.config.json'), 'utf8'));
if (!config.webClientId) {
  console.warn(
    'Warning: no webClientId in extension.config.json, so Google sign-in will not work in this build.\n' +
    'Do not submit it for review.',
  );
}
