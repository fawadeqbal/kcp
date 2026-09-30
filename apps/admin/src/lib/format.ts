/** Dates in the admin panel: day month year, in the viewer's time zone. */
const dateFormat = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' });
const dateTimeFormat = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function formatDate(value: string | Date | null | undefined): string {
  return value ? dateFormat.format(new Date(value)) : '—';
}

export function formatDateTime(value: string | Date | null | undefined): string {
  return value ? dateTimeFormat.format(new Date(value)) : '—';
}

/** "PENDING_VERIFICATION" → "Pending verification" */
export function humanize(value: string): string {
  const words = value.toLowerCase().replaceAll('_', ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export const STATUS_TONES = {
  ACTIVE: 'success',
  PENDING_VERIFICATION: 'warning',
  SUSPENDED: 'danger',
  DELETED: 'neutral',
} as const;

export function statusTone(status: string) {
  return STATUS_TONES[status as keyof typeof STATUS_TONES] ?? 'neutral';
}

/** "Showing 26–50 of 123" */
export function pageSummary(page: number, pageSize: number, total: number): string {
  if (total === 0) return 'No results';
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  return `Showing ${first}–${last} of ${total}`;
}

/**
 * The last 8 characters of an ID, for compact tables. (IDs are UUID v7: the first
 * characters are a timestamp and look alike for records made around the same time.)
 */
export const shortId = (id: string) => id.slice(-8);

const ZERO_DECIMAL = new Set(['JPY', 'KRW', 'VND', 'CLP', 'UGX', 'XAF', 'XOF']);
const THREE_DECIMAL = new Set(['BHD', 'JOD', 'KWD', 'OMR', 'TND']);

/** Digits of a currency's minor unit (ISO 4217, as Stripe counts them). */
export function minorDigits(currency: string): number {
  if (ZERO_DECIMAL.has(currency)) return 0;
  if (THREE_DECIMAL.has(currency)) return 3;
  return 2;
}

/** 150000 PKR → "PKR 1,500.00" (minor units: paisa, piastres, fils, halalas). */
export function formatMoney(minor: number, currency: string): string {
  const digits = minorDigits(currency);
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    currencyDisplay: 'code',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(minor / 10 ** digits);
}

/** "1,500.50" typed by staff → 150050 minor units; null when it isn't an amount. */
export function parseMoney(text: string, currency: string): number | null {
  const clean = text.replaceAll(',', '').trim();
  if (!/^\d+(\.\d+)?$/.test(clean)) return null;
  const digits = minorDigits(currency);
  const [whole, fraction = ''] = clean.split('.');
  if (fraction.length > digits) return null;
  return Number(whole) * 10 ** digits + Number(fraction.padEnd(digits, '0') || '0');
}
