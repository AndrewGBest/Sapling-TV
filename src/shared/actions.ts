import type { ActionName } from './config';
import type { PlayerKey, TextKey } from './player-keys';

// Every input device is reduced to one of these actions before anything else
// sees it. Adding a device means writing a mapper to Action, nothing more.
export type Direction = 'up' | 'down' | 'left' | 'right';

export type Action =
  | { type: 'move'; dir: Direction }
  | { type: 'select' }
  | { type: 'back' }
  | { type: 'playPause' }
  | { type: 'seek'; seconds: number }
  | { type: 'search' }
  | { type: 'settings' }
  | { type: 'diagnostics' }
  | { type: 'exit' };

export type ActionType = Action['type'];

const DIRECTIONS: readonly string[] = ['up', 'down', 'left', 'right'];
const PLAIN_ACTIONS: readonly string[] = ['select', 'back', 'playPause', 'search', 'settings', 'diagnostics', 'exit'];

export function isDirection(value: unknown): value is Direction {
  return typeof value === 'string' && DIRECTIONS.includes(value);
}

/** Rebuilds an action that crossed a process boundary from its known fields only. Null when it is not one. */
export function sanitizeAction(raw: unknown): Action | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (r['type'] === 'move') return isDirection(r['dir']) ? { type: 'move', dir: r['dir'] } : null;
  if (r['type'] === 'seek') return typeof r['seconds'] === 'number' && Number.isFinite(r['seconds']) ? { type: 'seek', seconds: r['seconds'] } : null;
  if (typeof r['type'] === 'string' && PLAIN_ACTIONS.includes(r['type'])) return { type: r['type'] } as Action;
  return null;
}

/** Messages the page-side layer may send to the main process. Keep this list short. */
export type BridgeMessage =
  | { kind: 'exit' }
  | { kind: 'playback'; playing: boolean }
  | { kind: 'playerKey'; key: PlayerKey | TextKey }
  /** Ask the shell to type text into whatever has focus, as a keyboard would. */
  | { kind: 'typeText'; text: string }
  /** Ask the shell to move the pointer a little, which makes a site's player show its controls. */
  | { kind: 'revealControls' }
  /** Ask the shell to rest the pointer on a point of the page (CSS pixels), for menus that open on hover. */
  | { kind: 'hover'; x: number; y: number }
  | { kind: 'diagnostics'; outline: string; url: string }
  /** From a page whose keyboard focus is inside a frame: pass this action to the layer in the focused frame. */
  | { kind: 'relay'; action: Action }
  /** From a layer in a frame: focus ran out in this direction; the layer in the parent frame may take it. */
  | { kind: 'frameEdge'; dir: Direction }
  /** From a layer in a frame: Back did not get the user out; the parent frame takes focus and handles Back. */
  | { kind: 'leaveFrame' }
  | { kind: 'spike'; event: SpikeEvent };

export type SpikeEvent =
  | { name: 'eme-access'; ok: boolean; detail: string }
  | { name: 'video'; event: string; width: number; height: number; currentTime: number; protected: boolean }
  | { name: 'video-error'; code: number; message: string };

export interface LayerOptions {
  dev: boolean;
  automation: boolean;
  spike: boolean;
  /** True for a layer running inside a frame of the page (a sign-in form, say), not the page itself. */
  frame?: boolean;
  /** App version, shown on the About panel. */
  version?: string;
  /** Key mappings from the user's config file. */
  keys?: Record<string, ActionName>;
  /** Gamepad button mappings from the user's config file. */
  buttons?: Record<string, ActionName>;
}
