# Sapling TV: design notes

17 November 2026. Labels: **[Seen]** observed on the live site in this
project's shell, with the date; **[Sourced]** read in a source listed at the
end; **[Guess]** reasoning with no source.

The general design (wrap the service's website in a castLabs Electron shell;
add an original remote layer in the preload's isolated world; never touch DRM
or the service's scripts) comes unchanged from Tropic Video's design study,
`docs/DESIGN.md` in github.com/AndrewGBest/Tropic-Video, sections 1 to 5. Read
that for the reasoning and the prior art (VacuumTube, Vacuumflix). This
document records only what is different about this service.

## 1. Summary

- **Playback works in the shell, on castLabs Electron 42.** A signed-in run on
  2026-11-17 played an included episode with protected video, MediaKeys
  attached and time advancing **[Seen]**. On castLabs Electron 44 the same
  episode failed with the site's "An Error Occurred" because the build claims
  Dolby audio support it cannot decode (section 3).
- **Browsing works with the generic layer plus two adapter entries** (shelf
  arrows, card menu buttons) **[Seen]**.
- **Signing in with only a remote is not possible yet.** The form is inside a
  frame, and the layer stops at frame boundaries (section 5).

## 2. What the website gives us

| Thing | What was seen (2026-11-17, unless marked) |
|---|---|
| Start address | `https://tv.apple.com/`. Signed out it is a marketing page with plan buttons; signed in it redirects to the service's channel page in the account's storefront. The catalogue is also browsable signed out at `/<country>/channel/apple-tv/tvs.sbd.4000`. **[Seen]** |
| Storefront and location | Paths start with a country code. When it differs from where the viewer is, a fixed banner across the bottom of every page offers another country; it covers the bottom 100 CSS pixels, including a title's play button. **[Seen]** |
| Page structure | A single-page app. The window does not scroll: a screen-sized box inside it does. Rows ("shelves") scroll sideways, show four or five cards, and hold the rest as `aria-hidden` placeholders until the shelf's own arrow is pressed. Each card has a small menu button. **[Seen]** |
| Native-app links | "Open TV" and similar links go to the native app through its own URL scheme; the shell refuses them. **[Seen]** |
| Sign-in | Opens a modal `<dialog>` holding a same-origin frame (`/includes/commerce/navigator`), which holds a further frame from `idmsa.apple.com`. The first step asks for an email. **[Seen]** |
| Profiles | A "Who's Watching?" picker appears after sign-in. Its structure has not been inspected. **[Seen]** that it exists. |
| Player | Opens in a `<dialog>`; its controls are custom elements with shadow roots. H.264 video, CBCS-encrypted, about 860x360 for a widescreen episode. Audio offered as AC-3 or E-AC-3 5.1 when the browser says it supports them. **[Seen]** through Chromium's media diagnostics |
| Browser support | Apple's support guide says the service can be watched in a web browser on a computer; a search summary named Chrome and Firefox. The guide itself returned 404 in every locale when fetched, so its exact wording is unread. **[Sourced, weak]** |

## 3. Dolby audio and the Electron version

castLabs turned on Chromium's `enable_platform_ac3_eac3_audio` build flag
starting with v43.0.0-alpha.1 **[Sourced: castlabs/electron-releases#221]**.
The flag makes the browser report AC-3 and E-AC-3 as supported and hands them
to a platform decoder; Linux has none, which castLabs' own engineer noted in
the same issue. On this site that matters: the site believes the browser,
serves Dolby audio, the audio decoder fails (`DECODER_ERROR_NOT_SUPPORTED`,
FFmpeg `kUnsupportedConfig`) and the player shows a generic error **[Seen]**.

castLabs Electron 42.11.18 predates the flag, reports both codecs as
unsupported, gets AAC from the site, and plays **[Seen]**. The project pins it
until one of these changes; see `DECISIONS.md` (2026-11-17) for the trade-off
and the alternative.

## 4. Remote navigation on this site

What the generic layer from Tropic Video does well here **[Seen]**: moving
through the top bar, banners, plan buttons and down through shelves; the
purchase guard on trial, bundle and plan buttons under `--automation`.

What needed adding:

- **Shelf arrows** (`rowPrev`, `rowNext`): pressed by the layer at a shelf's
  edge, never focused. After a turn, focus moves to the first card now shown,
  once the shelf has stopped scrolling.
- **Card menu buttons** (`notFocusable`, a new adapter key): otherwise every
  second Right press lands on one. Their actions are on the title page too.
- **The page's own scroller** (`pageScroller`): scrolling is done in the box
  that scrolls the page, not the window.

Still to solve (see `STATUS.md`): the play button under the country banner,
Down from a title's description skipping the play button, frames (next
section), and the player's controls inside shadow roots.

## 5. Frames: the design for sign-in and pop-ups in frames

**Superseded the same day:** what was built is one layer per frame, which
covers same-origin and cross-origin frames alike. See `DECISIONS.md`,
"The layer runs in every frame". The first plan is kept below for the record.

The layer runs in the top frame's isolated world and hears keys only while
keyboard focus is in the top document. When the site moves focus into a frame
(sign-in does), the remote goes dead: arrows and Back do nothing, only the
shell's Ctrl+Q still works **[Seen]**. Planned approach, in order:

1. **Same-origin frames** (the sign-in form): the isolated world can reach a
   same-origin frame's document. The top layer starts a second layer instance
   on that document in frame mode: its own navigator, ring, on-screen keyboard
   and purchase guard, and its own key listener. In frame mode Back never uses
   history; it presses the pop-up's own close control or hands focus back to
   the top page. **[Guess]** that this works from the isolated world;
   extensions' content scripts do the same.
2. **Cross-origin frames** (`idmsa.apple.com`): unreachable from the page. The
   shell, which sees every key, is told when focus is in such a frame; it then
   turns arrows into Tab and Shift+Tab, and Back into "take focus back to the
   page". Under `--automation` the on-screen keyboard never opens there,
   because the field type cannot be read (Hard rule 9).
3. **Never trapped**: whatever happens in 1 and 2, Back from inside any frame
   must get the user out.

## 6. Legal differences from Tropic Video

- Apple's guidelines for third parties forbid its marks in a product name,
  any variation of them, and "an image of a real apple or other variation of
  the Apple logo for any purpose" **[Sourced]**. Hence the name, and an icon
  of a seedling with pointed leaves and no fruit.
- The same guidelines allow a referential phrase such as "for" or "compatible
  with" when the product really works with the Apple product **[Sourced]**.
  The README and notice use "for watching Apple TV".
- For text distributed outside the US, Apple asks for the attribution form
  "_____ is a trademark of Apple Inc., registered in the U.S. and other
  countries and regions" without symbols **[Sourced]**; the notice uses it.

## 7. Sources

- Apple, Guidelines for Using Apple Trademarks and Copyrights: https://www.apple.com/legal/intellectual-property/guidelinesfor3rdparties.html
- Apple trademark list (Apple TV, Apple TV+): https://www.apple.com/legal/intellectual-property/trademark/appletmlist.html
- Apple Support, Watch in a web browser (returned 404 on 2026-11-17; content known only from a search summary): https://support.apple.com/en-gb/guide/tvplus/apdc0cb7ad64/web
- castLabs Electron issue 221, "Enable chromium ac3-ec3 system decoding": https://github.com/castlabs/electron-releases/issues/221
- castLabs Electron releases (Linux CDM notes, v42.11.18): https://github.com/castlabs/electron-releases/releases
- Tropic Video design study: https://github.com/AndrewGBest/Tropic-Video/blob/main/docs/DESIGN.md
