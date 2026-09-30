import { composeDocument } from './compose.js';

describe('composeDocument', () => {
  it('wraps a few tags into a full page with the CSS and JavaScript', () => {
    const page = composeDocument({ html: '<h1>Hi</h1>', css: 'h1 { color: red; }', js: 'go();' });
    expect(page).toMatch(/^<!doctype html>/);
    expect(page.indexOf('<style>')).toBeLessThan(page.indexOf('</head>'));
    expect(page.indexOf('<h1>Hi</h1>')).toBeLessThan(page.indexOf('<script>'));
    expect(page.indexOf('go();')).toBeLessThan(page.indexOf('</body>'));
  });

  it('puts the agent before everything the student wrote', () => {
    const page = composeDocument(
      { html: '<html><head><script>mine()</script></head><body><header>x</header></body></html>' },
      { headScript: 'agent()' },
    );
    expect(page.indexOf('agent()')).toBeLessThan(page.indexOf('mine()'));
    expect(page).toContain('<header>x</header>');
    expect(page.match(/agent\(\)/g)).toHaveLength(1);
  });

  it('adds the agent to pages without a <head> or <html>', () => {
    const page = composeDocument({ html: '<body><p>x</p></body>' }, { headScript: 'agent()' });
    expect(page.indexOf('agent()')).toBeLessThan(page.indexOf('<p>x</p>'));
  });

  it('keeps the student inside our <script> and <style> elements', () => {
    const page = composeDocument({ css: 'a{}</style><b>', js: 'x = "</script><i>";' });
    expect(page).not.toContain('</style><b>');
    expect(page).not.toContain('</script><i>');
  });

  it('keeps "$1" and friends exactly as typed', () => {
    const page = composeDocument({
      html: '<html><head></head><body></body></html>',
      css: 'a::after { content: "$1 $&"; }',
      js: 'const price = "$1";',
    });
    expect(page).toContain('content: "$1 $&"');
    expect(page).toContain('const price = "$1";');
  });

  it('uses the JavaScript it is given instead of the file (guarded code)', () => {
    expect(composeDocument({ js: 'raw()' }, { js: 'guarded()' })).toContain('guarded()');
  });
});
