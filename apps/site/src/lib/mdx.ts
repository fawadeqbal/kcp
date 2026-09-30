import { LOCALES, type Locale } from '@kcp/i18n';
import type { MDXRemoteProps } from 'next-mdx-remote/rsc';
import { remarkSafeContent } from './mdx-safety';

/**
 * How blog posts are compiled (next-mdx-remote, on the server at build time): Markdown
 * only (remarkSafeContent), and next-mdx-remote's own guards on top — JavaScript
 * expressions and import/export are removed even if a check above ever missed one.
 */
export const MDX_OPTIONS: NonNullable<MDXRemoteProps['options']> = {
  blockJS: true,
  blockDangerousJS: true,
  parseFrontmatter: false,
  mdxOptions: { format: 'mdx', remarkPlugins: [remarkSafeContent] },
};

const LOCALE_PREFIX = new RegExp(`^/(${LOCALES.join('|')})(/|$)`);

/**
 * Links inside a post: "/safety" becomes "/ur/safety" on an Urdu page, so authors write
 * site links without a language. Other links are left as they are.
 */
export function localizeHref(href: string, locale: Locale): string {
  if (!href.startsWith('/') || href.startsWith('//') || LOCALE_PREFIX.test(href)) return href;
  return `/${locale}${href === '/' ? '' : href}`;
}
