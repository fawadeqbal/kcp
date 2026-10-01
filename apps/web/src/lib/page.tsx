import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { type ComponentType, Suspense } from 'react';
import { routing } from '@/i18n/routing';

type Params = { params: Promise<{ locale: string }> };

/** Titles come from the messages, e.g. "auth.login.title". */
type TitleKey =
  | 'account.title'
  | 'auth.signUp.title'
  | 'auth.checkEmail.title'
  | 'auth.verify.title'
  | 'auth.login.title'
  | 'auth.forgot.title'
  | 'auth.reset.title'
  | 'auth.student.title'
  | 'nav.dashboard'
  | 'addChild.title'
  | 'learn.title'
  | 'leaderboard.title'
  | 'badges.title'
  | 'billing.title'
  | 'portfolio.title'
  | 'legal.safetyTitle'
  | 'legal.termsTitle'
  | 'legal.privacyTitle'
  | 'mentor.title'
  | 'mentor.conductTitle'
  | 'review.title'
  | 'consent.confirmTitle'
  | 'pair.title'
  | 'league.title'
  | 'friends.title'
  | 'reports.title'
  | 'skills.title'
  | 'rooms.title'
  | 'events.title'
  | 'mentorEvents.title'
  | 'classes.title'
  | 'teacher.title'
  | 'readiness.title'
  | 'hub.title'
  | 'hub.family.title'
  | 'hub.payouts.title'
  | 'hub.lead.title'
  | 'client.title'
  | 'client.settings.title';

/**
 * A page made of one client component: sets the language for static rendering,
 * the translated <title>, and a Suspense boundary for components that read the URL.
 */
export function clientPage(Component: ComponentType, titleKey: TitleKey) {
  async function generateMetadata({ params }: Params): Promise<Metadata> {
    const { locale } = await params;
    if (!hasLocale(routing.locales, locale)) return {};
    const t = await getTranslations({ locale });
    return { title: t(titleKey), robots: { index: false } };
  }

  // oxlint-disable-next-line unicorn/consistent-function-scoping -- uses Component (JSX isn't detected)
  async function Page({ params }: Params) {
    const { locale } = await params;
    if (!hasLocale(routing.locales, locale)) notFound();
    setRequestLocale(locale);
    return (
      <Suspense>
        <Component />
      </Suspense>
    );
  }

  return { Page, generateMetadata };
}
