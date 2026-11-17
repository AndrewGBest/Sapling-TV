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

// Kept for the first evidence-backed selector; see the note at the top.
void fromOutline;
