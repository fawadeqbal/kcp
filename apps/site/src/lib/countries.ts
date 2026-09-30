import type { Locale } from '@kcp/i18n';

/** The launch countries, in the order the site lists them. */
export const COUNTRY_CODES = ['PK', 'EG', 'AE', 'SA'] as const;
export type CountryCode = (typeof COUNTRY_CODES)[number];

/** Shown when nobody picked a country yet (e.g. /pricing without ?country=). */
export const DEFAULT_COUNTRY: CountryCode = 'PK';

/** Country names in every language (the API sends its own; these are the fallback). */
export const COUNTRY_NAMES: Record<CountryCode, Record<Locale, string>> = {
  PK: { en: 'Pakistan', ar: 'باكستان', ur: 'پاکستان' },
  EG: { en: 'Egypt', ar: 'مصر', ur: 'مصر' },
  AE: { en: 'United Arab Emirates', ar: 'الإمارات العربية المتحدة', ur: 'متحدہ عرب امارات' },
  SA: { en: 'Saudi Arabia', ar: 'المملكة العربية السعودية', ur: 'سعودی عرب' },
};

export function isCountryCode(value: unknown): value is CountryCode {
  return typeof value === 'string' && (COUNTRY_CODES as readonly string[]).includes(value);
}

/** Countries appear in URLs in lower case: /en/pricing/pk. */
export const countrySlug = (code: CountryCode) => code.toLowerCase();

/** 'pk', 'PK' → 'PK'; anything else → undefined. */
export function countryFromSlug(slug: string | null | undefined): CountryCode | undefined {
  const code = slug?.trim().toUpperCase();
  return isCountryCode(code) ? code : undefined;
}
