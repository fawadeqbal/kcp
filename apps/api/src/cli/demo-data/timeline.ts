import { seededRandom } from '../../learning/quiz-rules.js';
export { addMonths as plusMonths } from '../../premium/premium.service.js';
import { addDays, localDay } from '../../progress/xp-rules.js';

export const DAY_MS = 24 * 60 * 60 * 1000;
export const MINUTE_MS = 60 * 1000;
/** How far back the demo history goes (nine weeks). */
export const HISTORY_DAYS = 63;

/** Repeatable randomness, so every load tells the same story. */
export class Rng {
  private readonly next: (max: number) => number;

  constructor(seed: string) {
    this.next = seededRandom(seed);
  }

  /** A whole number from `min` up to (not including) `max`. */
  int(min: number, max: number): number {
    return max <= min ? min : min + this.next(max - min);
  }

  chance(probability: number): boolean {
    return this.next(1_000_000) < probability * 1_000_000;
  }

  pick<T>(items: readonly T[]): T {
    return items[this.next(items.length)]!;
  }

  hex(length: number): string {
    return Array.from({ length }, () => this.next(16).toString(16)).join('');
  }
}

/** Dates relative to the moment the script runs. Days are "YYYY-MM-DD". */
export class Clock {
  readonly now: Date;
  readonly today: string;

  constructor(now = new Date()) {
    this.now = now;
    this.today = now.toISOString().slice(0, 10);
  }

  /** The UTC date `days` days ago. */
  day(daysAgo: number): string {
    return addDays(this.today, -daysAgo);
  }

  /** A moment on a UTC day, e.g. at('2026-09-01', 9, 30). */
  at(day: string, hour: number, minute = 0): Date {
    const hh = String(hour).padStart(2, '0');
    const mm = String(minute).padStart(2, '0');
    return new Date(`${day}T${hh}:${mm}:00Z`);
  }

  /** A moment `daysAgo` days ago at a UTC time, never later than now. */
  ago(daysAgo: number, hour = 10, minute = 0): Date {
    return this.cap(this.at(this.day(daysAgo), hour, minute));
  }

  /** Never in the future (a few minutes before now at the latest). */
  cap(date: Date): Date {
    const latest = this.now.getTime() - 2 * MINUTE_MS;
    return date.getTime() > latest ? new Date(latest) : date;
  }

  /**
   * When a student in `timeZone` sits down to learn on their own `day`: an afternoon
   * or evening there, or earlier today if that is still to come. Null when their day
   * hasn't started yet or is already over for this purpose.
   */
  sessionStart(day: string, timeZone: string, rng: Rng): Date | null {
    const today = localDay(this.now, timeZone);
    if (day > today) return null;
    if (day === today) {
      const start = new Date(this.now.getTime() - rng.int(25, 180) * MINUTE_MS);
      return localDay(start, timeZone) === day ? start : null;
    }
    // 11:00–15:59 UTC is the afternoon or evening in Egypt and Pakistan.
    const start = this.at(day, rng.int(11, 16), rng.int(0, 60));
    return localDay(start, timeZone) === day ? start : null;
  }
}

export const plusMinutes = (date: Date, minutes: number) =>
  new Date(date.getTime() + minutes * MINUTE_MS);

export const plusDays = (date: Date, days: number) => new Date(date.getTime() + days * DAY_MS);

export const asDate = (day: string) => new Date(`${day}T00:00:00Z`);
export const asDay = (date: Date) => date.toISOString().slice(0, 10);
