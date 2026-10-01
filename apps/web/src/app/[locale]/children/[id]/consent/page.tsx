import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { ParentalConsentPage } from '@/features/children/parental-consent';
import { routing } from '@/i18n/routing';

type Params = { params: Promise<{ locale: string; id: string }> };

const UUID = /^[0-9a-f-]{36}$/;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale });
  return { title: t('consent.confirmTitle'), robots: { index: false } };
}

export default async function ConsentPage({ params }: Params) {
  const { locale, id } = await params;
  if (!hasLocale(routing.locales, locale) || !UUID.test(id)) notFound();
  setRequestLocale(locale);
  return (
    <Suspense>
      <ParentalConsentPage childId={id} />
    </Suspense>
  );
}
