'use client';

import { buttonClass } from '@kcp/ui';
import { clsx } from 'clsx';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Link, usePathname } from '@/i18n/navigation';
import { CloseIcon, LogoMark, MenuIcon } from './icons';
import { LanguageSwitcher } from './language-switcher';

const NAV = [
  ['/how-it-works', 'howItWorks'],
  ['/tracks', 'tracks'],
  ['/safety', 'safety'],
  ['/pricing', 'pricing'],
  ['/faq', 'faq'],
  ['/blog', 'blog'],
] as const;

const isCurrent = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`);

export function SiteHeader({ brand }: { brand: string }) {
  const t = useTranslations('nav');
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
            'rounded-lg font-medium whitespace-nowrap text-ink hover:bg-brand-50 hover:text-brand-700 aria-[current=page]:bg-brand-50 aria-[current=page]:text-brand-700',
            className,
          )}
        >
          {t(key)}
        </Link>
      </li>
    ));

  return (
    <header className="print-hidden sticky top-0 z-30 border-b border-line bg-surface">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
        <Link
          href="/"
          aria-label={t('homeLink', { brand })}
          className="flex shrink-0 items-center gap-2.5 rounded-lg text-base font-bold whitespace-nowrap text-ink sm:text-lg"
        >
          <LogoMark />
          <span className="font-latin">{brand}</span>
        </Link>

        <nav aria-label={t('main')} className="ms-auto hidden xl:block">
          <ul className="flex items-center">{links('inline-flex min-h-10 items-center px-2.5')}</ul>
        </nav>
        <div className="hidden shrink-0 items-center gap-2 xl:flex">
          <LanguageSwitcher />
          <Link
            href="/waitlist"
            className={clsx(buttonClass('primary', 'sm'), 'whitespace-nowrap')}
          >
            {t('waitlistShort')}
          </Link>
        </div>

        <button
          type="button"
          className="ms-auto inline-flex min-h-11 items-center gap-2 rounded-xl border border-line px-3.5 font-semibold hover:bg-brand-50 xl:hidden"
          aria-expanded={open}
          aria-controls="site-menu"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <CloseIcon /> : <MenuIcon />}
          {/* On the narrowest phones only the icon shows; screen readers still hear "Menu". */}
          <span className="max-[25rem]:sr-only">{t('menu')}</span>
        </button>
      </div>

      <div id="site-menu" hidden={!open} className="border-t border-line xl:hidden">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6">
          <nav aria-label={t('main')}>
            <ul className="grid gap-1 sm:grid-cols-2">
              {links('flex min-h-11 items-center px-3')}
            </ul>
          </nav>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
            <LanguageSwitcher />
            <Link href="/waitlist" className={buttonClass('primary', 'md')}>
              {t('waitlist')}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
