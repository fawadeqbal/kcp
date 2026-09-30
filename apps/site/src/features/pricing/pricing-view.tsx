import type { Locale } from '@kcp/i18n';
import { Badge } from '@kcp/ui';
import { clsx } from 'clsx';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { CalendarIcon, CardIcon, HeartIcon } from '@/components/icons';
import { CheckList, Container, IconBadge, PageIntro } from '@/components/layout';
import { SignUpLink } from '@/components/links';
import { Link } from '@/i18n/navigation';
import { COUNTRY_CODES, type CountryCode, countrySlug } from '@/lib/countries';
import { currencyName, formatPrice } from '@/lib/format';
import { getPricing, priceFor, yearlySavingPercent } from '@/lib/pricing';

function Plan({
  name,
  tagline,
  price,
  features,
  action,
  highlighted,
}: {
  name: string;
  tagline: string;
  price: ReactNode;
  features: string[];
  action: ReactNode;
  highlighted?: boolean;
}) {
  return (
    <div
      className={clsx(
        'flex flex-col gap-6 rounded-[var(--radius-card)] border bg-surface p-6 sm:p-8',
        highlighted ? 'border-brand-500 shadow-xl shadow-brand-600/10' : 'border-line',
      )}
    >
      <div>
        <h3 className="text-2xl font-bold">{name}</h3>
        <p className="mt-1 text-muted">{tagline}</p>
      </div>
      <div>{price}</div>
      <CheckList items={features} className="flex-1" />
      <div>{action}</div>
    </div>
  );
}

/** Prices for one country: the country picker, both plans, trial, family discount, payment. */
export async function PricingView({
  locale,
  country,
  onCountryPage,
}: {
  locale: Locale;
  country: CountryCode;
  /** True on /pricing/pk…, false on /pricing (where the country is only the default). */
  onCountryPage: boolean;
}) {
  const t = await getTranslations('pricing');
  const pricing = await getPricing();
  const price = priceFor(pricing, country);
  const countryName = price.names[locale];
  const days = pricing.trialDays;
  const percent = pricing.familyDiscountPercent;

  return (
    <>
      <PageIntro title={t('title')} subtitle={t('subtitle')}>
        <nav aria-label={t('countries')} className="mt-8">
          <p className="mb-3 text-sm font-semibold text-muted" aria-hidden="true">
            {t('countries')}
          </p>
          <ul className="flex flex-wrap gap-2">
            {COUNTRY_CODES.map((code) => {
              const selected = code === country;
              return (
                <li key={code}>
                  <Link
                    href={`/pricing/${countrySlug(code)}`}
                    aria-current={selected ? (onCountryPage ? 'page' : 'true') : undefined}
                    className={clsx(
                      'inline-flex min-h-11 items-center rounded-full border px-4 font-semibold transition-colors',
                      selected
                        ? 'border-brand-600 bg-brand-600 text-white'
                        : 'border-line bg-surface text-ink hover:border-brand-500 hover:bg-brand-50',
                    )}
                  >
                    {priceFor(pricing, code).names[locale]}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </PageIntro>

      <Container className="py-12 sm:py-16">
        <h2 className="text-2xl font-bold">{t('showing', { country: countryName })}</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <Plan
            name={t('free')}
            tagline={t('freeTagline')}
            price={<p className="text-4xl font-bold">{t('freePrice')}</p>}
            features={[t('freeIntro'), t('freeChecks'), t('freePortfolio')]}
            action={
              <SignUpLink locale={locale} variant="secondary">
                {t('freeCta')}
              </SignUpLink>
            }
          />
          <Plan
            highlighted
            name={t('premium')}
            tagline={t('premiumTagline')}
            price={
              <>
                <p className="flex flex-wrap items-baseline gap-x-2">
                  <bdi className="text-4xl font-bold" data-testid="monthly-price">
                    {formatPrice(price.monthlyMinor, price.currency, locale)}
                  </bdi>
                  <span className="text-muted">{t('perMonth')}</span>
                </p>
                <p className="mt-2 text-sm text-muted">
                  {t('perYear', {
                    price: formatPrice(price.yearlyMinor, price.currency, locale),
                    percent: yearlySavingPercent(price),
                  })}
                </p>
                <div className="mt-3">
                  <Badge tone="success">{t('trialTitle', { days })}</Badge>
                </div>
              </>
            }
            features={[
              t('premiumLessons'),
              t('premiumPython'),
              t('premiumPortfolio'),
              t('premiumCertificate'),
            ]}
            action={<SignUpLink locale={locale}>{t('premiumCta')}</SignUpLink>}
          />
        </div>

        <ul className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            {
              icon: <CalendarIcon />,
              title: t('trialTitle', { days }),
              body: t('trial', { days }),
            },
            {
              icon: <HeartIcon />,
              title: t('familyTitle', { percent }),
              body: t('family', { percent }),
            },
            { icon: <CardIcon />, title: t('paymentTitle'), body: t('payment') },
          ].map((item) => (
            <li
              key={item.title}
              className="flex gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-5"
            >
              <IconBadge>{item.icon}</IconBadge>
              <div>
                <h3 className="font-bold">{item.title}</h3>
                <p className="mt-1 text-muted">{item.body}</p>
              </div>
            </li>
          ))}
        </ul>

        <p className="mt-8 text-sm text-muted">
          {t('note', { currency: currencyName(price.currency, locale) })}
        </p>
      </Container>
    </>
  );
}
