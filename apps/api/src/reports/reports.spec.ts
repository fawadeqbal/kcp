import { localClock, reportDue } from './reports.service.js';

describe('weekly report timing', () => {
  it('reads the local hour and weekday', () => {
    // Sunday 4 October 2026, 12:30 UTC is 17:30 in Karachi (UTC+5).
    const now = new Date('2026-10-04T12:30:00Z');
    expect(localClock(now, 'Asia/Karachi')).toEqual({ hour: 17, weekday: 0 });
    expect(localClock(now, 'UTC')).toEqual({ hour: 12, weekday: 0 });
  });

  it('is due on Sunday evening, each place in its own time', () => {
    const sundayNoonUtc = new Date('2026-10-04T12:30:00Z');
    expect(reportDue(sundayNoonUtc, 'Asia/Karachi')).toBe(true);
    expect(reportDue(sundayNoonUtc, 'UTC')).toBe(false);
    // Monday morning in Karachi: the week is over, the next one isn't due.
    expect(reportDue(new Date('2026-10-04T20:00:00Z'), 'Asia/Karachi')).toBe(false);
    expect(reportDue(new Date('2026-10-03T13:00:00Z'), 'Asia/Karachi')).toBe(false);
  });
});
