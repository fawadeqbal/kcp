import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { MentorTeamPage } from '@/features/events/mentor-events';
import { routing } from '@/i18n/routing';

type Params = { params: Promise<{ locale: string; id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale });
  return { title: t('mentorEvents.title'), robots: { index: false } };
}

export default async function Page({ params }: Params) {
  const { locale, id } = await params;
  if (!hasLocale(routing.locales, locale) || !/^[0-9a-f-]{36}$/.test(id)) notFound();
  setRequestLocale(locale);
  return (
    <Suspense>
      <MentorTeamPage teamId={id} />
    </Suspense>
  );
}
