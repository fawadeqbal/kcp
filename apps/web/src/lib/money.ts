/**
 * Digits of the minor unit (ISO 4217, as Stripe counts them): 2 for PKR, EGP, AED and
 * SAR. (Intl's own figure can differ, e.g. it shows PKR without decimals.)
 */
const ZERO_DECIMAL = new Set([
  'BIF',
  'CLP',
  'DJF',
  'GNF',
  'JPY',
  'KMF',
  'KRW',
  'MGA',
  'PYG',
  'RWF',
  'UGX',
  'VND',
  'VUV',
  'XAF',
  'XOF',
  'XPF',
]);
const THREE_DECIMAL = new Set(['BHD', 'IQD', 'JOD', 'KWD', 'LYD', 'OMR', 'TND']);

export function minorDigits(currency: string): number {
  if (ZERO_DECIMAL.has(currency)) return 0;
  if (THREE_DECIMAL.has(currency)) return 3;
  return 2;
}

/**
 * An amount in minor units (paisa, piastres, fils, halalas) as the viewer reads
 * money in their language, e.g. "Rs 1,500" or "١٬٥٠٠ ج.م.". Whole amounts drop ".00".
 */
export function formatMoney(locale: string, minor: number, currency: string): string {
  const digits = minorDigits(currency);
  const amount = minor / 10 ** digits;
  const whole = Number.isInteger(amount);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: whole ? 0 : digits,
    maximumFractionDigits: digits,
  }).format(amount);
}
