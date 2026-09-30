'use client';

import { LOCALE_NAMES, LOCALES } from '@kcp/i18n';
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { Link, usePathname } from '@/i18n/navigation';

/** Links to the same page in every language. Each name is written in its own language. */
export function LanguageSwitcher() {
  const t = useTranslations('nav');
  const locale = useLocale();
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const href = search ? `${pathname}?${search}` : pathname;

  return (
    <nav aria-label={t('language')}>
      <ul className="flex items-center gap-1">
        {LOCALES.map((code) => (
          <li key={code}>
            <Link
              href={href}
              locale={code}
              lang={code}
              hrefLang={code}
              aria-current={code === locale ? 'true' : undefined}
              className={
                code === locale
                  ? 'rounded-lg bg-brand-100 px-2.5 py-1 text-sm font-semibold text-brand-700'
                  : 'rounded-lg px-2.5 py-1 text-sm text-muted hover:bg-brand-50'
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
