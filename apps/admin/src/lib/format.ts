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

/** "Just now", "2 min ago", "3 h ago", "Yesterday", or the date. */
export function formatAgo(value: string | Date, now: Date = new Date()): string {
  const then = new Date(value);
  const minutes = Math.floor((now.getTime() - then.getTime()) / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)} h ago`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (then.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return formatDate(then);
}

type ActionTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger';

/** Audit actions as a tag and a few words: "user.suspend" → [Suspended] account. */
const ACTIONS: Record<string, [tag: string, tone: ActionTone, text: string]> = {
  'user.suspend': ['Suspended', 'danger', 'account'],
  'user.reactivate': ['Reactivated', 'success', 'account'],
  'user.sign_out_everywhere': ['Sign-out', 'neutral', 'everywhere'],
  'child.create': ['Child', 'success', 'account added'],
  'child.update': ['Child', 'neutral', 'account changed'],
  'child.delete': ['Deleted', 'danger', 'child account'],
  'child.password_reset': ['Password', 'neutral', 'reset by the parent'],
  'child.consent_change': ['Consent', 'success', 'sharing switched on or off'],
  'child.portfolio_link_create': ['Sharing', 'success', 'portfolio link made'],
  'child.portfolio_link_remove': ['Sharing', 'neutral', 'portfolio link removed'],
  'content.publish': ['Published', 'brand', 'content'],
  'content.unpublish': ['Unpublished', 'warning', 'content'],
  'payment.manual': ['Payment', 'neutral', 'manual payment recorded'],
  'payment.refund': ['Refund', 'warning', 'payment refunded'],
  'premium.grant': ['Premium', 'brand', 'granted'],
  'premium.revoke': ['Premium', 'warning', 'taken away'],
  'feature_flag.update': ['Flag', 'neutral', 'changed'],
  'prices.update': ['Prices', 'neutral', 'changed'],
  'country.update': ['Country', 'neutral', 'changed'],
  'language.update': ['Language', 'neutral', 'changed'],
  'season.start': ['Season', 'brand', 'started'],
  'season.end': ['Season', 'neutral', 'ended'],
  'staff.create': ['Staff', 'brand', 'account added'],
  'auth.staff_login': ['Sign-in', 'neutral', 'staff'],
  'auth.sign_up': ['Sign-up', 'success', 'parent account'],
  'auth.terms_accepted': ['Terms', 'neutral', 'accepted'],
  'auth.password_reset': ['Password', 'neutral', 'reset by email'],
  'auth.password_changed': ['Password', 'neutral', 'changed'],
  'auth.mfa_enabled': ['2FA', 'success', 'switched on'],
  'auth.mfa_locked': ['2FA', 'danger', 'locked after wrong codes'],
  'account.export': ['Export', 'neutral', 'data downloaded'],
  'account.delete': ['Deleted', 'danger', 'parent account'],
  'billing.checkout': ['Billing', 'brand', 'checkout started'],
  'billing.change_plan': ['Billing', 'neutral', 'plan changed'],
  'billing.cancel': ['Billing', 'warning', 'plan cancelled'],
  'billing.resume': ['Billing', 'success', 'plan resumed'],
  'subscription.cancel': ['Billing', 'warning', 'subscription cancelled'],
  'certificate.revoke': ['Certificate', 'danger', 'revoked'],
  'badge.give': ['Badge', 'success', 'given'],
  'badge.take': ['Badge', 'warning', 'taken back'],
  'moderation.warn': ['Moderation', 'warning', 'warned in rooms'],
  'moderation.mute': ['Moderation', 'warning', 'muted in rooms'],
  'moderation.suspend': ['Moderation', 'danger', 'suspended after a report'],
  'moderation.hide': ['Moderation', 'neutral', 'message removed'],
  'moderation.dismiss': ['Moderation', 'neutral', 'report dismissed'],
  'moderation.unmute': ['Moderation', 'success', 'mute ended'],
  'event.create': ['Hackathon', 'brand', 'created'],
  'event.update': ['Hackathon', 'neutral', 'changed'],
  'event.status': ['Hackathon', 'brand', 'moved to the next step'],
  'event.judges': ['Hackathon', 'neutral', 'judges changed'],
  'event.team_mentor': ['Hackathon', 'neutral', 'team mentor changed'],
  'event.member_remove': ['Hackathon', 'warning', 'member removed from a team'],
  'school.create': ['School', 'brand', 'added'],
  'school.update': ['School', 'neutral', 'changed'],
  'school.teacher_add': ['School', 'success', 'teacher added'],
  'school.teacher_remove': ['School', 'neutral', 'teacher removed'],
  'license.create': ['Licence', 'neutral', 'invoiced'],
  'license.paid': ['Licence', 'success', 'marked paid'],
  'license.cancel': ['Licence', 'danger', 'cancelled'],
  'user.invite': ['Invitation', 'brand', 'mentor or teacher invited'],
  'blocked_term.add': ['Filter', 'neutral', 'word blocked'],
  'blocked_term.remove': ['Filter', 'neutral', 'word unblocked'],
  'xp.remove': ['XP', 'warning', 'removed'],
  'feedback.status': ['Feedback', 'neutral', 'status changed'],
};

export function describeAction(action: string): { tag: string; tone: ActionTone; text: string } {
  const known = ACTIONS[action];
  if (known) return { tag: known[0], tone: known[1], text: known[2] };
  const [area = action, ...rest] = action.split('.');
  return { tag: humanize(area), tone: 'neutral', text: humanize(rest.join(' ')).toLowerCase() };
}
