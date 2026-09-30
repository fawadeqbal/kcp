import {
  addDays,
  daysBetween,
  freezesNeeded,
  levelFor,
  localDay,
  meetGoal,
  previousDay,
  visibleStreak,
  weekAt,
  weekOfDay,
  xpWithinCap,
} from './xp-rules.js';

const RULES = { freezeEvery: 7, maxFreezes: 2 };

describe('xp rules', () => {
  it('works out the day in the student’s own time zone', () => {
    const lateEvening = new Date('2026-09-29T20:30:00Z');
    expect(localDay(lateEvening, 'UTC')).toBe('2026-09-29');
    expect(localDay(lateEvening, 'Asia/Karachi')).toBe('2026-09-30'); // UTC+5
    expect(localDay(lateEvening, 'America/Los_Angeles')).toBe('2026-09-29');
    expect(localDay(lateEvening, 'Not/AZone')).toBe('2026-09-29');
  });

  it('steps back a day across months and leap years', () => {
    expect(previousDay('2026-03-01')).toBe('2026-02-28');
    expect(previousDay('2028-03-01')).toBe('2028-02-29');
    expect(previousDay('2027-01-01')).toBe('2026-12-31');
  });

  it('keeps each day under the cap', () => {
    expect(xpWithinCap(10, 0, 300)).toBe(10);
    expect(xpWithinCap(100, 250, 300)).toBe(50);
    expect(xpWithinCap(10, 300, 300)).toBe(0);
    expect(xpWithinCap(10, 320, 300)).toBe(0);
  });

  it('counts days between dates', () => {
    expect(daysBetween('2026-09-28', '2026-09-30')).toBe(2);
    expect(daysBetween('2026-02-28', '2026-03-01')).toBe(1);
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('grows a streak on consecutive days and restarts it after a gap', () => {
    let streak = { current: 0, longest: 0, lastGoalDay: null as string | null, freezes: 0 };
    streak = meetGoal(streak, '2026-09-28', RULES);
    expect(streak).toEqual({ current: 1, longest: 1, lastGoalDay: '2026-09-28', freezes: 0 });
    streak = meetGoal(streak, '2026-09-28', RULES);
    expect(streak.current).toBe(1);
    streak = meetGoal(streak, '2026-09-29', RULES);
    streak = meetGoal(streak, '2026-09-30', RULES);
    expect(streak).toEqual({ current: 3, longest: 3, lastGoalDay: '2026-09-30', freezes: 0 });
    streak = meetGoal(streak, '2026-10-02', RULES);
    expect(streak).toEqual({ current: 1, longest: 3, lastGoalDay: '2026-10-02', freezes: 0 });
  });

  it('earns a freeze every 7 days (2 at most), and uses them for missed days', () => {
    let streak = { current: 6, longest: 6, lastGoalDay: '2026-09-29' as string | null, freezes: 0 };
    streak = meetGoal(streak, '2026-09-30', RULES);
    expect(streak).toMatchObject({ current: 7, freezes: 1 });
    // One day missed: the freeze covers it.
    expect(visibleStreak(streak, '2026-10-02')).toBe(7);
    expect(freezesNeeded(streak, '2026-10-02')).toBe(1);
    streak = meetGoal(streak, '2026-10-02', RULES);
    expect(streak).toMatchObject({ current: 8, freezes: 0 });
    // No freeze left: the next gap breaks the streak.
    expect(visibleStreak(streak, '2026-10-04')).toBe(0);
    expect(freezesNeeded(streak, '2026-10-04')).toBe(0);
    streak = meetGoal(streak, '2026-10-04', RULES);
    expect(streak).toMatchObject({ current: 1, longest: 8, freezes: 0 });

    const full = { current: 20, longest: 20, lastGoalDay: '2026-10-01', freezes: 2 };
    expect(meetGoal(full, '2026-10-02', RULES)).toMatchObject({ current: 21, freezes: 2 });
    // Two missed days need two freezes; three can't be covered.
    expect(meetGoal(full, '2026-10-04', RULES)).toMatchObject({ current: 21, freezes: 1 });
    expect(meetGoal(full, '2026-10-05', RULES)).toMatchObject({ current: 1, freezes: 2 });
  });

  it('shows a streak until the day after the last goal ends', () => {
    const streak = { current: 4, longest: 6, lastGoalDay: '2026-09-29', freezes: 0 };
    expect(visibleStreak(streak, '2026-09-29')).toBe(4);
    expect(visibleStreak(streak, '2026-09-30')).toBe(4);
    expect(visibleStreak(streak, '2026-10-01')).toBe(0);
    expect(
      visibleStreak({ current: 0, longest: 0, lastGoalDay: null, freezes: 2 }, '2026-10-01'),
    ).toBe(0);
  });

  it('names ISO weeks of a day, which start on Monday and can belong to the next year', () => {
    expect(weekOfDay('2026-09-30')).toEqual({
      key: '2026-W40',
      startDay: '2026-09-28',
      endDay: '2026-10-05',
    });
    expect(weekOfDay('2026-09-27').key).toBe('2026-W39'); // Sunday
    expect(weekOfDay('2026-09-28').key).toBe('2026-W40'); // Monday
    expect(weekOfDay('2024-12-30').key).toBe('2025-W01');
    expect(weekOfDay('2027-01-01').key).toBe('2026-W53');
  });

  it('starts the week at Monday 00:00 in each student’s own time zone', () => {
    // Sunday 20:30 UTC is already Monday in Karachi (UTC+5), still Sunday in Cairo.
    const at = new Date('2026-10-04T20:30:00Z');
    expect(weekAt(at, 'Asia/Karachi').key).toBe('2026-W41');
    expect(weekAt(at, 'Africa/Cairo').key).toBe('2026-W40');
  });

  it('finds the level for an XP total', () => {
    const levels = [
      { number: 1, minXp: 0 },
      { number: 2, minXp: 100 },
      { number: 3, minXp: 250 },
    ];
    expect(levelFor(0, levels)).toEqual({ number: 1, minXp: 0, nextMinXp: 100 });
    expect(levelFor(99, levels).number).toBe(1);
    expect(levelFor(100, levels)).toEqual({ number: 2, minXp: 100, nextMinXp: 250 });
    expect(levelFor(5000, levels)).toEqual({ number: 3, minXp: 250, nextMinXp: null });
  });
});
