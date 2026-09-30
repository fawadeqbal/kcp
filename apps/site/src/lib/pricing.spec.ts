import { formatDate, formatPrice, isolate } from './format';
import { FALLBACK_PRICING, parsePricing, priceFor, yearlySavingPercent } from './pricing';

const apiAnswer = {
  trialDays: 14,
  familyDiscountPercent: 30,
  countries: [
    {
      code: 'PK',
      currency: 'PKR',
      names: { en: 'Pakistan', ar: 'باكستان', ur: 'پاکستان' },
      monthlyMinor: 160_000,
      yearlyMinor: 1_600_000,
    },
    {
      code: 'EG',
      currency: 'EGP',
      names: { en: 'Egypt', ar: 'مصر', ur: '' },
      monthlyMinor: 25_000,
      yearlyMinor: 250_000,
    },
    // Not a country the site serves: ignored.
    { code: 'FR', currency: 'EUR', names: {}, monthlyMinor: 900, yearlyMinor: 9_000 },
  ],
};

describe('parsePricing', () => {
  it('accepts the API answer and keeps only the countries the site serves', () => {
    const pricing = parsePricing(apiAnswer);
    expect(pricing?.trialDays).toBe(14);
    expect(pricing?.countries.map((c) => c.code)).toEqual(['PK', 'EG']);
  });

  it('fills a missing country name with ours', () => {
    expect(parsePricing(apiAnswer)?.countries[1]?.names.ur).toBe('مصر');
  });

  it.each([
    ['nothing', null],
    ['an error body', { error: 'NOT_FOUND' }],
    ['no countries', { ...apiAnswer, countries: [] }],
    ['a negative trial', { ...apiAnswer, trialDays: -1 }],
    ['a discount over 100%', { ...apiAnswer, familyDiscountPercent: 120 }],
    [
      'prices as text',
      { ...apiAnswer, countries: [{ ...apiAnswer.countries[0], monthlyMinor: '1500' }] },
    ],
    [
      'a bad currency',
      { ...apiAnswer, countries: [{ ...apiAnswer.countries[0], currency: 'rs' }] },
    ],
  ])('rejects %s', (_label, data) => {
    expect(parsePricing(data)).toBeNull();
  });
});

describe('priceFor', () => {
  it('uses the API prices when they are there, and the bundled ones otherwise', () => {
    const pricing = parsePricing(apiAnswer);
    if (!pricing) throw new Error('expected pricing');
    expect(priceFor(pricing, 'PK').monthlyMinor).toBe(160_000);
    expect(priceFor(pricing, 'SA')).toEqual(FALLBACK_PRICING.countries[3]);
  });
});

describe('bundled prices', () => {
  it('has the placeholder prices for every launch country', () => {
    expect(
      FALLBACK_PRICING.countries.map((c) => [c.code, c.currency, c.monthlyMinor, c.yearlyMinor]),
    ).toEqual([
      ['PK', 'PKR', 150_000, 1_500_000],
      ['EG', 'EGP', 25_000, 250_000],
      ['AE', 'AED', 3_500, 35_000],
      ['SA', 'SAR', 3_500, 35_000],
    ]);
  });

  it('works out the yearly saving', () => {
    expect(yearlySavingPercent(priceFor(FALLBACK_PRICING, 'PK'))).toBe(17);
  });
});

describe('formatPrice', () => {
  it('formats in the page language with Western digits', () => {
    expect(formatPrice(150_000, 'PKR', 'en')).toMatch(/^PKR\s1,500$/);
    expect(formatPrice(3_500, 'SAR', 'ar')).toMatch(/^\u200f?35\s+ر\.س\.\u200f?$/);
    expect(formatPrice(150_000, 'PKR', 'ur')).toMatch(/1,500/);
    for (const locale of ['en', 'ar', 'ur'] as const) {
      expect(formatPrice(250_000, 'EGP', locale)).not.toMatch(/[\u0660-\u0669\u06F0-\u06F9]/);
    }
  });

  it('keeps cents only when there are some', () => {
    expect(formatPrice(3_550, 'AED', 'en')).toMatch(/^AED\s35\.50$/);
  });
});

describe('isolate', () => {
  it('wraps a value in Unicode isolates', () => {
    const wrapped = isolate('parent@example.com');
    expect([...wrapped].map((c) => c.codePointAt(0))).toEqual([
      0x2068,
      ...[...'parent@example.com'].map((c) => c.codePointAt(0)),
      0x2069,
    ]);
  });
});

describe('formatDate', () => {
  it('writes dates with Western digits', () => {
    expect(formatDate('2026-09-15', 'en')).toBe('15 September 2026');
    expect(formatDate('2026-09-15', 'ar')).toContain('2026');
  });
});
