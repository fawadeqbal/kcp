import { LOCALES, type Locale } from '@kcp/i18n';
import { cache } from 'react';
import { API_URL } from './config';
import { COUNTRY_NAMES, type CountryCode, isCountryCode } from './countries';

export interface CountryPrice {
  code: CountryCode;
  /** ISO 4217, e.g. "PKR". */
  currency: string;
  names: Record<Locale, string>;
  /** Premium per month and per year, in minor units (×100). */
  monthlyMinor: number;
  yearlyMinor: number;
}

export interface Pricing {
  trialDays: number;
  familyDiscountPercent: number;
  countries: CountryPrice[];
}

const country = (
  code: CountryCode,
  currency: string,
  monthly: number,
  yearly: number,
): CountryPrice => ({
  code,
  currency,
  names: COUNTRY_NAMES[code],
  monthlyMinor: monthly * 100,
  yearlyMinor: yearly * 100,
});

/**
 * Placeholder prices bundled with the site. Used when the API can't be reached while
 * the site is built (or revalidated), so a build never fails because of it.
 */
export const FALLBACK_PRICING: Pricing = {
  trialDays: 14,
  familyDiscountPercent: 30,
  countries: [
    country('PK', 'PKR', 1_500, 15_000),
    country('EG', 'EGP', 250, 2_500),
    country('AE', 'AED', 35, 350),
    country('SA', 'SAR', 35, 350),
  ],
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0;

function parseCountry(value: unknown): CountryPrice | null {
  if (!isRecord(value) || !isCountryCode(value.code)) return null;
  const { code, currency, names, monthlyMinor, yearlyMinor } = value;
  if (typeof currency !== 'string' || !/^[A-Z]{3}$/.test(currency)) return null;
  if (!isCount(monthlyMinor) || !isCount(yearlyMinor) || monthlyMinor === 0) return null;
  const localNames = isRecord(names) ? names : {};
  return {
    code,
    currency,
    // A missing or empty name falls back to ours rather than showing nothing.
    names: Object.fromEntries(
      LOCALES.map((locale) => {
        const name = localNames[locale];
        return [
          locale,
          typeof name === 'string' && name.trim() ? name : COUNTRY_NAMES[code][locale],
        ];
      }),
    ) as Record<Locale, string>,
    monthlyMinor,
    yearlyMinor,
  };
}

/**
 * Checks the API's answer to GET /v1/public/pricing. Returns null when it isn't usable,
 * so the caller falls back to the bundled prices. Countries the site doesn't serve
 * are ignored.
 */
export function parsePricing(data: unknown): Pricing | null {
  if (!isRecord(data) || !Array.isArray(data.countries)) return null;
  const { trialDays, familyDiscountPercent } = data;
  if (!isCount(trialDays) || !isCount(familyDiscountPercent) || familyDiscountPercent > 100) {
    return null;
  }
  const countries = data.countries
    .map(parseCountry)
    .filter((entry): entry is CountryPrice => entry !== null);
  if (countries.length === 0) return null;
  return { trialDays, familyDiscountPercent, countries };
}

let warned = false;

/**
 * Prices from the API, fetched when the page is built and again at most once an hour.
 * Never throws: without the API, the bundled placeholder prices are used.
 */
export const getPricing = cache(async (): Promise<Pricing> => {
  try {
    const response = await fetch(`${API_URL}/v1/public/pricing`, {
      headers: { accept: 'application/json' },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const pricing = parsePricing(await response.json());
    if (!pricing) throw new Error('unexpected response');
    return pricing;
  } catch (error) {
    if (!warned) {
      warned = true;
      // oxlint-disable-next-line no-console -- tells whoever builds the site why prices look like placeholders
      console.warn(
        `Pricing: using the bundled prices (${API_URL}/v1/public/pricing: ${String(error)})`,
      );
    }
    return FALLBACK_PRICING;
  }
});

/** The prices for one country: from the API if it sent them, otherwise the bundled ones. */
export function priceFor(pricing: Pricing, code: CountryCode): CountryPrice {
  const found =
    pricing.countries.find((entry) => entry.code === code) ??
    FALLBACK_PRICING.countries.find((entry) => entry.code === code);
  if (!found) throw new Error(`No prices for ${code}`);
  return found;
}

/** How much a year costs less than twelve months, in whole percent (15,000 vs 18,000 → 17). */
export function yearlySavingPercent({ monthlyMinor, yearlyMinor }: CountryPrice): number {
  const twelveMonths = monthlyMinor * 12;
  return Math.max(0, Math.round((1 - yearlyMinor / twelveMonths) * 100));
}
