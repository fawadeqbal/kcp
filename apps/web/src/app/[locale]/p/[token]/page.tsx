import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { SharedPortfolio } from '@/features/portfolio/shared-portfolio';
import { routing } from '@/i18n/routing';

type Params = { params: Promise<{ locale: string; token: string }> };

const TOKEN = /^[\w-]{16,64}$/;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale });
  // Shared by a family with a link: never indexed, and no referrer carrying the link.
  return {
    title: t('shared.title'),
    robots: { index: false, follow: false },
    referrer: 'no-referrer',
  };
}

export default async function Page({ params }: Params) {
  const { locale, token } = await params;
  if (!hasLocale(routing.locales, locale) || !TOKEN.test(token)) notFound();
  setRequestLocale(locale);
  return <SharedPortfolio token={token} />;
}
