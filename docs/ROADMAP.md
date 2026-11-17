# Roadmap

Each phase lists what "done" means. Tick items only when verified on this
service, and note how in `STATUS.md`. Much of the layer came from Tropic
Video, where it was verified against another site; that does not count here
until it is seen working on this one.

## Phase 0: playback spike (blocks everything else)

- [x] Load the site in the shell, signed out and signed in
- [x] Sign in by hand and play an included title; read `spike-report.json`
- [x] Record the outcome in `DECISIONS.md` (plays on castLabs Electron 42; fails on 44 for Dolby audio)

**Done when:** a title plays in the shell. Done 2026-11-17, in a VM.

## Phase 1: navigable shell

- [x] Spatial navigation, input, focus ring, allowlists, guard, diagnostics (inherited)
- [x] Capture an outline from the live site and write the first adapter revision
- [x] Shelves turn from the remote
- [x] Focus scrolls into view on pages that scroll an inner box
- [ ] Remote coverage walk, signed in: home, a title page, search, a film, a channel, settings menus
- [ ] The play button: not under the country banner; reached by Down from the description
- [ ] Profile picker from the remote (choosing a profile is Andrew's to try)
- [ ] TV scaling tuned on a real 1080p TV

**Done when:** home → title → play using only a controller, on the live site.

## Phase 2: frames, player and text entry

- [ ] Same-origin frames: a second layer instance follows focus into them
- [ ] Cross-origin frames: arrows become Tab, Back always gets out
- [ ] Sign in with only a remote (Andrew)
- [ ] Player: find the playing video and the site's controls (custom elements with shadow roots)
- [ ] Play/pause and seek keys on this site's player
- [ ] Subtitles and audio menus from the remote
- [ ] Next episode from the couch
- [ ] On-screen keyboard for search on this site

**Done when:** sign in, then watch an episode and start the next one, from the couch.

## Phase 3: HTPC polish

- [ ] Config file, remapping, sleep inhibition, MPRIS, leaving-the-app pause: inherited, check here
- [ ] Hardware decode flags
- [ ] About panel shows this project's notice (wording done; panel not looked at)

**Done when:** it runs for a week as the daily driver on one HTPC.

## Phase 4: packaging and release

- [ ] Repository on GitHub; CI green
- [ ] AppImage, tarball and Flatpak bundle built in CI and launched once
- [ ] First pre-release
- [x] Original icon
- [ ] Lawyer review of `LEGAL-GUARDRAILS.md` before promoting the project

**Done when:** a clean install works on a fresh machine.

## Phase 5: upkeep

- [x] Live-site walk tool (`npm run live:walk`)
- [ ] Shared layer: decide whether to extract it into a package used by both apps
- [ ] Issue template for "the site changed" reports (inherited; check wording)
