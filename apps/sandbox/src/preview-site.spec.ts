import { dataUrl, resolvePath, Site, type SiteFile } from './preview-site.js';

const text = (path: string, type: string, body: string): SiteFile => ({
  path,
  type,
  text: body,
  base64: null,
});
const binary = (path: string, type: string, base64: string): SiteFile => ({
  path,
  type,
  text: null,
  base64,
});

const many = (name: string) => Array.from({ length: 1000 }, () => `@import "${name}";`).join('\n');

describe('resolvePath', () => {
  it('resolves references from a file, like a browser on the site would', () => {
    expect(resolvePath('index.html', 'style.css')).toBe('style.css');
    expect(resolvePath('pages/about.html', 'img/a.png')).toBe('pages/img/a.png');
    expect(resolvePath('pages/about.html', '../img/a.png')).toBe('img/a.png');
    expect(resolvePath('pages/about.html', '/img/a.png')).toBe('img/a.png');
    expect(resolvePath('pages/about.html', './b.html?x=1#top')).toBe('pages/b.html');
    expect(resolvePath('a/b.html', '../../../x.css')).toBe('x.css');
    expect(resolvePath('index.html', 'my%20photo.png')).toBe('my photo.png');
  });

  it('turns folders into their index page', () => {
    expect(resolvePath('index.html', 'blog/')).toBe('blog/index.html');
    expect(resolvePath('blog/post.html', '/')).toBe('index.html');
    expect(resolvePath('blog/post.html', '..')).toBe('index.html');
  });

  it('leaves other websites, data: URLs and fragments alone', () => {
    for (const reference of [
      'https://example.com/a.css',
      '//cdn.example.com/x.js',
      'data:image/png;base64,AAAA',
      'mailto:hi@example.com',
      'javascript:void(0)',
      '#top',
      '',
      '  ',
    ]) {
      expect(resolvePath('index.html', reference)).toBeNull();
    }
  });
});

describe('Site', () => {
  const site = new Site([
    text('index.html', 'text/html', '<h1>Hi</h1>'),
    text('about.html', 'text/html', '<p>About</p>'),
    text('blog/index.html', 'text/html', '<p>Blog</p>'),
    text(
      'css/site.css',
      'text/css',
      '@import "base.css" screen;\nbody { background: url(../img/bg.png); }',
    ),
    text('css/base.css', 'text/css', 'h1 { font-family: "Kid"; src: url("../fonts/kid.woff2"); }'),
    binary('img/bg.png', 'image/png', 'iVBORw0K'),
    binary('fonts/kid.woff2', 'font/woff2', 'd09GMgAB'),
    text('img/logo.svg', 'image/svg+xml', '<svg xmlns="http://www.w3.org/2000/svg"/>'),
  ]);

  it('lists pages with index.html first', () => {
    expect(site.pages()).toEqual(['index.html', 'about.html', 'blog/index.html']);
    expect(site.has('about.html')).toBe(true);
    expect(site.has('css/site.css')).toBe(false);
    expect(site.has('missing.html')).toBe(false);
  });

  it('finds folders by their index page', () => {
    expect(site.find('index.html', 'blog/')?.path).toBe('blog/index.html');
    expect(site.find('index.html', 'blog')?.path).toBe('blog/index.html');
  });

  it('makes pictures and fonts data: URLs, but never pages or stylesheets', () => {
    expect(site.url('index.html', 'img/bg.png')).toBe('data:image/png;base64,iVBORw0K');
    expect(site.url('index.html', 'img/logo.svg')).toBe(
      `data:image/svg+xml;charset=utf-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg"/>')}`,
    );
    expect(site.url('index.html', 'about.html')).toBeNull();
    expect(site.url('index.html', 'css/site.css')).toBeNull();
    expect(site.url('index.html', 'https://example.com/a.png')).toBeNull();
  });

  it('inlines @import rules (keeping their media) and rewrites url() from the stylesheet’s folder', () => {
    const css = site.css('css/site.css', site.find('index.html', 'css/site.css')?.text ?? '');
    expect(css).toContain('@media screen {');
    expect(css).toContain('url("data:font/woff2;base64,d09GMgAB")');
    expect(css).toContain('url("data:image/png;base64,iVBORw0K")');
    expect(css).not.toContain('@import');
  });

  it('stops following @import rules that go round in circles', () => {
    const loop = new Site([
      text('a.css', 'text/css', '@import "b.css";\na {}'),
      text('b.css', 'text/css', '@import "a.css";\nb {}'),
    ]);
    // b.css is inlined once; its import of a.css (already on the way) stays as written.
    expect(loop.css('a.css', '@import "b.css";\na {}')).toBe('@import "a.css";\nb {}\na {}');
  });

  it('keeps a stylesheet that imports another many times from blowing up', () => {
    const bomb = new Site([
      text('a.css', 'text/css', many('b.css')),
      text('b.css', 'text/css', many('c.css')),
      text('c.css', 'text/css', `${'x'.repeat(100)} {}`),
    ]);
    const started = Date.now();
    const css = bomb.css('index.html', '@import "a.css";');
    expect(Date.now() - started).toBeLessThan(2000);
    expect(css.length).toBeLessThan(10_000_000);
    // Empty files at the end of the chain cost something too.
    const empty = new Site([
      text('a.css', 'text/css', many('b.css')),
      text('b.css', 'text/css', many('c.css')),
      text('c.css', 'text/css', many('d.css')),
      text('d.css', 'text/css', many('e.css')),
      text('e.css', 'text/css', ''),
    ]);
    const begun = Date.now();
    empty.css('index.html', '@import "a.css";');
    expect(Date.now() - begun).toBeLessThan(2000);
  });

  it('blanks references to site files that aren’t there, and keeps other websites’', () => {
    // Left as it was, a missing file would be asked of the sandbox's own domain.
    expect(site.css('index.html', 'a { background: url(missing.png) }')).toBe(
      'a { background: url("data:,") }',
    );
    expect(site.css('index.html', 'a { background: url(https://x.example/a.png) }')).toBe(
      'a { background: url(https://x.example/a.png) }',
    );
    expect(site.srcset('index.html', 'img/bg.png 1x, gone.png 2x')).toBe(
      'data:image/png;base64,iVBORw0K 1x',
    );
    expect(site.css('index.html', 'a { background: url(data:image/png;base64,AA) }')).toBe(
      'a { background: url(data:image/png;base64,AA) }',
    );
  });

  it('rewrites srcset candidates', () => {
    expect(site.srcset('index.html', 'img/bg.png 1x, https://x.example/b.png 2x')).toBe(
      'data:image/png;base64,iVBORw0K 1x, https://x.example/b.png 2x',
    );
  });

  it('makes data: URLs from text and base64 files', () => {
    expect(dataUrl('text/plain', { text: 'a b', base64: null })).toBe(
      'data:text/plain;charset=utf-8,a%20b',
    );
    expect(dataUrl('image/gif', { text: null, base64: 'R0lG' })).toBe('data:image/gif;base64,R0lG');
  });
});
