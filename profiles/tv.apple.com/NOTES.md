# Apple TV

Converted on 2026-11-18 from the site adapter of Sapling TV (revision 3), a
single-site app that came before this profile. Everything the adapter said
has a place in the format; nothing had to be added to it.

Independent work. Not affiliated with, endorsed by or supported by Apple.
Apple and Apple TV are trademarks of Apple Inc. The site's name is used only
to say which website this file is for.

## What it says

| In the profile | What it is for |
|---|---|
| `match.hosts` | The website, and only it: the same company's other sites are not covered. Sign-in happens in a frame from another domain, which the profile does not reach |
| `focus.scrollPrevious`, `focus.scrollNext` | The arrows of each shelf of cards. Cards past the first screenful are placeholders until the shelf is turned, so the arrow is pressed when left or right runs out; never highlighted |
| `focus.exclude` | The small "more" button on each card. It opens a menu and sat between every two cards; the card itself is still selectable |
| `focus.initial` | The main button of a title's page (the one that plays), so the first key press lands there and not on the "more" link of the description |

There is no `player`, `text` or `guard` section: the player, the search page
and the purchase controls have not been captured in an outline, so nothing is
said about them (no guesses). Longboard works those out by itself.

## Evidence

`outline.txt` holds the trimmed page outlines that show each selector:
a shelf from a channel page (signed out) and the buttons of a title's page
(signed in), both captured on 2026-11-17 in the Canadian storefront.

## What was tested

- With Sapling TV, on the live site, on a Debian 13 virtual machine driven by
  a script sending key presses (2026-11-17): shelves turn, the highlight
  lands on the first card shown, and the first key on a title page lands on
  the play button.
- With Longboard (commit 304caf9), on the live site, **signed out**, on the
  same machine, by a script sending key presses, 2026-11-18, United States
  storefront, a 1920x1080 window drawn at 960x540:
  - the menu named the profile as the one in use;
  - on the home page, Right along a shelf went past the first screenful
    twice (cards 0 to 11), each time landing on the first card shown;
  - the highlight never stopped on a card's "more" button;
  - on a film's page the first key press landed on the main button.
- **Not tested:** signed in with Longboard; the player; search; sign-in; a
  remote or a game controller; a real TV. Nobody looked at the screen.
- **Playing a protected title is expected to fail** on Longboard's engine
  for now, whatever the profile says: the browser tells the site it can play
  Dolby audio (AC-3, E-AC-3) that it cannot decode on Linux. Measured on
  castLabs Electron 45.2.1 on 2026-11-18; playback itself was not tried. A
  profile cannot change this.
- Ad blocking: the site is on the verified list (added 2026-11-18, the owner's
  decision), so Longboard starts with the switch off here. Neither position
  of the switch was tried on the site.
