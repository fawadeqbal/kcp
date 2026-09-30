import '@fontsource-variable/noto-sans/index.css';
import '@fontsource-variable/noto-sans-arabic/index.css';
import '@fontsource/noto-nastaliq-urdu/arabic-400.css';
import '@fontsource/noto-nastaliq-urdu/arabic-700.css';
import '../globals.css';
import { directionOf, LOCALES } from '@kcp/i18n';
import type { Metadata } from 'next';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { FeedbackButton } from '@/components/feedback-button';
import { SiteHeader } from '@/components/site-header';
import { TermsGate } from '@/features/account/terms-gate';
import { Link } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { AuthProvider } from '@/lib/auth-provider';

type Props = { children: ReactNode; params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Omit<Props, 'children'>): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: 'meta' });
  return {
    title: { default: t('title'), template: `%s · ${t('title')}` },
    description: t('description'),
    alternates: { languages: Object.fromEntries(LOCALES.map((l) => [l, `/${l}`])) },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);
  const t = await getTranslations();

  return (
    <html lang={locale} dir={directionOf(locale)}>
      <body className="flex min-h-dvh flex-col antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-10 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2"
        >
          {t('nav.skipToContent')}
        </a>
        <NextIntlClientProvider>
          <AuthProvider>
            <SiteHeader />
            <main id="main" className="flex-1 px-4 py-10">
              <TermsGate>{children}</TermsGate>
            </main>
            <footer className="print-hidden border-t border-line px-4 py-6 pb-20 text-center text-sm text-muted">
              <p>{t('meta.description')}</p>
              <nav aria-label={t('nav.footer')} className="mt-3">
                <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2">
                  {(['safety', 'terms', 'privacy'] as const).map((page) => (
                    <li key={page}>
                      <Link
                        href={`/${page}`}
                        className="font-medium text-ink underline-offset-4 hover:underline"
                      >
                        {t(`nav.${page}`)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </footer>
            <FeedbackButton />
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
