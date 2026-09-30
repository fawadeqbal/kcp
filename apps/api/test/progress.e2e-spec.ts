import { DAILY_XP_CAP } from '@kcp/shared';
import { LearningService } from '../src/learning/learning.service.js';
import { ProgressService } from '../src/progress/progress.service.js';
import { LeaderboardJobsService } from '../src/progress/leaderboard-jobs.service.js';
import { weekAt } from '../src/progress/xp-rules.js';
import { createTestApp, resetRateLimits, staffLogin, type TestContext } from './helpers.js';
import {
  auth,
  family,
  H1_CHECKS,
  hideLearningFixture,
  P_CHECKS,
  seedLearningFixture,
} from './learning-fixture.js';

/** A day in January 2026, mid-afternoon in Pakistan. */
const januaryDay = (n: number) => new Date(Date.UTC(2026, 0, n, 9));

describe('XP, streaks and leaderboards (e2e)', () => {
  let t: TestContext;

  beforeAll(async () => {
    t = await createTestApp();
    await seedLearningFixture(t.prisma);
  });

  beforeEach(async () => {
    await resetRateLimits(t.redis);
  });

  afterAll(async () => {
    await hideLearningFixture(t.prisma);
    await t.app.close();
  });

  const submit = (token: string, challengeId: string, checks: { id: string }[], ok = true) =>
    t
      .http()
      .post(`/v1/learning/challenges/${challengeId}/submissions`)
      .set(auth(token))
      .send({
        code: { html: '<h1>Hi</h1><p>Hi</p>' },
        results: checks.map((check) => ({ id: check.id, passed: ok })),
      })
      .expect(201);

  const progressOf = async (token: string) =>
    (await t.http().get('/v1/progress').set(auth(token)).expect(200)).body;

  it('gives XP once per challenge and lesson, and starts a streak at the daily goal', async () => {
    const { student, parent, child } = await family(t);

    const empty = await progressOf(student);
    expect(empty).toMatchObject({
      xpTotal: 0,
      level: { number: 1, minXp: 0, nextMinXp: 100 },
      today: { xp: 0, goalXp: 20, capXp: DAILY_XP_CAP, capReached: false },
      streak: { current: 0, longest: 0, doneToday: false },
    });

    // A failed check earns nothing; the first pass earns the challenge's XP…
    expect((await submit(student, 'e2e-m01-l01-c1', H1_CHECKS, false)).body.xpAwarded).toBe(0);
    expect((await submit(student, 'e2e-m01-l01-c1', H1_CHECKS)).body.xpAwarded).toBe(10);
    // …and passing again earns nothing more.
    expect((await submit(student, 'e2e-m01-l01-c1', H1_CHECKS)).body.xpAwarded).toBe(0);
    let progress = await progressOf(student);
    expect(progress.today.xp).toBe(10);
    expect(progress.streak.current).toBe(0);

    // The last challenge completes the lesson: challenge XP plus lesson XP.
    const last = await submit(student, 'e2e-m01-l01-c2', P_CHECKS);
    expect(last.body).toMatchObject({ lessonCompleted: true, xpAwarded: 30 });
    progress = await progressOf(student);
    expect(progress).toMatchObject({
      xpTotal: 40,
      today: { xp: 40 },
      streak: { current: 1, longest: 1, doneToday: true },
    });

    const events = await t.prisma.xpEvent.findMany({ where: { userId: child.id } });
    expect(events.map((e) => `${e.source}:${e.sourceId}:${e.amount}`).toSorted()).toEqual([
      'CHALLENGE:e2e-m01-l01-c1:10',
      'CHALLENGE:e2e-m01-l01-c2:10',
      'LESSON:e2e-m01-l01:20',
    ]);

    // The parent sees it on the dashboard.
    const children = await t.http().get('/v1/children').set(auth(parent.accessToken)).expect(200);
    expect(children.body[0]).toMatchObject({ xpTotal: 40, level: 1, streak: 1 });

    // XP history can't be rewritten.
    await expect(
      t.prisma.xpEvent.update({ where: { id: events[0]!.id }, data: { amount: 999 } }),
    ).rejects.toThrow();
    await expect(t.prisma.xpEvent.delete({ where: { id: events[0]!.id } })).rejects.toThrow();
  });

  it('stops at the daily cap, and gives a capped challenge its XP on a later pass', async () => {
    const { student, child } = await family(t);
    const progress = t.app.get(ProgressService);
    await t.prisma.$transaction((tx) =>
      progress.award(tx, child.id, 'ADMIN', 'e2e-cap-test', DAILY_XP_CAP - 5),
    );

    const first = await submit(student, 'e2e-m01-l01-c1', H1_CHECKS);
    expect(first.body).toMatchObject({ xpAwarded: 5, dailyCapReached: true });
    const second = await submit(student, 'e2e-m01-l02-c1', P_CHECKS);
    expect(second.body).toMatchObject({ xpAwarded: 0, dailyCapReached: true });
    expect((await progressOf(student)).today).toMatchObject({ xp: DAILY_XP_CAP, capReached: true });
    // Nothing was recorded for the challenge that got no XP, so it can earn it later.
    expect(
      await t.prisma.xpEvent.count({ where: { userId: child.id, sourceId: 'e2e-m01-l02-c1' } }),
    ).toBe(0);

    // A lesson finished at the cap gets its XP the next time it opens, on a later day.
    const finished = await submit(student, 'e2e-m01-l01-c2', P_CHECKS);
    expect(finished.body).toMatchObject({ lessonCompleted: true, xpAwarded: 0 });
    const lessonXp = () =>
      t.prisma.xpEvent.findFirst({
        where: { userId: child.id, source: 'LESSON', sourceId: 'e2e-m01-l01' },
      });
    expect(await lessonXp()).toBeNull();
    const asStudent = {
      id: child.id,
      sessionId: 'e2e',
      roleId: '',
      roleKey: 'student',
      kind: 'STUDENT',
      isStaff: false,
    } as const;
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await t.app.get(LearningService).start('e2e-m01-l01', asStudent, tomorrow);
    expect(await lessonXp()).toMatchObject({ amount: 20 });
    // Only once.
    await t.app.get(LearningService).start('e2e-m01-l01', asStudent, tomorrow);
    expect(await t.prisma.xpEvent.count({ where: { userId: child.id, source: 'LESSON' } })).toBe(1);
  });

  it('ranks only students whose parent switched on public leaderboards', async () => {
    const shown = await family(t, {
      consents: { publicLeaderboards: true, publicPortfolio: false },
    });
    const hidden = await family(t);
    await submit(shown.student, 'e2e-m01-l01-c1', H1_CHECKS);
    await submit(hidden.student, 'e2e-m01-l01-c1', H1_CHECKS);

    const board = await t.http().get('/v1/leaderboards').set(auth(shown.student)).expect(200);
    expect(board.body.scope).toBe('global');
    expect(board.body).toMatchObject({ period: 'week', available: true });
    expect(board.body.week.key).toMatch(/^\d{4}-W\d{2}$/);
    const me = board.body.entries.find((e: { isMe: boolean }) => e.isMe);
    expect(me).toMatchObject({ nickname: shown.child.nickname, avatarKey: 'rocket', xp: 10 });
    // Nickname, avatar and XP only.
    expect(Object.keys(me).toSorted()).toEqual(['avatarKey', 'isMe', 'nickname', 'rank', 'xp']);
    expect(board.body.me).toMatchObject({ rank: me.rank, xp: 10, hidden: false });
    const nicknames = board.body.entries.map((e: { nickname: string }) => e.nickname);
    expect(nicknames).not.toContain(hidden.child.nickname);

    const country = await t
      .http()
      .get('/v1/leaderboards?scope=country')
      .set(auth(shown.student))
      .expect(200);
    expect(country.body.countryCode).toBe('PK');
    expect(country.body.entries.some((e: { isMe: boolean }) => e.isMe)).toBe(true);

    // The hidden student sees the board, and their own XP, but isn't on it.
    const theirView = await t.http().get('/v1/leaderboards').set(auth(hidden.student)).expect(200);
    expect(theirView.body.me).toEqual({ rank: null, xp: 10, hidden: true });
    expect((await progressOf(hidden.student)).week).toMatchObject({ hidden: true, xp: 10 });

    // Their parent switches boards on: they appear straight away; off again: gone.
    const setBoards = (on: boolean) =>
      t
        .http()
        .put(`/v1/children/${hidden.child.id}/consents`)
        .set(auth(hidden.parent.accessToken))
        .send({ publicLeaderboards: on, publicPortfolio: false })
        .expect(200);
    await setBoards(true);
    let after = await t.http().get('/v1/leaderboards').set(auth(hidden.student)).expect(200);
    expect(after.body.me).toMatchObject({ xp: 10, hidden: false });
    expect(after.body.me.rank).toBeGreaterThan(0);
    expect((await progressOf(hidden.student)).week.globalRank).toBe(after.body.me.rank);
    await setBoards(false);
    after = await t.http().get('/v1/leaderboards').set(auth(shown.student)).expect(200);
    expect(after.body.entries.map((e: { nickname: string }) => e.nickname)).not.toContain(
      hidden.child.nickname,
    );
  });

  it('takes suspended students off the boards until they are reactivated', async () => {
    const { student, child } = await family(t, {
      consents: { publicLeaderboards: true, publicPortfolio: false },
    });
    await submit(student, 'e2e-m01-l01-c1', H1_CHECKS);
    const key = `lb:w:${weekAt(new Date(), 'Asia/Karachi').key}:global:-`;
    expect(await t.redis.zscore(key, child.id)).toBe('10');

    const admin = await staffLogin(t, 'admin');
    const setStatus = (status: 'ACTIVE' | 'SUSPENDED') =>
      t
        .http()
        .patch(`/v1/users/${child.id}/status`)
        .set(auth(admin.token))
        .send({ status, reason: 'Browser of a shared computer' })
        .expect(200);
    await setStatus('SUSPENDED');
    expect(await t.redis.zscore(key, child.id)).toBeNull();
    await setStatus('ACTIVE');
    expect(await t.redis.zscore(key, child.id)).toBe('10');
  });

  it('rebuilds the boards from the database when Redis has lost them', async () => {
    const shown = await family(t, {
      consents: { publicLeaderboards: true, publicPortfolio: false },
    });
    await submit(shown.student, 'e2e-m01-l01-c1', H1_CHECKS);
    const before = await t.http().get('/v1/leaderboards').set(auth(shown.student)).expect(200);
    const keys = await t.redis.keys('lb:*');
    if (keys.length) await t.redis.del(...keys);
    const after = await t.http().get('/v1/leaderboards').set(auth(shown.student)).expect(200);
    expect(after.body.me).toEqual(before.body.me);
    expect(after.body.entries).toEqual(before.body.entries);
  });

  it('gives badges for what students do, and celebrates each once', async () => {
    const { student } = await family(t);
    const first = await submit(student, 'e2e-m01-l01-c1', H1_CHECKS);
    expect(first.body.badgesEarned).toEqual(['first-steps']);
    const last = await submit(student, 'e2e-m01-l01-c2', P_CHECKS);
    expect(last.body.badgesEarned).toEqual(['first-lesson']);
    // Passing again earns nothing new.
    expect((await submit(student, 'e2e-m01-l01-c2', P_CHECKS)).body.badgesEarned).toEqual([]);

    const list = await t.http().get('/v1/badges').set(auth(student)).expect(200);
    const byKey = new Map(
      list.body.badges.map((b: { key: string; earned: boolean; seen: boolean }) => [b.key, b]),
    );
    expect(byKey.get('first-steps')).toMatchObject({ earned: true, seen: false, icon: '👣' });
    expect(byKey.get('first-ship')).toMatchObject({ earned: false, seen: true });
    expect((await progressOf(student)).badges).toMatchObject({ earned: 2, unseen: 2 });
    await t
      .http()
      .post('/v1/badges/seen')
      .set(auth(student))
      .send({ keys: ['first-steps', 'first-lesson'] })
      .expect(204);
    expect((await progressOf(student)).badges).toMatchObject({ earned: 2, unseen: 0 });
    await t
      .http()
      .post('/v1/badges/seen')
      .set(auth(student))
      .send({ keys: ['<x>'] })
      .expect(400);
  });

  it('keeps a streak going with freezes earned every 7 days', async () => {
    const { child } = await family(t);
    const progress = t.app.get(ProgressService);
    const earn = (n: number) =>
      t.prisma.$transaction((tx) =>
        progress.award(tx, child.id, 'ADMIN', `streak-${n}`, 20, januaryDay(n)),
      );
    for (let n = 1; n <= 7; n++) await earn(n);
    let streak = await t.prisma.streak.findUniqueOrThrow({ where: { userId: child.id } });
    expect(streak).toMatchObject({ current: 7, longest: 7, freezes: 1 });
    // Day 8 missed: the freeze covers it.
    await earn(9);
    streak = await t.prisma.streak.findUniqueOrThrow({ where: { userId: child.id } });
    expect(streak).toMatchObject({ current: 8, freezes: 0 });
    // Two missed days, no freeze left: a new streak.
    await earn(12);
    streak = await t.prisma.streak.findUniqueOrThrow({ where: { userId: child.id } });
    expect(streak).toMatchObject({ current: 1, longest: 8, freezes: 0 });
  });

  it('opens region and city boards only once enough students live there', async () => {
    const region = await t.prisma.region.findFirstOrThrow({
      where: { countryCode: 'PK', cities: { some: {} } },
      include: { cities: { take: 1 } },
    });
    const city = region.cities[0]!;
    const { student, child } = await family(t, {
      regionId: region.id,
      cityId: city.id,
      consents: { publicLeaderboards: true, publicPortfolio: false },
    });
    await submit(student, 'e2e-m01-l01-c1', H1_CHECKS);
    const cityBoard = () =>
      t.http().get('/v1/leaderboards?scope=city&lang=ur').set(auth(student)).expect(200);
    let board = await cityBoard();
    expect(board.body).toMatchObject({ scope: 'city', available: false, minStudents: 20 });
    expect(board.body.entries).toEqual([]);
    expect(board.body.areaName).toBeTruthy();
    expect((await progressOf(student)).week.cityRank).toBeNull();

    // Pretend the city has enough students (the count is cached in Redis).
    await t.redis.set(`lbarea:city:${city.id}`, '25', 'EX', 60);
    board = await cityBoard();
    expect(board.body.available).toBe(true);
    expect(board.body.entries.some((e: { isMe: boolean }) => e.isMe)).toBe(true);
    expect((await progressOf(student)).week.cityRank).toBeGreaterThan(0);
    await t.redis.del(`lbarea:city:${city.id}`);
    const all = await t
      .http()
      .get('/v1/leaderboards?period=all&scope=country')
      .set(auth(student))
      .expect(200);
    expect(all.body).toMatchObject({ period: 'all', available: true, week: null });
    expect(all.body.me).toMatchObject({ xp: 10 });
    expect(child.id).toBeTruthy();
  });

  it('runs seasons, takes a cheater’s XP away with a reason, and closes finished weeks', async () => {
    const admin = await staffLogin(t, 'admin');
    const moderator = await staffLogin(t, 'moderator');
    // End any season left over from an earlier run.
    const existing = await t.http().get('/v1/admin/seasons').set(auth(admin.token)).expect(200);
    for (const season of existing.body.seasons.filter(
      (s: { status: string }) => s.status === 'ACTIVE',
    )) {
      await t.http().post(`/v1/admin/seasons/${season.id}/end`).set(auth(admin.token)).expect(200);
    }
    await t
      .http()
      .post('/v1/admin/seasons')
      .set(auth(moderator.token))
      .send({ name: 'Moderator season' })
      .expect(403);
    const today = new Date().toISOString().slice(0, 10);
    const season = await t
      .http()
      .post('/v1/admin/seasons')
      .set(auth(admin.token))
      .send({ name: 'E2E season', startDay: '2026-01-01' })
      .expect(201);
    expect(season.body).toMatchObject({ name: 'E2E season', status: 'ACTIVE', endDay: null });
    const second = await t
      .http()
      .post('/v1/admin/seasons')
      .set(auth(admin.token))
      .send({ name: 'Another' })
      .expect(409);
    expect(second.body.error).toBe('SEASON_ACTIVE');

    const { student, child } = await family(t, {
      consents: { publicLeaderboards: true, publicPortfolio: false },
    });
    await submit(student, 'e2e-m01-l01-c1', H1_CHECKS);
    await submit(student, 'e2e-m01-l01-c2', P_CHECKS);
    const seasonBoard = await t
      .http()
      .get('/v1/leaderboards?period=season')
      .set(auth(student))
      .expect(200);
    expect(seasonBoard.body).toMatchObject({
      period: 'season',
      available: true,
      season: { name: 'E2E season' },
      me: { xp: 40 },
    });
    expect((await progressOf(student)).season).toMatchObject({ name: 'E2E season' });

    // Staff see the board with usernames; moderators can look but not change.
    const adminBoard = await t
      .http()
      .get('/v1/admin/leaderboards?period=season&scope=country&scopeId=PK')
      .set(auth(moderator.token))
      .expect(200);
    expect(
      adminBoard.body.entries.find((e: { userId: string }) => e.userId === child.id),
    ).toMatchObject({
      username: child.username,
      xp: 40,
    });

    // Removing XP needs a reason and can't go below zero.
    const removal = (amount: number, reason: string, token = admin.token) =>
      t
        .http()
        .post(`/v1/admin/users/${child.id}/xp-removals`)
        .set(auth(token))
        .send({ amount, reason });
    await removal(5, 'Copied answers', moderator.token).expect(403);
    await removal(5, 'no').expect(400);
    expect((await removal(500, 'Copied answers').expect(400)).body.error).toBe(
      'XP_REMOVAL_TOO_LARGE',
    );
    const removed = await removal(15, 'Copied answers in bulk').expect(200);
    expect(removed.body).toMatchObject({ xpTotal: 25 });
    expect(removed.body.events[0]).toMatchObject({
      amount: -15,
      source: 'ADMIN',
      reason: 'Copied answers in bulk',
    });
    const afterRemoval = await t.http().get('/v1/leaderboards').set(auth(student)).expect(200);
    expect(afterRemoval.body.me.xp).toBe(25);
    const audit = await t.prisma.auditLog.findFirst({
      where: { action: 'xp.remove', entityId: child.id },
    });
    expect(audit?.after).toMatchObject({ removed: 15, reason: 'Copied answers in bulk' });

    // Staff give (and take back) the "Helper" badge; other badges are earned, not given.
    const badge = (key: string, token = admin.token) =>
      t
        .http()
        .post(`/v1/admin/users/${child.id}/badges`)
        .set(auth(token))
        .send({ badgeKey: key, reason: 'Helped classmates in the pilot class' });
    await badge('first-ship').expect(400);
    await badge('helper', moderator.token).expect(403);
    await badge('helper').expect(204);
    await badge('helper').expect(409);
    await t
      .http()
      .delete(`/v1/admin/users/${child.id}/badges/helper`)
      .set(auth(admin.token))
      .send({ reason: 'Given by mistake' })
      .expect(204);

    // The week closes after Monday 00:00 in each country: final top 10s are kept, and
    // the top 10 of each country board earn a badge.
    const jobs = t.app.get(LeaderboardJobsService);
    const week = weekAt(new Date(), 'Asia/Karachi');
    const nextMonday = new Date(`${week.endDay}T12:00:00Z`);
    try {
      await jobs.closeFinished(nextMonday);
      const results = await t.prisma.leaderboardResult.findMany({
        where: { period: 'WEEK', periodKey: week.key, scope: 'COUNTRY', scopeId: 'PK' },
        orderBy: { rank: 'asc' },
      });
      expect(results.length).toBeGreaterThan(0);
      expect(results.map((r) => r.rank)).toEqual(results.map((_, i) => i + 1));
      for (const result of results) {
        expect(
          await t.prisma.userBadge.count({
            where: { userId: result.userId, badgeKey: 'weekly-top-10' },
          }),
        ).toBe(1);
      }
      // Running it again changes nothing.
      await jobs.closeFinished(nextMonday);
      expect(
        await t.prisma.leaderboardResult.count({
          where: { period: 'WEEK', periodKey: week.key, scope: 'COUNTRY', scopeId: 'PK' },
        }),
      ).toBe(results.length);
    } finally {
      // Leave the real weekly close to the real job.
      const markers = await t.redis.keys(`lbclosed:${week.key}:*`);
      if (markers.length) await t.redis.del(...markers);
      await t.prisma.leaderboardResult.deleteMany({ where: { periodKey: week.key } });
    }

    // A season ends by hand (or when its planned end passes): its top 10s are kept.
    const ended = await t
      .http()
      .post(`/v1/admin/seasons/${season.body.id}/end`)
      .set(auth(admin.token))
      .expect(200);
    expect(ended.body.status).toBe('ENDED');
    expect(ended.body.endDay > today).toBe(true);
    const seasonResults = await t
      .http()
      .get('/v1/admin/leaderboards/results?period=SEASON')
      .set(auth(moderator.token))
      .expect(200);
    const board = seasonResults.body.boards.find(
      (b: { periodKey: string; scope: string }) =>
        b.periodKey === season.body.id && b.scope === 'GLOBAL',
    );
    expect(board.seasonName).toBe('E2E season');
    const noSeason = await t
      .http()
      .get('/v1/leaderboards?period=season')
      .set(auth(student))
      .expect(200);
    expect(noSeason.body).toMatchObject({ available: false, season: null });
  });

  it('keeps XP and boards for students only', async () => {
    const { parent } = await family(t);
    await t.http().get('/v1/progress').set(auth(parent.accessToken)).expect(403);
    await t.http().get('/v1/leaderboards').set(auth(parent.accessToken)).expect(403);
    await t.http().get('/v1/leaderboards').expect(401);
    const { student } = await family(t);
    await t.http().get('/v1/leaderboards?scope=town').set(auth(student)).expect(400);
    await t.http().get('/v1/leaderboards?period=month').set(auth(student)).expect(400);
    await t.http().get('/v1/badges').set(auth(parent.accessToken)).expect(403);
  });
});
