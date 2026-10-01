import {
  frameAncestorsFromEnv,
  isSitePage,
  portfolioHeaders,
  pyodideHeaders,
  sandboxHeaders,
} from './headers.mjs';

describe('sandbox headers', () => {
  it('lets only the web app (and the portfolio page here) embed the sandbox, and blocks network access', () => {
    const csp = sandboxHeaders('https://app.example.com')['Content-Security-Policy'];
    expect(csp).toContain("frame-ancestors 'self' https://app.example.com");
    // Only blob: URLs the page made itself (Python's standard library): nothing leaves.
    expect(csp).toContain('connect-src blob:;');
    expect(csp).toContain("form-action 'none'");
    expect(csp).toContain("default-src 'none'");
  });

  it('lets Python start a worker and WebAssembly, without eval', () => {
    const csp = sandboxHeaders()['Content-Security-Policy'];
    expect(csp).toContain('worker-src blob:');
    expect(csp).toContain("'wasm-unsafe-eval'");
    expect(csp).not.toContain("'unsafe-eval'");
  });

  it('shares Pyodide with the web app, cached for a year once versioned', () => {
    expect(pyodideHeaders(true)).toMatchObject({
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=31536000, immutable',
    });
    expect(pyodideHeaders(false)['Cache-Control']).toBe('no-cache');
  });

  it('lets the portfolio page read from the API only, and never be embedded', () => {
    const csp = portfolioHeaders('https://api.example.com')['Content-Security-Policy'];
    expect(csp).toContain("connect-src 'self' https://api.example.com");
    expect(csp).toContain("script-src 'self';");
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it('gives the sandbox’s own pages (portfolio, hub preview) their headers, but not the frames', () => {
    for (const path of [
      '/portfolio/',
      '/portfolio.js',
      '/preview/',
      '/preview',
      '/preview.js',
      '/pages.css',
    ]) {
      expect(isSitePage(path)).toBe(true);
    }
    // The frames run students’ code: they keep the runner’s headers.
    for (const path of [
      '/',
      '/runner.js',
      '/preview-frame.html',
      '/preview-frame.js',
      '/previewx',
    ]) {
      expect(isSitePage(path)).toBe(false);
    }
  });

  it('reads and checks the allowed origins', () => {
    expect(frameAncestorsFromEnv('https://a.example.com, https://b.example.com')).toBe(
      'https://a.example.com https://b.example.com',
    );
    expect(() => frameAncestorsFromEnv("https://ok.com 'unsafe-inline'")).toThrow(/not an origin/);
  });
});
