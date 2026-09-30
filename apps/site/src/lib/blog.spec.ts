import { LOCALES } from '@kcp/i18n';
import { compileMDX } from 'next-mdx-remote/rsc';
import { getPost, listPosts, parsePost, postLanguages } from './blog';
import { localizeHref, MDX_OPTIONS } from './mdx';

const compile = (source: string) =>
  compileMDX({ source, options: MDX_OPTIONS, components: { Callout: () => null } });

describe('blog posts in content/blog', () => {
  it('every post is written in every language', async () => {
    const languages = await postLanguages();
    expect(languages.size).toBeGreaterThanOrEqual(2);
    for (const [slug, locales] of languages) {
      expect({ slug, locales: locales.toSorted() }).toEqual({
        slug,
        locales: [...LOCALES].toSorted(),
      });
    }
  });

  it('lists posts newest first, with the same dates in every language', async () => {
    const english = await listPosts('en');
    expect(english.map((post) => post.date)).toEqual(
      english
        .map((post) => post.date)
        .toSorted()
        .toReversed(),
    );
    for (const locale of LOCALES) {
      const posts = await listPosts(locale);
      expect(posts.map((post) => [post.slug, post.date])).toEqual(
        english.map((post) => [post.slug, post.date]),
      );
    }
  });

  it('every post compiles with the Markdown-only rules', async () => {
    for (const locale of LOCALES) {
      for (const { slug } of await listPosts(locale)) {
        const post = await getPost(slug, locale);
        await expect(compile(post?.body ?? '')).resolves.toHaveProperty('content');
      }
    }
  });
});

describe('parsePost', () => {
  const source = "---\ntitle: Hello\ndate: '2026-09-15'\nsummary: A post\n---\n\nBody **text**\n";

  it('reads the front matter and the body', () => {
    expect(parsePost(source, 'hello.ur.mdx')).toEqual({
      slug: 'hello',
      locale: 'ur',
      title: 'Hello',
      date: '2026-09-15',
      summary: 'A post',
      body: '\nBody **text**\n',
    });
  });

  it.each([
    ['a file name without a language', source, 'hello.mdx'],
    ['a language the site does not have', source, 'hello.fr.mdx'],
    ['no front matter', 'Body', 'hello.en.mdx'],
    ['a missing summary', "---\ntitle: Hello\ndate: '2026-09-15'\n---\nBody", 'hello.en.mdx'],
    ['a bad date', '---\ntitle: Hello\ndate: soon\nsummary: A post\n---\nBody', 'hello.en.mdx'],
  ])('rejects %s', (_label, text, file) => {
    expect(() => parsePost(text, file)).toThrow(file);
  });
});

describe('Markdown-only MDX', () => {
  it('allows Markdown, code blocks, site links and <Callout>', async () => {
    const source = [
      '## Title',
      'Some **bold** text, `code` and a [link](/safety) or [another](https://example.com).',
      '```html\n<script>alert(1)</script>\n```',
      '<Callout>A note</Callout>',
    ].join('\n\n');
    await expect(compile(source)).resolves.toHaveProperty('content');
  });

  it.each([
    ['raw HTML', '<script>alert(1)</script>'],
    ['an iframe', '<iframe src="https://example.com"></iframe>'],
    ['an unknown component', '<Widget />'],
    ['a JavaScript expression', 'Hello {alert(1)}'],
    ['an import', "import x from 'y'\n\nHello"],
    ['an export', 'export const a = 1\n\nHello'],
    ['a javascript: link', '[click](javascript:alert(1))'],
    ['a javascript: link by reference', '[click][x]\n\n[x]: javascript:alert(1)'],
    ['an image from another site', '![cat](https://example.com/cat.png)'],
    ['an expression in a component attribute', '<Callout title={alert(1)}>Hi</Callout>'],
    ['a level-1 heading', '# Title'],
  ])('rejects %s', async (_label, source) => {
    await expect(compile(source)).rejects.toThrow(/not allowed|must be|use ## headings/);
  });
});

describe('localizeHref', () => {
  it('adds the language to site links only', () => {
    expect(localizeHref('/safety', 'ur')).toBe('/ur/safety');
    expect(localizeHref('/', 'ar')).toBe('/ar');
    expect(localizeHref('/en/faq', 'ur')).toBe('/en/faq');
    expect(localizeHref('https://example.com', 'ur')).toBe('https://example.com');
    expect(localizeHref('#top', 'ur')).toBe('#top');
    expect(localizeHref('//evil.example', 'ur')).toBe('//evil.example');
  });
});
