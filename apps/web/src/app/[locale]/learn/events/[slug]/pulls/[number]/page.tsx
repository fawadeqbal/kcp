import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { StudentPullPage } from '@/features/events/pull-page';
import { routing } from '@/i18n/routing';

type Params = { params: Promise<{ locale: string; slug: string; number: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale });
  return { title: t('pulls.pageTitle'), robots: { index: false } };
}

export default async function Page({ params }: Params) {
  const { locale, slug, number } = await params;
  if (
    !hasLocale(routing.locales, locale) ||
    !/^[a-z0-9-]{3,40}$/.test(slug) ||
    !/^\d{1,6}$/.test(number)
  )
    notFound();
  setRequestLocale(locale);
  return (
    <Suspense>
      <StudentPullPage slug={slug} number={Number(number)} />
    </Suspense>
  );
}
