import { DEFAULT_LOCALE, LOCALES } from '@kcp/i18n';
import { defineRouting } from 'next-intl/routing';

// Every page lives under a language prefix: /en, /ar, /ur.
export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: 'always',
});
