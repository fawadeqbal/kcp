import type { Locale } from '@kcp/i18n';

/*
 * Numbers and dates are written with Western digits (0–9) in every language, the same
 * as prices on receipts and in the web app: "1,500 ر.س.", not "١٬٥٠٠" (Arabic-Indic digits).
 */
// English on this site is British English ("colours", "15 September 2026").
const REGION: Record<Locale, string> = { en: 'en-GB', ar: 'ar', ur: 'ur' };
const withLatinDigits = (locale: Locale) => `${REGION[locale]}-u-nu-latn`;

const FIRST_STRONG_ISOLATE = String.fromCharCode(0x2068);
const POP_DIRECTIONAL_ISOLATE = String.fromCharCode(0x2069);

/**
 * Keeps a left-to-right value (an email address) in one piece inside an Arabic or Urdu
 * sentence, like the web app does (Unicode isolates, invisible on screen).
 */
export function isolate(text: string): string {
  return `${FIRST_STRONG_ISOLATE}${text}${POP_DIRECTIONAL_ISOLATE}`;
}

/** An amount in minor units (×100) in the page's language: 150000 PKR → "PKR 1,500". */
export function formatPrice(minor: number, currency: string, locale: Locale): string {
  const amount = minor / 100;
  const digits = Number.isInteger(amount) ? 0 : 2;
  return new Intl.NumberFormat(withLatinDigits(locale), {
    style: 'currency',
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount);
}

/** How prices in this language mark the currency: PKR → "PKR" (en), "Rs" (ur); SAR → "ر.س." (ar). */
export function currencySymbol(currency: string, locale: Locale): string {
  return (
    new Intl.NumberFormat(withLatinDigits(locale), { style: 'currency', currency })
      .formatToParts(1)
      .find((part) => part.type === 'currency')?.value ?? currency
  );
}

/** The currency's name in the page's language: PKR → "Pakistani Rupee" / "روبية باكستانية". */
export function currencyName(currency: string, locale: Locale): string {
  return new Intl.DisplayNames([locale], { type: 'currency' }).of(currency) ?? currency;
}

/** A calendar date like "2026-09-15" → "15 September 2026" / "15 سبتمبر 2026". */
export function formatDate(isoDate: string, locale: Locale): string {
  return new Intl.DateTimeFormat(withLatinDigits(locale), {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${isoDate}T00:00:00Z`));
}
