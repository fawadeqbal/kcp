'use client';

import type { Locale } from '@kcp/i18n';
import { buttonClass, Icon, LogoMark } from '@kcp/ui';
import { clsx } from 'clsx';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Link, usePathname } from '@/i18n/navigation';
import { webAppUrl } from '@/lib/config';
import { LanguageList, LanguageSwitcher } from './language-switcher';

const NAV = [
  ['/how-it-works', 'howItWorks'],
  ['/tracks', 'tracks'],
  ['/pricing', 'pricing'],
  ['/safety', 'safety'],
  ['/faq', 'faq'],
  ['/blog', 'blog'],
] as const;

const isCurrent = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`);

export function SiteHeader({ brand }: { brand: string }) {
  const t = useTranslations('nav');
  const cta = useTranslations('cta');
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [menuPath, setMenuPath] = useState(pathname);

  // Close the phone menu after following one of its links.
  if (menuPath !== pathname) {
    setMenuPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const links = (className: string) =>
    NAV.map(([href, key]) => (
      <li key={href}>
        <Link
          href={href}
          aria-current={isCurrent(pathname, href) ? 'page' : undefined}
          className={clsx(
            'rounded-full font-semibold whitespace-nowrap text-ink hover:bg-ink/7 aria-[current=page]:bg-brand-100 aria-[current=page]:text-brand-800',
            className,
          )}
        >
          {t(key)}
        </Link>
      </li>
    ));

  const logIn = (
    <a
      href={webAppUrl(locale, '/login')}
      className="inline-flex min-h-10 items-center rounded-full px-3 font-semibold whitespace-nowrap hover:bg-ink/7"
    >
      {t('logIn')}
    </a>
  );
  const signUp = (className?: string) => (
    <a
      href={webAppUrl(locale, '/sign-up')}
      className={clsx(buttonClass('primary', 'md'), 'whitespace-nowrap', className)}
    >
      {cta('signUp')}
    </a>
  );

  return (
    <header className="print-hidden sticky top-0 z-30 bg-canvas/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[80rem] items-center gap-3 px-4 py-4 sm:px-6 lg:px-14">
        <Link
          href="/"
          aria-label={t('homeLink', { brand })}
          className="flex shrink-0 items-center gap-2.5 rounded-full whitespace-nowrap"
        >
          <LogoMark />
          <span className="font-display text-lg sm:text-xl">{brand}</span>
        </Link>

        <nav aria-label={t('main')} className="ms-4 hidden xl:block">
          <ul className="flex items-center gap-1">
            {links('inline-flex min-h-10 items-center px-3')}
          </ul>
        </nav>
        <div className="ms-auto hidden shrink-0 items-center gap-2 xl:flex">
          <LanguageSwitcher />
          {logIn}
          {signUp()}
        </div>

        <button
          type="button"
          className="ms-auto inline-flex min-h-11 items-center gap-2 rounded-full bg-surface px-4 font-semibold hover:bg-sand-300 xl:hidden"
          aria-expanded={open}
          aria-controls="site-menu"
          onClick={() => setOpen((value) => !value)}
        >
          <Icon name={open ? 'x' : 'menu'} className="text-lg" />
          {/* On the narrowest phones only the icon shows; screen readers still hear "Menu". */}
          <span className="max-[25rem]:sr-only">{t('menu')}</span>
        </button>
      </div>

      <div id="site-menu" hidden={!open} className="xl:hidden">
        <div className="mx-2 mb-3 flex flex-col gap-4 rounded-panel bg-surface p-4 sm:mx-4 sm:p-5">
          <nav aria-label={t('main')}>
            <ul className="grid gap-1 sm:grid-cols-2">
              {links('flex min-h-11 items-center px-4')}
            </ul>
          </nav>
          <div className="flex flex-col gap-3 border-t border-line pt-4">
            <LanguageList />
            <div className="flex flex-wrap items-center gap-2">
              {signUp()}
              {logIn}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
