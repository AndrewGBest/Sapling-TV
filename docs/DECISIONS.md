# Decision log

Newest last. Each entry: date, decision, reason, and what would reopen it.

## Inherited from Tropic Video

Sapling TV started as a copy of Tropic Video 0.1.1, and these decisions came
with the code. The full entries, with evidence, are in Tropic Video's
`docs/DECISIONS.md` (github.com/AndrewGBest/Tropic-Video). Reopen them here
only with evidence from this service.

| Date | Decision |
|---|---|
| 2026-11-13 | Wrap the website with an original layer; never run a service's TV bundle |
| 2026-11-13 | TypeScript on castLabs Electron; the layer is shell-agnostic, so installed Chromium is the fallback shell |
| 2026-11-13 | The layer runs in the preload's isolated world |
| 2026-11-13 | Honest Chromium user agent; never pose as a device |
| 2026-11-13 | Distribute on GitHub Releases, not Flathub (Flathub's 2026 policy on AI-assisted code) |
| 2026-11-13 | No ad blocking, ever |
| 2026-11-13 | Purchase guard only in automation mode |
| 2026-11-13 | No end-to-end test framework; the harness speaks the DevTools protocol |
| 2026-11-13 | Refused navigations are shown (toast, or a notice page) and logged without queries |
| 2026-11-13 | The player is controlled only by ordinary key presses |
| 2026-11-14 | Player controls are the site's own, revealed by a pointer movement |
| 2026-11-14 | TV scale: page zoom to a 960x540 canvas, with a width floor |
| 2026-11-14 | Carousel arrows are pressed at the edge, never focused |
| 2026-11-14 | Familiar layout from the service's TV app allowed as a reference, never its material (Andrew) |
| 2026-11-14 | Hover-only menus are opened by resting the pointer |
| 2026-11-14 | On-screen keyboard types through the shell |
| 2026-11-14 | The site's interface is the interface; own UI only where a remote needs it (Andrew) |
| 2026-11-14 | Settings are a hand-edited config file |
| 2026-11-14 | Flatpak bundle permissions (`--device=all` for controllers) |
| 2026-11-16 | Hide player buttons the site has disabled |
| 2026-11-16 | The on-screen keyboard may type passwords and codes for a person, never for an agent (Andrew) |
| 2026-11-16 | The on-screen keyboard covers all printable ASCII |
| 2026-11-16 | Leaving the app pauses, mutes and (in fullscreen) minimises |

## 2026-11-17: Start Sapling TV as a copy of Tropic Video, not a shared library

**Decision:** import Tropic Video's 0.1.1 tree into a new repository and
change what names the service. Service-specific values are gathered in
`src/shared/service.ts`, `src/main/hosts.ts`, `src/shared/about.ts`, the
purchase-guard wording and the adapter.
**Reason:** Andrew asked for an Apple TV version now; the planning document
for the family says the apps can share one codebase and differ in name, icon,
start address and adapter. A shared package is the better end state, but
extracting it first would hold up the second app and change the first one's
release process. A copy with the service-specific parts gathered keeps that
later extraction mechanical.
**Cost:** fixes to the shared layer must be carried across by hand.
**Reopen when:** a third app starts, or the two layers drift apart.

## 2026-11-17: Project name is "Sapling TV"

**Decision (Andrew):** he named the project Sapling TV when asking for it to
be built. It hints at an orchard without fruit or any of the service's marks.
**Checks done earlier, in the family's planning document:** no same-name
streaming app found. Cautions: Sapling Pictures (a TV producer), a live
SAPLING mark in the entertainment class (Leaf Group) and Sapling
Corporation's software-class marks. Backups considered: Temperate TV, Windfall TV.
**Not done:** a direct search of the USPTO, CIPO, EUIPO or UK registers.
**Reopen:** before promoting the project publicly.

## 2026-11-17: The navigation allowlist names exact hosts

**Decision:** the window may load `tv.apple.com` and four account hosts
(`idmsa`, `appleid`, `account`, `iforgot`, each under `apple.com`), matched
exactly; not the whole `apple.com` domain.
**Reason:** that domain also carries a shop and an app store. Whole-domain
matching would let a link take the window into them.
**Not verified:** which account hosts the service actually navigates the
whole window to. Sign-in seen so far happens in frames, which the allowlist
does not govern.
**Reopen if:** a sign-in or recovery step is refused; add the host it needs, with evidence.

## 2026-11-17: Adapter revisions 1 and 2, and a notFocusable key

**Decision:** `adapters/appletv.json` names the shelf arrows (`rowPrev`,
`rowNext`) and the cards' menu buttons (`notFocusable`, a new key: controls
the pointer can use but focus never lands on). Evidence:
`test/fixtures/outlines/channel-shelf.txt`, captured signed out, checked by
`test/adapter-evidence.test.ts`.
**Reason:** later cards in a shelf are `aria-hidden` placeholders, so only the
arrow brings them in, and it sat in the path of Right. The menu buttons took
every second Right press.
**Cost:** a card's menu (add to Up Next and the like) is not reachable from
the remote on the shelf. Its actions are on the title page too, which was
seen but not walked.
**Reopen if:** someone needs the card menu from a shelf. Then map a key (the
remote's Menu key, say) to open it for the focused card, rather than making
it a focus stop again.

## 2026-11-17: Phase 0: playback works; pin castLabs Electron 42.11.18

**Result:** on Electron 44.10.1+wvcus (the version Tropic Video uses), an
included episode opened the site's player and then showed "An Error
Occurred". Chromium's own media diagnostics showed why: the video track was
fine (H.264, CBCS-encrypted) but the audio was AC-3 or E-AC-3 5.1, and the
audio decoder failed (FFmpeg `kUnsupportedConfig`). The build answers "yes"
for AC-3 and E-AC-3 in MediaSource, `canPlayType`, Media Capabilities and EME.
castLabs enabled that from v43 for platform decoders, which Linux lacks
(castlabs/electron-releases#221). On 42.11.18+wvcus, with the same signed-in
profile copied to a scratch folder, both codecs report unsupported, the site
sends AAC, and the episode played: MediaKeys attached, `playing`, time
advancing 668 to 708 seconds over 40 seconds, video 862x360, no errors.
**Decision:** pin `v42.11.18+wvcus`.
**Cost, accepted for now:** Electron 42 is older than the three major
versions Electron itself supports (it ships Chromium 148; 44 ships 152), so it
gets fewer security fixes. The window only loads the allowlisted hosts, and
the renderer is sandboxed, which limits but does not remove the exposure.
**Alternative kept in reserve:** stay on a current castLabs release and have
the shell stop advertising AC-3 and E-AC-3 on Linux. With no switch for it in
Chromium, that means a small script in the page's main world narrowing four
capability queries to the truth. It touches no request, response or script
of the service, but it is the first code in the page's own world, which the
project has avoided so far. Andrew's call.
**Reopen when:** castLabs stops advertising (E)AC-3 on Linux, castLabs stops
updating the 42 line, or Andrew chooses the alternative.
**Not checked:** the picture by eye (it was not looked at during playback);
sound; any other title; bare metal.

## 2026-11-17: Licence is GPL-3.0, as for Tropic Video

**Decision (Andrew):** GPL-3.0, so that anyone distributing a modified
version must publish their source under the same terms. The repository was
first created with an AGPL-3.0 file by mistake; Andrew asked for GPL-3.0 and
the file was replaced with the same GPL-3.0 text Tropic Video uses.
`package.json` says `GPL-3.0-only`; whether to allow "or any later version"
was not discussed, as with Tropic Video.
**Note:** the licence covers the code, not the name. The README asks forks to
use a different name.
**Reopen if:** Andrew wants "or later", or a contributor needs a different licence.

## 2026-11-17: The layer runs in every frame (`nodeIntegrationInSubFrames`)

**Decision:** the sandboxed preload is loaded into every frame of the page,
and each frame gets its own layer instance. Frames hand the keys to each
other: a frame is a focus target in its parent; at an edge a frame offers the
move to its parent; Back in a frame sends Escape, and a second Back hands the
keys to the parent; a frame that shows nothing hands every key to its parent.
Game-controller presses are read by the page and relayed to the focused
frame through the shell.
**Reason:** the site's sign-in form (and its purchase flows) live in frames:
a same-origin frame in a pop-up, holding a frame from the account host that
is given the keys while it has no height. With the layer only in the page,
the remote went dead when the form opened. Running a layer inside each frame
gives every frame, including the cross-origin one, the same ring, keyboard
and purchase guard, with no access from one origin's page to another's.
**Hard rule 12:** despite its name the Electron option enables no Node
integration. Frames get the same sandboxed, context-isolated preload as the
page and nothing is exposed to their scripts. The shell now accepts messages
from frames of its own window; pointer, sleep and relay requests only from
the page, hand-back requests only from frames; relayed actions are rebuilt
from known fields (`sanitizeAction`).
**The design note this replaces:** `DESIGN.md` section 5 proposed a second
layer started by the top layer for same-origin frames, and Tab emulation for
cross-origin ones. One layer per frame is simpler and covers both.
**Open risk:** on 2026-11-17 the sign-in prompt stalled on a spinner three
times in a row (the account frame stayed blank) with this change in place.
It loaded in every run without the change (5) and in later runs with it (4
of 4 that opened a prompt). The site was also returning errors from its
account service in that period. Cause not established.
**Reopen if:** the stall is pinned on the layer; then start layers in frames
only once they are loaded and shown, or go back to the top-layer design.

## 2026-11-17: Adapter revision 3: first focus on a title page is the play button

**Decision:** new adapter key `initialFocus`. When nothing has focus and the
page shows a control it names, focus starts there. Evidence:
`test/fixtures/outlines/title-buttons.txt`.
**Reason:** on a title page Down from the description skipped the play
button, which sits below and to the left, for the episode row in the same
column. Changing the geometry rule (never jump over a nearer row) was tried
and dropped: it contradicts a tested rule and would stop on shelf titles
from some columns but not others.
**Reopen if:** signed out, the same selector matches the subscription button
and starting there is unwelcome.

## 2026-11-18: Rebuild Sapling TV as an app on Longboard (0.2.0)

**Decision (Andrew):** convert Sapling TV to Longboard in two forms: a
standalone Sapling TV app that runs on Longboard, and a Longboard profile for
the service in the shared catalogue. This revives the name, which Longboard's
own decision log had set aside ("each becomes a profile and a web-app entry").
**How (the agent's choices, assumptions unless marked):**

| Topic | Chosen | Why |
|---|---|---|
| How Longboard gets in | A dev dependency on its repository at one full commit, built from source by this repository's build | Nothing copied, so nothing to carry across by hand; a pin that moves in one line. A copy was how 0.1.x was made and its cost was exactly that |
| Start-up | This repository's own `src/main/index.ts`, calling Longboard's `createBrowser` and friends, not Longboard's `index.ts` with a changed command line | Leaving ad blocking out, the app's own user-agent token and the start address cannot be set from the command line. The typecheck fails when Longboard changes what these modules take |
| The About panel | Longboard's `shared/about` is swapped for this repository's at build time | The notice required for this service has to be in About, and Longboard's panel has no setting for its words. A test and the end-to-end run guard the swap |
| Longboard's name on Home and in the menu | Left | Fixed text in Longboard's screens. The About panel says the app is built on Longboard |
| The profile catalogue | Still fetched daily | A fix to the profile reaches the app without a release. Disclosed in About; `"catalogue": false` stops it |
| Data folder | `~/.config/sapling-tv`, as before | An existing sign-in carries over. **Not checked** that a folder last opened by Electron 42 is read safely by 45 |
| The 0.1.x layer, adapter, spike and host allowlist | Removed | Longboard does that work. They are in the history up to 25e5472 |

**The old decisions above** about the layer (frames, adapter keys, the
navigation allowlist, the Electron 42 pin, "start as a copy of Tropic Video")
describe the 0.1.x app. They are kept as history and no longer describe the
code.
**Reopen if:** Longboard gains a supported way to build a named app on it;
then use that and delete the start-up copy and the About swap.

## 2026-11-18: Adopt Longboard's Hard rules; the navigation allowlist goes

**Decision (Andrew, asked because the conversion conflicted with the old
rule 12):** Sapling TV takes Longboard's rules. Longboard is a browser with a
Home screen and an address tile and asks the person before a site gets the
camera, location and the like; the old rule required a navigation allowlist
and a fixed permission list. The alternatives offered were a locked
single-site mode added to Longboard, or refusing other hosts from this
repository's start-up code.
**Consequence:** the app can open any website. Rules 13 (least privilege)
and 14 (stay current) matter more than before.
**Dropped with it:** the old rule 6 ("familiar layout, original material").
The app no longer draws a layout of its own; what remains of the rule is in
rules 1 and 6.

## 2026-11-18: No ad blocking in this app

**Decision (the agent's, offered with the question above and not objected
to; an assumption until Andrew says otherwise):** Longboard's ad blocking is
left out of Sapling TV: `adBlock.enabled` is false, no filter list is
fetched, the menu has no switch. Hard rule 5.
**Reason:** it keeps what Sapling TV promised before ("not an ad blocker,
and never will be"). In Longboard itself the site is not on the verified
list, so blocking would start on for it.
**Cost:** `@ghostery/adblocker` is still bundled into `dist/main.js`, unused,
because Longboard's window code imports the module that uses it (MPL-2.0;
see Longboard's `DECISIONS.md`).
**Not decided here:** whether the site goes on Longboard's verified list.
That is a person's review, so Andrew's.
(Later the same day Andrew added it: Longboard-Profiles commit fe8b6ec.)

## 2026-11-18: Ship on Longboard's Electron 45 although playback is expected to fail

**Decision (Andrew):** finish on castLabs 45.2.1, the version the pinned
Longboard uses, on the assumption that the Dolby audio problem will be fixed
in Longboard. Not the 42 pin of 2026-11-17.
**Evidence:** on 45.2.1 the browser says yes to AC-3 and E-AC-3 in
`MediaSource.isTypeSupported`, `canPlayType` and Media Capabilities; on
42.11.18 it says no to all three (both measured 2026-11-18 on a local page).
The app's end-to-end run and live walk pass on both. Playback itself was not
tried on 45.
**Reason:** the 42 pin was accepted for a window that opened only the
service's hosts. The app is now a browser; an out-of-support Chromium is a
larger exposure, and the cause is the engine's, shared with Longboard.
**Cost:** until the fix, expect the site's player to fail on protected
titles. The README and `STATUS.md` say so first.
**Reopen when:** Longboard has a fix (move the pin and try playback, signed
in, with Andrew), or it turns out not to be fixable there.

## 2026-11-18: The profile says only what the outlines show

**Decision:** the Longboard profile carries the three things the adapter had
(shelf arrows, cards' "more" buttons excluded, first highlight on a title
page) and nothing about the player, search or purchase controls. Profile id
`apple-tv`, folder `tv.apple.com`, one host matched exactly.
**Reason:** Hard rule 8. No outline of the player, the search page or a
purchase control exists yet.
**Mapping:** `rowPrev`/`rowNext` to `focus.scrollPrevious`/`scrollNext`;
`notFocusable` to `focus.exclude` (Longboard also leaves out anything inside
an excluded element; the selector names the button itself, and a test checks
the card is not inside it); `initialFocus` to `focus.initial`.
**Seen, signed out, on a home page:** the `focus.initial` selector matched 11
elements there (the banner's buttons). The first key landed on the first.
Not looked at further.

