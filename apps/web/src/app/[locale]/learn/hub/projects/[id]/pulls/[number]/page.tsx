import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { HubPullPage } from '@/features/hub/student-project';
import { routing } from '@/i18n/routing';

type Params = { params: Promise<{ locale: string; id: string; number: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale });
  return { title: t('pulls.pageTitle'), robots: { index: false } };
}

export default async function Page({ params }: Params) {
  const { locale, id, number } = await params;
  if (
    !hasLocale(routing.locales, locale) ||
    !/^[0-9a-f-]{36}$/.test(id) ||
    !/^\d{1,6}$/.test(number)
  )
    notFound();
  setRequestLocale(locale);
  return (
    <Suspense>
      <HubPullPage id={id} number={Number(number)} area="STUDENT" />
    </Suspense>
  );
}
