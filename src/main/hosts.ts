// Which sites the window may navigate to. The app is a front end for one
// service; anything else is refused rather than opened.
//
// The vendor's domain also carries its shop, app store and other services, so
// whole-domain matching would let the window wander into a store. Only these
// exact hosts are accepted.
const SERVICE_HOSTS = new Set(['tv.apple.com']);

// Sign-in and account recovery pages. The service normally signs in inside a
// frame on its own page (frames are not governed by this list); these cover a
// sign-in or recovery step that takes over the whole window. **[Guess]** until
// seen on the live site: which of these the service actually navigates to.
const ACCOUNT_HOSTS = new Set(['idmsa.apple.com', 'appleid.apple.com', 'account.apple.com', 'iforgot.apple.com']);

export function isAllowedUrl(raw: string, opts: { dev: boolean } = { dev: false }): boolean {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  if (opts.dev) {
    if (u.protocol === 'file:') return true;
    if (u.protocol === 'http:' && (u.hostname === 'localhost' || u.hostname === '127.0.0.1')) return true;
  }
  if (u.protocol !== 'https:') return false;
  if (u.username || u.password) return false;
  const host = u.hostname.toLowerCase();
  return SERVICE_HOSTS.has(host) || ACCOUNT_HOSTS.has(host);
}

/**
 * The browser identity we send: the embedded Chromium's own user agent with
 * the Electron and app tokens removed. It states the real engine, the real
 * version and the real OS. It never claims to be a TV, console or other OS.
 */
export function browserUserAgent(defaultUa: string): string {
  return defaultUa
    .replace(/\s?Electron\/\S+/g, '')
    .replace(/\s?sapling-tv\/\S+/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
