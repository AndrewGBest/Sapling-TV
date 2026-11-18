# Continuing on the VM

How to pick this project up on a Linux machine that can reach the service.
Written for an AI agent working in a terminal there, and for Andrew.

## What the machine needs

- A Linux desktop session (Wayland or X11). A headless VM works for the
  fixture tests with `xvfb-run`, but protected playback and what the page
  looks like need a real or virtual display that can be viewed.
- Node.js 22 or newer, git, and network access to GitHub (Longboard and
  Electron are fetched from there), the service and Google's component
  servers (the Widevine component downloads on first run).
- Audio output is optional for development.

Protected playback in a VM was seen once with the 0.1.x app. With this
build it is expected to fail anywhere until the Dolby audio problem is
fixed (`DESIGN.md` section 3).

## First session checklist

1. `git clone` the repo, then `npm ci`.
2. `npm run check` and `xvfb-run -a npm run e2e` (or `npm run e2e` on a
   desktop). Both must pass before changing anything.
3. Read `CLAUDE.md`, then `docs/STATUS.md`.
4. The engine's own documents are in `node_modules/longboard/docs/`. A
   checkout of Longboard and of Longboard-Profiles beside this one helps
   when a problem turns out to be the engine's or the profile's.

## Driving the app as an agent

Always with `--automation`. The harness adds it and gives the app a
throw-away data folder, so a run through it is signed out:

```
npm run live:walk
```

That opens a window, lets the app open the service by itself, presses arrow
keys and prints what it could see of the built-in profile at work (no titles
or text). Extend `test/live/walk.mjs` for another page; it uses
`test/e2e/harness.mjs`: `page.press`, `page.evaluate`, `page.focused`,
`app.chrome()` for Longboard's own screens. The highlight is on the element
carrying `data-longboard-focus`.

For a signed-in look, Andrew starts the app himself (`npm start`) and signs
in; an agent then joins with
`npx electron . --dev --automation --remote-debugging-port=9222` only when
he asks. The agent does not type credentials, codes or the account email
(Hard rule 10), and never chooses a profile.

Protected video will probably appear black in screenshots; judge playback
from the video element's `paused` and `currentTime`. This site puts parts of
its player inside shadow roots. When playback fails, Chromium's own media
diagnostics (the DevTools `Media` domain) say which decoder failed; that is
how the Dolby audio problem was found.

The signed-in data lives in `~/.config/sapling-tv` and persists between
runs. Never copy it into the repository, commit it or print its contents.

## Capturing page outlines for the profile

1. Navigate to the page of interest (home, a title's page, search, the
   profile picker, the player with controls showing).
2. Press Ctrl+Shift+D, or choose "Save page outline" in the menu. A file
   appears in `<data folder>/diagnostics/`.
3. Read the outline. It holds tag names, structural attributes and lengths
   only. Confirm by eye that it has no titles or names before copying any of
   it.
4. Add selectors to `profiles/tv.apple.com/profile.json` only for things the
   outline shows, raise `version`, add the trimmed outline as a new `####`
   page in `outline.txt`, add a test in `test/profile.test.ts` that the
   selector matches what it should, and say in `NOTES.md` what was tried.
5. Put the same three files in the Longboard-Profiles repository, run its
   `npm run index` and `npm run check`, and send them there too.

## Moving the Longboard pin

See `CLAUDE.md`, "Moving the Longboard pin".

## Sharing the window

The app window is on Andrew's desktop, and he may be looking at it or using
it while an agent drives it over DevTools. Before driving, say what you are
about to do. Stop any playback you start (it moves the account's resume
point). Never change the profile, the storefront banner's country, or
account settings.

## Things only Andrew does

- Signing in, and any two-step verification.
- Anything involving payment, rental, subscription or account settings.
- Judging picture quality and how it feels on a real TV with a real remote.
- Creating releases.
- Choosing a profile on the profile picker.
