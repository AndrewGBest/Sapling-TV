// @vitest-environment jsdom
// Hard rule 7: every selector in the adapter must be shown by an outline
// captured from the live site. This test rebuilds a DOM from the trimmed
// outlines in test/fixtures/outlines/ and checks each selector against it.
// When the first selector is added, add a test here that rebuilds the outline
// with fromOutline() and shows the selector matching what it should.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseAdapter } from '../src/layer/adapter/adapter';
import { ADAPTER_FILE } from '../src/shared/service';

const DIR = join(__dirname, 'fixtures/outlines');
const raw = JSON.parse(readFileSync(join(__dirname, '../adapters', ADAPTER_FILE), 'utf8'));
const adapter = parseAdapter(raw);
const outlines = (): string[] => readdirSync(DIR).filter((n) => n.endsWith('.txt'));

/** Rebuilds elements from outline lines: `tag#id.class[attr="v"][attr:len]{text:len}`. */
function fromOutline(name: string): HTMLElement {
  return fromOutlineText(readFileSync(join(DIR, name), 'utf8'));
}

function fromOutlineText(outline: string): HTMLElement {
  const root = document.createElement('div');
  const stack: Array<{ depth: number; el: Element }> = [{ depth: -1, el: root }];
  for (const line of outline.split('\n')) {
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

describe('the adapter is backed by outlines', () => {
  it('fixtures carry structure only', () => {
    for (const name of outlines()) {
      const body = readFileSync(join(DIR, name), 'utf8')
        .split('\n')
        .filter((l) => !l.startsWith('#'))
        .join('\n');
      // No free text can survive: outline lines have no spaces except indentation.
      expect(body.split('\n').every((l) => !l.trim().includes(' '))).toBe(true);
      expect(body).not.toMatch(/https?:|profile-[A-Za-z]/);
    }
  });

  it('has no selectors while there is no evidence for any', () => {
    const count = Object.values(adapter.selectors).reduce((n, list) => n + list.length, 0);
    if (outlines().length === 0) {
      expect(count).toBe(0);
      expect(raw.verified).toBe(false);
    } else {
      expect(raw.verified).toBe(true);
    }
  });

  it('shelf arrows: each shelf has one previous and one next button beside its list, outside the cards', () => {
    const dom = fromOutline('channel-shelf.txt');
    const shelf = dom.querySelector('[data-testid="shelf-component"]')!;
    const prev = shelf.querySelectorAll(adapter.selectors.rowPrev[0]!);
    const next = shelf.querySelectorAll(adapter.selectors.rowNext[0]!);
    expect(prev).toHaveLength(1);
    expect(next).toHaveLength(1);
    expect(next[0]!.tagName).toBe('BUTTON');
    expect(next[0]!.parentElement!.querySelector('ul[role="list"]')).not.toBeNull();
    expect(next[0]!.closest('li')).toBeNull();
    // Cards past the first screenful are placeholders hidden from focus: only the arrow brings them in.
    expect(shelf.querySelector('li[aria-hidden="true"] a')).toBeNull();
  });

  it("a card's more button is never a focus target; the card's own link still is", () => {
    const dom = fromOutline('channel-shelf.txt');
    const card = dom.querySelector('[data-testid="lockup-container"]')!;
    const skipped = card.querySelectorAll(adapter.selectors.notFocusable.join(','));
    expect(skipped).toHaveLength(1);
    expect(skipped[0]!.tagName).toBe('BUTTON');
    expect(skipped[0]!.getAttribute('aria-haspopup')).toBe('true');
    expect(card.querySelector('a[data-testid="lockup"]')!.matches(adapter.selectors.notFocusable.join(','))).toBe(false);
  });

  it('first focus: the title page has one primary button, the one that plays, and it is not the small "more" button', () => {
    const dom = fromOutline('title-buttons.txt');
    const first = dom.querySelectorAll(adapter.selectors.initialFocus[0]!);
    expect(first).toHaveLength(1);
    expect(first[0]!.querySelector('[class*="PlayGlyph"]')).not.toBeNull();
    expect(first[0]!.matches('[data-testid="truncate-more-button"]')).toBe(false);
  });

  it('rebuilds an outline into elements the selectors can be checked against', () => {
    const dom = fromOutlineText(
      ['div[data-testid="row"]', '  ul', '    li', '      a.card[href:12]{text:5}', '  button[aria-label:4]'].join('\n'),
    );
    expect(dom.querySelectorAll('[data-testid="row"] ul li a.card')).toHaveLength(1);
    expect(dom.querySelector('a.card')?.getAttribute('href')).toHaveLength(12);
    expect(dom.querySelector('a.card')?.textContent).toHaveLength(5);
    expect(dom.querySelector('[data-testid="row"] > button')).not.toBeNull();
  });
});

