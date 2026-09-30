import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { FinalCallToAction } from '@/components/final-cta';
import {
  ArrowIcon,
  BookIcon,
  CalendarIcon,
  CodeIcon,
  HeartIcon,
  ShieldIcon,
  StarIcon,
  UserPlusIcon,
} from '@/components/icons';
import { Container, IconBadge, Section } from '@/components/layout';
import { MoreLink, SignUpLink, WaitlistLink } from '@/components/links';
import { FaqList } from '@/features/faq/faq-list';
import { LessonDemo } from '@/features/home/lesson-demo';
import { SafetyPromises } from '@/features/safety/promises';
import { TrackCards } from '@/features/tracks/track-cards';
import { Link } from '@/i18n/navigation';
import { COUNTRY_CODES, countrySlug } from '@/lib/countries';
import { formatPrice } from '@/lib/format';
import { pageMetadata } from '@/lib/metadata';
import { type LocaleParams, metadataLocale, pageLocale } from '@/lib/page';
import { getPricing, priceFor } from '@/lib/pricing';

// Prices come from the API: look again at most once an hour.
export const revalidate = 3600;

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const locale = await metadataLocale(params);
  if (!locale) return {};
  const t = await getTranslations({ locale, namespace: 'home' });
  const meta = await getTranslations({ locale, namespace: 'meta' });
  return pageMetadata(locale, '', { title: t('metaTitle'), description: meta('description') });
}

export default async function HomePage({ params }: LocaleParams) {
  const locale = await pageLocale(params);
  const t = await getTranslations('home');
  const tPricing = await getTranslations('pricing');
  const pricing = await getPricing();

  const steps = [
    { icon: <UserPlusIcon />, title: t('steps.accountTitle'), body: t('steps.account') },
    { icon: <CodeIcon />, title: t('steps.learnTitle'), body: t('steps.learn') },
    { icon: <StarIcon />, title: t('steps.shipTitle'), body: t('steps.ship') },
  ];

  const facts = [
    { icon: <BookIcon />, tone: 'brand' as const, text: t('pricingFree') },
    {
      icon: <CalendarIcon />,
      tone: 'success' as const,
      text: tPricing('trial', { days: pricing.trialDays }),
    },
    {
      icon: <HeartIcon />,
      tone: 'accent' as const,
      text: tPricing('family', { percent: pricing.familyDiscountPercent }),
    },
  ];

  return (
    <>
      <section aria-labelledby="hero-title" className="bg-linear-to-b from-brand-50 to-canvas">
        <Container className="grid items-center gap-12 py-14 sm:py-20 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-surface px-3.5 py-1 text-sm font-semibold text-brand-700 shadow-sm">
              <span className="size-2 rounded-full bg-success" aria-hidden="true" />
              {t('badge')}
            </p>
            <h1 id="hero-title" className="mt-5 text-4xl font-bold text-balance sm:text-5xl">
              {t('title')}
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted">{t('subtitle')}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <SignUpLink locale={locale} />
              <WaitlistLink />
            </div>
            <p className="mt-6 flex items-center gap-2 text-sm font-medium text-muted">
              <ShieldIcon className="text-success" />
              {t('noAds')}
            </p>
          </div>
          <LessonDemo />
        </Container>
      </section>

      <Section id="steps" title={t('steps.title')} subtitle={t('steps.subtitle')}>
        <ol className="grid gap-5 md:grid-cols-3">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-6"
            >
              <div className="flex items-center justify-between">
                <IconBadge>{step.icon}</IconBadge>
                <span className="font-latin text-4xl font-bold text-brand-100" aria-hidden="true">
                  {index + 1}
                </span>
              </div>
              <h3 className="text-lg font-bold">{step.title}</h3>
              <p className="text-muted">{step.body}</p>
            </li>
          ))}
        </ol>
        <p className="mt-8">
          <MoreLink href="/how-it-works">{t('steps.more')}</MoreLink>
        </p>
      </Section>

      <Section id="tracks" tone="surface" title={t('tracksTitle')} subtitle={t('tracksSubtitle')}>
        <TrackCards />
        <p className="mt-8">
          <MoreLink href="/tracks">{t('tracksMore')}</MoreLink>
        </p>
      </Section>

      <Section id="safety" title={t('safetyTitle')} subtitle={t('safetySubtitle')}>
        <SafetyPromises only={['parents', 'anonymous', 'noChat', 'sandbox']} />
        <p className="mt-8">
          <MoreLink href="/safety">{t('safetyMore')}</MoreLink>
        </p>
      </Section>

      <Section id="pricing" tone="surface" title={t('pricingTitle')} subtitle={t('pricingBody')}>
        <div className="grid gap-6 lg:grid-cols-2">
          <ul className="flex flex-col gap-4">
            {facts.map((fact) => (
              <li
                key={fact.text}
                className="flex items-center gap-4 rounded-[var(--radius-card)] border border-line bg-canvas p-5"
              >
                <IconBadge tone={fact.tone}>{fact.icon}</IconBadge>
                <p className="font-medium">{fact.text}</p>
              </li>
            ))}
          </ul>
          <div className="rounded-[var(--radius-card)] border border-brand-500 bg-surface p-6">
            <h3 className="font-bold">{t('pricingPerMonth')}</h3>
            <ul className="mt-3 divide-y divide-line">
              {COUNTRY_CODES.map((code) => {
                const price = priceFor(pricing, code);
                return (
                  <li key={code}>
                    <Link
                      href={`/pricing/${countrySlug(code)}`}
                      className="group flex min-h-12 items-center justify-between gap-4 py-2 hover:text-brand-700"
                    >
                      <span>{price.names[locale]}</span>
                      <span className="flex items-center gap-2 font-semibold">
                        <bdi>{formatPrice(price.monthlyMinor, price.currency, locale)}</bdi>
                        <ArrowIcon className="size-4 text-brand-600" />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
        <p className="mt-8">
          <MoreLink href="/pricing">{t('pricingMore')}</MoreLink>
        </p>
      </Section>

      <Section id="faq" title={t('faqTitle')}>
        <FaqList ids={['ages', 'lessons', 'signUp', 'devices']} pricing={pricing} />
        <p className="mt-8">
          <MoreLink href="/faq">{t('faqMore')}</MoreLink>
        </p>
      </Section>

      <FinalCallToAction title={t('finalTitle')} body={t('finalBody')} locale={locale} />
    </>
  );
}
