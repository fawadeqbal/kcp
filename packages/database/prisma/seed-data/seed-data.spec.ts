import { LAUNCH_LANGUAGES, ROLE_KEYS, STAFF_ROLE_KEYS } from '../../src/constants.js';
import { languages } from './languages.js';
import { levels } from './levels.js';
import { planPrices } from './plans.js';
import { countries } from './locations.js';
import { roles } from './roles.js';

describe('seed data', () => {
  it('activates exactly the launch languages', () => {
    const active = languages.filter((l) => l.isActive).map((l) => l.code);
    expect(active.toSorted()).toEqual([...LAUNCH_LANGUAGES].toSorted());
  });

  it('marks Arabic and Urdu as right-to-left', () => {
    const rtl = languages.filter((l) => l.direction === 'RTL').map((l) => l.code);
    expect(rtl.toSorted()).toEqual(['ar', 'ur']);
  });

  it('seeds every role from the scope, with staff roles flagged', () => {
    expect(roles.map((r) => r.key).toSorted()).toEqual(Object.values(ROLE_KEYS).toSorted());
    for (const role of roles) {
      expect(role.isStaff).toBe(STAFF_ROLE_KEYS.includes(role.key));
    }
  });

  it('gives every country a known default language and valid codes', () => {
    const languageCodes = new Set(languages.map((l) => l.code));
    for (const country of countries) {
      expect(country.code).toMatch(/^[A-Z]{2}$/);
      expect(country.currency).toMatch(/^[A-Z]{3}$/);
      expect(languageCodes.has(country.defaultLanguageCode)).toBe(true);
      expect(() => new Intl.DateTimeFormat('en', { timeZone: country.timezone })).not.toThrow();
    }
  });

  it("writes each placeholder price in its country's currency", () => {
    for (const price of planPrices) {
      const country = countries.find((c) => c.code === price.countryCode);
      expect(country?.currency).toBe(price.currency);
    }
  });

  it('names every place in all launch languages, with unique slugs', () => {
    for (const country of countries) {
      const regionSlugs = new Set<string>();
      for (const region of country.regions) {
        expect(regionSlugs.has(region.slug)).toBe(false);
        regionSlugs.add(region.slug);
        const citySlugs = new Set<string>();
        for (const place of [country, region, ...region.cities]) {
          for (const lang of LAUNCH_LANGUAGES) {
            expect(place.names[lang].trim()).not.toBe('');
          }
        }
        for (const city of region.cities) {
          expect(citySlugs.has(city.slug)).toBe(false);
          citySlugs.add(city.slug);
        }
      }
    }
  });
});

describe('permission matrix', () => {
  it('defines rules for every role, using known actions and subjects', async () => {
    const { permissionMatrix } = await import('../../src/permission-matrix.js');
    const { ACTIONS, SUBJECTS } = await import('../../src/constants.js');
    expect(Object.keys(permissionMatrix).toSorted()).toEqual(Object.values(ROLE_KEYS).toSorted());
    for (const rules of Object.values(permissionMatrix)) {
      expect(rules.length).toBeGreaterThan(0);
      for (const rule of rules) {
        expect(ACTIONS).toContain(rule.action);
        expect(SUBJECTS).toContain(rule.subject);
        // Conditions are stored as JSON, so they must survive a round trip.
        expect(JSON.parse(JSON.stringify(rule.conditions ?? {}))).toEqual(rule.conditions ?? {});
      }
    }
  });

  it('gives "manage all" to super admins only', async () => {
    const { permissionMatrix } = await import('../../src/permission-matrix.js');
    for (const [role, rules] of Object.entries(permissionMatrix)) {
      const managesAll = rules.some((r) => r.action === 'manage' && r.subject === 'all');
      expect(managesAll).toBe(role === ROLE_KEYS.SUPER_ADMIN);
    }
  });

  it('starts levels at 0 XP and makes each one cost more than the last', () => {
    expect(levels[0]).toEqual({ number: 1, minXp: 0 });
    expect(levels.slice(0, 5).map((l) => l.minXp)).toEqual([0, 100, 250, 450, 700]);
    for (let i = 2; i < levels.length; i++) {
      const step = levels[i]!.minXp - levels[i - 1]!.minXp;
      expect(step).toBeGreaterThan(levels[i - 1]!.minXp - levels[i - 2]!.minXp);
    }
  });
});

describe('badges', () => {
  it('are named and described in every launch language', async () => {
    const { badges } = await import('./badges.js');
    for (const lang of LAUNCH_LANGUAGES) {
      const messages = (await import(`@kcp/i18n/messages/${lang}.json`, { with: { type: 'json' } }))
        .default as { badges: Record<string, { name?: string; description?: string }> };
      for (const badge of badges) {
        expect(messages.badges[badge.key]?.name?.trim(), `${lang}: ${badge.key}`).toBeTruthy();
        expect(
          messages.badges[badge.key]?.description?.trim(),
          `${lang}: ${badge.key}`,
        ).toBeTruthy();
      }
    }
  });
});
