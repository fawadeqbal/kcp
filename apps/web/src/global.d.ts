import type en from '@kcp/i18n/messages/en.json';
import type { Locale } from '@kcp/i18n';

// Type-checks every t('…') key against the English messages.
declare module 'next-intl' {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof en;
  }
}
