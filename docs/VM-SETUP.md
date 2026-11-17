# Continuing on the VM

How to pick this project up on a Linux machine that can reach the service.
Written for an AI agent working in a terminal there, and for Andrew.

## What the machine needs

- A Linux desktop session (Wayland or X11). A headless VM works for the
  fixture tests with `xvfb-run`, but protected playback and what the page looks
  like need a real or virtual display that can be viewed.
- Node.js 22 or newer, git, and network access to GitHub, the service and
  Google's component servers (the Widevine component downloads on first run).
- Audio output is optional for development.

Note for VMs: protected playback in a VM is **unverified**. If the spike fails
in the VM, repeat it on bare metal before concluding anything.

## First session checklist

1. `git clone` the repo, then `npm ci`.
2. `npm run check` and `xvfb-run -a npm run e2e` (or `npm run e2e` on a
   desktop). Both must pass before changing anything.
3. Read `CLAUDE.md`, then `docs/STATUS.md`.
4. Run the spike. Unlike Tropic Video's service, this site's signed-out
   pages load under `--automation`, so the agent can start
   `npm run spike -- --automation --dev --remote-debugging-port=9222` and
   Andrew signs in by hand in that window when it is on his screen.
   - Andrew signs in by hand. The agent does not type credentials, codes or
     the account email (Hard rule 9), and never chooses a profile.
   - Start any included title and let it run for a minute.
   - Quit with Ctrl+Q. The report path is printed in the terminal at start
     (under `~/.config/` in a folder named after the app).
5. Record the result in `docs/DECISIONS.md` and `docs/STATUS.md`.

## Reading the spike report

| Field | Good | Bad |
|---|---|---|
| `widevineComponent` | an object listing an installed component and version | an error string |
| `eme-access` event | `ok: true` | `ok: false` |
| `video` events | `playing` with a non-zero width and height, and later events with advancing `currentTime` | no `playing`, or only `waiting` |
| `video-error` events | none | any |

A site error message on screen with no `playing` event means the service
refused the shell: go to the fallback in `DECISIONS.md`.

## Driving the app as an agent

Always start with `--automation`. Example:

```
npx electron . --dev --automation --remote-debugging-port=9222
```

Then connect over the DevTools protocol as `test/e2e/fixture-smoke.mjs` does:
send key events with `Input.dispatchKeyEvent`, read state with
`Runtime.evaluate`, and take screenshots with `Page.captureScreenshot`.
Protected video will probably appear black in screenshots; judge playback from
the video element's `paused` and `currentTime` instead. This site puts parts
of its player inside shadow roots, so search them too when looking for the
video. When playback fails, Chromium's own media diagnostics (the DevTools
`Media` domain, the same data as `chrome://media-internals`) say which
decoder failed; that is how the Dolby audio problem was found.

To try another Electron version without risking the signed-in profile, copy
the user data folder to a scratch place and pass `--user-data-dir=<copy>`. An
older Chromium may not read a newer profile safely; never point one at the
real folder.

The signed-in profile lives in the app's user data folder and persists between
runs. Never copy it, commit it or print its contents.

## Walking a page with the remote

To check that a page works from a remote, start the app as above and run:

```
npm run live:walk -- ArrowDown 20
```

It presses the key that many times and prints where the focus ring went
after each press (tag, test id, position, scroll position; no titles or
text). Look for `NONE` (focus lost), `OFFSCREEN` (ring not visible), an early
stop (a trap) or a jump in the scroll position that skips part of the page.
Navigate to the page of interest first, walk it in all four directions, and
record what you find in `STATUS.md`. Session 2's findings came from exactly
this.

## Capturing page outlines for the adapter

1. Navigate to the page of interest (home, a title's detail page, search, the
   profile picker, the player with controls showing).
2. Press Ctrl+Shift+D. A file appears in `<user data>/diagnostics/`.
3. Read the outline. It holds tag names, structural attributes and lengths only.
   Confirm by eye that it has no titles or names before copying any of it.
4. Add selectors to `adapters/appletv.json` only for things the outline
   shows, bump `revision`, set `verified` to true, and add a trimmed copy of the
   outline to `test/fixtures/outlines/` with a test that the selector matches.

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
