/*
 * Money and dates in emails, in the reader's language. Amounts are in minor units
 * (ISO 4217 digits, as Stripe counts them: 2 for PKR, EGP, AED and SAR).
 */
const ZERO_DECIMAL = new Set(['JPY', 'KRW', 'VND', 'CLP', 'UGX', 'XAF', 'XOF']);
const THREE_DECIMAL = new Set(['BHD', 'JOD', 'KWD', 'OMR', 'TND']);

export function minorDigits(currency: string): number {
  if (ZERO_DECIMAL.has(currency)) return 0;
  if (THREE_DECIMAL.has(currency)) return 3;
  return 2;
}

export function formatMoney(language: string, minor: number, currency: string): string {
  const digits = minorDigits(currency);
  const amount = minor / 10 ** digits;
  const whole = Number.isInteger(amount);
  return new Intl.NumberFormat(language, {
    style: 'currency',
    currency,
    minimumFractionDigits: whole ? 0 : digits,
    maximumFractionDigits: digits,
  }).format(amount);
}

/** "14 October 2026" in the reader's language (and time zone, when known). */
export function formatDate(language: string, date: Date, timeZone = 'UTC'): string {
  return new Intl.DateTimeFormat(language, { dateStyle: 'long', timeZone }).format(date);
}

/** "September 2026" */
export function formatMonth(language: string, date: Date): string {
  return new Intl.DateTimeFormat(language, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}
