import type { Locale } from '@kcp/i18n';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';

export type LocaleParams = { params: Promise<{ locale: string }> };

/**
 * For a page: the language from the URL, registered for static rendering
 * (next-intl's setRequestLocale). An unknown language is a 404.
 */
export async function pageLocale(params: LocaleParams['params']): Promise<Locale> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return locale;
}

/** For generateMetadata: the language from the URL, or null when it isn't one of ours. */
export async function metadataLocale(params: LocaleParams['params']): Promise<Locale | null> {
  const { locale } = await params;
  return hasLocale(routing.locales, locale) ? locale : null;
}
