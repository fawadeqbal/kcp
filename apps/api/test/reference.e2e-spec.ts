import { createTestApp, type TestContext } from './helpers.js';

describe('reference data (e2e)', () => {
  let t: TestContext;

  beforeAll(async () => {
    t = await createTestApp();
  });

  afterAll(async () => {
    await t.app.close();
  });

  it('lists the launch languages with their writing direction', async () => {
    const res = await t.http().get('/v1/languages').expect(200);
    expect(res.headers['cache-control']).toMatch(/max-age/);
    const byCode = Object.fromEntries(
      res.body.map((l: { code: string; direction: string }) => [l.code, l.direction]),
    );
    expect(byCode).toEqual({ en: 'LTR', ar: 'RTL', ur: 'RTL' });
  });

  it('lists only open countries, with regions and cities', async () => {
    const countries = await t.http().get('/v1/countries').expect(200);
    const codes = countries.body.map((c: { code: string }) => c.code);
    expect(codes).toEqual(expect.arrayContaining(['PK', 'EG']));
    expect(codes).not.toContain('AE');

    const regions = await t.http().get('/v1/countries/pk/regions').expect(200);
    const punjab = regions.body.find((r: { slug: string }) => r.slug === 'punjab');
    expect(punjab.names.ur).toBe('پنجاب');
    expect(punjab.cities.map((c: { slug: string }) => c.slug)).toContain('lahore');

    await t.http().get('/v1/countries/AE/regions').expect(404);
  });
});
