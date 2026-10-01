import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { TeamWorkspacePage } from '@/features/events/workspace-page';
import { routing } from '@/i18n/routing';

type Params = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale });
  return { title: t('workspace.pageTitle'), robots: { index: false } };
}

export default async function Page({ params }: Params) {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale) || !/^[a-z0-9-]{3,40}$/.test(slug)) notFound();
  setRequestLocale(locale);
  return (
    <Suspense>
      <TeamWorkspacePage slug={slug} />
    </Suspense>
  );
}
