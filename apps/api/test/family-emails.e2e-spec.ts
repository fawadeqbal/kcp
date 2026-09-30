import { FamilyEmailsService } from '../src/family-emails/family-emails.service.js';
import { WaitlistService } from '../src/waitlist/waitlist.service.js';
import {
  createTestApp,
  lastMailTo,
  resetRateLimits,
  signUpAndLogin,
  staffLogin,
  tokenFrom,
  type TestContext,
  uniqueEmail,
} from './helpers.js';
import { auth, family } from './learning-fixture.js';

const DAY_MS = 24 * 60 * 60 * 1000;

describe('emails to families and the waitlist (e2e)', () => {
  let t: TestContext;
  let emails: FamilyEmailsService;

  beforeAll(async () => {
    t = await createTestApp();
    emails = t.app.get(FamilyEmailsService);
  });

  beforeEach(async () => {
    await resetRateLimits(t.redis);
  });

  afterAll(async () => {
    await t.app.close();
  });

  const mailsTo = (to: string, template: string) =>
    t.mail.outbox.filter((m) => m.to === to && m.template === template);

  const join = (email: string, overrides: Record<string, string> = {}) =>
    t
      .http()
      .post('/v1/waitlist')
      .send({ email, countryCode: 'EG', ageBand: 'AGE_9_12', languageCode: 'ar', ...overrides });

  it('welcomes a parent once their email is verified, in their language', async () => {
    const parent = await signUpAndLogin(t, 'ar');
    const [welcome, ...more] = mailsTo(parent.email, 'welcome');
    expect(more).toEqual([]);
    expect(welcome?.language).toBe('ar');
    expect(welcome?.params.actionUrl).toMatch(/\/ar\/children\/new$/);
  });

  it('reminds parents three days before a trial ends, once, and not when premium stays on', async () => {
    const { parent, child } = await family(t);
    const other = await family(t);
    const endsAt = new Date(Date.now() + 2 * DAY_MS);
    for (const id of [child.id, other.child.id]) {
      await t.prisma.studentProfile.update({
        where: { userId: id },
        data: { trialEndsAt: endsAt },
      });
    }
    // The second family has premium from our team: nothing to remind.
    const admin = await staffLogin(t, 'admin');
    await t
      .http()
      .post(`/v1/admin/users/${other.parent.user.id}/premium`)
      .set(auth(admin.token))
      .send({ months: 1, reason: 'Pilot family' })
      .expect(200);

    const now = new Date();
    await emails.sendTrialReminders(now);
    const [reminder] = mailsTo(parent.email, 'trialEnding');
    expect(reminder?.params.vars).toMatchObject({ nickname: child.nickname });
    expect(reminder?.params.actionUrl).toMatch(/\/en\/billing$/);
    expect(mailsTo(other.parent.email, 'trialEnding')).toEqual([]);
    const bell = await t.http().get('/v1/notifications').set(auth(parent.accessToken)).expect(200);
    expect(bell.body.items[0]).toMatchObject({
      type: 'trial_ending',
      data: { childId: child.id, endsAt: endsAt.toISOString() },
    });

    // Running again (or on a second server) sends nothing new.
    await emails.sendTrialReminders(now);
    expect(mailsTo(parent.email, 'trialEnding')).toHaveLength(1);
  });

  it("sends last month's progress on the 1st, once, unless the parent switched it off", async () => {
    const { parent, child } = await family(t);
    const quiet = await family(t);
    // Last month (as seen from the run below): a lesson done and some XP.
    const now = new Date(Date.UTC(2031, 4, 1, 6, 20));
    const inMonth = new Date(Date.UTC(2031, 3, 15));
    const lesson = await t.prisma.lesson.findFirstOrThrow({ where: { isActive: true } });
    await t.prisma.lessonProgress.create({
      data: { userId: child.id, lessonId: lesson.id, status: 'COMPLETED', completedAt: inMonth },
    });
    await t.prisma.xpEvent.create({
      data: {
        userId: child.id,
        source: 'LESSON',
        sourceId: `summary-${child.id}`,
        amount: 35,
        day: inMonth,
        createdAt: inMonth,
      },
    });
    // Markers from an earlier run of this spec.
    await t.redis.del(
      `summary:2031-04:${parent.user.id}`,
      `summary:2031-04:${quiet.parent.user.id}`,
    );

    // The switch on the dashboard.
    const prefs = await t
      .http()
      .get('/v1/account/email-preferences')
      .set(auth(quiet.parent.accessToken))
      .expect(200);
    expect(prefs.body).toEqual({ monthlySummary: true });
    await t
      .http()
      .put('/v1/account/email-preferences')
      .set(auth(quiet.parent.accessToken))
      .send({ monthlySummary: false })
      .expect(200, { monthlySummary: false });
    await t
      .http()
      .put('/v1/account/email-preferences')
      .set(auth(quiet.parent.accessToken))
      .send({ monthlySummary: 'no' })
      .expect(400);
    // Students have no such emails.
    await t.http().get('/v1/account/email-preferences').set(auth(quiet.student)).expect(403);

    await emails.sendMonthlySummaries(now);
    const [summary, ...more] = mailsTo(parent.email, 'monthlySummary');
    expect(more).toEqual([]);
    expect(summary?.params.vars).toEqual({ month: 'April 2031' });
    expect(summary?.params.lines).toHaveLength(1);
    expect(summary?.params.lines?.[0]).toContain(child.nickname);
    expect(summary?.text).toContain('lessons finished: 1,');
    expect(summary?.text).toContain('XP earned: 35,');
    expect(mailsTo(quiet.parent.email, 'monthlySummary')).toEqual([]);

    await emails.sendMonthlySummaries(now);
    expect(mailsTo(parent.email, 'monthlySummary')).toHaveLength(1);
  });

  describe('waitlist', () => {
    it('counts an address only once its owner confirms it', async () => {
      const email = uniqueEmail('wait');
      await join(email.toUpperCase()).expect(202);
      const sent = lastMailTo(t.mail, email);
      expect(sent?.template).toBe('waitlistConfirm');
      expect(sent?.language).toBe('ar');
      expect(sent?.params.actionUrl).toMatch(
        /^http:\/\/localhost:3003\/ar\/waitlist\/confirm\?token=/,
      );

      const admin = await staffLogin(t, 'admin');
      const summary = async () =>
        (await t.http().get('/v1/admin/waitlist').set(auth(admin.token)).expect(200)).body as {
          countries: { countryCode: string; confirmed: number; pending: number }[];
          latest: { email: string }[];
        };
      const before = await summary();
      const egBefore = before.countries.find((c) => c.countryCode === 'EG');
      expect(egBefore?.pending).toBeGreaterThanOrEqual(1);
      expect(before.latest.map((e) => e.email)).not.toContain(email);

      await t
        .http()
        .post('/v1/waitlist/confirm')
        .send({ token: tokenFrom(sent) })
        .expect(200);
      // A used link doesn't work again.
      await t
        .http()
        .post('/v1/waitlist/confirm')
        .send({ token: tokenFrom(sent) })
        .expect(404);
      const after = await summary();
      expect(after.latest[0]).toMatchObject({ email, countryCode: 'EG', ageBand: 'AGE_9_12' });
      expect(after.countries.find((c) => c.countryCode === 'EG')?.confirmed).toBe(
        (egBefore?.confirmed ?? 0) + 1,
      );

      // Joining again once confirmed: the same answer, and new answers apply only once
      // the inbox owner clicks the new link (anyone can type someone's address).
      await join(email, { countryCode: 'PK', ageBand: 'AGE_13_16' }).expect(202);
      const again = lastMailTo(t.mail, email);
      expect(again).not.toBe(sent);
      expect(again?.template).toBe('waitlistConfirm');
      const unchanged = await t.prisma.waitlistEntry.findUniqueOrThrow({ where: { email } });
      expect(unchanged).toMatchObject({ countryCode: 'EG', ageBand: 'AGE_9_12' });
      await t
        .http()
        .post('/v1/waitlist/confirm')
        .send({ token: tokenFrom(again) })
        .expect(200);
      const entry = await t.prisma.waitlistEntry.findUniqueOrThrow({ where: { email } });
      expect(entry).toMatchObject({ countryCode: 'PK', ageBand: 'AGE_13_16' });
      expect(entry.confirmedAt).not.toBeNull();
      // Once only.
      await t
        .http()
        .post('/v1/waitlist/confirm')
        .send({ token: tokenFrom(again) })
        .expect(404);
    });

    it('turns old links away and forgets addresses never confirmed', async () => {
      const email = uniqueEmail('wait');
      await join(email).expect(202);
      const token = tokenFrom(lastMailTo(t.mail, email));
      await t.prisma.waitlistEntry.update({
        where: { email },
        data: { tokenExpiresAt: new Date(Date.now() - 1000) },
      });
      await t.http().post('/v1/waitlist/confirm').send({ token }).expect(410);
      await t
        .http()
        .post('/v1/waitlist/confirm')
        .send({ token: 'x'.repeat(40) })
        .expect(404);

      // A month later, the nightly cleanup removes it.
      const waitlist = t.app.get(WaitlistService);
      await waitlist.forgetUnconfirmed(new Date(Date.now() + 31 * DAY_MS));
      expect(await t.prisma.waitlistEntry.findUnique({ where: { email } })).toBeNull();
    });

    it('checks what it gets, limits tries, and is for admins to read', async () => {
      await join('not-an-email').expect(400);
      await join(uniqueEmail('wait'), { ageBand: 'AGE_3_5' }).expect(400);
      await join(uniqueEmail('wait'), { languageCode: 'fr' }).expect(400);
      const email = uniqueEmail('wait');
      for (let i = 0; i < 3; i++) await join(email).expect(202);
      await join(email).expect(429);

      const moderator = await staffLogin(t, 'moderator');
      await t.http().get('/v1/admin/waitlist').set(auth(moderator.token)).expect(403);
      const parent = await signUpAndLogin(t);
      await t.http().get('/v1/admin/waitlist').set(auth(parent.accessToken)).expect(403);
      await t.http().get('/v1/admin/waitlist').expect(401);
    });
  });

  it('lets the public portfolio page (another domain) read shared portfolios, errors too', async () => {
    const res = await t
      .http()
      .get('/v1/shared/portfolios/not-a-real-token')
      .set('Origin', 'https://usercontent.example.com')
      .expect(404);
    expect(res.headers['access-control-allow-origin']).toBe('*');
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.headers['referrer-policy']).toBe('no-referrer');
    // Other routes stay closed to other origins.
    const other = await t
      .http()
      .get('/v1/public/pricing')
      .set('Origin', 'https://usercontent.example.com')
      .expect(200);
    expect(other.headers['access-control-allow-origin']).toBeUndefined();
  });
});
