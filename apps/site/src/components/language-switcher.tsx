'use client';

import { type Locale, LOCALE_NAMES, LOCALES } from '@kcp/i18n';
import { Icon, Popover } from '@kcp/ui';
import { clsx } from 'clsx';
import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';

/*
 * Links to the same page in every language (/en/tracks → /ar/tracks). Each language is
 * named in its own language. Query strings are dropped on purpose: the only ones on
 * this site are one-time links (waitlist confirmation), which must not be reused.
 */
function LanguageLinks({ onPick, className }: { onPick?: () => void; className?: string }) {
  const t = useTranslations('nav');
  const locale = useLocale();
  const pathname = usePathname();
  return (
    <nav aria-label={t('language')}>
      <ul className={className}>
        {LOCALES.map((code) => (
          <li key={code}>
            <Link
              href={pathname}
              locale={code}
              lang={code}
              hrefLang={code}
              prefetch={false}
              onClick={onPick}
              aria-current={code === locale ? 'true' : undefined}
              className={clsx(
                'flex min-h-11 items-center justify-between gap-2 rounded-full px-4 font-semibold whitespace-nowrap',
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
  );
}

/** The language pill in the header: the current language, opening the choices. */
export function LanguageSwitcher() {
  const t = useTranslations('nav');
  const locale = useLocale() as Locale;
  return (
    <Popover
      label={`${t('language')}: ${LOCALE_NAMES[locale]}`}
      buttonClassName="flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-muted hover:bg-ink/7 hover:text-ink"
      panelClassName="w-44"
      button={
        <>
          <Icon name="globe" className="text-[0.95rem]" />
          <span lang={locale}>{LOCALE_NAMES[locale]}</span>
          <Icon name="chevD" className="text-xs" />
        </>
      }
    >
      {(close) => <LanguageLinks onPick={close} className="flex flex-col gap-0.5" />}
    </Popover>
  );
}

/** The same choices laid out in a row, in the phone menu. */
export function LanguageList() {
  return <LanguageLinks className="flex flex-wrap gap-1" />;
}
