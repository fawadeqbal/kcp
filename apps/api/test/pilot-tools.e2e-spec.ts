import {
  createTestApp,
  resetRateLimits,
  signUpAndLogin,
  staffLogin,
  type TestContext,
} from './helpers.js';
import {
  auth,
  family,
  hideLearningFixture,
  PROJECT_CHECKS,
  seedLearningFixture,
  seedProjectFixture,
} from './learning-fixture.js';

describe('pilot tools (e2e)', () => {
  let t: TestContext;

  beforeAll(async () => {
    t = await createTestApp();
    await seedLearningFixture(t.prisma);
    await seedProjectFixture(t.prisma);
  });

  beforeEach(async () => {
    await resetRateLimits(t.redis);
  });

  afterAll(async () => {
    await hideLearningFixture(t.prisma);
    await t.app.close();
  });

  describe('feedback', () => {
    it('lets students and parents send it, and staff read and sort it', async () => {
      const { student, parent, child } = await family(t);
      const sent = await t
        .http()
        .post('/v1/feedback')
        .set(auth(student))
        .send({
          kind: 'BUG',
          message: '  The preview went blank on lesson 3  ',
          pagePath: '/ar/learn/builder-m01-l03?x=1#top',
          languageCode: 'ar',
        })
        .expect(201);
      await t
        .http()
        .post('/v1/feedback')
        .set(auth(parent.accessToken))
        .send({ kind: 'IDEA', message: 'More lessons about games please!' })
        .expect(201);
      await t
        .http()
        .post('/v1/feedback')
        .set(auth(student))
        .send({ kind: 'RANT', message: 'x' })
        .expect(400);
      await t
        .http()
        .post('/v1/feedback')
        .set(auth(student))
        .send({ kind: 'OTHER', message: 'x'.repeat(1001) })
        .expect(400);
      await t
        .http()
        .post('/v1/feedback')
        .set(auth(student))
        .send({ kind: 'OTHER', message: 'hello', pagePath: 'javascript:alert(1)' })
        .expect(400);

      // Sent from a share page: the link's secret part isn't kept.
      const fromShare = await t
        .http()
        .post('/v1/feedback')
        .set(auth(parent.accessToken))
        .send({ kind: 'PRAISE', message: 'Lovely page', pagePath: '/en/p/AbCdEf123456_-AbCdEf12' })
        .expect(201);
      const stored = await t.prisma.feedback.findUniqueOrThrow({
        where: { id: fromShare.body.id },
      });
      expect(stored.pagePath).toBe('/en/p/[link]');

      // Families can't read feedback.
      await t.http().get('/v1/admin/feedback').set(auth(parent.accessToken)).expect(403);

      const moderator = await staffLogin(t, 'moderator');
      const list = await t
        .http()
        .get('/v1/admin/feedback?status=NEW')
        .set(auth(moderator.token))
        .expect(200);
      const mine = list.body.items.find((item: { id: string }) => item.id === sent.body.id);
      expect(mine).toMatchObject({
        kind: 'BUG',
        message: 'The preview went blank on lesson 3',
        pagePath: '/ar/learn/builder-m01-l03',
        languageCode: 'ar',
        status: 'NEW',
        sender: { id: child.id, roleKey: 'student', name: child.nickname },
      });
      expect(list.body.unread).toBeGreaterThanOrEqual(2);

      const done = await t
        .http()
        .patch(`/v1/admin/feedback/${sent.body.id}`)
        .set(auth(moderator.token))
        .send({ status: 'DONE' })
        .expect(200);
      expect(done.body.status).toBe('DONE');
      const audit = await t.prisma.auditLog.findFirst({
        where: { action: 'feedback.status', entityId: sent.body.id },
      });
      expect(audit?.actorId).toBe(moderator.user.id);
    });

    it('limits how much one account can send', async () => {
      const { student } = await family(t);
      for (let i = 0; i < 10; i++) {
        await t
          .http()
          .post('/v1/feedback')
          .set(auth(student))
          .send({ kind: 'PRAISE', message: `Great ${i}` })
          .expect(201);
      }
      await t
        .http()
        .post('/v1/feedback')
        .set(auth(student))
        .send({ kind: 'PRAISE', message: 'One more' })
        .expect(429);
    });
  });

  describe('premium by hand', () => {
    it('lets admins grant premium to a whole family and revoke it, with a reason', async () => {
      const { parent, child } = await family(t);
      const second = await t
        .http()
        .post('/v1/children')
        .set(auth(parent.accessToken))
        .send({
          nickname: `Second${Math.floor(Math.random() * 900 + 100)}`,
          avatarKey: 'star',
          birthYear: new Date().getUTCFullYear() - 15,
          countryCode: 'PK',
          languageCode: 'en',
          password: 'kid pass 42',
          consents: { publicLeaderboards: false, publicPortfolio: false },
        })
        .expect(201);

      const moderator = await staffLogin(t, 'moderator');
      await t
        .http()
        .post(`/v1/admin/users/${parent.user.id}/premium`)
        .set(auth(moderator.token))
        .send({ months: 3, reason: 'Pilot family' })
        .expect(403);

      const admin = await staffLogin(t, 'admin');
      await t
        .http()
        .post(`/v1/admin/users/${parent.user.id}/premium`)
        .set(auth(admin.token))
        .send({ months: 2, reason: 'Pilot family' })
        .expect(400);
      const granted = await t
        .http()
        .post(`/v1/admin/users/${parent.user.id}/premium`)
        .set(auth(admin.token))
        .send({ months: 3, reason: 'Pilot family from the Lahore school' })
        .expect(200);
      expect(granted.body.grants).toHaveLength(2);
      expect(granted.body.grants.every((g: { active: boolean }) => g.active)).toBe(true);
      expect(granted.body.grants.map((g: { studentId: string }) => g.studentId).toSorted()).toEqual(
        [child.id, second.body.id].toSorted(),
      );

      // The parent sees it on the dashboard.
      const children = await t.http().get('/v1/children').set(auth(parent.accessToken)).expect(200);
      for (const c of children.body) {
        expect(c.premiumUntil).toEqual(expect.any(String));
        expect(c.premiumSource).toBe('grant');
      }

      // Revoking one grant ends premium for that child only.
      const grant = granted.body.grants.find(
        (g: { studentId: string }) => g.studentId === child.id,
      );
      const revoked = await t
        .http()
        .post(`/v1/admin/premium/${grant.id}/revoke`)
        .set(auth(admin.token))
        .send({ reason: 'Left the pilot' })
        .expect(200);
      expect(revoked.body).toMatchObject({ active: false, revokedAt: expect.any(String) });
      await t
        .http()
        .post(`/v1/admin/premium/${grant.id}/revoke`)
        .set(auth(admin.token))
        .send({ reason: 'Again' })
        .expect(400);
      const after = await t.http().get('/v1/children').set(auth(parent.accessToken)).expect(200);
      const byId = new Map(
        after.body.map((c: { id: string; premiumSource: string | null }) => [c.id, c]),
      );
      // Back to the free trial every new child has.
      expect((byId.get(child.id) as { premiumSource: unknown }).premiumSource).toBe('trial');
      expect((byId.get(second.body.id) as { premiumSource: unknown }).premiumSource).toBe('grant');

      const list = await t
        .http()
        .get(`/v1/admin/users/${child.id}/premium`)
        .set(auth(moderator.token))
        .expect(403);
      expect(list.body.error).toBeDefined();
      const history = await t
        .http()
        .get(`/v1/admin/users/${child.id}/premium`)
        .set(auth(admin.token))
        .expect(200);
      expect(history.body.grants).toHaveLength(1);
      const audit = await t.prisma.auditLog.findMany({
        where: { action: { in: ['premium.grant', 'premium.revoke'] }, entityId: child.id },
      });
      expect(audit.map((a) => a.action).toSorted()).toEqual(['premium.grant', 'premium.revoke']);

      // Staff accounts aren't families.
      await t
        .http()
        .post(`/v1/admin/users/${moderator.user.id}/premium`)
        .set(auth(admin.token))
        .send({ months: 1, reason: 'Nope' })
        .expect(400);

      // Nor are deleted accounts, or parents without children.
      await t
        .http()
        .delete(`/v1/children/${child.id}`)
        .set(auth(parent.accessToken))
        .send({ nickname: child.nickname })
        .expect(204);
      const gone = await t
        .http()
        .post(`/v1/admin/users/${child.id}/premium`)
        .set(auth(admin.token))
        .send({ months: 1, reason: 'Too late' })
        .expect(400);
      expect(gone.body.error).toBe('ACCOUNT_DELETED');
      const alone = await signUpAndLogin(t);
      const none = await t
        .http()
        .post(`/v1/admin/users/${alone.user.id}/premium`)
        .set(auth(admin.token))
        .send({ months: 1, reason: 'No children yet' })
        .expect(400);
      expect(none.body.error).toBe('NO_CHILDREN');
    });
  });

  describe('the five numbers', () => {
    it('counts sign-ups, first projects and weekly active students per country', async () => {
      const admin = await staffLogin(t, 'admin');
      const read = async () =>
        (await t.http().get('/v1/admin/metrics?days=3').set(auth(admin.token)).expect(200)).body;
      const today = new Date().toISOString().slice(0, 10);
      type Row = {
        day: string;
        countryCode: string;
        signUps: number;
        firstProjects: number;
        weeklyActive: number;
        payingParents: number;
        cancellations: number;
      };
      const pkToday = (body: { rows: Row[] }) =>
        body.rows.find((r) => r.day === today && r.countryCode === 'PK') ?? {
          signUps: 0,
          firstProjects: 0,
          weeklyActive: 0,
          payingParents: 0,
          cancellations: 0,
        };

      const before = pkToday(await read());
      const { student } = await family(t);
      await t
        .http()
        .post('/v1/projects/e2e-m01-project/ship')
        .set(auth(student))
        .send({
          code: { html: '<h1>Me</h1><p>Hi</p>', css: '', js: '' },
          results: PROJECT_CHECKS.map((c) => ({ id: c.id, passed: true })),
        })
        .expect(200);
      const after = await read();
      expect(after.to).toBe(today);
      expect(after.countries).toContain('PK');
      expect(pkToday(after)).toMatchObject({
        signUps: before.signUps + 1,
        firstProjects: before.firstProjects + 1,
        weeklyActive: before.weeklyActive + 1,
        payingParents: before.payingParents,
        cancellations: before.cancellations,
      });
      const refreshed = await t
        .http()
        .post('/v1/admin/metrics/refresh?days=3')
        .set(auth(admin.token))
        .expect(200);
      expect(pkToday(refreshed.body)).toEqual(pkToday(after));
      // Several admins opening the page at once all get the numbers.
      const together = await Promise.all([read(), read(), read(), read()]);
      for (const body of together) expect(pkToday(body)).toEqual(pkToday(after));

      const moderator = await staffLogin(t, 'moderator');
      await t.http().get('/v1/admin/metrics').set(auth(moderator.token)).expect(403);
    });
  });
});
