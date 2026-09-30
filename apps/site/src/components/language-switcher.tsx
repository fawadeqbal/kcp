'use client';

import { LOCALE_NAMES, LOCALES } from '@kcp/i18n';
import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';

/**
 * Links to the same page in every language (/en/tracks → /ar/tracks). Each language is
 * named in its own language. Query strings are dropped on purpose: the only ones on
 * this site are one-time links (waitlist confirmation), which must not be reused.
 */
export function LanguageSwitcher() {
  const t = useTranslations('nav');
  const locale = useLocale();
  const pathname = usePathname();

  return (
    <nav aria-label={t('language')}>
      <ul className="flex items-center gap-1">
        {LOCALES.map((code) => (
          <li key={code}>
            <Link
              href={pathname}
              locale={code}
              lang={code}
              hrefLang={code}
              prefetch={false}
              aria-current={code === locale ? 'true' : undefined}
              className={
                code === locale
                  ? 'inline-flex min-h-9 items-center rounded-lg bg-brand-100 px-2.5 text-sm font-semibold whitespace-nowrap text-brand-700'
                  : 'inline-flex min-h-9 items-center rounded-lg px-2.5 text-sm whitespace-nowrap text-muted hover:bg-brand-50 hover:text-ink'
              }
            >
              {LOCALE_NAMES[code]}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
