// usage: node stills.mjs 100 200 300  -> out/stills/f100.png ...
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import path from 'path';
import fs from 'fs';
const frames = process.argv.slice(2).map(Number);
const browserExecutable = '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const composition = await selectComposition({serveUrl, id: 'Trailer', browserExecutable});
fs.mkdirSync('out/stills', {recursive: true});
for (const frame of frames) {
  await renderStill({serveUrl, composition, frame, output: `out/stills/f${frame}.jpg`, imageFormat: 'jpeg', jpegQuality: 70, scale: 0.5, browserExecutable, chromiumOptions: {gl: 'swangle'}});
  console.log('ok', frame);
}
