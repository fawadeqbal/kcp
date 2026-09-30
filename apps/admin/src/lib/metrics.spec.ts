import { byDay, daysBetween } from './metrics';

const row = (day: string, countryCode: string, signUps: number, weeklyActive: number) => ({
  day,
  countryCode,
  signUps,
  firstProjects: 0,
  weeklyActive,
  payingParents: 0,
  cancellations: 0,
});

describe('pilot numbers', () => {
  it('lists every day of the period, newest first, across month ends', () => {
    expect(daysBetween('2026-09-29', '2026-10-02')).toEqual([
      '2026-10-02',
      '2026-10-01',
      '2026-09-30',
      '2026-09-29',
    ]);
    expect(daysBetween('2026-10-02', '2026-10-02')).toEqual(['2026-10-02']);
  });

  it('adds countries up per day, or keeps one country', () => {
    const rows = [
      row('2026-10-01', 'PK', 2, 5),
      row('2026-10-01', 'SA', 1, 3),
      row('2026-10-02', 'PK', 0, 6),
    ];
    const all = byDay(rows, '');
    expect(all.get('2026-10-01')).toMatchObject({ signUps: 3, weeklyActive: 8 });
    expect(all.get('2026-10-02')).toMatchObject({ signUps: 0, weeklyActive: 6 });
    const sa = byDay(rows, 'SA');
    expect(sa.get('2026-10-01')).toMatchObject({ signUps: 1, weeklyActive: 3 });
    expect(sa.has('2026-10-02')).toBe(false);
  });
});
