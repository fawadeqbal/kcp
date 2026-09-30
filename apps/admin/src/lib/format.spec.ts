import {
  describeAction,
  formatAgo,
  formatMoney,
  humanize,
  pageSummary,
  parseMoney,
  shortId,
  statusTone,
} from './format';

describe('format helpers', () => {
  it('turns API enums into words', () => {
    expect(humanize('PENDING_VERIFICATION')).toBe('Pending verification');
    expect(humanize('PUBLIC_LEADERBOARDS')).toBe('Public leaderboards');
  });

  it('summarises a page of results', () => {
    expect(pageSummary(1, 25, 0)).toBe('No results');
    expect(pageSummary(1, 25, 10)).toBe('Showing 1–10 of 10');
    expect(pageSummary(2, 25, 60)).toBe('Showing 26–50 of 60');
    expect(pageSummary(3, 25, 60)).toBe('Showing 51–60 of 60');
  });

  it('colours statuses', () => {
    expect(statusTone('SUSPENDED')).toBe('danger');
    expect(statusTone('SOMETHING_NEW')).toBe('neutral');
  });
});

describe('shortId', () => {
  it('keeps the distinctive end of a UUID v7', () => {
    expect(shortId('01a0ed6c-f3c8-7299-869a-b97c6896853a')).toBe('6896853a');
  });
});

describe('money', () => {
  it('shows and reads minor units', () => {
    expect(formatMoney(150_000, 'PKR').replace(/\s/g, ' ')).toBe('PKR 1,500.00');
    expect(parseMoney('1,500', 'PKR')).toBe(150_000);
    expect(parseMoney('24.5', 'AED')).toBe(2_450);
    expect(parseMoney('24.505', 'AED')).toBeNull();
    expect(parseMoney('abc', 'AED')).toBeNull();
  });
});

describe('activity', () => {
  it('says how long ago', () => {
    const now = new Date('2026-10-01T12:00:00Z');
    expect(formatAgo('2026-10-01T11:59:40Z', now)).toBe('Just now');
    expect(formatAgo('2026-10-01T11:58:00Z', now)).toBe('2 min ago');
    expect(formatAgo('2026-10-01T09:00:00Z', now)).toBe('3 h ago');
  });

  it('describes audit actions', () => {
    expect(describeAction('user.suspend')).toEqual({
      tag: 'Suspended',
      tone: 'danger',
      text: 'account',
    });
    expect(describeAction('robot.wave_hello')).toEqual({
      tag: 'Robot',
      tone: 'neutral',
      text: 'wave hello',
    });
  });
});
