/**
 * The rules behind XP, levels, streaks and weekly boards, as plain functions so they
 * are easy to test. Days are "YYYY-MM-DD" strings in the student's time zone.
 */

const dayFormats = new Map<string, Intl.DateTimeFormat>();

/** The date in a time zone, e.g. localDay(now, 'Asia/Karachi') → "2026-09-30". */
export function localDay(at: Date, timeZone: string): string {
  try {
    // Building a formatter is slow; there are only a few time zones.
    let format = dayFormats.get(timeZone);
    if (!format) {
      format = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      dayFormats.set(timeZone, format);
    }
    return format.format(at);
  } catch {
    return at.toISOString().slice(0, 10);
  }
}

/** "2026-03-01" → "2026-02-28". */
export function previousDay(day: string): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

/** How much of an XP gain fits under the daily cap (0 when the cap is reached). */
export function xpWithinCap(amount: number, earnedToday: number, dailyCap: number): number {
  return Math.max(0, Math.min(amount, dailyCap - Math.max(0, earnedToday)));
}

/** Whole days from `from` to `to` ("2026-09-28" → "2026-09-30" = 2). */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/** "2026-09-30" plus `days` days. */
export function addDays(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * The end (the first day not counted) of a season ended now: today counts in full
 * everywhere, including where it's already tomorrow (late in the UTC day, Karachi is
 * a day ahead), unless the planned end comes sooner.
 */
export function seasonEndDay(at: Date, timeZones: string[], plannedEnd?: string | null): string {
  const latest = timeZones
    .map((zone) => localDay(at, zone))
    .reduce((a, b) => (b > a ? b : a), at.toISOString().slice(0, 10));
  const end = addDays(latest, 1);
  return plannedEnd && plannedEnd <= end ? plannedEnd : end;
}

export interface StreakState {
  current: number;
  longest: number;
  /** The last day the daily goal was met. */
  lastGoalDay: string | null;
  /** Streak freezes held: each covers one missed day. */
  freezes: number;
}

export interface StreakRules {
  /** A freeze is earned each time the streak reaches a multiple of this. */
  freezeEvery: number;
  maxFreezes: number;
}

/** Days missed between the last goal day and `today` (not counting today). */
function missedDays(lastGoalDay: string, today: string): number {
  return Math.max(0, daysBetween(lastGoalDay, today) - 1);
}

/**
 * The streak after the student meets today's goal: one more if they met it
 * yesterday, or if freezes cover the days they missed (using them up); otherwise a
 * new streak of 1. Every `freezeEvery` days of streak earns a freeze. Meeting the
 * goal twice in a day changes nothing.
 */
export function meetGoal(streak: StreakState, today: string, rules: StreakRules): StreakState {
  if (streak.lastGoalDay === today) return streak;
  let current = 1;
  let freezes = streak.freezes;
  if (streak.lastGoalDay) {
    const missed = missedDays(streak.lastGoalDay, today);
    if (missed === 0) {
      current = streak.current + 1;
    } else if (missed <= freezes) {
      current = streak.current + 1;
      freezes -= missed;
    }
  }
  if (current % rules.freezeEvery === 0) freezes = Math.min(rules.maxFreezes, freezes + 1);
  return { current, longest: Math.max(streak.longest, current), lastGoalDay: today, freezes };
}

/**
 * The streak as shown today: alive while the goal was met today or yesterday (there
 * is time left today), or while freezes cover the days missed since; broken otherwise.
 */
export function visibleStreak(streak: StreakState, today: string): number {
  if (!streak.lastGoalDay) return 0;
  return missedDays(streak.lastGoalDay, today) <= streak.freezes ? streak.current : 0;
}

/** Freezes that would be used up if the goal were met today (0 when none are needed). */
export function freezesNeeded(streak: StreakState, today: string): number {
  if (!streak.lastGoalDay || streak.lastGoalDay === today) return 0;
  const missed = missedDays(streak.lastGoalDay, today);
  return missed <= streak.freezes ? missed : 0;
}

export interface Week {
  /** e.g. "2026-W40" (ISO week). */
  key: string;
  /** Monday, as a date ("2026-09-28"). */
  startDay: string;
  /** The next Monday: the week ends just before it. */
  endDay: string;
}

/**
 * The ISO week (Monday to Sunday) a day falls in. Days are the student's own dates,
 * so every board resets at Monday 00:00 in each student's time zone.
 */
export function weekOfDay(day: string): Week {
  const date = new Date(`${day}T00:00:00Z`);
  const weekday = (date.getUTCDay() + 6) % 7; // Monday = 0
  const startDay = addDays(day, -weekday);
  const thursday = new Date(`${addDays(startDay, 3)}T00:00:00Z`);
  // The ISO year is the year of the week's Thursday.
  const yearStart = Date.UTC(thursday.getUTCFullYear(), 0, 1);
  const week = Math.floor((thursday.getTime() - yearStart) / 86_400_000 / 7) + 1;
  return {
    key: `${thursday.getUTCFullYear()}-W${String(week).padStart(2, '0')}`,
    startDay,
    endDay: addDays(startDay, 7),
  };
}

/** The week `at` falls in for someone in `timeZone`. */
export function weekAt(at: Date, timeZone: string): Week {
  return weekOfDay(localDay(at, timeZone));
}

/** @deprecated Weeks now follow each student's time zone: use weekAt(). UTC week of `at`. */
export function isoWeek(at: Date) {
  const week = weekOfDay(at.toISOString().slice(0, 10));
  return {
    key: week.key,
    start: new Date(`${week.startDay}T00:00:00Z`),
    end: new Date(`${week.endDay}T00:00:00Z`),
  };
}

export interface LevelInfo {
  number: number;
  /** XP at which this level starts. */
  minXp: number;
  /** XP at which the next level starts (null at the top level). */
  nextMinXp: number | null;
}

/** The level for an XP total. `levels` are sorted by minXp and start at 0. */
export function levelFor(xp: number, levels: { number: number; minXp: number }[]): LevelInfo {
  let index = 0;
  for (let i = 0; i < levels.length; i++) {
    if (levels[i]!.minXp <= xp) index = i;
  }
  const level = levels[index] ?? { number: 1, minXp: 0 };
  return { number: level.number, minXp: level.minXp, nextMinXp: levels[index + 1]?.minXp ?? null };
}
