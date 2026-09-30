import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { PricingView } from '@/features/pricing/pricing-view';
import { COUNTRY_CODES, countryFromSlug, countrySlug } from '@/lib/countries';
import { pageMetadata } from '@/lib/metadata';
import { metadataLocale, pageLocale } from '@/lib/page';
import { getPricing, priceFor } from '@/lib/pricing';

type Props = { params: Promise<{ locale: string; country: string }> };

// Prices come from the API: look again at most once an hour.
export const revalidate = 3600;
// Only the launch countries exist: /en/pricing/fr is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return COUNTRY_CODES.map((code) => ({ country: countrySlug(code) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await metadataLocale(params);
  const country = countryFromSlug((await params).country);
  if (!locale || !country) return {};
  const t = await getTranslations({ locale, namespace: 'pricing' });
  const pricing = await getPricing();
  const name = priceFor(pricing, country).names[locale];
  return pageMetadata(locale, `/pricing/${countrySlug(country)}`, {
    title: t('metaTitleCountry', { country: name }),
    description: t('metaDescription', {
      country: name,
      days: pricing.trialDays,
      percent: pricing.familyDiscountPercent,
    }),
  });
}

export default async function CountryPricingPage({ params }: Props) {
  const locale = await pageLocale(params);
  const country = countryFromSlug((await params).country);
  // Upper-case or unknown slugs: only the lower-case launch countries are pages.
  if (!country || (await params).country !== countrySlug(country)) notFound();
  return <PricingView locale={locale} country={country} onCountryPage />;
}
