import type { Locale } from '@kcp/i18n';
import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

// The site's own texts (apps/site/messages), separate from the apps' shared messages.
const loaders: Record<Locale, () => Promise<{ default: Record<string, unknown> }>> = {
  en: () => import('../../messages/en.json'),
  ar: () => import('../../messages/ar.json'),
  ur: () => import('../../messages/ur.json'),
};

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  return { locale, messages: (await loaders[locale]()).default };
});
