import { REFERRAL_MAX_PER_YEAR, REFERRAL_REWARD_DAYS } from '@kcp/shared';
import { ReportsService } from '../src/reports/reports.service.js';
import {
  CHILD_PASSWORD,
  childBody,
  createTestApp,
  lastMailTo,
  PASSWORD,
  resetRateLimits,
  tokenFrom,
  type TestContext,
  uniqueEmail,
} from './helpers.js';
import {
  auth,
  family,
  H1_CHECKS,
  hideLearningFixture,
  P_CHECKS,
  PROJECT_CHECKS,
  seedLearningFixture,
  seedProjectFixture,
} from './learning-fixture.js';

const DAY_MS = 24 * 60 * 60 * 1000;

describe('referrals, minutes, skills and weekly reports (e2e)', () => {
  let t: TestContext;

  beforeAll(async () => {
    t = await createTestApp();
    await seedLearningFixture(t.prisma);
    await seedProjectFixture(t.prisma);
    await t.prisma.lesson.update({ where: { id: 'e2e-m01-l01' }, data: { skills: ['html'] } });
  });

  beforeEach(async () => {
    await resetRateLimits(t.redis);
  });

  afterAll(async () => {
    await t.prisma.lesson.update({ where: { id: 'e2e-m01-l01' }, data: { skills: [] } });
    await hideLearningFixture(t.prisma);
    await t.app.close();
  });

  /** A new parent who signed up with an invite code, with a child. */
  async function invitedFamily(code: string | undefined) {
    const email = uniqueEmail('invited');
    await t
      .http()
      .post('/v1/auth/parents/sign-up')
      .send({
        email,
        password: PASSWORD,
        displayName: 'Invited Parent',
        languageCode: 'en',
        countryCode: 'PK',
        acceptTerms: true,
        ...(code ? { referralCode: code } : {}),
      })
      .expect(202);
    await t
      .http()
      .post('/v1/auth/email/verify')
      .send({ token: tokenFrom(lastMailTo(t.mail, email)) })
      .expect(200);
    const login = await t.http().post('/v1/auth/login').send({ email, password: PASSWORD });
    const parent = login.body.accessToken as string;
    const child = (
      await t.http().post('/v1/children').set(auth(parent)).send(childBody()).expect(201)
    ).body as { id: string; username: string };
    const student = (
      await t
        .http()
        .post('/v1/auth/students/login')
        .send({ username: child.username, password: CHILD_PASSWORD })
        .expect(200)
    ).body.accessToken as string;
    const user = await t.prisma.user.findUniqueOrThrow({ where: { email } });
    return { email, parent, child, student, userId: user.id };
  }

  const ship = (student: string) =>
    t
      .http()
      .post('/v1/projects/e2e-m01-project/ship')
      .set(auth(student))
      .send({
        code: { html: '<h1>Me</h1><p>Hi</p>', css: '', js: '' },
        results: PROJECT_CHECKS.map((c) => ({ id: c.id, passed: true })),
      })
      .expect(200);

  /** The referrer's sessions came from another network (tests all run on one machine). */
  const otherNetwork = (userId: string) =>
    t.prisma.session.updateMany({ where: { userId }, data: { ipAddress: '203.0.113.9' } });

  it('rewards the inviting family when the invited family’s child ships their first project', async () => {
    const referrer = await family(t);
    const summary = await t
      .http()
      .get('/v1/referrals')
      .set(auth(referrer.parent.accessToken))
      .expect(200);
    expect(summary.body).toMatchObject({
      rewardDays: REFERRAL_REWARD_DAYS,
      maxPerYear: REFERRAL_MAX_PER_YEAR,
      rewardedThisYear: 0,
      invitations: [],
    });
    const code = summary.body.code as string;
    expect(code).toMatch(/^[2-9A-HJ-NP-Z]{8}$/);
    expect(summary.body.link).toMatch(new RegExp(`/en/sign-up\\?ref=${code}$`));
    // Students have no invite link.
    await t.http().get('/v1/referrals').set(auth(referrer.student)).expect(403);

    await otherNetwork(referrer.parent.user.id);
    const invited = await invitedFamily(code.toLowerCase());
    let list = await t.http().get('/v1/referrals').set(auth(referrer.parent.accessToken));
    expect(list.body.invitations).toMatchObject([{ status: 'PENDING', reason: null }]);

    // Shipping again doesn't reward twice.
    await ship(invited.student);
    await ship(invited.student);
    const grants = await t.prisma.premiumGrant.findMany({ where: { userId: referrer.child.id } });
    expect(grants).toHaveLength(1);
    expect(grants[0]).toMatchObject({ source: 'REFERRAL', grantedById: null });
    expect(grants[0]!.endsAt.getTime() - grants[0]!.startsAt.getTime()).toBe(
      REFERRAL_REWARD_DAYS * DAY_MS,
    );
    const status = await t
      .http()
      .get(`/v1/children/${referrer.child.id}`)
      .set(auth(referrer.parent.accessToken))
      .expect(200);
    expect(status.body.premiumSource).toBe('grant');
    list = await t.http().get('/v1/referrals').set(auth(referrer.parent.accessToken));
    expect(list.body).toMatchObject({
      rewardedThisYear: 1,
      invitations: [{ status: 'REWARDED', rewardDays: REFERRAL_REWARD_DAYS }],
    });
    expect(lastMailTo(t.mail, referrer.parent.email)?.subject).toMatch(
      new RegExp(`^Your children got ${REFERRAL_REWARD_DAYS} days of premium`),
    );
    const note = await t.prisma.notification.findFirstOrThrow({
      where: { userId: referrer.parent.user.id, type: 'referral_rewarded' },
    });
    expect(note.data).toEqual({ days: REFERRAL_REWARD_DAYS });

    // A second reward adds its days after the first.
    const again = await invitedFamily(code);
    await ship(again.student);
    const both = await t.prisma.premiumGrant.findMany({
      where: { userId: referrer.child.id },
      orderBy: { startsAt: 'asc' },
    });
    expect(both[1]!.startsAt.getTime()).toBe(both[0]!.endsAt.getTime());
  });

  it('gives no reward to what looks like one family, or past the yearly limit', async () => {
    // Same network: the invited parent signed up where the inviting one signs in.
    const nearby = await family(t);
    const code = (
      await t.http().get('/v1/referrals').set(auth(nearby.parent.accessToken)).expect(200)
    ).body.code as string;
    const neighbour = await invitedFamily(code);
    await ship(neighbour.student);
    expect(
      await t.prisma.referral.findUniqueOrThrow({ where: { inviteeId: neighbour.userId } }),
    ).toMatchObject({ status: 'NOT_REWARDED', reason: 'SAME_NETWORK' });

    // The yearly limit.
    const busy = await family(t);
    const busyCode = (
      await t.http().get('/v1/referrals').set(auth(busy.parent.accessToken)).expect(200)
    ).body.code as string;
    await otherNetwork(busy.parent.user.id);
    for (let i = 0; i < REFERRAL_MAX_PER_YEAR; i++) {
      const filler = await invitedFamily(undefined);
      await t.prisma.referral.create({
        data: {
          referrerId: busy.parent.user.id,
          inviteeId: filler.userId,
          status: 'REWARDED',
          rewardDays: REFERRAL_REWARD_DAYS,
          decidedAt: new Date(Date.now() - 30 * DAY_MS),
        },
      });
    }
    const late = await invitedFamily(busyCode);
    await ship(late.student);
    expect(
      await t.prisma.referral.findUniqueOrThrow({ where: { inviteeId: late.userId } }),
    ).toMatchObject({ status: 'NOT_REWARDED', reason: 'YEARLY_LIMIT' });

    // Codes that aren't anyone's are ignored: the sign-up works.
    const stranger = await invitedFamily('ZZZZ2222');
    expect(await t.prisma.referral.count({ where: { inviteeId: stranger.userId } })).toBe(0);
  });

  it('counts minutes, maps skills, and writes the weekly report', async () => {
    const { parent, child, student } = await family(t);
    await t.redis.del(`activity:${child.id}`);
    await t.http().post('/v1/activity/heartbeat').set(auth(student)).expect(204);
    // A second heartbeat within the minute (another tab) doesn't count.
    await t.http().post('/v1/activity/heartbeat').set(auth(student)).expect(204);
    await t.redis.del(`activity:${child.id}`);
    await t.http().post('/v1/activity/heartbeat').set(auth(student)).expect(204);
    const days = await t.prisma.studentActivityDay.findMany({ where: { userId: child.id } });
    expect(days.map((d) => d.minutes)).toEqual([2]);
    await t.http().post('/v1/activity/heartbeat').set(auth(parent.accessToken)).expect(403);

    // Finishing the lesson that teaches HTML.
    for (const [id, checks] of [
      ['e2e-m01-l01-c1', H1_CHECKS],
      ['e2e-m01-l01-c2', P_CHECKS],
    ] as const) {
      await t
        .http()
        .post(`/v1/learning/challenges/${id}/submissions`)
        .set(auth(student))
        .send({
          code: { html: '<h1>Hi</h1><p>Hi</p>' },
          results: checks.map((c) => ({ id: c.id, passed: true })),
        })
        .expect(201);
    }
    const map = await t.http().get('/v1/skills?lang=ar').set(auth(student)).expect(200);
    const web = map.body.categories.find((c: { key: string }) => c.key === 'web');
    expect(web.skills.find((s: { key: string }) => s.key === 'html')).toMatchObject({
      name: 'صفحات الويب (HTML)',
      learned: true,
      lessonsDone: 1,
    });
    expect(map.body.learned).toBeGreaterThanOrEqual(1);
    const theirs = await t
      .http()
      .get(`/v1/children/${child.id}/skills`)
      .set(auth(parent.accessToken))
      .expect(200);
    expect(theirs.body.learned).toBe(map.body.learned);
    const other = await family(t);
    await t
      .http()
      .get(`/v1/children/${child.id}/skills`)
      .set(auth(other.parent.accessToken))
      .expect(404);

    // The report for this week: once, on the dashboard and by email.
    const reports = t.app.get(ReportsService);
    expect((await reports.buildFor(parent.user.id))?.created).toBe(true);
    expect((await reports.buildFor(parent.user.id))?.created).toBe(false);
    const list = await t
      .http()
      .get('/v1/reports?lang=en')
      .set(auth(parent.accessToken))
      .expect(200);
    expect(list.body.reports).toHaveLength(1);
    const [report] = list.body.reports;
    expect(report.children).toMatchObject([
      { childId: child.id, minutes: 2, xp: 40, lessons: 1, skills: ['html'], league: 'bronze' },
    ]);
    expect(report.children[0].days).toHaveLength(7);
    expect(report.skillNames).toEqual({ html: 'Web pages (HTML)' });
    const mail = lastMailTo(t.mail, parent.email);
    expect(mail?.subject).toMatch(/^Your children's week: /);
    expect(mail?.text).toContain('time learning: 2 min, XP: 40, lessons finished: 1');
    expect(mail?.text).toContain('new skills: Web pages (HTML)');

    // Switched off: the report is still made, without an email.
    await t
      .http()
      .put('/v1/account/email-preferences')
      .set(auth(other.parent.accessToken))
      .send({ weeklyReport: false })
      .expect(200, { monthlySummary: true, weeklyReport: false });
    const before = t.mail.outbox.length;
    expect((await reports.buildFor(other.parent.user.id))?.created).toBe(true);
    expect(t.mail.outbox.slice(before).filter((m) => m.to === other.parent.email)).toEqual([]);
  });
});
