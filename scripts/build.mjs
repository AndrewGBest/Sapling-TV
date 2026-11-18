// Bundles the entry points. The shell's start-up is this repository's; the
// page layer and the screens are Longboard's, built from the pinned copy in
// node_modules exactly as Longboard builds them, with one substitution: the
// About panel's words come from src/shared/about.ts here.
import { build } from 'esbuild';
import { mkdir, copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const LONGBOARD = 'node_modules/longboard/src';
const OWN_ABOUT = resolve('src/shared/about.ts');

/** Longboard's `shared/about` is answered with this app's, except when this app's file asks for Longboard's. */
const aboutWords = {
  name: 'about-words',
  setup(b) {
    b.onResolve({ filter: /(^|\/)shared\/about$/ }, (args) => (args.importer === OWN_ABOUT ? undefined : { path: OWN_ABOUT }));
  },
};

const common = {
  bundle: true,
  sourcemap: true,
  logLevel: 'info',
  target: 'es2022',
  plugins: [aboutWords],
};

await mkdir('dist', { recursive: true });

await build({
  ...common,
  entryPoints: ['src/main/index.ts'],
  outfile: 'dist/main.js',
  platform: 'node',
  format: 'cjs',
  external: ['electron'],
});

// The page view's preload (the layer) and the chrome view's (Home, the menu, About).
for (const [entry, outfile] of [[`${LONGBOARD}/preload/index.ts`, 'dist/preload.js'], [`${LONGBOARD}/chrome/index.ts`, 'dist/chrome.js']]) {
  await build({
    ...common,
    entryPoints: [entry],
    outfile,
    platform: 'browser',
    format: 'iife',
    external: ['electron'],
    loader: { '.css': 'text' },
  });
}

await copyFile(`${LONGBOARD}/layer/ui/tv.css`, 'dist/tv.css');
await copyFile(`${LONGBOARD}/chrome/chrome.html`, 'dist/chrome.html');
