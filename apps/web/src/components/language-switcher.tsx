'use client';

import { type Locale, LOCALE_NAMES, LOCALES } from '@kcp/i18n';
import { Icon, Popover } from '@kcp/ui';
import { clsx } from 'clsx';
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { Link, usePathname } from '@/i18n/navigation';

/**
 * The language pill: the current language, opening the same page in every language.
 * Each name is written in its own language.
 */
export function LanguageSwitcher() {
  const t = useTranslations('nav');
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const href = search ? `${pathname}?${search}` : pathname;

  return (
    <Popover
      label={`${t('language')}: ${LOCALE_NAMES[locale]}`}
      buttonClassName="flex min-h-10 items-center gap-1.5 rounded-full border border-line px-3.5 text-sm font-semibold hover:bg-ink/7"
      panelClassName="w-44"
      button={
        <>
          <Icon name="globe" className="text-[0.95rem]" />
          <span lang={locale}>{LOCALE_NAMES[locale]}</span>
          <Icon name="chevD" className="text-xs text-muted" />
        </>
      }
    >
      {(close) => (
        <nav aria-label={t('language')}>
          <ul className="flex flex-col gap-0.5">
            {LOCALES.map((code) => (
              <li key={code}>
                <Link
                  href={href}
                  locale={code}
                  lang={code}
                  hrefLang={code}
                  onClick={close}
                  aria-current={code === locale ? 'true' : undefined}
                  className={clsx(
                    'flex min-h-11 items-center justify-between gap-2 rounded-full px-4 font-semibold',
                    code === locale ? 'bg-brand-100 text-brand-800' : 'hover:bg-ink/7',
                  )}
                >
                  {LOCALE_NAMES[code]}
                  {code === locale ? <Icon name="check" className="text-sm" /> : null}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </Popover>
  );
}
