import { MAX_TRIALS_PER_FAMILY } from '@kcp/shared';
import { FeatureFlagsService } from '../src/feature-flags/feature-flags.service.js';
import {
  CHILD_PASSWORD,
  childBody,
  createTestApp,
  lastMailTo,
  PASSWORD,
  resetRateLimits,
  signUpAndLogin,
  staffLogin,
  type TestContext,
} from './helpers.js';
import {
  auth,
  family,
  hideLearningFixture,
  seedLearningFixture,
  seedProjectFixture,
} from './learning-fixture.js';

describe('admin settings, content publishing and account data (e2e)', () => {
  let t: TestContext;
  let admin: { token: string };
  let moderator: { token: string };

  beforeAll(async () => {
    t = await createTestApp();
    await seedLearningFixture(t.prisma);
    await seedProjectFixture(t.prisma);
    admin = await staffLogin(t, 'admin');
    moderator = await staffLogin(t, 'moderator');
  });

  beforeEach(async () => {
    await resetRateLimits(t.redis);
  });

  afterAll(async () => {
    await t.prisma.module.update({
      where: { id: 'e2e-m01' },
      data: { publishedAt: new Date() },
    });
    await hideLearningFixture(t.prisma);
    await t.app.close();
  });

  describe('content', () => {
    it('lists every module, previews it in a language, and publishes or hides it', async () => {
      const tree = await t.http().get('/v1/admin/content').set(auth(admin.token)).expect(200);
      const track = tree.body.tracks.find((tr: { id: string }) => tr.id === 'e2e');
      expect(track.modules[0]).toMatchObject({
        id: 'e2e-m01',
        lessons: 2,
        challenges: 3,
        hasProject: true,
        languages: ['en'],
      });
      expect(track.modules[0].publishedAt).toEqual(expect.any(String));

      const preview = await t
        .http()
        .get('/v1/admin/content/modules/e2e-m01?lang=ar')
        .set(auth(admin.token))
        .expect(200);
      expect(preview.body.title).toBe('الوحدة الأولى');
      expect(preview.body.lessons[0]).toMatchObject({ title: 'الدرس الأول', translated: true });
      expect(preview.body.lessons[1]).toMatchObject({ title: 'Lesson l02', translated: false });
      expect(preview.body.lessons[0].challenges[0].checks).toEqual([
        'has-h1: at least 1 h1',
        'h1-text: text of h1 is not empty',
      ]);
      expect(preview.body.project).toMatchObject({ title: 'صفحتي', translated: true });

      // Hidden: students no longer see it, or open its lessons.
      const { student } = await family(t);
      await t
        .http()
        .post('/v1/admin/content/modules/e2e-m01/unpublish')
        .set(auth(admin.token))
        .send({ reason: 'Fixing a typo' })
        .expect(204);
      const map = await t.http().get('/v1/learning/tracks').set(auth(student)).expect(200);
      expect(JSON.stringify(map.body)).not.toContain('e2e-m01');
      await t.http().get('/v1/learning/lessons/e2e-m01-l01').set(auth(student)).expect(404);
      await t.http().get('/v1/projects/e2e-m01-project').set(auth(student)).expect(404);

      await t
        .http()
        .post('/v1/admin/content/modules/e2e-m01/publish')
        .set(auth(admin.token))
        .expect(204);
      await t.http().get('/v1/learning/lessons/e2e-m01-l01').set(auth(student)).expect(200);
      const log = await t.prisma.auditLog.findFirstOrThrow({
        where: { action: 'content.unpublish', entityId: 'e2e-m01' },
        orderBy: { createdAt: 'desc' },
      });
      expect(log.after).toMatchObject({ published: false, reason: 'Fixing a typo' });
    });

    it('lets content creators preview but not publish, and nobody else', async () => {
      const creator = await staffLogin(t, 'content_creator');
      await t.http().get('/v1/admin/content').set(auth(creator.token)).expect(200);
      await t.http().get('/v1/admin/content/modules/e2e-m01').set(auth(creator.token)).expect(200);
      await t
        .http()
        .post('/v1/admin/content/modules/e2e-m01/unpublish')
        .set(auth(creator.token))
        .send({})
        .expect(403);
      await t.http().get('/v1/admin/content').set(auth(moderator.token)).expect(403);
      await t.http().get('/v1/admin/content/modules/missing').set(auth(admin.token)).expect(404);
    });
  });

  describe('countries and languages', () => {
    const TEST_COUNTRY = 'ZZ';

    beforeAll(async () => {
      await t.prisma.country.upsert({
        where: { code: TEST_COUNTRY },
        create: {
          code: TEST_COUNTRY,
          names: { en: 'Testland' },
          currency: 'USD',
          timezone: 'UTC',
          defaultLanguageCode: 'en',
        },
        update: { isActive: false, currency: 'USD' },
      });
      await t.prisma.planPrice.deleteMany({ where: { countryCode: TEST_COUNTRY } });
    });

    afterAll(async () => {
      await t.prisma.planPrice.deleteMany({ where: { countryCode: TEST_COUNTRY } });
      await t.prisma.country.delete({ where: { code: TEST_COUNTRY } });
    });

    const update = (body: object, token = admin.token) =>
      t.http().patch(`/v1/admin/countries/${TEST_COUNTRY}`).set(auth(token)).send(body);

    it('switches a country on only once its prices are set, and its currency only while off', async () => {
      expect((await update({ isActive: true }).expect(409)).body.error).toBe('PRICES_MISSING');
      await t
        .http()
        .put(`/v1/admin/prices/${TEST_COUNTRY}`)
        .set(auth(admin.token))
        .send({ monthlyMinor: 500, yearlyMinor: 5000, reason: 'Launch prices' })
        .expect(200);
      expect((await update({ isActive: true }).expect(200)).body).toEqual({
        code: TEST_COUNTRY,
        isActive: true,
        currency: 'USD',
        under13ConsentMethods: [],
      });
      expect((await update({ currency: 'EUR' }).expect(409)).body.error).toBe('COUNTRY_ACTIVE');

      // Off, then a new currency: the old prices go, and must be set again before it opens.
      await update({ isActive: false, currency: 'EUR' }).expect(200);
      expect(await t.prisma.planPrice.count({ where: { countryCode: TEST_COUNTRY } })).toBe(0);
      expect((await update({ isActive: true }).expect(409)).body.error).toBe('PRICES_MISSING');
      expect((await update({ currency: 'XYZ' }).expect(400)).body.error).toBe('UNKNOWN_CURRENCY');
      await update({ currency: 'eur' }).expect(400);
      await update({ isActive: true }, moderator.token).expect(403);
      const log = await t.prisma.auditLog.findFirstOrThrow({
        where: { action: 'country.update', entityId: TEST_COUNTRY },
        orderBy: { createdAt: 'desc' },
      });
      expect(log.after).toEqual({ isActive: false, currency: 'EUR', under13ConsentMethods: [] });
    });

    it('keeps the languages families rely on switched on', async () => {
      const list = await t.http().get('/v1/admin/languages').set(auth(admin.token)).expect(200);
      const english = list.body.languages.find((l: { code: string }) => l.code === 'en');
      expect(english).toMatchObject({ isActive: true, direction: 'LTR' });
      expect(english.accounts).toBeGreaterThan(0);

      const set = (code: string, isActive: boolean) =>
        t.http().patch(`/v1/admin/languages/${code}`).set(auth(admin.token)).send({ isActive });
      expect((await set('en', false).expect(409)).body.error).toBe('FALLBACK_LANGUAGE');
      expect((await set('ur', false).expect(409)).body.error).toBe('LANGUAGE_IN_USE');
      expect((await set('fr', true).expect(409)).body.error).toBe('NOT_TRANSLATED');
      await t
        .http()
        .patch('/v1/admin/languages/ur')
        .set(auth(moderator.token))
        .send({ isActive: false })
        .expect(403);
    });
  });

  describe('feature flags', () => {
    afterAll(async () => {
      await t.prisma.featureFlag.update({
        where: { key: 'payments' },
        data: { enabled: true, countryCodes: [] },
      });
      t.app.get(FeatureFlagsService).invalidate();
    });

    it('switches a flag for some countries, with a reason, and it applies at once', async () => {
      const list = await t.http().get('/v1/admin/feature-flags').set(auth(admin.token)).expect(200);
      expect(list.body.flags.map((f: { key: string }) => f.key)).toEqual([
        'hub_payouts',
        'mentor_approval_for_certificates',
        'payments',
        'under_13_accounts',
      ]);
      const set = (body: object, token = admin.token) =>
        t.http().patch('/v1/admin/feature-flags/payments').set(auth(token)).send(body);
      await set({ enabled: true }).expect(400); // no reason
      await set({ countryCodes: ['QQ'], reason: 'Pilot' }).expect(400);
      await set({ countryCodes: ['PK'], reason: 'Pakistan first' }, moderator.token).expect(403);
      await set({ countryCodes: ['PK', 'PK'], reason: 'Pakistan first' }).expect(204);

      const flags = t.app.get(FeatureFlagsService);
      expect(await flags.isEnabled('payments', 'PK')).toBe(true);
      expect(await flags.isEnabled('payments', 'EG')).toBe(false);
      const after = await t
        .http()
        .get('/v1/admin/feature-flags')
        .set(auth(admin.token))
        .expect(200);
      expect(after.body.flags.find((f: { key: string }) => f.key === 'payments')).toMatchObject({
        key: 'payments',
        countryCodes: ['PK'],
        updatedBy: 'admin tester',
      });
      await t
        .http()
        .patch('/v1/admin/feature-flags/missing')
        .set(auth(admin.token))
        .send({
          enabled: true,
          reason: 'Nothing',
        })
        .expect(404);
    });
  });

  describe("a parent's own data", () => {
    it('downloads everything kept about the family', async () => {
      const { parent, child } = await family(t, {
        consents: { publicLeaderboards: true, publicPortfolio: false },
      });
      const res = await t
        .http()
        .get('/v1/account/export')
        .set(auth(parent.accessToken))
        .expect(200);
      expect(res.headers['content-disposition']).toContain('kids-coding-platform-data.json');
      expect(res.body.account).toMatchObject({ email: parent.email, displayName: 'Test Parent' });
      expect(res.body.children).toEqual([
        expect.objectContaining({
          username: child.username,
          studentProfile: expect.objectContaining({ nickname: child.nickname }),
          consents: expect.arrayContaining([
            expect.objectContaining({ type: 'ACCOUNT' }),
            expect.objectContaining({ type: 'PUBLIC_LEADERBOARDS' }),
          ]),
        }),
      ]);
      // The code the child typed, their XP history and the family's own sign-ins too.
      expect(res.body.children[0]).toMatchObject({
        submissions: expect.any(Array),
        challengeDrafts: expect.any(Array),
        xpEvents: expect.any(Array),
        sessions: [expect.objectContaining({ createdAt: expect.any(String) })],
      });
      expect(res.body.account.sessions).toEqual([
        expect.objectContaining({ ipAddress: expect.anything() }),
      ]);
      // Never secrets.
      expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|refreshTokenHash|totpSecret/);
      const { student } = await family(t);
      await t.http().get('/v1/account/export').set(auth(student)).expect(403);
    });

    it('deletes the whole family account with the password, and says so by email', async () => {
      const { parent, child } = await family(t);
      await t
        .http()
        .delete('/v1/account')
        .set(auth(parent.accessToken))
        .send({ password: 'not the password 1' })
        .expect(400);
      await t
        .http()
        .delete('/v1/account')
        .set(auth(parent.accessToken))
        .send({ password: PASSWORD })
        .expect(204);
      expect(lastMailTo(t.mail, parent.email)?.template).toBe('accountDeleted');

      const gone = await t.prisma.user.findUniqueOrThrow({ where: { id: parent.user.id } });
      expect(gone).toMatchObject({ status: 'DELETED', email: null, displayName: null });
      const kid = await t.prisma.user.findUniqueOrThrow({ where: { id: child.id } });
      expect(kid.status).toBe('DELETED');
      await t
        .http()
        .post('/v1/auth/login')
        .send({ email: parent.email, password: PASSWORD })
        .expect(401);
      await t
        .http()
        .post('/v1/auth/students/login')
        .send({ username: child.username, password: CHILD_PASSWORD })
        .expect(401);
      await t.http().get('/v1/auth/me').set(auth(parent.accessToken)).expect(401);
      // The consent records stay, as legal evidence.
      expect(await t.prisma.consentRecord.count({ where: { childId: child.id } })).toBeGreaterThan(
        0,
      );
      // The same email can sign up again later.
      await t
        .http()
        .post('/v1/auth/parents/sign-up')
        .send({
          email: parent.email,
          password: PASSWORD,
          displayName: 'Back Again',
          languageCode: 'en',
          countryCode: 'PK',
          acceptTerms: true,
        })
        .expect(202);
    });
  });

  it(`gives a family ${MAX_TRIALS_PER_FAMILY} free trials in all, even if children are deleted`, async () => {
    const parent = await signUpAndLogin(t);
    const ids: string[] = [];
    for (let i = 0; i < MAX_TRIALS_PER_FAMILY; i++) {
      const created = await t
        .http()
        .post('/v1/children')
        .set(auth(parent.accessToken))
        .send(childBody())
        .expect(201);
      expect(created.body.trialEndsAt).toEqual(expect.any(String));
      ids.push(created.body.id as string);
    }
    // Deleting one doesn't give its trial back.
    const first = await t.prisma.studentProfile.findUniqueOrThrow({ where: { userId: ids[0]! } });
    await t
      .http()
      .delete(`/v1/children/${ids[0]}`)
      .set(auth(parent.accessToken))
      .send({ nickname: first.nickname })
      .expect(204);
    const extra = await t
      .http()
      .post('/v1/children')
      .set(auth(parent.accessToken))
      .send(childBody())
      .expect(201);
    expect(extra.body.trialEndsAt).toBeNull();
    expect(extra.body.premiumSource).toBeNull();
  });
});
