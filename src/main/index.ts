// Main process: start-up. Sapling TV is the Longboard browser started under
// its own name, pointed at one service. The window, its views, the layer and
// every screen are Longboard's (`longboard/src/...`, pinned in package.json);
// this file is the counterpart of Longboard's `src/main/index.ts`, and differs
// from it in four ways:
//
//   - it opens the service's website, never Home, unless told otherwise;
//   - ad blocking is left out altogether (Hard rule 5): no filter list is
//     fetched and no request is refused;
//   - the profile for the service ships in `profiles/`;
//   - the name, the data folder and the token taken out of the user agent
//     are this app's.
import { app, session } from 'electron';
import * as electron from 'electron';
import { join } from 'node:path';
import { parseConfig, type UserConfig } from 'longboard/src/shared/config';
import { DEFAULT_INDEX_URL } from 'longboard/src/shared/catalogue';
import { createBrowser } from 'longboard/src/main/browser';
import { refreshCatalogue } from 'longboard/src/main/catalogue';
import { ProfileStore } from 'longboard/src/main/profiles';
import { readJson } from 'longboard/src/main/store';
import { APP_NAME, LOG_PREFIX } from '../shared/service';
import { browserUserAgent, startTarget } from '../shared/start';

const argv = process.argv.slice(1);
const flag = (name: string): boolean => argv.includes(`--${name}`);
const value = (name: string): string | undefined =>
  argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);

const options = {
  dev: flag('dev'),
  automation: flag('automation'),
};

// castLabs builds add `components` (the Widevine component updater). Stock
// Electron lacks it, and then protected playback cannot work.
interface Components {
  whenReady(): Promise<unknown>;
  status(): unknown;
}
const components = (electron as unknown as { components?: Components }).components;

/** Reads <user data>/config.json. A missing file is normal; a broken one is reported and ignored. */
function loadConfig(): UserConfig {
  const raw = readJson(join(app.getPath('userData'), 'config.json'), (why) => console.error(`${LOG_PREFIX} config.json could not be read: ${why}`));
  const { config, problems } = parseConfig(raw);
  for (const problem of problems) console.error(`${LOG_PREFIX} config.json: ${problem}`);
  return config;
}

async function main(): Promise<void> {
  if (!app.requestSingleInstanceLock()) {
    app.quit();
    return;
  }

  // Before the browser starts: its switches cannot be changed afterwards.
  const config = loadConfig();
  if (config.hardwareDecode) {
    // Chromium's own switches for decoding video on the graphics chip on
    // Linux, which it does not promise to support. Off unless asked for.
    app.commandLine.appendSwitch('enable-features', 'AcceleratedVideoDecodeLinuxGL,AcceleratedVideoDecodeLinuxZeroCopyGL');
  }

  await app.whenReady();
  // Said once in the terminal, so "is the graphics chip decoding?" has an answer.
  void app
    .getGPUInfo('basic')
    .then(() => {
      const status = app.getGPUFeatureStatus() as unknown as Record<string, string>;
      console.log(`${LOG_PREFIX} video decode: ${status['video_decode'] ?? 'unknown'}${config.hardwareDecode ? ' (hardwareDecode is on)' : ''}`);
    })
    .catch(() => undefined);
  app.userAgentFallback = browserUserAgent(app.userAgentFallback, app.getName());

  // Nothing but Longboard's views is ever created; a page cannot embed another browser.
  app.on('web-contents-created', (_e, contents) => {
    contents.on('will-attach-webview', (event) => event.preventDefault());
  });

  const data = app.getPath('userData');
  const profiles = new ProfileStore({
    builtin: join(app.getAppPath(), 'profiles'),
    catalogue: join(data, 'catalogue'),
    local: join(data, 'profiles'),
    imported: join(data, 'imported'),
    exports: join(data, 'exports'),
    answers: join(data, 'imported-answers.json'),
  });
  console.log(`${LOG_PREFIX} profiles: ${profiles.count}`);

  // The window opens before the component is ready, never after: on a first
  // run the component is a download, and a slow one must not look like an
  // app that did not start. If it is still not ready after a while the site
  // is loaded anyway, and the terminal says what is missing.
  const COMPONENT_WAIT_MS = 45_000;
  const componentsReady = (async (): Promise<void> => {
    let widevine: unknown = 'unavailable: not a castLabs Electron build';
    if (components) {
      try {
        const timedOut = await Promise.race([
          components.whenReady().then(() => false),
          new Promise<boolean>((resolve) => setTimeout(() => resolve(true), COMPONENT_WAIT_MS)),
        ]);
        widevine = timedOut ? `not ready after ${COMPONENT_WAIT_MS / 1000} seconds; protected playback may fail` : components.status();
      } catch (err) {
        widevine = `component error: ${String(err)}`;
      }
    }
    console.log(`${LOG_PREFIX} widevine component:`, JSON.stringify(widevine));
  })();

  const start = startTarget(argv, config.search);
  const browser = createBrowser({
    options,
    config,
    startUrl: 'url' in start ? start.url : null,
    startApp: 'app' in start ? start.app : null,
    // Windowed while developing, so the desktop stays reachable.
    fullscreen: flag('fullscreen') || !options.dev,
    downloads: value('downloads') || app.getPath('downloads'),
    zoomOverride: value('zoom'),
    size: /^\d{3,5}x\d{3,5}$/.test(value('size') ?? '') ? (value('size') as string).split('x').map(Number) as [number, number] : undefined,
    ready: componentsReady,
    profiles,
    // Left out: Longboard then shows no switch, and nothing is ever refused.
    adBlock: { enabled: false, filters: () => null, verified: () => [] },
  });
  const { win } = browser;
  win.setTitle(APP_NAME);

  // The reviewed catalogue, in the background and never in the way of
  // starting: a fix to the service's profile arrives without a new release.
  // Its own session, kept in memory: no cookies go out and none are kept. A
  // scripted run does not fetch it unless pointed at a catalogue of its own.
  const fetcher = session.fromPartition('longboard-catalogue');
  const fetchBytes = async (url: string, maxBytes: number): Promise<Buffer> => {
    const response = await fetcher.fetch(url, { credentials: 'omit', cache: 'no-store', redirect: 'error' });
    if (!response.ok) throw new Error(`${response.status} for ${new URL(url).pathname}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > maxBytes) throw new Error(`${new URL(url).pathname} is larger than expected`);
    return bytes;
  };
  if (config.catalogue !== false && (!options.automation || value('catalogue'))) {
    void refreshCatalogue(
      { folder: join(data, 'catalogue'), indexUrl: value('catalogue') ?? DEFAULT_INDEX_URL, now: () => Date.now(), note: (line) => console.log(`${LOG_PREFIX} ${line}`), fetchBytes },
      value('catalogue') !== undefined,
    ).then((changed) => {
      if (changed) profiles.load();
    });
  }

  // Started again while already running: the window comes forward, and opens
  // what was asked for if anything was.
  app.on('second-instance', (_event, args) => {
    if (win.isMinimized()) win.restore();
    win.focus();
    const rest = args.slice(1);
    if (!rest.some((a) => a.startsWith('--url=') || a.startsWith('--app=') || /^https?:\/\//i.test(a))) return;
    const wanted = startTarget(rest, config.search);
    if ('app' in wanted) browser.openApp(wanted.app);
    else browser.openAddress(wanted.url);
  });
  app.on('window-all-closed', () => app.quit());
}

void main();
