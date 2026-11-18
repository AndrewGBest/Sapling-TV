# Architecture

How the app is built since 0.2.0. For why, see `DESIGN.md` and the
2026-11-18 entries in `DECISIONS.md`. For how the engine itself works (the
window and its views, the navigation layer, profiles, the purchase guard,
permissions), read Longboard's `docs/ARCHITECTURE.md`; a copy is at
`node_modules/longboard/docs/` after `npm install`.

## What is whose

```
this repository                         Longboard, at the pinned commit
┌──────────────────────────────┐        ┌──────────────────────────────────────┐
│ src/main/index.ts  start-up  │ calls  │ src/main/browser.ts   window, views, │
│   opens the service          │ ─────▶ │   navigation rules, permissions,     │
│   ad blocking: left out      │        │   downloads, Home, menu, profiles    │
│   name, user-agent token     │        │ src/preload + src/layer   the layer  │
│ src/shared/about.ts  notice  │ ─swap▶ │ src/chrome   Home, menu, About panel │
│ profiles/tv.apple.com/       │ ─read▶ │ profile store, validator, matcher    │
└──────────────────────────────┘        └──────────────────────────────────────┘
```

- **Longboard arrives as source**, as the dev dependency
  `github:AndrewGBest/Longboard#<commit>`. Nothing of it is copied into this
  repository, and nothing in `node_modules/longboard` is edited.
- **`scripts/build.mjs`** makes the same three bundles Longboard's build
  makes: `dist/main.js` from this repository's `src/main/index.ts` (which
  imports Longboard's modules), and `dist/preload.js` and `dist/chrome.js`
  straight from Longboard's entry points. Everything is bundled, so the
  package has no runtime dependencies.
- **One substitution at build time.** Wherever Longboard imports its
  `shared/about` (the About panel's title, notice and background-requests
  text), the build answers with `src/shared/about.ts` from here. That file
  must export the same names; `test/about.test.ts` checks it, and the
  end-to-end run reads the panel.

## Start-up (`src/main/index.ts`)

The counterpart of Longboard's `src/main/index.ts`, kept as close to it as
possible so the two can be compared when the pin moves. It differs in this:

| | Longboard | Sapling TV |
|---|---|---|
| Opens at start | Home, or an address or app given on the command line | The service (`HOME_URL`), unless an address or app is given. `startTarget` in `src/shared/start.ts`, unit-tested |
| Ad blocking | A per-site switch; filter list fetched | Left out: `adBlock: { enabled: false }`, no filter store, nothing fetched (Hard rule 5) |
| Verified-sites list | Read for the switch's starting position | Not read |
| Built-in profiles | Longboard's `profiles/` | This repository's `profiles/` |
| User agent | Electron and `longboard/` tokens removed | Electron token and this app's own token removed (`browserUserAgent`, unit-tested and read in the end-to-end run) |
| Window title, terminal prefix | Longboard | Sapling TV, `[sapling-tv]` for this file's lines. Longboard's modules still say `[longboard]` |
| Data folder | `~/.config/Longboard` | `~/.config/sapling-tv` (from the package name) |

The same as Longboard: the single-instance lock, the wait for the Widevine
component before the first site is loaded, the daily catalogue fetch in a
cookie-less session of its own, `--dev`, `--automation`, `--zoom=`,
`--size=`, `--downloads=`, `--catalogue=`.

## What is still Longboard's name on screen

Home's heading, "Quit Longboard" in the menu, and wording inside questions
("shared with the rest of Longboard"). These are fixed text in Longboard's
screens. The About panel says that the app is built on Longboard.

An app added from the menu ("Add this site as an app") gets a desktop entry
whose file name starts with Longboard's app ID
(`io.github.andrewgbest.Longboard.app-<id>.desktop`), started with this
app's program. If Longboard itself is installed and has an app with the same
id, the two write the same file.

## The profile

`profiles/tv.apple.com/profile.json` is a Longboard format version 1 profile
(Longboard's `docs/PROFILES.md`). It is loaded as a built-in profile. The
same file is in the shared catalogue; a newer one there is downloaded and
wins over the built-in copy (catalogue before built-in, Longboard's order),
and a person's own profile in the data folder wins over both.

What it says, and the outline lines that back each selector, are in
`profiles/tv.apple.com/NOTES.md` and `outline.txt`.
`test/profile.test.ts` rebuilds the outlined pages and checks every selector.

## Testing

- **Unit tests** (`npm test`): the start target, the user agent, the About
  words, the profile against Longboard's validator, matcher and its outline.
- **End to end** (`npm run e2e`): the real app with `--automation` and a
  throw-away data folder against a made-up page: identity, nothing exposed to
  the page, the highlight moving, the purchase guard, no ad-blocking switch,
  the About panel, the built-in profile loaded, nothing fetched. The harness
  is Longboard's, copied, because Longboard's own resolves paths from its
  own folder.
- **Live walk** (`npm run live:walk`): the same harness on the live site,
  signed out. See `VM-SETUP.md`.
- The engine's behaviour is tested in Longboard (its unit tests and
  end-to-end scenarios), at the commit pinned here.

## Packaging

`electron-builder`, as before: AppImage, tarball, and a Flatpak bundle built
separately in CI. The package holds `dist/`, `profiles/`, `assets/` and
`package.json`.
