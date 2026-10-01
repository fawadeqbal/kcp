// ── The hub: paid client work for senior students ────────────────────────────

/**
 * Versions of the hub's agreements (texts in apps/api/src/hub/contracts). A new
 * version asks for acceptance again: parents consent again, clients sign again.
 */
export const HUB_AGREEMENTS = {
  /** Parent agreement: paid work, earnings to the parent, transfer of intellectual property. */
  parent: '2026-11',
  /** Client agreement with the platform. */
  client: '2026-11',
  /** Statement of work, made from each quote. */
  sow: '2026-11',
} as const;

/** Files on a client's project request: at most this many, each up to this size. */
export const HUB_INTAKE_MAX_FILES = 5;
export const HUB_INTAKE_FILE_MAX_BYTES = 10 * 1024 * 1024;

/** Task shares are in basis points of the students' pool: they add up to exactly this. */
export const HUB_SHARE_TOTAL = 10_000;

/** A share in basis points as a percentage, e.g. 2500 → "25%", 3333 → "33.33%". */
export function sharePercent(bp: number): string {
  const value = bp / 100;
  return `${Number.isInteger(value) ? value : value.toFixed(2)}%`;
}

/** The country's rules for hub work (Country.hub* columns) and the student's time zone. */
export interface HubRules {
  timeZone: string;
  minAge: number;
  weeklyMinutes: number;
  /** Minutes after local midnight. */
  dayStartMinute: number;
  dayEndMinute: number;
  /** 0 = Sunday … 6 = Saturday. */
  schoolDays: readonly number[];
  schoolStartMinute: number;
  schoolEndMinute: number;
}

const clockFormats = new Map<string, Intl.DateTimeFormat>();
const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** The local date, weekday and minute of the day in a time zone. */
export function localClock(
  at: Date,
  timeZone: string,
): { day: string; weekday: number; minute: number } {
  let format = clockFormats.get(timeZone);
  if (!format) {
    format = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
    clockFormats.set(timeZone, format);
  }
  const parts = Object.fromEntries(format.formatToParts(at).map((p) => [p.type, p.value]));
  return {
    day: `${parts['year']}-${parts['month']}-${parts['day']}`,
    weekday: WEEKDAYS[parts['weekday'] ?? 'Sun'] ?? 0,
    minute: Number(parts['hour']) * 60 + Number(parts['minute']),
  };
}

/** The allowed stretches of a local day, as [from, to) minutes after midnight. */
function stretches(weekday: number, rules: HubRules): [number, number][] {
  const { dayStartMinute: start, dayEndMinute: end } = rules;
  if (end <= start) return [];
  if (!rules.schoolDays.includes(weekday)) return [[start, end]];
  const out: [number, number][] = [];
  if (rules.schoolStartMinute > start) out.push([start, Math.min(rules.schoolStartMinute, end)]);
  if (rules.schoolEndMinute < end) out.push([Math.max(rules.schoolEndMinute, start), end]);
  return out;
}

/** Whether hub work is allowed at this moment (outside school hours, inside the day). */
export function hubWorkAllowedAt(at: Date, rules: HubRules): boolean {
  const { weekday, minute } = localClock(at, rules.timeZone);
  return stretches(weekday, rules).some(([from, to]) => minute >= from && minute < to);
}

/** When the allowed stretch going on now ends (null when work isn't allowed now). */
export function hubWindowEnd(at: Date, rules: HubRules): Date | null {
  const { weekday, minute } = localClock(at, rules.timeZone);
  const stretch = stretches(weekday, rules).find(([from, to]) => minute >= from && minute < to);
  if (!stretch) return null;
  const end = new Date(at.getTime() + (stretch[1] - minute) * 60_000);
  end.setUTCSeconds(0, 0);
  return end;
}

/** The next moment hub work is allowed (now, if it is). Looks up to 8 days ahead. */
export function nextHubWindow(at: Date, rules: HubRules): Date | null {
  if (hubWorkAllowedAt(at, rules)) return at;
  const { minute } = localClock(at, rules.timeZone);
  // Walk to the next local minute boundary that starts a stretch.
  for (let day = 0; day < 8; day++) {
    const probe = new Date(at.getTime() + day * 86_400_000);
    const clock = localClock(probe, rules.timeZone);
    for (const [from] of stretches(clock.weekday, rules)) {
      const offset = day * 1440 + from - minute;
      if (offset <= 0) continue;
      const start = new Date(at.getTime() + offset * 60_000);
      start.setUTCSeconds(0, 0);
      if (hubWorkAllowedAt(start, rules)) return start;
    }
  }
  return null;
}

/** ISO week of a local day: "2026-W40" (Monday to Sunday, like the weekly boards). */
export function isoWeekOf(day: string): string {
  const date = new Date(`${day}T00:00:00Z`);
  const weekday = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - weekday);
  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((date.getTime() - yearStart) / 86_400_000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** The hub week a moment belongs to, in the student's time zone. */
export function hubWeekAt(at: Date, timeZone: string): string {
  return isoWeekOf(localClock(at, timeZone).day);
}

export interface HubSplitPercents {
  student: number;
  lead: number;
  platform: number;
}

/**
 * Splits money between the students' pool, the lead developer and the platform
 * (minor units, rounding down; what's left over goes to the platform).
 */
export function splitHubAmount(totalMinor: number, percents: HubSplitPercents) {
  const student = Math.floor((totalMinor * percents.student) / 100);
  const lead = Math.floor((totalMinor * percents.lead) / 100);
  return { student, lead, platform: totalMinor - student - lead };
}

/**
 * Shares a pool out by weights (task shares in basis points): each gets its part
 * rounded down, and the units left over go one by one to the largest remainders, so
 * the parts always add up to the pool exactly. Weights of zero get nothing.
 */
export function shareOut<K>(
  poolMinor: number,
  weights: { key: K; weight: number }[],
): Map<K, number> {
  const total = weights.reduce((sum, w) => sum + Math.max(0, w.weight), 0);
  const result = new Map<K, number>();
  if (total <= 0 || poolMinor <= 0) {
    for (const w of weights) result.set(w.key, 0);
    return result;
  }
  const parts = weights.map((w, index) => {
    const exact = (poolMinor * Math.max(0, w.weight)) / total;
    return { key: w.key, index, floor: Math.floor(exact), rest: exact - Math.floor(exact) };
  });
  let left = poolMinor - parts.reduce((sum, p) => sum + p.floor, 0);
  for (const part of parts.toSorted((a, b) => b.rest - a.rest || a.index - b.index)) {
    if (left <= 0) break;
    if (part.rest > 0) {
      part.floor += 1;
      left -= 1;
    }
  }
  for (const part of parts) result.set(part.key, (result.get(part.key) ?? 0) + part.floor);
  return result;
}

// ── Payouts ──────────────────────────────────────────────────────────────

/** A new or changed payout account can be paid only after this long (hours). */
export const PAYOUT_COOLING_HOURS = 48;
/** The smallest payout (minor units): smaller balances wait for the next round. */
export const PAYOUT_MIN_MINOR = 1000;

/** An IBAN without spaces, in capitals. */
export const normaliseIban = (value: string) => value.replace(/[\s-]/g, '').toUpperCase();

/**
 * Whether an IBAN is well formed: country letters, check digits and the mod-97 check
 * (it catches typing mistakes; it doesn't prove the account exists).
 */
export function ibanValid(value: string): boolean {
  const iban = normaliseIban(value);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
  const moved = iban.slice(4) + iban.slice(0, 4);
  let rest = 0;
  for (const char of moved) {
    const digits = /\d/.test(char) ? char : String(char.charCodeAt(0) - 55);
    for (const digit of digits) rest = (rest * 10 + Number(digit)) % 97;
  }
  return rest === 1;
}

/** Tax withheld from a payout (basis points, rounded down). */
export const withholdingOf = (amountMinor: number, basisPoints: number) =>
  Math.floor((amountMinor * Math.max(0, basisPoints)) / 10_000);
