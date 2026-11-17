// Sandboxed preload. The whole TV layer runs here, in the isolated world.
// Nothing is exposed to the page: there is no contextBridge API, so site
// scripts cannot call into the app.
import { ipcRenderer } from 'electron';
import { sanitizeAction, type BridgeMessage, type LayerOptions } from '../shared/actions';
import { parseAdapter } from '../layer/adapter/adapter';
import { startLayer, type Layer } from '../layer/index';

const ARG_PREFIX = '--sapling-boot=';

function readBoot(): { options: LayerOptions; adapter: unknown } | null {
  // A frame from another site runs in its own process, which may not have
  // been given the argument; it asks the shell instead. Without an answer
  // the layer must not start: the fallback has the automation guard off.
  const raw = process.argv.find((a) => a.startsWith(ARG_PREFIX)) ?? (ipcRenderer.sendSync('sapling:boot') as string | undefined);
  if (!raw) return null;
  try {
    return JSON.parse(decodeURIComponent(raw.replace(ARG_PREFIX, ''))) as { options: LayerOptions; adapter: unknown };
  } catch {
    return null;
  }
}

const boot = readBoot();
const send = (msg: BridgeMessage): void => ipcRenderer.send('sapling:msg', msg);

let layer: Layer | undefined;

// From the shell to the layer: a line of text to show. It arrives in
// the isolated world; the page's own scripts never see it.
ipcRenderer.on('sapling:notice', (_event, text: unknown) => {
  if (typeof text === 'string') layer?.notice(text.slice(0, 200));
});

// The window is no longer the one in front.
ipcRenderer.on('sapling:away', () => layer?.away());

// From the shell: a game-controller press made while the keys were in this frame.
ipcRenderer.on('sapling:action', (_event, raw: unknown) => {
  const action = sanitizeAction(raw);
  if (action) layer?.dispatch(action);
});
// From the shell, on behalf of the layer in a frame of this document.
ipcRenderer.on('sapling:frameEdge', (_event, dir: unknown) => layer?.frameEdge(dir));
ipcRenderer.on('sapling:leaveFrame', () => layer?.leaveFrame());

const start = (): void => {
  // Every frame gets its own layer (a sign-in form lives in one). Each runs
  // in its own isolated world and handles the keys while its frame has them.
  if (!boot) return;
  const framed = window.top !== window;
  layer = startLayer({
    doc: document,
    options: { ...boot.options, frame: framed },
    adapter: parseAdapter(boot.adapter, document),
    send,
  });
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start, { once: true });
} else {
  start();
}
