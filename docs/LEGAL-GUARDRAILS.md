# Legal guardrails

This explains the reasoning behind the Hard rules in `CLAUDE.md`. It is a risk
map written by a non-lawyer, not legal advice. Before a wide public release,
have a lawyer review it. Items marked **[Guess]** are reasoning without a source.

The rules are Longboard's (github.com/AndrewGBest/Longboard,
`docs/LEGAL-GUARDRAILS.md`), adopted on 2026-11-18 when Sapling TV was rebuilt
on it, with this service's specifics and one difference: no ad blocking.
Most of them go back to Tropic Video's guardrails.

## The position this project takes

Sapling TV is a web browser, Longboard, under another name and pointed at one
service. It loads the service's public website in a Chromium engine, the user
signs in on the service's own page, and video plays through the browser's
standard protected media path. On top, Longboard draws its own highlight and
menus and turns controller presses into ordinary focus changes and clicks.

Everything risky that similar projects do is deliberately absent. The contrast
case is a client that bundles a service's TV scripts, fonts, logo and the
Widevine binary, names itself after the service, and presents an invented
device serial (see Tropic Video's `DESIGN.md` section 2 for one such repo).

## Rule by rule

| Rule | Risk it avoids | Basis |
|---|---|---|
| 1. No third-party material | Copyright infringement by redistribution | Copying another party's code, fonts or artwork into a public repo is reproduction and distribution of their work. |
| 2. DRM left alone | Anti-circumvention law | Canada's Copyright Act prohibits circumventing technological protection measures (s. 41.1). Its interoperability exception (s. 41.12) concerns lawfully obtained computer programs and is lost where the act infringes copyright. The US has a comparable prohibition (17 USC 1201; from general knowledge, not re-checked for this document). The project never needs an exception because it never circumvents. |
| 3. Honest identity | Misrepresentation to obtain service not offered to this device class | Linux browsers have only a software CDM, and the service served about 862x360 to the earlier shell. Posing as another device or browser to get more would be the kind of workaround rule 2 forbids. **[Guess]** on how a court would characterise it; the rule avoids the question. |
| 4. The service is not altered | Terms-of-use breach; interference claims | Media services terms commonly forbid circumventing territorial limits and interfering with the service. **[Guess]**: this service's terms were not read for this document. |
| 5. No ad blocking in this app | The same, and the complaint a service is most likely to make | Longboard lets a person switch request blocking on for any site, starting off on reviewed sites; its guardrails call that the part most likely to draw a complaint from a paid service. An app whose one purpose is a paid service has no use for the switch, so it is left out: nothing is fetched and nothing is refused. This also keeps Tropic Video's "no ad blocking, ever" for this app. |
| 6. No trademarks in name or icon | Trademark infringement, confusion about origin | Apple's guidelines for third parties: its marks may not be used "in whole or in part" in a name, nor "a variation, phonetic equivalent, foreign language equivalent, takeoff, or abbreviation"; and "You may not use an image of a real apple or other variation of the Apple logo for any purpose." A referential phrase such as "for" or "compatible with" is allowed when the product really works with the Apple product. |
| 7. Profiles are data | A settings file becoming a way to run code | A profile that could run code would have to be reviewed as a program. A data-only one can be reviewed by reading it. |
| 8. Selectors come from evidence | None legal; reliability | Guessed selectors silently break. |
| 9. No reverse engineering of apps | Licence breach; anti-circumvention if apps are protected | Reading a web page your browser was sent is ordinary use. Decompiling a TV app is not. |
| 10. Credentials untouched | Privacy harm, account compromise | The app never needs them; the cookie jar stays on the user's disk. The on-screen keyboard only passes key picks through, like a keyboard. |
| 11. Automation never spends | Unauthorised charges on a real account | Enforced by Longboard's guard in the page and by address in the shell. It recognises wording in English and addresses: a safety net, not a guarantee (Longboard's `STATUS.md`). |
| 12. Privacy by default | Privacy law exposure; user trust | Nothing leaves the machine except traffic to the sites opened, the Widevine component download, and the daily download of the public profile index, which is the same for everyone and says nothing about what is watched. |
| 13. Least privilege | Security of the user's machine | The page is untrusted code; it gets no path into the app. Since 0.2.0 the window is a browser and can open any site, so this rule and rule 14 carry more weight than when it could open only the service's hosts. |
| 14. Stay current | Known security holes in an old engine | A browser on an out-of-support Chromium is unsafe. The earlier app pinned an old Electron to get playback; that was accepted for a window that opened only the service, and is not for a browser. |

## What remains uncertain

- **Terms of use.** Whether a restyled browser session is a permitted way to
  use the service has not been confirmed, and the service's terms were not
  reviewed for this document. Account risk sits with each user and the README
  says so.
- **Injecting a stylesheet and focus handling** is the same class of activity
  as a browser extension or user style. **[Guess]** that it is treated the same.
- **Look and feel.** The app draws nothing that resembles the service's own
  app: what is on screen is the service's website and Longboard's plain
  highlight and menus. **[Guess]**: little risk while the app uses none of
  the service's assets, keeps its own name and icon, and carries the
  non-affiliation notice.
- **The name.** "Sapling" was screened for same-name streaming apps, not
  checked in the trademark registers (see `DECISIONS.md`).
- **Longboard's own open points** apply here too: its name is not cleared,
  and it has no Safe Browsing (see its `LEGAL-GUARDRAILS.md` and README).
- **Jurisdiction.** Reasoning above leans on Canadian and US law. Users
  elsewhere are subject to their own.
- **Takedown.** If the rights holder objects, the project responds promptly
  and in good faith. A contact route is listed in the README.

## Required wording

Every release, the README and the About panel carry, word for word (a test
compares them, and the end-to-end run reads the panel):

> Sapling TV is an unofficial, independent project. It is not affiliated
> with, endorsed by or supported by Apple. Apple and Apple TV are trademarks
> of Apple Inc., registered in the U.S. and other countries and regions. An
> Apple Account and a subscription or purchase are required to watch.
> Sapling TV does not provide, unlock or bypass access to any content and
> does not remove or work around DRM.

The attribution sentence follows Apple's form for material distributed
outside the US, without trademark symbols.

## Sources

- Copyright Act (Canada), s. 41.12: https://laws-lois.justice.gc.ca/eng/acts/C-42/section-41.12.html
- Apple, Guidelines for Using Apple Trademarks and Copyrights: https://www.apple.com/legal/intellectual-property/guidelinesfor3rdparties.html
- Apple trademark list: https://www.apple.com/legal/intellectual-property/trademark/appletmlist.html
- Longboard legal guardrails: https://github.com/AndrewGBest/Longboard/blob/main/docs/LEGAL-GUARDRAILS.md
- Tropic Video legal guardrails: https://github.com/AndrewGBest/Tropic-Video/blob/main/docs/LEGAL-GUARDRAILS.md
