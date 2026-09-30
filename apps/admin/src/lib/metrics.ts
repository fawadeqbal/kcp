import type { components } from '@kcp/api-client-ts';

type Row = components['schemas']['MetricsRowDto'];
export type NumberKey = Exclude<keyof Row, 'day' | 'countryCode'>;

export const EMPTY: Readonly<Record<NumberKey, number>> = {
  signUps: 0,
  firstProjects: 0,
  weeklyActive: 0,
  payingParents: 0,
  cancellations: 0,
};
const KEYS = Object.keys(EMPTY) as NumberKey[];

/** Every day from `from` to `to` (YYYY-MM-DD, UTC), newest first. */
export function daysBetween(from: string, to: string): string[] {
  const days: string[] = [];
  const first = Date.parse(`${from}T00:00:00Z`);
  for (let time = Date.parse(`${to}T00:00:00Z`); time >= first; time -= 86_400_000) {
    days.push(new Date(time).toISOString().slice(0, 10));
  }
  return days;
}

/** The numbers per day, for one country or all of them added up. */
export function byDay(rows: Row[], country: string): Map<string, Record<NumberKey, number>> {
  const days = new Map<string, Record<NumberKey, number>>();
  for (const row of rows) {
    if (country && row.countryCode !== country) continue;
    const total = days.get(row.day) ?? { ...EMPTY };
    for (const key of KEYS) total[key] += row[key];
    days.set(row.day, total);
  }
  return days;
}
