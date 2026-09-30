import { addMonths } from './premium.service.js';

describe('addMonths', () => {
  it('keeps the day of the month, or uses the last day of a shorter month', () => {
    expect(addMonths(new Date('2026-09-29T10:00:00Z'), 1).toISOString()).toBe(
      '2026-10-29T10:00:00.000Z',
    );
    expect(addMonths(new Date('2026-01-31T10:00:00Z'), 1).toISOString()).toBe(
      '2026-02-28T10:00:00.000Z',
    );
    expect(addMonths(new Date('2028-01-31T10:00:00Z'), 1).toISOString()).toBe(
      '2028-02-29T10:00:00.000Z',
    );
    expect(addMonths(new Date('2026-11-15T10:00:00Z'), 3).toISOString()).toBe(
      '2027-02-15T10:00:00.000Z',
    );
  });
});
