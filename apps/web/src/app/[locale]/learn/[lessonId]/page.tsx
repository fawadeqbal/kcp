import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { LessonPlayer } from '@/features/learn/lesson-player';
import { routing } from '@/i18n/routing';

type Params = { params: Promise<{ locale: string; lessonId: string }> };

/** Lesson IDs are content keys, e.g. "builder-m01-l01". */
const LESSON_ID = /^[a-z0-9-]{1,100}$/;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale });
  return { title: t('lesson.title'), robots: { index: false } };
}

export default async function LessonPage({ params }: Params) {
  const { locale, lessonId } = await params;
  if (!hasLocale(routing.locales, locale) || !LESSON_ID.test(lessonId)) notFound();
  setRequestLocale(locale);
  return <LessonPlayer lessonId={lessonId} />;
}
