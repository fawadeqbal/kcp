import { DEFAULT_LOCALE, LOCALES, type Locale } from '@kcp/i18n';
import type { MetadataRoute } from 'next';
import { postLanguages } from '@/lib/blog';
import { SITE_URL } from '@/lib/config';
import { COUNTRY_CODES, countrySlug } from '@/lib/countries';
import { STATIC_PATHS } from '@/lib/routes';

/** One entry per page and language, each listing the page in every other language. */
function entries(path: string, locales: readonly Locale[] = LOCALES): MetadataRoute.Sitemap {
  const url = (locale: Locale) => `${SITE_URL}/${locale}${path}`;
  const languages: Record<string, string> = Object.fromEntries(
    locales.map((locale) => [locale, url(locale)]),
  );
  if (locales.includes(DEFAULT_LOCALE)) languages['x-default'] = url(DEFAULT_LOCALE);
  return locales.map((locale) => ({ url: url(locale), alternates: { languages } }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await postLanguages();
  return [
    ...STATIC_PATHS.flatMap((path) => entries(path)),
    ...COUNTRY_CODES.flatMap((code) => entries(`/pricing/${countrySlug(code)}`)),
    ...[...posts].flatMap(([slug, locales]) => entries(`/blog/${slug}`, locales)),
  ];
}
