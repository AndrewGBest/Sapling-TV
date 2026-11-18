# Sapling TV: working rules

Read this file at the start of every session, and re-read the Hard rules before
any commit. Then read `docs/STATUS.md` for where things stand.

Sapling TV is an unofficial, open-source app for watching Apple TV (the
streaming service, not the hardware) on Linux HTPCs from a remote or game
controller. The owner is Andrew (GitHub: AndrewGBest). Releases go out
through GitHub Releases.

Since 0.2.0 (2026-11-18) it is **an app built on Longboard**, Andrew's web
browser for TVs (github.com/AndrewGBest/Longboard). The window, the
navigation layer, the on-screen keyboard, the purchase guard, Home and the
menu are all Longboard's, built from its source at the commit pinned in
`package.json`. This repository holds only what makes it Sapling TV:

- `src/main/index.ts`: start-up. Opens the service, leaves ad blocking out;
- `src/shared/service.ts`, `src/shared/about.ts`: the name, the start
  address and the About panel's notice;
- `profiles/tv.apple.com/`: the Longboard profile for the service, shipped
  built in. The same file is in the shared catalogue
  (github.com/AndrewGBest/Longboard-Profiles); keep the two in step;
- the icon, the packaging and these documents.

**There is no navigation, input or layer code here.** A problem with how the
highlight moves, the keyboard, the player keys, frames or the guard is fixed
in Longboard, and arrives here by moving the pin. A problem with where
things are on the service's pages is fixed in the profile.

The earlier app (0.1.x, a copy of Tropic Video's tree with its own layer) is
in the history up to commit 25e5472.

## Hard rules

These are not style preferences. A change that breaks one does not ship, even
if asked for casually. If a request conflicts with a rule, stop and say so.
The reasoning for each is in `docs/LEGAL-GUARDRAILS.md`. They are Longboard's
rules (Andrew's decision, 2026-11-18), with this service's specifics and one
difference: rule 5.

1. **No third-party material in the repo.** No code, fonts, logos, artwork,
   sounds, screenshots or copied text from Apple or any other service. The
   Widevine library is never committed or bundled. Screenshots taken while
   developing stay in scratch folders and are never committed.
2. **DRM is left alone.** Protected playback goes through the browser's
   standard EME interface with the unmodified CDM. Never extract keys, patch or
   wrap the CDM, inspect or replay licence traffic, record or download streams,
   or work around a resolution or output restriction.
3. **Honest identity.** The user agent is the embedded Chromium's real one with
   only the shell's and the app's tokens removed. Never claim to be a TV,
   console, phone, another OS or another browser (including another Chromium
   brand). Never invent device IDs or serials. No user-agent switcher.
4. **The service is not altered.** No in-stream ad skipping, no region or VPN
   workarounds, no rewriting of the site's requests, responses, headers or
   scripts. The app adds its own UI and sends ordinary input; that is all. It
   never calls `play()`, `pause()` or sets `currentTime` on the site's video.
5. **No ad blocking in this app.** Longboard has a per-site ad-blocking
   switch; Sapling TV leaves the whole feature out: `adBlock.enabled` is
   `false` in `src/main/index.ts`, no filter list is fetched, no request is
   refused, and the menu shows no switch. Do not turn it on here.
6. **No trademarks in the name, app ID, icon or artwork.** "Apple", "Apple TV",
   "iTunes", the Apple logo and any image of an apple or other fruit stay out.
   Plain-text compatibility statements ("for watching Apple TV") are fine,
   always with the non-affiliation notice. The app must never present itself
   as the service's own.
7. **Profiles are data.** The built-in profile is a Longboard format version 1
   file: selectors, names and numbers. Never add a way for it to run script.
8. **Selectors come from evidence.** Nothing is added to
   `profiles/tv.apple.com/profile.json` without a page outline from the live
   site, in `outline.txt` beside it, showing it. Never guess a selector from
   memory. The site must still work, degraded, with no profile.
9. **No reverse engineering of the service's apps.** The only inputs are pages
   served to a browser. No decompiling TV, mobile or desktop apps.
10. **Credentials are the user's business.** Sign-in happens on the service's
    own page. Never read, log or store passwords, one-time codes or account
    email addresses. The on-screen keyboard may pass a person's own key picks
    to those fields; an agent or script never types them, and under
    `--automation` the keyboard stays out of secret fields. Never commit
    cookies, browsing data, HAR files, profile names or anything captured
    from a signed-in session.
11. **Automation never spends money.** Any agent- or script-driven run uses
    `--automation`, which blocks purchase, rental, subscription, trial and
    sign-up controls. Never disable or weaken the guard to get a test
    through. The harness in `test/e2e/harness.mjs` always adds the flag.
12. **Privacy by default.** No telemetry, analytics or crash upload. Outlines
    contain structure only and are written locally. The only background
    request is the daily download of the profile index from the
    Longboard-Profiles repository, disclosed in the About panel and switched
    off with `"catalogue": false`.
13. **Least privilege in the shell.** Longboard's settings stand as they are:
    `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`, no
    `contextBridge` API exposed to web pages, default-deny permissions (a
    site gets camera, microphone, location and the like only when the person
    says yes for that site), no click-through on certificate errors. This
    repository's start-up code adds no permission, request or certificate
    handler of its own. (Until 0.2.0 the window could open only the service's
    hosts. Longboard is a browser with a Home screen and an address tile, so
    that allowlist is gone: Andrew's decision, 2026-11-18.)
14. **Stay current.** The engine is Longboard at one exact commit, on the
    castLabs Electron version that commit uses. Move the pin to follow
    Longboard promptly; never run it on an older Electron to get a feature
    back (this includes the Dolby audio problem in `docs/STATUS.md`).

`npm run check` enforces the mechanical parts of these (see `scripts/check-rules.mjs`).
Passing it is necessary, not sufficient.

## How to work

- **Verify before claiming.** Run `npm run check` before every commit. Run
  `npm run e2e` (under `xvfb-run -a` if headless) after touching the start-up
  code, the build, the About words or the Longboard pin. Report results as they are, including
  failures. Do not chain a commit onto a check through a pipe that hides its
  exit code.
- **Say what is verified and what is not.** Anything not exercised against the
  live site is unverified; record it in `docs/STATUS.md`, not as done.
- **Test first for logic.** What the app opens at start and the identity it
  sends are pure (`src/shared/start.ts`) and must have unit tests for every
  change. The profile has a test for every selector against its outline.
- **Moving the Longboard pin.** Change the commit in `package.json`, set
  `electron` to the version that commit uses, `npm install`, then
  `npm run check`, `npm run e2e` and `npm run live:walk`. The typecheck is
  what catches a change in the Longboard modules the start-up code uses;
  compare `src/main/index.ts` with Longboard's own for anything new it does
  at start. Record the move in `docs/STATUS.md`.
- **Engine problems go to Longboard.** Do not patch `node_modules/longboard`
  or copy its files here to change them. Describe the problem for the
  Longboard repository; work around it here only in the profile.
- **Fixtures are invented.** Pages in `test/fixtures/` are made-up layouts.
  Outlines captured from the live site may be committed only after checking
  they contain no titles, names or IDs.
- **Sharing the window.** The live app may be on Andrew's screen while an agent
  drives it. Say what you are about to do, never change the profile, the
  storefront or account settings, and stop playback you started.
- **Small dependencies.** There are no runtime dependencies: everything is
  bundled at build time, including what Longboard brings. Dev dependencies
  should stay few; a new one needs a line in `docs/DECISIONS.md`.
- **Record decisions.** Any choice that a future session might re-argue goes in
  `docs/DECISIONS.md` with the date and the reason.
- **Keep STATUS current.** Update `docs/STATUS.md` at the end of each session:
  what changed, what was verified and how, what is next.
- **Commits.** Small, one purpose each, imperative subject line. Do not push to
  `main` once others contribute; use a branch and a pull request.
- **Sources.** Andrew wants claims backed by sources and guesses labelled as
  guesses. Apply that to docs, commit messages and reports.

## Map

| Path | What |
|---|---|
| `src/main/index.ts` | Start-up: the counterpart of Longboard's `src/main/index.ts` |
| `src/shared/` | `service.ts` names the service; `about.ts` is the About panel's words; `start.ts` is what opens at start and the user agent |
| `profiles/tv.apple.com/` | The built-in Longboard profile, its outline (the evidence) and notes |
| `node_modules/longboard/` | The engine, as source, at the pinned commit. Read it; never edit it |
| `scripts/` | Build (bundles Longboard's layer and screens) and rule checks |
| `test/` | Unit tests (vitest), an invented fixture, the DevTools-protocol harness, the live walk |
| `docs/` | Design, architecture, guardrails, roadmap, status, decisions, VM setup |

## Commands

```
npm run check        # typecheck + unit tests + build + rule checks
npm run e2e          # the real app against the local fixture, driven over the DevTools protocol
npm start            # dev window on the live site
npm run tv           # full screen
npm run live:walk    # signed-out walk of the live site with the built-in profile; see docs/VM-SETUP.md
```
