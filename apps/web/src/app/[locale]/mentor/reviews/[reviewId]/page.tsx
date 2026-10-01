import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { MentorReview } from '@/features/mentor/mentor-review';
import { routing } from '@/i18n/routing';

type Params = { params: Promise<{ locale: string; reviewId: string }> };

const UUID = /^[0-9a-f-]{36}$/;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale });
  return { title: t('review.title'), robots: { index: false } };
}

export default async function MentorReviewPage({ params }: Params) {
  const { locale, reviewId } = await params;
  if (!hasLocale(routing.locales, locale) || !UUID.test(reviewId)) notFound();
  setRequestLocale(locale);
  return <MentorReview id={reviewId} />;
}
