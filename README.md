# Sapling TV

An unofficial app for watching Apple TV (the streaming service) on a Linux
HTPC, driven by a game controller, remote or keyboard. It is built on
[Longboard](https://github.com/AndrewGBest/Longboard), a web browser for TVs.

**Status: early development, not ready for everyday use.** Browsing the
service's pages with a remote-style keyboard works on the pages tried.
**Playing a protected title is expected to fail for now**: the browser engine
tells the site it can play Dolby audio that it cannot decode on Linux, and
the site's player then stops with an error. That is to be fixed in Longboard.
Signing in needs the on-screen pointer (F2), because the form sits in an
embedded frame. See [docs/STATUS.md](docs/STATUS.md) for exactly what has and
has not been checked.

> Sapling TV is an unofficial, independent project. It is not affiliated
> with, endorsed by or supported by Apple. Apple and Apple TV are trademarks
> of Apple Inc., registered in the U.S. and other countries and regions. An
> Apple Account and a subscription or purchase are required to watch.
> Sapling TV does not provide, unlock or bypass access to any content and
> does not remove or work around DRM.

## What it is

Longboard, started under its own name and pointed at one service:

- it opens the service's normal website straight away, enlarged for a TV;
- a highlight moves through the site's pages, shelves and menus with the
  arrows, using a small settings file (a Longboard *profile*) that says where
  things are on this site;
- an on-screen keyboard, an on-screen pointer for what the highlight cannot
  reach, and play, pause and seek sent to the site's player as ordinary key
  presses;
- its own data folder, so its sign-in is separate from any other browser's.

Everything else you see is Longboard: Back from the service's first page
shows Longboard's Home screen, and its menu can open any address. If you
already use Longboard, you do not need this app: the same profile is in
Longboard's shared catalogue, and "Add this site as an app" there does much
the same.

## What it is not

- Not the service's own TV app. It contains none of the service's artwork,
  logos, fonts or code.
- Not a way to get higher quality than a Linux browser gets. Linux browsers
  use a software-only DRM module and get a lower resolution; in testing with
  the earlier version of this app the picture was about 860 pixels wide.
- Not an ad blocker, downloader or region unlocker. Longboard's ad-blocking
  switch is left out of this app altogether.

## Controls

These are Longboard's.

| Button | Does |
|---|---|
| Arrows, D-pad | Move the highlight; scroll when there is nothing to move to |
| OK, Enter, A | Select. On a text field: bring up the on-screen keyboard |
| Back, Backspace, Escape, B | Back; Longboard's Home from the service's first page |
| Menu key, Ctrl+O, Start | The menu: Home, Back, Reload, zoom, pointer, the profile, About |
| F2, right stick click | Pointer mode on and off |
| Space, X | Play or pause |
| Left, Right, LB, RB on a video | Skip back or forward |
| / or Y | Go to the page's search field |
| Ctrl+Shift+D | Save a page outline for bug reports (structure only) |
| Ctrl+Q | Quit |

At the end of a shelf, Left or Right turns the shelf to show more.

## Installing

There is no release yet. Build it from source (below).

The app downloads the Widevine component from Google the first time it runs;
it is not included in the package. Playback needs that download to succeed.

## Building from source

Needs Node.js 22+ and git, on 64-bit Intel/AMD Linux.

```
git clone https://github.com/AndrewGBest/Sapling-TV.git
cd Sapling-TV
npm ci
npm run check     # typecheck, tests, build, rule checks
npm start         # opens a development window
npm run dist      # builds release/SaplingTV-x86_64.AppImage and a tarball
```

## Options

| Option | What it does |
|---|---|
| `--fullscreen` | Start fullscreen (it always does unless started with `--dev`). |
| `--zoom=<factor>` | Override the TV scale. The default fits the site to a 960x540 canvas: 2 on a 1080p screen. |
| `--url=<address>` | Open this address at start, not the service. |
| `--automation` | For scripted runs: blocks purchase, rental, trial, subscription and sign-up controls. |

## Settings and remapping keys

Create `config.json` in the app's data folder and restart. The folder is
`~/.config/sapling-tv/`, or
`~/.var/app/io.github.andrewgbest.SaplingTV/config/sapling-tv/` for the
Flatpak. The file is Longboard's:

```json
{
  "zoom": 2,
  "catalogue": false,
  "keys": { "MediaStop": "back", "F1": "search", "F9": "menu", "Ctrl+h": "none" },
  "buttons": { "8": "pointer", "9": "playPause" }
}
```

A key is the name the keyboard or remote sends (a `KeyboardEvent.key` value),
optionally with `Ctrl+` in front. Actions: `up`, `down`, `left`, `right`,
`select`, `back`, `playPause`, `seekBack`, `seekForward`, `search`, `menu`,
`pointer`, `quit`, and `none` to switch a built-in key off. `buttons` does the
same for a game controller, by button number in the browser's standard
layout. Mistakes in the file are reported in the terminal and ignored.
Longboard's `adBlocking` and `filterLists` settings do nothing here.

## Your account

Using any unofficial client is at your own risk. The service decides which
devices and apps it supports and may change that at any time.

## Privacy

No telemetry, no analytics, no crash upload. Besides the sites you open, the
app makes one request of its own: once a day it downloads the list of
reviewed website profiles from the
[Longboard-Profiles](https://github.com/AndrewGBest/Longboard-Profiles)
repository on GitHub, so a fix to the service's profile arrives without a
new release. The whole list is fetched, so it says nothing about what you
watch. `"catalogue": false` in `config.json` stops it. The page-outline file
made by Ctrl+Shift+D stays on your disk and contains page structure only (no
titles, names, links or text).

## Contributing

Read [CLAUDE.md](CLAUDE.md) first: its Hard rules apply to every contributor,
human or AI. Design and reasoning are in [docs/](docs/). How the highlight
moves, the keyboard, the player keys and the menus are Longboard's: report
and fix those [there](https://github.com/AndrewGBest/Longboard). Where
things are on the service's pages is the profile in `profiles/tv.apple.com/`.

## How it is made

The code is written with Claude Code, an AI coding agent, directed and tested
by the owner, who is responsible for what is released.

## Rights holders

If you represent a rights holder and have a concern, please open an issue on
this repository and it will be addressed promptly.

## Licence

GPL-3.0. See [LICENSE](LICENSE). You are free to use, study, share and change
this software; if you distribute a modified version, you must make its source
available under the same licence.

Longboard is GPL-3.0 as well and is built into the program from its source.
The profile in `profiles/` is also in the shared catalogue, where it is
CC0-1.0.

The licence covers the code, not the project's name. If you publish a fork,
please give it a different name so users can tell the two apart.
