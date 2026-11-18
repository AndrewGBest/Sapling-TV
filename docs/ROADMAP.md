# Roadmap

Each phase lists what "done" means. Tick items only when verified on this
service with this app, and note how in `STATUS.md`. The 0.1.x app's ticks
(its own layer, castLabs Electron 42) do not count here; they are in this
file's history.

Most of what is open is Longboard's to fix, not this repository's. Those
items are marked **(Longboard)**: the work here is to describe the problem
there, then move the pin and check.

## Phase 0: on Longboard

- [x] Start-up on Longboard's engine; opens the service; ad blocking left out
- [x] The service's profile, built in and in the shared catalogue
- [x] Own name, icon, data folder, user agent token and About notice
- [x] Unit tests, end-to-end run, rule checks; a signed-out live walk
- [x] Unpacked package starts

**Done when:** the branch is merged. Built 2026-11-18.

## Phase 1: play something

- [ ] **(Longboard)** The engine stops claiming Dolby audio it cannot decode on Linux (`DESIGN.md` section 3)
- [ ] Signed in, an included title plays: Andrew signs in; picture and sound judged by a person
- [ ] Why play asked for the account again on 2026-11-17 (`STATUS.md`)

**Done when:** a title plays in this app on a current engine.

## Phase 2: from the couch

- [ ] Sign in with the pointer and the on-screen keyboard (Andrew)
- [ ] **(Longboard)** A layer inside frames, so sign-in works with the highlight
- [ ] Remote coverage walk, signed in: home, a title page, search, a film, a channel, settings menus
- [ ] The player: play/pause, seek, the site's controls, subtitles and audio menus, next episode. Outline the player and add `player` to the profile if Longboard does not find it by itself
- [ ] Search: outline the search page; add `text.search` if needed
- [ ] Purchase controls: outline them and add `guard.purchase`, so a scripted run does not rely on wording alone
- [ ] The profile picker
- [ ] A real TV, a real remote, a game controller

**Done when:** sign in, then watch an episode and start the next one, from the couch.

## Phase 3: packaging and release

- [ ] AppImage, tarball and Flatpak bundle built in CI from this tree, and each started once
- [ ] **(Longboard)** App name as a setting, so Home and the menu do not say "Longboard"; desktop entries of added apps under this app's ID
- [ ] First pre-release
- [x] Original icon
- [ ] Lawyer review of `LEGAL-GUARDRAILS.md` before promoting the project

**Done when:** a clean install works on a fresh machine.

## Upkeep

- [ ] Move the Longboard pin with each Longboard release (`CLAUDE.md`, "Moving the Longboard pin")
- [ ] Keep `profiles/tv.apple.com/` and the catalogue's copy in step
