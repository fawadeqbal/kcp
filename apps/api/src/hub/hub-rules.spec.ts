import { ageOf } from './hub-rules.js';

describe('ageOf', () => {
  const now = new Date('2026-10-01T10:00:00Z');

  it('is the age a student has surely reached, from the birth year alone', () => {
    // Born in 2011: 15 by the end of 2026, but maybe only 14 today. Surely 15 from 2027.
    expect(ageOf(2011, now)).toBe(14);
    expect(ageOf(2011, new Date('2027-01-01T00:00:00Z'))).toBe(15);
    expect(ageOf(2010, now)).toBe(15);
  });

  it('is 0 without a birth year (and never negative)', () => {
    expect(ageOf(null, now)).toBe(0);
    expect(ageOf(undefined, now)).toBe(0);
    expect(ageOf(2026, now)).toBe(0);
  });
});
