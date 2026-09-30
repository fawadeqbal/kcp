import type { Locale } from '@kcp/i18n';
import type en from '../messages/en.json';

// Type-checks every t('…') key against the English messages.
declare module 'next-intl' {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof en;
  }
}
