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
import { HomePromises } from '@/features/safety/promises';
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
      tone: 'sage' as const,
      text: tPricing('trial', { days: pricing.trialDays }),
    },
    {
      icon: <HeartIcon />,
      tone: 'brand' as const,
      text: tPricing('family', { percent: pricing.familyDiscountPercent }),
    },
  ];

  return (
    <>
      <section aria-labelledby="hero-title" className="overflow-x-clip">
        <Container className="grid items-center gap-12 pt-8 pb-16 sm:pt-10 sm:pb-20 lg:grid-cols-[1.1fr_1fr] lg:gap-10">
          <div className="flex flex-col items-start gap-5.5">
            <p className="inline-flex items-center gap-2 rounded-full bg-sage-100 px-3.5 py-1.5 text-[0.8rem] font-bold text-sage-800">
              <span className="size-2 rounded-full bg-sage" aria-hidden="true" />
              {t('badge')}
            </p>
            <h1
              id="hero-title"
              className="text-[2.5rem] leading-[1.04] text-balance sm:text-5xl lg:text-[3.75rem]"
            >
              {t('title')}
            </h1>
            <p className="max-w-xl text-lg text-muted sm:text-[1.2rem]">{t('subtitle')}</p>
            <div className="mt-1.5 flex flex-wrap gap-3">
              <SignUpLink locale={locale} size="lg" arrow />
              <WaitlistLink size="lg" />
            </div>
            <p className="flex items-center gap-2 text-sm font-semibold text-sage-text">
              <ShieldIcon className="size-4.5" />
              {t('noAds')}
            </p>
          </div>
          <LessonDemo />
        </Container>
      </section>

      <Section
        id="steps"
        title={t('steps.title')}
        subtitle={t('steps.subtitle')}
        aside={<MoreLink href="/how-it-works">{t('steps.more')}</MoreLink>}
      >
        <ol className="grid gap-4.5 md:grid-cols-3">
          {steps.map((step, index) => (
            <li key={step.title} className="flex flex-col gap-3 rounded-hero bg-surface p-7">
              <div className="flex items-center justify-between">
                <IconBadge size="lg">{step.icon}</IconBadge>
                <span
                  className="font-display text-[3.5rem] leading-none text-brand-300"
                  aria-hidden="true"
                >
                  {index + 1}
                </span>
              </div>
              <h3 className="text-[1.375rem]">{step.title}</h3>
              <p className="text-[0.95rem] text-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      <section aria-labelledby="safety-title" className="px-2 py-6 sm:px-4 sm:py-8">
        <div className="mx-auto grid max-w-[80rem] gap-10 rounded-[2.5rem] bg-sage-100 px-6 py-12 sm:rounded-[3rem] sm:px-14 sm:py-16 lg:grid-cols-[0.9fr_1.3fr] lg:gap-12">
          <div className="flex flex-col items-start gap-3">
            <h2 id="safety-title" className="text-4xl text-sage-900 sm:text-[2.5rem]">
              {t('safetyTitle')}
            </h2>
            <p className="text-lg text-sage-800">{t('safetySubtitle')}</p>
            <p className="mt-2">
              <MoreLink href="/safety" tone="sage">
                {t('safetyMore')}
              </MoreLink>
            </p>
          </div>
          <HomePromises />
        </div>
      </section>

      <Section
        id="tracks"
        title={t('tracksTitle')}
        subtitle={t('tracksSubtitle')}
        aside={<MoreLink href="/tracks">{t('tracksMore')}</MoreLink>}
      >
        <TrackCards />
      </Section>

      <section aria-labelledby="pricing-title" className="py-12 sm:py-18">
        <Container className="grid items-start gap-10 lg:grid-cols-2">
          <div className="flex flex-col gap-3.5">
            <h2 id="pricing-title" className="text-4xl text-balance sm:text-[2.5rem]">
              {t('pricingTitle')}
            </h2>
            <p className="text-muted">{t('pricingBody')}</p>
            <ul className="mt-2 flex flex-col gap-2.5">
              {facts.map((fact) => (
                <li key={fact.text} className="flex items-center gap-3 font-semibold">
                  <IconBadge tone={fact.tone} size="sm">
                    {fact.icon}
                  </IconBadge>
                  {fact.text}
                </li>
              ))}
            </ul>
            <p className="mt-3">
              <MoreLink href="/pricing">{t('pricingMore')}</MoreLink>
            </p>
          </div>
          <div className="rounded-hero bg-surface px-7 py-6.5">
            <h3 className="text-xl">{t('pricingPerMonth')}</h3>
            <ul className="mt-2.5 divide-y divide-line">
              {COUNTRY_CODES.map((code) => {
                const price = priceFor(pricing, code);
                return (
                  <li key={code}>
                    <Link
                      href={`/pricing/${countrySlug(code)}`}
                      className="group flex min-h-13 items-center justify-between gap-4 py-2 hover:text-brand-text"
                    >
                      <span>{price.names[locale]}</span>
                      <span className="flex items-center gap-2.5 font-bold">
                        <bdi>{formatPrice(price.monthlyMinor, price.currency, locale)}</bdi>
                        <ArrowIcon className="size-4 text-brand" />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </Container>
      </section>

      <Section
        id="faq"
        tone="surface"
        title={t('faqTitle')}
        aside={<MoreLink href="/faq">{t('faqMore')}</MoreLink>}
      >
        <FaqList ids={['ages', 'lessons', 'signUp', 'devices']} pricing={pricing} onSurface />
      </Section>

      <div className="h-6 sm:h-8" />
      <FinalCallToAction title={t('finalTitle')} body={t('finalBody')} locale={locale} />
    </>
  );
}
