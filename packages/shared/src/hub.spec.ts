import { describe, expect, it } from 'vitest';
import {
  HUB_SHARE_TOTAL,
  ibanValid,
  normaliseIban,
  withholdingOf,
  type HubRules,
  hubWeekAt,
  hubWindowEnd,
  hubWorkAllowedAt,
  isoWeekOf,
  localClock,
  nextHubWindow,
  shareOut,
  sharePercent,
  splitHubAmount,
} from './hub.js';

// Pakistan's defaults: 07:00–21:00, no work 08:00–14:00 Monday to Saturday (UTC+5).
const PK: HubRules = {
  timeZone: 'Asia/Karachi',
  minAge: 15,
  weeklyMinutes: 360,
  dayStartMinute: 420,
  dayEndMinute: 1260,
  schoolDays: [1, 2, 3, 4, 5, 6],
  schoolStartMinute: 480,
  schoolEndMinute: 840,
};

/** A moment given as Karachi local time. */
const karachi = (local: string) => new Date(`${local}+05:00`);

describe('hub rules', () => {
  it('reads the local clock in the student’s time zone', () => {
    expect(localClock(karachi('2026-10-05T15:30:00'), 'Asia/Karachi')).toEqual({
      day: '2026-10-05',
      weekday: 1,
      minute: 930,
    });
  });

  it('allows work outside school hours, inside the day', () => {
    // Monday 2026-10-05 is a school day.
    expect(hubWorkAllowedAt(karachi('2026-10-05T07:30:00'), PK)).toBe(true);
    expect(hubWorkAllowedAt(karachi('2026-10-05T08:00:00'), PK)).toBe(false);
    expect(hubWorkAllowedAt(karachi('2026-10-05T13:59:00'), PK)).toBe(false);
    expect(hubWorkAllowedAt(karachi('2026-10-05T14:00:00'), PK)).toBe(true);
    expect(hubWorkAllowedAt(karachi('2026-10-05T20:59:00'), PK)).toBe(true);
    expect(hubWorkAllowedAt(karachi('2026-10-05T21:00:00'), PK)).toBe(false);
    expect(hubWorkAllowedAt(karachi('2026-10-05T06:59:00'), PK)).toBe(false);
    // Sunday is not a school day: the whole day is open.
    expect(hubWorkAllowedAt(karachi('2026-10-04T10:00:00'), PK)).toBe(true);
  });

  it('knows when the stretch going on now ends, and when the next one starts', () => {
    expect(hubWindowEnd(karachi('2026-10-05T07:15:00'), PK)).toEqual(
      karachi('2026-10-05T08:00:00'),
    );
    expect(hubWindowEnd(karachi('2026-10-05T18:00:30'), PK)).toEqual(
      karachi('2026-10-05T21:00:00'),
    );
    expect(hubWindowEnd(karachi('2026-10-05T10:00:00'), PK)).toBeNull();
    expect(nextHubWindow(karachi('2026-10-05T10:00:00'), PK)).toEqual(
      karachi('2026-10-05T14:00:00'),
    );
    expect(nextHubWindow(karachi('2026-10-05T22:10:00'), PK)).toEqual(
      karachi('2026-10-06T07:00:00'),
    );
    const now = karachi('2026-10-05T16:00:00');
    expect(nextHubWindow(now, PK)).toBe(now);
  });

  it('names the week in the student’s time zone (Monday to Sunday)', () => {
    expect(isoWeekOf('2026-10-05')).toBe('2026-W41');
    expect(isoWeekOf('2026-10-04')).toBe('2026-W40');
    expect(isoWeekOf('2027-01-01')).toBe('2026-W53');
    // Sunday 20:30 UTC is already Monday in Karachi.
    expect(hubWeekAt(new Date('2026-10-04T20:30:00Z'), 'Asia/Karachi')).toBe('2026-W41');
    expect(hubWeekAt(new Date('2026-10-04T20:30:00Z'), 'Africa/Cairo')).toBe('2026-W40');
  });

  it('splits a payment 50/25/25, the platform taking what rounding leaves', () => {
    expect(splitHubAmount(100_00, { student: 50, lead: 25, platform: 25 })).toEqual({
      student: 50_00,
      lead: 25_00,
      platform: 25_00,
    });
    expect(splitHubAmount(1001, { student: 50, lead: 25, platform: 25 })).toEqual({
      student: 500,
      lead: 250,
      platform: 251,
    });
  });

  it('shares a pool out by task shares, adding up to the pool exactly', () => {
    const shares = shareOut(1000, [
      { key: 'a', weight: 3333 },
      { key: 'b', weight: 3333 },
      { key: 'c', weight: 3334 },
    ]);
    expect([...shares.values()].reduce((s, v) => s + v, 0)).toBe(1000);
    expect(shares.get('c')).toBe(334);
    // One student with two tasks gets both parts.
    const merged = shareOut(900, [
      { key: 'kid', weight: 5000 },
      { key: 'kid', weight: 2500 },
      { key: 'other', weight: 2500 },
    ]);
    expect(merged.get('kid')).toBe(675);
    expect(merged.get('other')).toBe(225);
    expect(shareOut(0, [{ key: 'x', weight: HUB_SHARE_TOTAL }]).get('x')).toBe(0);
  });

  it('shows shares as percentages', () => {
    expect(sharePercent(2500)).toBe('25%');
    expect(sharePercent(3333)).toBe('33.33%');
  });
});

describe('payout helpers', () => {
  it('checks IBANs (format and mod-97)', () => {
    expect(ibanValid('GB82 WEST 1234 5698 7654 32')).toBe(true);
    expect(ibanValid('PK36SCBL0000001123456702')).toBe(true);
    expect(ibanValid('AE070331234567890123456')).toBe(true);
    expect(ibanValid('GB82 WEST 1234 5698 7654 33')).toBe(false);
    expect(ibanValid('PK36')).toBe(false);
    expect(ibanValid('12345678901234567890')).toBe(false);
    expect(normaliseIban(' pk36 scbl-0000 ')).toBe('PK36SCBL0000');
  });

  it('works out withholding', () => {
    expect(withholdingOf(10_001, 1000)).toBe(1000);
    expect(withholdingOf(10_000, 0)).toBe(0);
  });
});
