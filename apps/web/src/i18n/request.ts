import type { Locale } from '@kcp/i18n';
import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

const loaders: Record<Locale, () => Promise<{ default: Record<string, unknown> }>> = {
  en: () => import('@kcp/i18n/messages/en.json'),
  ar: () => import('@kcp/i18n/messages/ar.json'),
  ur: () => import('@kcp/i18n/messages/ur.json'),
};

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  return { locale, messages: (await loaders[locale]()).default };
});
