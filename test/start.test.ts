import { describe, expect, it } from 'vitest';
import { browserUserAgent, startTarget } from '../src/shared/start';
import { HOME_URL } from '../src/shared/service';

describe('what the app opens when it starts', () => {
  it('opens the service with nothing on the command line, never Home', () => {
    expect(startTarget([])).toEqual({ url: HOME_URL });
    expect(startTarget(['--dev', '--automation', '--zoom=2'])).toEqual({ url: HOME_URL });
    expect(HOME_URL).toMatch(/^https:\/\//);
  });

  it('an address on the command line wins', () => {
    expect(startTarget(['--url=https://example.com/a'])).toEqual({ url: 'https://example.com/a' });
    expect(startTarget(['--dev', 'https://example.com/'])).toEqual({ url: 'https://example.com/' });
    expect(startTarget(['--app=other', '--url=http://127.0.0.1:8080/x'])).toEqual({ url: 'http://127.0.0.1:8080/x' });
  });

  it('an app added from the menu is opened by its id', () => {
    expect(startTarget(['--app=example-com'])).toEqual({ app: 'example-com' });
  });

  it('an empty or unusable address falls back to the service', () => {
    expect(startTarget(['--url='])).toEqual({ url: HOME_URL });
    expect(startTarget(['--url=   '])).toEqual({ url: HOME_URL });
    expect(startTarget(['--app='])).toEqual({ url: HOME_URL });
  });

  it('never opens anything but a web address', () => {
    for (const bad of ['file:///etc/passwd', 'javascript:alert(1)', 'data:text/html,x']) {
      const got = startTarget([`--url=${bad}`]);
      expect('url' in got && /^https?:\/\//.test(got.url), bad).toBe(true);
    }
  });
});

describe('the identity sent to websites', () => {
  const real = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) sapling-tv/0.2.0 Chrome/140.0.0.0 Electron/45.2.1 Safari/537.36';
  const honest = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

  it("is the browser's own with the shell's and the app's tokens taken out", () => {
    expect(browserUserAgent(real, 'sapling-tv')).toBe(honest);
    expect(browserUserAgent(real.replace('sapling-tv/', 'SaplingTV/'), 'Sapling TV')).toBe(honest);
    expect(browserUserAgent(real.replace('sapling-tv/', 'longboard/'), 'sapling-tv')).toBe(honest);
  });

  it('changes nothing else: same engine, version and system', () => {
    expect(browserUserAgent(honest, 'sapling-tv')).toBe(honest);
    expect(browserUserAgent(honest, '')).toBe(honest);
    // A name with characters that mean something in a pattern is taken literally.
    expect(browserUserAgent(honest, '.*')).toBe(honest);
  });
});
