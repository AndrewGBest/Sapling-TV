# Status

Update this at the end of every working session. Newest first.

## 2026-11-17: session 1 (Debian 13 VM, KDE on X11, Canada)

The repository was created from Tropic Video 0.1.1 and pointed at the Apple
TV website. Andrew signed in by hand in the app's window part-way through.

### Changed

- Renamed throughout; own app ID (`io.github.andrewgbest.SaplingTV`) and data
  folder (`~/.config/sapling-tv`). Service names gathered in `src/shared/service.ts`.
- Navigation allowlist: exact hosts. Purchase guard wording for trials,
  offers, bundles, plans and redeeming. Non-affiliation notice in Apple's
  attribution form.
- Empty adapter, then revisions 1 and 2 from a live outline: shelf arrows and
  card menu buttons. New adapter key `notFocusable`.
- Shelves turn from the remote, and focus lands on the first card shown after
  the shelf stops scrolling.
- The navigator scrolls the box that scrolls the page when the window does not.
- The log names a refused address's scheme when it is not https.
- castLabs Electron pinned to 42.11.18 (see `DECISIONS.md`).
- New icon. Documentation rewritten for this service.

### Verified, and how

| Claim | Evidence |
|---|---|
| Checks pass | `npm run check` (193 unit tests, rule check) and `npm run e2e` (all steps), on Electron 44 and again on 42 |
| Widevine component installs | Log: version 4.10.3112.0 |
| The site accepts the shell | Signed-out and signed-in pages load; no unsupported-browser message; user agent and client hints say Chromium on Linux |
| **Protected playback works on Electron 42** | Spike report, signed in, an included episode: `encrypted`, `loadedmetadata`, `playing`, time 668 to 708 s over 40 s, MediaKeys attached, 862x360, no `video-error` |
| **Playback fails on Electron 44, and why** | Spike report: `video-error` 4, audio decoder initialisation failed. Chromium media diagnostics: audio track AC-3 / E-AC-3 5.1; FFmpeg decoder `kUnsupportedConfig` |
| Generic navigation on the signed-out landing and channel pages | `live:walk`: top bar, plan buttons, FAQ, down through shelves |
| Shelves turn | Live, signed out: a 21-card and a 16-card shelf walked end to end in both directions, focus on screen after every press |
| Purchase guard on the real buttons | Live, `--automation`: Enter on "Accept Free Trial" and "Bundle and Save" showed the blocked toast and opened nothing |
| A refused native-app link is logged with its scheme | Unit and e2e tests; live: "Open TV" refused |
| Focus scrolls into view on pages that scroll an inner box | Live, signed in: Up from the episode list to the play button brought the page to the top with the button visible |
| The icon renders | Rendered with Chromium and looked at |

### Not verified

- The picture and sound by eye or ear. The spike sees element state only.
- Any title other than one episode; films; live sports; any other storefront.
- Bare metal, a real TV, a physical remote or game controller.
- Packaging (AppImage, tarball, Flatpak) and the CI workflows: nothing has
  been built or pushed yet.
- Sleep inhibition, MPRIS, leaving-the-app pause: carried over from Tropic
  Video, not tried here.
- The player from the remote: its controls are custom elements with shadow
  roots, and whether the layer finds the playing video and the controls has
  not been checked.

### Found, not fixed

1. **Sign-in traps the remote.** The form is in a same-origin frame inside a
   modal dialog (with a further frame from the account host). Once focus is
   in the frame the layer hears no keys: arrows and Back do nothing; Ctrl+Q
   still quits. Design in `DESIGN.md` section 5.
2. **Profile picker** ("Who's Watching?"): the layer moved focus through the
   page behind it instead. Structure not inspected; possibly the same frame
   problem.
3. **Country banner covers the play button** when the storefront differs from
   where the viewer is. Closing it with its X works from the remote; it comes
   back on the next launch.
4. **Down from a title's description skips the play button** and goes to the
   episode list; Up reaches it.
5. On the signed-in channel page, after a mix of keys, focus once sat on a
   shelf title above the screen. Probably the scroller bug fixed later the
   same session; not re-checked.
6. The spike's video probes listen on the document; a video inside a shadow
   root would be missed. The player's video was seen by them this time.
7. A profile was selected on the picker during the session without a remote
   press from the agent (either Andrew, or Escape dismissing it). Unknown which.

### Next actions

1. Frames: make sign-in and the profile picker usable from a remote (items 1, 2).
2. Player: find the playing video and the site's controls from the remote;
   check play/pause and seek keys on this site's player.
3. The play button: items 3 and 4.
4. Andrew: decide on Electron 42 versus a current release with the shell
   narrowing the Dolby claims (`DECISIONS.md`).
5. Build the packages in CI once the repository is on GitHub.
