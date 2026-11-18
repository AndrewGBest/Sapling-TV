// The About and help panel's words. Longboard's own screen draws the panel;
// the build puts this file in place of Longboard's `src/shared/about.ts`
// (scripts/build.mjs), so it must export the same names, which a test checks.
// The notice is the wording LEGAL-GUARDRAILS.md requires in every release;
// keep the two in step.
import { HELP as LONGBOARD_HELP } from 'longboard/src/shared/about';
import { APP_NAME } from './service';

export const NOTICE =
  'Sapling TV is an unofficial, independent project. It is not affiliated with, endorsed by or supported by Apple. ' +
  'Apple and Apple TV are trademarks of Apple Inc., registered in the U.S. and other countries and regions. ' +
  'An Apple Account and a subscription or purchase are required to watch. ' +
  'Sapling TV does not provide, unlock or bypass access to any content and does not remove or work around DRM.';

/** What the app fetches by itself, said where the person can read it (Hard rule 12). */
export const BACKGROUND =
  'Sapling TV is built on Longboard, an open-source web browser for TVs, and its Home screen and menu are Longboard\'s. ' +
  'It sends no usage data. Once a day it downloads the list of reviewed website profiles from the ' +
  'Longboard-Profiles repository on GitHub; the whole list is fetched, so nothing is revealed about what you watch or visit. ' +
  'Put "catalogue": false in config.json to stop it. ' +
  'Ad blocking is left out of this app: no filter list is downloaded and no request is refused.';

/** The keys are Longboard's, so the list is too. */
export const HELP: readonly (readonly [string, string])[] = LONGBOARD_HELP;

export function aboutTitle(version: string | undefined): string {
  return version ? `${APP_NAME} ${version}` : APP_NAME;
}
