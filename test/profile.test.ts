// @vitest-environment jsdom
// Hard rule 8: every selector in the built-in profile must be shown by an
// outline from the live site. This rebuilds each page from the profile's own
// outline file and checks every selector against it, and checks that the
// profile is one Longboard accepts and applies to the service's addresses.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { rulesFrom } from 'longboard/src/layer/profile/rules';
import { chooseProfile, matchScore, validateProfile } from 'longboard/src/shared/profile';
import { HOME_URL } from '../src/shared/service';

const DIR = join(__dirname, '../profiles/tv.apple.com');
const checked = validateProfile(JSON.parse(readFileSync(join(DIR, 'profile.json'), 'utf8')));
if (!checked.profile) throw new Error(`the built-in profile is not valid: ${checked.problems.join('; ')}`);
const profile = checked.profile;
const rules = rulesFrom(profile);

/** The outline file holds several pages; a line starting with "####" begins one. */
const pages = new Map<string, string>();
{
  let name = '';
  for (const line of readFileSync(join(DIR, profile.evidence.outline), 'utf8').split('\n')) {
    if (line.startsWith('#### ')) name = line.slice(5).trim();
    else if (name) pages.set(name, `${pages.get(name) ?? ''}${line}\n`);
  }
}

/** Rebuilds elements from outline lines: `tag#id.class[attr="v"][attr:len]{text:len}`. */
function fromOutline(name: string): HTMLElement {
  const root = document.createElement('div');
  const stack: Array<{ depth: number; el: Element }> = [{ depth: -1, el: root }];
  const body = pages.get(name);
  if (body === undefined) throw new Error(`no outline named ${name}`);
  for (const line of body.split('\n')) {
    if (!line.trim() || line.startsWith('#')) continue;
    const depth = (line.length - line.trimStart().length) / 2;
    const text = line.trim();
    const headEnd = text.search(/[[{]/);
    const head = headEnd < 0 ? text : text.slice(0, headEnd);
    const [tagAndId = '', ...classes] = head.split('.');
    const [tag = 'div', id] = tagAndId.split('#');
    const el = document.createElement(tag);
    if (id) el.id = id;
    if (classes.length) el.setAttribute('class', classes.join(' '));
    for (const m of text.matchAll(/\[([a-z-]+)(?:="([^"]*)"|:(\d+))\]/g)) {
      el.setAttribute(m[1]!, m[2] ?? 'x'.repeat(Number(m[3])));
    }
    const t = /\{text:(\d+)\}/.exec(text);
    if (t) el.textContent = 'x'.repeat(Number(t[1]));
    while (stack[stack.length - 1]!.depth >= depth) stack.pop();
    stack[stack.length - 1]!.el.append(el);
    stack.push({ depth, el });
  }
  return root;
}

describe('the built-in profile', () => {
  it('is one Longboard accepts, and is data only', () => {
    expect(checked.problems).toEqual([]);
    expect(profile.longboard).toBe(1);
    expect(profile.licence).toBe('CC0-1.0');
  });

  it("applies to the service's website and to nothing else of the same company's", () => {
    const stored = [{ source: 'builtin' as const, profile }];
    const choice = chooseProfile(HOME_URL, stored, {});
    expect(choice.kind === 'use' ? [choice.profile.id, choice.source] : choice.kind).toEqual([profile.id, 'builtin']);
    expect(matchScore(profile, `${HOME_URL}some/page`)).toBeGreaterThanOrEqual(0);
    for (const other of ['https://www.apple.com/', 'https://music.apple.com/', 'https://apple.com/', 'https://tv.apple.com.example.org/']) {
      expect(matchScore(profile, other), other).toBeLessThan(0);
    }
  });

  it('says nothing about the player, search or purchase controls: there is no outline for them yet', () => {
    const s = rules.selectors;
    expect([s.playerRoot, s.playerClose, s.searchInput, s.searchOpen, s.purchaseControls, s.extraFocusable, s.dismiss].flat()).toEqual([]);
  });
});

describe('the built-in profile is backed by outlines', () => {
  it('the outlines carry structure only', () => {
    expect([...pages.keys()]).toEqual(['channel-shelf', 'title-buttons']);
    for (const body of pages.values()) {
      const lines = body.split('\n').filter((l) => !l.startsWith('#'));
      // No free text can survive: outline lines have no spaces except indentation.
      expect(lines.every((l) => !l.trim().includes(' '))).toBe(true);
      expect(body).not.toMatch(/https?:|profile-[A-Za-z]/);
    }
  });

  it('every selector in the profile matches something in the outlines', () => {
    const all = [...pages.keys()].map((name) => fromOutline(name));
    const selectors = [...Object.values(rules.selectors).flat(), ...(rules.initial ? [rules.initial] : [])];
    expect(selectors).toHaveLength(4);
    for (const sel of selectors) expect(all.some((dom) => dom.querySelector(sel) !== null), sel).toBe(true);
  });

  it('shelf arrows: each shelf has one previous and one next button beside its list, outside the cards', () => {
    const shelf = fromOutline('channel-shelf').querySelector('[data-testid="shelf-component"]')!;
    const prev = shelf.querySelectorAll(rules.selectors.rowPrev[0]!);
    const next = shelf.querySelectorAll(rules.selectors.rowNext[0]!);
    expect(prev).toHaveLength(1);
    expect(next).toHaveLength(1);
    expect(next[0]!.tagName).toBe('BUTTON');
    expect(next[0]!.parentElement!.querySelector('ul[role="list"]')).not.toBeNull();
    expect(next[0]!.closest('li')).toBeNull();
    // Cards past the first screenful are placeholders hidden from focus: only the arrow brings them in.
    expect(shelf.querySelector('li[aria-hidden="true"] a')).toBeNull();
  });

  it("a card's more button never takes the highlight; the card's own link still can", () => {
    const card = fromOutline('channel-shelf').querySelector('[data-testid="lockup-container"]')!;
    const skipped = card.querySelectorAll(rules.selectors.exclude.join(','));
    expect(skipped).toHaveLength(1);
    expect(skipped[0]!.tagName).toBe('BUTTON');
    expect(skipped[0]!.getAttribute('aria-haspopup')).toBe('true');
    // Longboard leaves out an excluded element and everything inside it, so the card must not be inside one.
    expect(card.querySelector('a[data-testid="lockup"]')!.closest(rules.selectors.exclude.join(','))).toBeNull();
  });

  it('first highlight: the title page has one primary button, the one that plays, and it is not the small "more" button', () => {
    const first = fromOutline('title-buttons').querySelectorAll(rules.initial!);
    expect(first).toHaveLength(1);
    expect(first[0]!.querySelector('[class*="PlayGlyph"]')).not.toBeNull();
    expect(first[0]!.matches('[data-testid="truncate-more-button"]')).toBe(false);
  });
});
