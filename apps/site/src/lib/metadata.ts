import { DEFAULT_LOCALE, LOCALES, type Locale } from '@kcp/i18n';
import type { Metadata } from 'next';
import { BRAND_NAME } from './brand';

/**
 * Canonical and hreflang links for a page that exists in every language.
 * `path` has no language prefix: '' for the home page, '/pricing/pk'…
 * x-default points to English, the language for everyone else.
 */
export function alternatesFor(locale: Locale, path: string): NonNullable<Metadata['alternates']> {
  return {
    canonical: `/${locale}${path}`,
    languages: {
      ...Object.fromEntries(LOCALES.map((code) => [code, `/${code}${path}`])),
      'x-default': `/${DEFAULT_LOCALE}${path}`,
    },
  };
}

/** Title, description, hreflang and Open Graph for a page (URLs resolve against the site URL). */
export function pageMetadata(
  locale: Locale,
  path: string,
  { title, description, index = true }: { title: string; description: string; index?: boolean },
): Metadata {
  return {
    title,
    description,
    alternates: alternatesFor(locale, path),
    openGraph: {
      type: 'website',
      siteName: BRAND_NAME,
      title,
      description,
      locale,
      url: `/${locale}${path}`,
    },
    ...(index ? {} : { robots: { index: false, follow: true } }),
  };
}
