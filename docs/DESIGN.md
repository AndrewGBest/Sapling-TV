# Sapling TV: design notes

18 November 2026. Labels: **[Seen]** observed on the live site, with the
date and which build; **[Sourced]** read in a source listed at the end;
**[Guess]** reasoning with no source.

## 1. What it is now

Sapling TV 0.2.0 is Longboard (github.com/AndrewGBest/Longboard, Andrew's
browser for TVs) started under its own name and pointed at one service, with
that service's profile built in and ad blocking left out. Longboard's
`docs/DESIGN.md` is the design; this document records only what is specific
to this service and this app.

The 0.1.x app was a copy of Tropic Video's tree with its own navigation
layer. Its design notes are in this file's history (commit 25e5472). What
it learned about the service is carried over below, marked with the build it
was seen on, because **none of it has been seen again on Longboard's engine
unless it says so**.

## 2. Why an app at all, when Longboard has the profile

Longboard's own answer to "an app per service" is a profile plus "Add this
site as an app". Sapling TV exists beside that for people who want one thing
in the TV's app list that opens straight on the service, without setting up a
browser first: its own name and icon, its own data folder and sign-in, the
profile already there, the non-affiliation notice for this service in About,
and no ad-blocking switch. (Andrew asked for both forms on 2026-11-18.)

What it does not do is hide the browser: Back from the service's first page
shows Longboard's Home, and the menu opens any address. A locked single-site
mode would have to be a Longboard feature; Andrew chose not to ask for one
(`DECISIONS.md`, 2026-11-18).

## 3. Dolby audio and the Electron version

castLabs turned on Chromium's `enable_platform_ac3_eac3_audio` build flag
starting with v43.0.0-alpha.1 **[Sourced: castlabs/electron-releases#221]**.
The flag makes the browser report AC-3 and E-AC-3 as supported and hands them
to a platform decoder; Linux has none, which castLabs' own engineer noted in
the same issue. On this site that matters: the site believes the browser,
serves Dolby audio, the audio decoder fails (`DECODER_ERROR_NOT_SUPPORTED`,
FFmpeg `kUnsupportedConfig`) and the player shows a generic error **[Seen,
2026-11-17, the 0.1.x app on castLabs 44.10.1]**.

castLabs 42.11.18 predates the flag, reports both codecs as unsupported, gets
AAC from the site, and played **[Seen, 2026-11-17, the 0.1.x app]**.

Longboard's engine, castLabs 45.2.1 (Chromium 156), still makes the claim:
`MediaSource.isTypeSupported`, `canPlayType` and Media Capabilities all say
yes to `ac-3` and `ec-3` **[Seen, 2026-11-18, this app, on a local page]**.
Playback on 45 was not tried, so that it fails is an expectation, not an
observation.

Sapling TV 0.2.0 ships on 45 all the same (Andrew, 2026-11-18): the fix
belongs in Longboard, and the app follows Longboard's engine (Hard rule 14).
Until then, expect the site's "An Error Occurred" on protected titles.

## 4. Remote navigation on this site

**[Seen, 2026-11-18, this app, signed out, United States storefront, by
script]**: Down from the top reaches the first shelf; Right along a shelf
turns it at the end and lands on the first card shown; the highlight never
rests on a card's "more" button; OK on a card opens its page; the first key
on a title's page lands on its main button.

The profile's three parts, each from an outline of the live site:

- **Shelf arrows** (`focus.scrollPrevious`, `focus.scrollNext`): cards past
  the first screenful are placeholders until the shelf is turned.
- **Cards' "more" buttons** (`focus.exclude`): they took every second Right
  press. Cost: a card's menu is not reachable from a shelf with the
  highlight; the pointer can still press it.
- **First highlight on a title page** (`focus.initial`): Down from the
  description otherwise skipped the main button for the episode row.

## 5. Signing in

The site's sign-in form is in a frame from the account host, inside a
same-origin frame in a pop-up **[Seen, 2026-11-17, the 0.1.x app]**.
Longboard runs no layer inside embedded frames: the highlight can rest on a
frame, and OK there starts pointer mode on it (Longboard's `DECISIONS.md`).
So signing in here means the on-screen pointer plus the on-screen keyboard,
or a real keyboard and mouse. **Not tried on this site with Longboard.**

The 0.1.x app ran a layer in every frame and its first sign-in step worked
from the remote (its `DECISIONS.md` entry of 2026-11-17, kept in this
repository). That code is in the history (commit e5ca098) and could be
offered to Longboard, where frames are on the roadmap under "Later".

## 6. Picture quality

About 862x360 on an included episode **[Seen, 2026-11-17, the 0.1.x app on
castLabs 42]**. Linux browsers have the software-only DRM module. Nothing
here tries to change that (Hard rules 2 and 3).

## Sources

- castLabs Electron, issue 221: https://github.com/castlabs/electron-releases/issues/221
- Longboard: https://github.com/AndrewGBest/Longboard
- Tropic Video design study: https://github.com/AndrewGBest/Tropic-Video/blob/main/docs/DESIGN.md
