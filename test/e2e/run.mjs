// End to end: the real app, started with --automation (Hard rule 11) and a
// throw-away data folder, against a made-up page served on this machine. It
// checks what is this app's own: that it is Longboard's engine under Sapling
// TV's name, identity and notice, with ad blocking left out. Longboard's own
// end-to-end run covers the engine itself.
//
//   npm run e2e            (xvfb-run -a npm run e2e when there is no display)
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { check, fail, failureCount, launch, root, serveFixtures, sleep, until } from './harness.mjs';

const version = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version;
const about = readFileSync(join(root, 'src/shared/about.ts'), 'utf8');
const server = await serveFixtures();
const app = await launch({ url: `${server.origin}/home.html` });
try {
  const page = await app.page(server.origin);
  if (!page) throw new Error('the page did not open');
  await until(() => page.evaluate('document.readyState'), (s) => s === 'complete');
  await sleep(600);

  // Identity (Hard rule 3).
  const ua = await page.evaluate('navigator.userAgent');
  check('the user agent names no shell and no app', /electron|sapling|longboard/i.test(ua), false);
  check('the user agent is a desktop Linux Chromium one', /^Mozilla\/5\.0 \(X11; Linux [^)]+\) AppleWebKit\/[\d.]+ \(KHTML, like Gecko\) Chrome\/[\d.]+ Safari\/[\d.]+$/.test(ua), true);

  // Least privilege (Hard rule 13): nothing of the app is visible to the page.
  check('the page sees no app or node objects', await page.evaluate('[typeof require, typeof process, typeof window.electron, typeof window.longboard].join()'), 'undefined,undefined,undefined,undefined');

  // The engine is there: the highlight moves along a row.
  await page.press('ArrowDown', 300);
  await page.press('ArrowDown', 300);
  const first = await page.focused();
  await page.press('ArrowRight', 300);
  check('the highlight moves from card to card', [first, await page.focused()], ['t1', 't2']);

  // Automation never spends money (Hard rule 11).
  await page.press('ArrowDown', 300);
  await page.press('ArrowLeft', 300);
  check('the highlight reaches the play button', await page.focused(), 'play');
  await page.press('Enter', 300);
  await page.press('ArrowRight', 300);
  check('and the trial button beside it', await page.focused(), 'trial');
  await page.press('Enter', 400);
  check('a trial button is not pressed in automation mode', [await page.evaluate('__clicks'), await page.toastText()], [['play'], 'Blocked: automation mode never activates purchase or sign-up controls']);

  // The menu: no ad-blocking switch, and About is Sapling TV's.
  const chrome = await app.chrome();
  await page.press('ContextMenu', 600);
  check('the menu opens', await chrome.focused(), 'menu-home');
  check('there is no ad-blocking switch', await chrome.evaluate('document.getElementById("menu-adblock")'), null);
  for (let i = 0; i < 30 && (await chrome.focused()) !== 'menu-about'; i++) await chrome.press('ArrowDown');
  await chrome.press('Enter', 500);
  const shown = await chrome.evaluate('[document.querySelector("h1")?.textContent, ...[...document.querySelectorAll("p")].map((p) => p.textContent)]');
  check('About is titled with the app and its version', shown[0], `Sapling TV ${version}`);
  check('About carries the non-affiliation notice', shown.some((t) => t.startsWith('Sapling TV is an unofficial, independent project. It is not affiliated with, endorsed by or supported by Apple.')), true);
  check('About says ad blocking is left out and names the one background download', shown.some((t) => t.includes('Ad blocking is left out') && t.includes('Longboard-Profiles')), true);
  check("About does not carry the browser's own notice", shown.some((t) => t.startsWith('Longboard is an independent project')), false);
  check('the source of those words is this repository', about.includes('Ad blocking is left out'), true);

  // The terminal: the built-in profile was read, and nothing was fetched or refused.
  check('the built-in profile is loaded', /\[sapling-tv\] profiles: 1\b/.test(app.log), true);
  check('no filter list and no catalogue is fetched in a scripted run', /easylist|filter list|catalogue/i.test(app.log), false);
} catch (err) {
  fail(`the run stopped: ${String(err).slice(0, 300)}`);
  console.log(app.log.slice(-2000));
}
await app.close();
server.close();
console.log(failureCount() ? `\n${failureCount()} check(s) failed` : '\nAll end-to-end checks passed');
process.exit(failureCount() ? 1 : 0);
