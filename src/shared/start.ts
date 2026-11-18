// What the app opens when it starts, and the identity it sends. Pure, so the
// rules are unit-tested.
import { resolveAddress } from 'longboard/src/shared/address';
import { HOME_URL } from './service';

export type StartTarget = { app: string } | { url: string };

/**
 * `args` is the command line without the program. An address given there
 * (`--url=` or a bare http/https address) wins, then an app added from the
 * menu (`--app=<id>`, which is what its entry in the TV's app list passes),
 * and with neither the service's own website. Unlike Longboard, this app
 * never starts on Home.
 */
export function startTarget(args: readonly string[], search?: string): StartTarget {
  const given = args.find((a) => a.startsWith('--url='))?.slice(6) || args.find((a) => /^https?:\/\//i.test(a));
  const address = given ? resolveAddress(given, search) : null;
  if (address) return { url: address };
  const app = args.find((a) => a.startsWith('--app='))?.slice(6);
  if (app) return { app };
  return { url: HOME_URL };
}

/**
 * The browser identity we send: the embedded Chromium's own user agent with
 * the Electron token and the app's own token removed. It states the real
 * engine, the real version and the real OS. It never claims to be a TV,
 * console or other OS, and there is no way to switch it (Hard rule 3).
 * `appName` is the name the shell put in its token (the package's name).
 */
export function browserUserAgent(defaultUa: string, appName: string): string {
  const own = appName.replace(/\s+/g, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let ua = defaultUa.replace(/\s?Electron\/\S+/g, '').replace(/\s?longboard\/\S+/gi, '');
  if (own) ua = ua.replace(new RegExp(`\\s?${own}/\\S+`, 'gi'), '');
  return ua.replace(/\s{2,}/g, ' ').trim();
}
