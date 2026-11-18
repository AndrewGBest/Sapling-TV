// A walk of the live site in the real app: signed out (a throw-away data
// folder), --automation (Hard rule 11), key presses only. It reports what a
// script can see of the built-in profile at work, with none of the page's
// words: which profile the menu names, whether Right turns a shelf past its
// first screenful, whether the highlight ever rests on a card's "more"
// button, and where the first key lands on a title's page.
//
//   npm run live:walk
//
// It opens a window on the current display. It plays nothing and signs in to
// nothing. Anything it prints is about structure; still, do not commit its
// output without reading it.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch, root, sleep, until } from '../e2e/harness.mjs';

const profile = JSON.parse(readFileSync(join(root, 'profiles/tv.apple.com/profile.json'), 'utf8'));
const HOME = 'https://tv.apple.com';
const STATE = `(() => {
  const f = document.querySelector('[data-longboard-focus]');
  const r = f?.getBoundingClientRect();
  return {
    focus: f ? f.tagName.toLowerCase() + (f.getAttribute('data-testid') ? '[' + f.getAttribute('data-testid') + ']' : '') : null,
    x: r ? Math.round(r.left) : null,
    inShelf: !!f?.closest('[data-testid="shelf-component"]'),
    item: f?.closest('li[data-test-id]')?.getAttribute('data-test-id')?.replace('shelf-grid-list-item-', '') ?? null,
    onMore: !!f?.closest('[data-testid="lockup-context-menu"]'),
  };
})()`;
let failed = 0;
const say = (ok, what, detail = '') => {
  if (!ok) failed += 1;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}${detail ? `: ${detail}` : ''}`);
};

// The real TV scale: a 1920x1080 window drawn at 960x540. No address: the app opens the service by itself.
const app = await launch({ args: ['--zoom=2'], width: 1920, height: 1080 });
try {
  const page = await app.page(HOME, 200);
  if (!page) throw new Error('the site did not open');
  say(true, 'with no address given, the app opened the service');
  await until(() => page.evaluate('document.readyState'), (s) => s === 'complete', 150, 200);
  await sleep(6000);

  let st;
  for (let i = 0; i < 12; i++) {
    await page.press('ArrowDown', 900);
    st = await page.evaluate(STATE);
    if (st.inShelf) break;
  }
  say(st.inShelf, 'Down reaches a card in a shelf', JSON.stringify(st));
  const seen = [];
  let onMore = st.onMore;
  for (let i = 0; i < 14; i++) {
    await page.press('ArrowRight', 1100);
    st = await page.evaluate(STATE);
    seen.push(Number(st.item));
    onMore ||= st.onMore;
  }
  say(Math.max(...seen) >= 8, 'Right turns the shelf past its first screenful', `cards ${seen.join(' ')}`);
  say(!onMore, 'the highlight never rests on a card\'s "more" button');

  const before = await page.evaluate('location.pathname');
  await page.press('Enter', 500);
  const after = await until(() => page.evaluate('location.pathname'), (p) => p !== before, 60, 200);
  say(after !== before, 'OK on a card opens its page');
  await sleep(6000);
  await page.press('ArrowDown', 900);
  say(await page.evaluate(`!!document.querySelector('[data-longboard-focus]')?.matches(${JSON.stringify(profile.focus.initial)})`), "the first key on a title's page lands on its main button");

  const chrome = await app.chrome();
  await page.press('ContextMenu', 800);
  const menu = (await chrome.evaluate('document.body.innerText')).split('\n');
  say(menu.some((l) => l.includes(`Profile: ${profile.name}`)), 'the menu names the profile in use', menu.find((l) => l.startsWith('Profile:')) ?? 'no profile line');
  say(!menu.some((l) => /ad blocking/i.test(l)), 'the menu has no ad-blocking switch');
  await page.press('ContextMenu', 400);
} catch (err) {
  say(false, 'the walk stopped', String(err).slice(0, 300));
  console.log(app.log.split('\n').filter((l) => /\[(sapling-tv|longboard)\]/.test(l)).slice(-12).join('\n'));
}
await app.close();
process.exit(failed ? 1 : 0);
