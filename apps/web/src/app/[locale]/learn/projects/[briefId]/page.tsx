import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { ProjectPage } from '@/features/projects/project-page';
import { routing } from '@/i18n/routing';

type Params = { params: Promise<{ locale: string; briefId: string }> };

/** Project IDs are content keys, e.g. "builder-m01-project". */
const PROJECT_ID = /^[a-z0-9-]{1,100}$/;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale });
  return { title: t('project.title'), robots: { index: false } };
}

export default async function Page({ params }: Params) {
  const { locale, briefId } = await params;
  if (!hasLocale(routing.locales, locale) || !PROJECT_ID.test(briefId)) notFound();
  setRequestLocale(locale);
  return <ProjectPage briefId={briefId} />;
}
