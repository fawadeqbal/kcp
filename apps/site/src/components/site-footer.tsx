import type { Locale } from '@kcp/i18n';
import { LogoMark } from '@kcp/ui';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { BRAND_NAME } from '@/lib/brand';
import { webAppUrl } from '@/lib/config';
import { Container } from './layout';

const linkClass = 'font-semibold text-ink underline-offset-4 hover:text-brand-text hover:underline';

const page = (href: string, label: string) => (
  <li>
    <Link href={href} className={linkClass}>
      {label}
    </Link>
  </li>
);

function Column({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="font-sans text-xs font-bold tracking-[0.1em] text-muted uppercase">{title}</h2>
      <ul className="mt-3 flex flex-col gap-2">{children}</ul>
    </div>
  );
}

export async function SiteFooter({ locale }: { locale: Locale }) {
  const t = await getTranslations('footer');
  const nav = await getTranslations('nav');
  const app = (path: `/${string}`, label: string) => (
    <li>
      <a href={webAppUrl(locale, path)} className={linkClass}>
        {label}
      </a>
    </li>
  );

  return (
    <footer className="print-hidden">
      <Container className="py-14">
        <div className="grid gap-10 md:grid-cols-[2fr_3fr]">
          <div className="max-w-sm">
            <p className="flex items-center gap-2.5">
              <LogoMark />
              <span className="font-display text-xl">{BRAND_NAME}</span>
            </p>
            <p className="mt-3 text-muted">{t('about')}</p>
          </div>
          <nav aria-label={t('label')} className="grid gap-8 sm:grid-cols-3">
            <Column title={t('explore')}>
              {page('/how-it-works', nav('howItWorks'))}
              {page('/tracks', nav('tracks'))}
              {page('/pricing', nav('pricing'))}
              {page('/faq', nav('faq'))}
            </Column>
            <Column title={t('company')}>
              {page('/about', nav('about'))}
              {page('/blog', nav('blog'))}
              {page('/waitlist', nav('waitlist'))}
              {app('/login', t('logIn'))}
            </Column>
            <Column title={t('trust')}>
              {page('/safety', nav('safety'))}
              {app('/privacy', t('privacy'))}
              {app('/terms', t('terms'))}
            </Column>
          </nav>
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t border-line pt-6 text-sm text-muted sm:flex-row sm:justify-between">
          <p>{t('copyright', { year: new Date().getFullYear(), brand: BRAND_NAME })}</p>
          <p>{t('cookies')}</p>
        </div>
      </Container>
    </footer>
  );
}
