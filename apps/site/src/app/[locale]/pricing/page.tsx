import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { PricingView } from '@/features/pricing/pricing-view';
import { DEFAULT_COUNTRY } from '@/lib/countries';
import { pageMetadata } from '@/lib/metadata';
import { type LocaleParams, metadataLocale, pageLocale } from '@/lib/page';
import { getPricing, priceFor } from '@/lib/pricing';

// Prices come from the API: look again at most once an hour.
export const revalidate = 3600;

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const locale = await metadataLocale(params);
  if (!locale) return {};
  const t = await getTranslations({ locale, namespace: 'pricing' });
  const pricing = await getPricing();
  return pageMetadata(locale, '/pricing', {
    title: t('metaTitle'),
    description: t('metaDescription', {
      country: priceFor(pricing, DEFAULT_COUNTRY).names[locale],
      days: pricing.trialDays,
      percent: pricing.familyDiscountPercent,
    }),
  });
}

/**
 * /pricing shows the default country (Pakistan). /pricing?country=eg is sent to
 * /pricing/eg by the proxy (src/proxy.ts), so every price page stays static.
 */
export default async function PricingPage({ params }: LocaleParams) {
  const locale = await pageLocale(params);
  return <PricingView locale={locale} country={DEFAULT_COUNTRY} onCountryPage={false} />;
}
