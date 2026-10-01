import {
  familyPrice,
  allowedBirthYears,
  AVATAR_KEYS,
  BADGE_CATEGORIES,
  BADGES,
  CHILD_MAX_AGE,
  isAvatarKey,
  LEAGUE_TIERS,
  leagueLevelBand,
  leagueOutcome,
  normalizeFriendCode,
  NICKNAME_PATTERN,
  STUDENT_USERNAME_PATTERN,
} from './index.js';

describe('allowedBirthYears', () => {
  it('keeps possibly-under-13 children out while those accounts are closed', () => {
    const years = allowedBirthYears(2026, false);
    // Born 2012 turns 14 this year, so is at least 13 today.
    expect(years[0]).toBe(2012);
    expect(years).not.toContain(2013);
    expect(years.at(-1)).toBe(2026 - (CHILD_MAX_AGE + 1));
  });

  it('opens down to age 9 when under-13 accounts are allowed', () => {
    const years = allowedBirthYears(2026, true);
    expect(years[0]).toBe(2017);
    expect(years).toContain(2013);
  });
});

describe('patterns', () => {
  it('accepts sensible nicknames only', () => {
    expect(NICKNAME_PATTERN.test('SwiftFalcon27')).toBe(true);
    expect(NICKNAME_PATTERN.test('ab')).toBe(false);
    expect(NICKNAME_PATTERN.test('9lives')).toBe(false);
    expect(NICKNAME_PATTERN.test('has space')).toBe(false);
    expect(NICKNAME_PATTERN.test('a'.repeat(21))).toBe(false);
  });

  it('describes generated usernames', () => {
    expect(STUDENT_USERNAME_PATTERN.test('swift-falcon-4821')).toBe(true);
    expect(STUDENT_USERNAME_PATTERN.test('Swift-Falcon-4821')).toBe(false);
  });

  it('knows the preset avatars', () => {
    expect(AVATAR_KEYS).toHaveLength(12);
    expect(isAvatarKey('rocket')).toBe(true);
    expect(isAvatarKey('photo')).toBe(false);
  });
});

describe('badges', () => {
  it('have unique keys, one emoji each, and valid criteria', () => {
    const keys = BADGES.map((badge) => badge.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const badge of BADGES) {
      expect(badge.key).toMatch(/^[a-z0-9-]+$/);
      expect(BADGE_CATEGORIES).toContain(badge.category);
      expect(badge.icon.trim()).not.toBe('');
    }
    const minimums = BADGES.flatMap((badge) =>
      'min' in badge.criteria ? [badge.criteria.min] : [],
    );
    expect(minimums.length).toBeGreaterThan(0);
    for (const min of minimums) expect(min).toBeGreaterThan(0);
  });
});

describe('familyPrice', () => {
  it('charges the first child in full and the others with the family discount', () => {
    expect(familyPrice(150_000, 1, 30)).toEqual({
      firstMinor: 150_000,
      extraUnitMinor: 105_000,
      extraChildren: 0,
      totalMinor: 150_000,
    });
    expect(familyPrice(150_000, 3, 30).totalMinor).toBe(150_000 + 2 * 105_000);
    expect(familyPrice(3_500, 2, 30).extraUnitMinor).toBe(2_450);
  });

  it('never charges for fewer than one child', () => {
    expect(familyPrice(25_000, 0, 30).totalMinor).toBe(25_000);
  });
});

describe('leagues', () => {
  it('puts levels into bands', () => {
    expect([1, 2, 3, 5, 6, 9, 10, 40].map(leagueLevelBand)).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
  });

  it('moves the top five up and, in a full group, the bottom five down', () => {
    const outcomes = Array.from({ length: 30 }, (_, i) => leagueOutcome(i + 1, 30, 2, 100));
    expect(outcomes.filter((o) => o === 'PROMOTED')).toHaveLength(5);
    expect(outcomes.slice(0, 5).every((o) => o === 'PROMOTED')).toBe(true);
    expect(outcomes.slice(25).every((o) => o === 'RELEGATED')).toBe(true);
    expect(outcomes.slice(5, 25).every((o) => o === 'STAYED')).toBe(true);
  });

  it('keeps small groups, the lowest tier and the top tier fair', () => {
    // Eight students: five go up, no one goes down.
    const small = Array.from({ length: 8 }, (_, i) => leagueOutcome(i + 1, 8, 3, 50));
    expect(small).toEqual([...Array(5).fill('PROMOTED'), ...Array(3).fill('STAYED')]);
    expect(leagueOutcome(30, 30, 0, 10)).toBe('STAYED');
    expect(leagueOutcome(1, 30, LEAGUE_TIERS.length - 1, 500)).toBe('STAYED');
    // No XP, no promotion.
    expect(leagueOutcome(1, 3, 0, 0)).toBe('STAYED');
  });

  it('reads friend codes however they were typed', () => {
    expect(normalizeFriendCode(' k7mq-4x ')).toBe('K7MQ4X');
  });
});
