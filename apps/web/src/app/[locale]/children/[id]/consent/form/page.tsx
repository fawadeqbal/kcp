import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { ConsentFormPrint } from '@/features/children/parental-consent';
import { routing } from '@/i18n/routing';

type Params = { params: Promise<{ locale: string; id: string }> };

const UUID = /^[0-9a-f-]{36}$/;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale });
  return { title: t('consent.formPageTitle'), robots: { index: false } };
}

export default async function ConsentFormPage({ params }: Params) {
  const { locale, id } = await params;
  if (!hasLocale(routing.locales, locale) || !UUID.test(id)) notFound();
  setRequestLocale(locale);
  return <ConsentFormPrint childId={id} />;
}
