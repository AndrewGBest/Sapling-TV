import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as longboard from 'longboard/src/shared/about';
import * as own from '../src/shared/about';

const doc = (name: string): string => readFileSync(join(__dirname, '..', name), 'utf8').replace(/^> ?/gm, '').replace(/\s+/g, ' ');

describe("the About panel's words", () => {
  it("stand in for Longboard's: the same names, of the same kinds", () => {
    // The build swaps one file for the other, so a name Longboard's screen
    // asks for and this file lacks would only show up as a blank panel.
    expect(Object.keys(own).sort()).toEqual(Object.keys(longboard).sort());
    for (const key of Object.keys(longboard) as (keyof typeof longboard)[]) expect(typeof own[key], key).toBe(typeof longboard[key]);
    expect(own.HELP).toEqual(longboard.HELP);
  });

  it('carry the notice word for word as the README and the guardrails give it', () => {
    expect(doc('README.md')).toContain(own.NOTICE);
    expect(doc('docs/LEGAL-GUARDRAILS.md')).toContain(own.NOTICE);
  });

  it('name the app, not the browser underneath, in the title', () => {
    expect(own.aboutTitle('0.2.0')).toBe('Sapling TV 0.2.0');
    expect(own.aboutTitle(undefined)).toBe('Sapling TV');
  });

  it('say what is fetched in the background and that ad blocking is left out', () => {
    expect(own.BACKGROUND).toContain('Longboard-Profiles');
    expect(own.BACKGROUND).toContain('"catalogue": false');
    expect(own.BACKGROUND).toContain('Ad blocking is left out');
    expect(own.BACKGROUND).not.toMatch(/easylist/i);
  });
});
