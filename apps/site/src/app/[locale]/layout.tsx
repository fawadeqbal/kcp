import '@fontsource/caprasimo/latin-400.css';
import '@fontsource/caprasimo/latin-ext-400.css';
import '@fontsource-variable/figtree/index.css';
import '@fontsource-variable/baloo-bhaijaan-2/index.css';
import '@fontsource-variable/noto-sans-arabic/index.css';
import '@fontsource/noto-nastaliq-urdu/arabic-400.css';
import '@fontsource/noto-nastaliq-urdu/arabic-700.css';
import '../globals.css';
import { directionOf } from '@kcp/i18n';
import type { Metadata, Viewport } from 'next';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { routing } from '@/i18n/routing';
import { BRAND_NAME } from '@/lib/brand';
import { SITE_URL } from '@/lib/config';

type Props = { children: ReactNode; params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// The browser's bar takes the page's ground, light or dark (packages/ui/src/theme.css).
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5ead8' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1815' },
  ],
};

export async function generateMetadata({ params }: Omit<Props, 'children'>): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: 'meta' });
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: BRAND_NAME, template: `%s · ${BRAND_NAME}` },
    description: t('description'),
    applicationName: BRAND_NAME,
    // No automatic phone/email links on iOS: numbers on this site are prices.
    formatDetection: { telephone: false, email: false, address: false },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations('nav');
  // Only the texts that client components use travel to the browser.
  const { nav, cta, waitlist, confirm, hire } = await getMessages();

  return (
    <html lang={locale} dir={directionOf(locale)}>
      <body className="flex min-h-dvh flex-col antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-surface focus:px-4 focus:py-2 focus:font-semibold focus:elev-lg"
        >
          {t('skipToContent')}
        </a>
        <NextIntlClientProvider
          messages={{
            nav,
            cta,
            waitlist,
            confirm,
            hire: { form: hire.form, confirm: hire.confirm },
          }}
        >
          <SiteHeader brand={BRAND_NAME} />
          <main id="main" className="flex-1">
            {children}
          </main>
          <SiteFooter locale={locale} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
