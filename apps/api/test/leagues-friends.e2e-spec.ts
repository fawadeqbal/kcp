import { LEAGUE_TIERS } from '@kcp/shared';
import { FriendsService } from '../src/friends/friends.service.js';
import { LeaguesService } from '../src/progress/leagues.service.js';
import { localDay, weekOfDay } from '../src/progress/xp-rules.js';
import {
  CHILD_PASSWORD,
  childBody,
  createTestApp,
  lastMailTo,
  resetRateLimits,
  staffLogin,
  type TestContext,
} from './helpers.js';
import {
  auth,
  family,
  H1_CHECKS,
  hideLearningFixture,
  P_CHECKS,
  seedLearningFixture,
} from './learning-fixture.js';

const EMERALD = LEAGUE_TIERS.indexOf('emerald');
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

describe('leagues and friends (e2e)', () => {
  let t: TestContext;

  beforeAll(async () => {
    t = await createTestApp();
    await seedLearningFixture(t.prisma);
    // Emerald groups of this week belong to this test (left over from an earlier run otherwise).
    const week = weekOfDay(localDay(new Date(), 'Asia/Karachi')).key;
    await t.prisma.leagueGroup.deleteMany({ where: { tier: EMERALD, weekKey: week } });
  });

  beforeEach(async () => {
    await resetRateLimits(t.redis);
  });

  afterAll(async () => {
    await hideLearningFixture(t.prisma);
    await t.app.close();
  });

  const submit = (token: string, challengeId: string, checks: { id: string }[]) =>
    t
      .http()
      .post(`/v1/learning/challenges/${challengeId}/submissions`)
      .set(auth(token))
      .send({
        code: { html: '<h1>Hi</h1><p>Hi</p>' },
        results: checks.map((check) => ({ id: check.id, passed: true })),
      })
      .expect(201);

  const leagueOf = async (token: string) =>
    (await t.http().get('/v1/league').set(auth(token)).expect(200)).body;

  const friendsOf = async (token: string) =>
    (await t.http().get('/v1/friends').set(auth(token)).expect(200)).body;

  const makeFriends = async (
    a: { student: string; parent: { accessToken: string } },
    b: { student: string; parent: { accessToken: string } },
  ) => {
    const { code } = await friendsOf(b.student);
    const sent = await t
      .http()
      .post('/v1/friends/requests')
      .set(auth(a.student))
      .send({ code })
      .expect(200);
    for (const parent of [a.parent, b.parent]) {
      await t
        .http()
        .post(`/v1/friend-requests/${sent.body.id}/decision`)
        .set(auth(parent.accessToken))
        .send({ approve: true })
        .expect(200);
    }
  };

  it('puts students in a league group with their first XP of the week, and moves the top up', async () => {
    const shown = await family(t, {
      consents: { publicLeaderboards: true, publicPortfolio: false },
    });
    const me = await family(t);
    const hidden = await family(t);
    await t.prisma.studentProfile.updateMany({
      where: { userId: { in: [shown.child.id, me.child.id, hidden.child.id] } },
      data: { leagueTier: EMERALD },
    });

    // Not in a group until the first XP of the week.
    let league = await leagueOf(me.student);
    expect(league).toMatchObject({ tier: 'emerald', tierIndex: EMERALD, joined: false });
    expect(league.standings).toEqual([]);

    await submit(shown.student, 'e2e-m01-l01-c1', H1_CHECKS);
    await submit(shown.student, 'e2e-m01-l01-c2', P_CHECKS);
    await submit(me.student, 'e2e-m01-l01-c1', H1_CHECKS);
    await submit(hidden.student, 'e2e-m01-l01-c1', H1_CHECKS);

    league = await leagueOf(me.student);
    expect(league.joined).toBe(true);
    expect(league.standings).toHaveLength(3);
    const [first, second, third] = league.standings;
    // Most XP first; a tie goes to whoever got there first.
    expect(first).toMatchObject({ rank: 1, nickname: shown.child.nickname, xp: 40, isMe: false });
    expect(second).toMatchObject({ rank: 2, nickname: me.child.nickname, xp: 10, isMe: true });
    // Kept off public boards by their parent: "A player", unless a friend.
    expect(third).toMatchObject({ rank: 3, nickname: null, avatarKey: null, xp: 10 });
    // A small group: all three would move up, no one down.
    expect(league.standings.map((s: { zone: string | null }) => s.zone)).toEqual([
      'up',
      'up',
      'up',
    ]);
    expect(league).toMatchObject({ promoteCount: 3, relegateCount: 0, lastResult: null });

    // Friends see each other by name.
    await makeFriends(me, hidden);
    league = await leagueOf(me.student);
    expect(league.standings[2]).toMatchObject({
      nickname: hidden.child.nickname,
      isFriend: true,
    });

    // Staff take XP away: the league week goes down too.
    const admin = await staffLogin(t, 'admin');
    await t
      .http()
      .post(`/v1/admin/users/${shown.child.id}/xp-removals`)
      .set(auth(admin.token))
      .send({ amount: 35, reason: 'Copied answers in bulk' })
      .expect(200);
    league = await leagueOf(me.student);
    expect(league.standings.map((s: { xp: number }) => s.xp)).toEqual([10, 10, 5]);

    // The week ends everywhere: final ranks, everyone with XP moves up to Diamond.
    const leagues = t.app.get(LeaguesService);
    expect(await leagues.closeFinished(new Date(Date.now() + WEEK_MS))).toBeGreaterThan(0);
    const profiles = await t.prisma.studentProfile.findMany({
      where: { userId: { in: [shown.child.id, me.child.id, hidden.child.id] } },
      select: { leagueTier: true },
    });
    expect(profiles.map((p) => p.leagueTier)).toEqual([EMERALD + 1, EMERALD + 1, EMERALD + 1]);
    const note = await t.prisma.notification.findFirstOrThrow({
      where: { userId: me.child.id, type: 'league_result' },
    });
    expect(note.data).toEqual({ outcome: 'PROMOTED', tier: 'diamond' });

    league = await leagueOf(me.student);
    expect(league).toMatchObject({
      tier: 'diamond',
      lastResult: { tier: 'emerald', rank: 1, outcome: 'PROMOTED', newTier: 'diamond' },
    });
    await t.http().post('/v1/league/seen').set(auth(me.student)).expect(204);
    expect((await leagueOf(me.student)).lastResult).toBeNull();

    // Parents don't play.
    await t.http().get('/v1/league').set(auth(me.parent.accessToken)).expect(403);
  });

  it('makes students friends once a parent of each approves, and lets either end it', async () => {
    const x = await family(t);
    const y = await family(t);
    const outsider = await family(t);

    const { code } = await friendsOf(x.student);
    expect(code).toMatch(/^[2-9A-HJ-NP-Z]{6}$/);
    expect((await friendsOf(x.student)).code).toBe(code);

    // Codes can be typed any way; wrong ones and your own don't work.
    const typed = `${code.slice(0, 3).toLowerCase()} ${code.slice(3)}`;
    const sent = await t
      .http()
      .post('/v1/friends/requests')
      .set(auth(y.student))
      .send({ code: typed })
      .expect(200);
    expect(sent.body).toMatchObject({ nickname: x.child.nickname, status: 'PENDING' });
    const own = (await friendsOf(y.student)).code;
    expect(
      (
        await t
          .http()
          .post('/v1/friends/requests')
          .set(auth(y.student))
          .send({ code: own })
          .expect(400)
      ).body.error,
    ).toBe('FRIEND_SELF');
    expect(
      (
        await t
          .http()
          .post('/v1/friends/requests')
          .set(auth(y.student))
          .send({ code: 'ZZZZZZ' })
          .expect(404)
      ).body.error,
    ).toBe('FRIEND_CODE_NOT_FOUND');
    // One open request per pair, whoever asks.
    const yCode = (await friendsOf(y.student)).code;
    expect(
      (
        await t
          .http()
          .post('/v1/friends/requests')
          .set(auth(x.student))
          .send({ code: yCode })
          .expect(409)
      ).body.error,
    ).toBe('FRIEND_REQUEST_EXISTS');

    // Both families hear about it: the bell and an email.
    for (const side of [x, y]) {
      const bell = await t.prisma.notification.findFirstOrThrow({
        where: { userId: side.parent.user.id, type: 'friend_request' },
      });
      expect(bell.data).toMatchObject({ requestId: sent.body.id, childId: side.child.id });
      expect(lastMailTo(t.mail, side.parent.email)?.subject).toMatch(/want to be friends/);
    }
    expect((await friendsOf(x.student)).received).toMatchObject([
      { id: sent.body.id, nickname: y.child.nickname, status: 'PENDING' },
    ]);

    // What X's parent sees.
    const requests = await t
      .http()
      .get('/v1/friend-requests')
      .set(auth(x.parent.accessToken))
      .expect(200);
    expect(requests.body).toEqual([
      expect.objectContaining({
        id: sent.body.id,
        child: expect.objectContaining({ id: x.child.id, nickname: x.child.nickname }),
        other: expect.objectContaining({ nickname: y.child.nickname }),
        direction: 'received',
        waitingForYou: true,
        waitingForOtherFamily: true,
      }),
    ]);

    // Only the two families' parents decide.
    const decide = (token: string, approve: boolean) =>
      t
        .http()
        .post(`/v1/friend-requests/${sent.body.id}/decision`)
        .set(auth(token))
        .send({ approve });
    await decide(y.student, true).expect(403);
    await decide(outsider.parent.accessToken, true).expect(404);
    expect((await decide(x.parent.accessToken, true).expect(200)).body.status).toBe('PENDING');
    expect((await decide(y.parent.accessToken, true).expect(200)).body.status).toBe('APPROVED');
    await decide(y.parent.accessToken, false).expect(409);

    // Friends: on each other's list and board, with a note for each.
    const xFriends = await friendsOf(x.student);
    expect(xFriends.friends).toMatchObject([{ userId: y.child.id, nickname: y.child.nickname }]);
    expect(xFriends.received).toEqual([]);
    const added = await t.prisma.notification.findFirstOrThrow({
      where: { userId: x.child.id, type: 'friend_added' },
    });
    expect(added.data).toEqual({ nickname: y.child.nickname });
    await submit(y.student, 'e2e-m01-l01-c1', H1_CHECKS);
    const board = await t.http().get('/v1/friends/board').set(auth(x.student)).expect(200);
    expect(board.body.entries).toMatchObject([
      { rank: 1, userId: y.child.id, xp: 10, isMe: false },
      { rank: 2, userId: x.child.id, xp: 0, isMe: true },
    ]);

    // A parent sees their child's friends and can end a friendship.
    const theirs = await t
      .http()
      .get(`/v1/children/${y.child.id}/friends`)
      .set(auth(y.parent.accessToken))
      .expect(200);
    expect(theirs.body).toMatchObject([{ userId: x.child.id }]);
    await t
      .http()
      .get(`/v1/children/${y.child.id}/friends`)
      .set(auth(outsider.parent.accessToken))
      .expect(404);
    await t
      .http()
      .delete(`/v1/children/${y.child.id}/friends/${x.child.id}`)
      .set(auth(y.parent.accessToken))
      .expect(204);
    expect((await friendsOf(x.student)).friends).toEqual([]);

    // Declined: the child sees it.
    const again = await t
      .http()
      .post('/v1/friends/requests')
      .set(auth(x.student))
      .send({ code: yCode })
      .expect(200);
    await t
      .http()
      .post(`/v1/friend-requests/${again.body.id}/decision`)
      .set(auth(y.parent.accessToken))
      .send({ approve: false })
      .expect(200);
    expect((await friendsOf(x.student)).sent).toMatchObject([
      { id: again.body.id, status: 'DECLINED' },
    ]);

    // Taken back by the child who asked, or left to expire.
    const outsiderCode = (await friendsOf(outsider.student)).code;
    const cancelled = await t
      .http()
      .post('/v1/friends/requests')
      .set(auth(x.student))
      .send({ code: outsiderCode })
      .expect(200);
    await t
      .http()
      .delete(`/v1/friends/requests/${cancelled.body.id}`)
      .set(auth(y.student))
      .expect(404);
    await t
      .http()
      .delete(`/v1/friends/requests/${cancelled.body.id}`)
      .set(auth(x.student))
      .expect(204);
    const old = await t
      .http()
      .post('/v1/friends/requests')
      .set(auth(y.student))
      .send({ code: outsiderCode })
      .expect(200);
    await t.prisma.friendRequest.update({
      where: { id: old.body.id },
      data: { createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) },
    });
    expect(await t.app.get(FriendsService).expire()).toBeGreaterThanOrEqual(1);
    expect(
      (await t.prisma.friendRequest.findUniqueOrThrow({ where: { id: old.body.id } })).status,
    ).toBe('EXPIRED');
  });

  it('lets one parent approve for brothers and sisters, and lets staff end a friendship', async () => {
    const first = await family(t);
    const created = await t
      .http()
      .post('/v1/children')
      .set(auth(first.parent.accessToken))
      .send(childBody())
      .expect(201);
    const sibling = (
      await t
        .http()
        .post('/v1/auth/students/login')
        .send({ username: created.body.username, password: CHILD_PASSWORD })
        .expect(200)
    ).body.accessToken as string;
    const { code } = await friendsOf(sibling);
    const sent = await t
      .http()
      .post('/v1/friends/requests')
      .set(auth(first.student))
      .send({ code })
      .expect(200);
    const decision = await t
      .http()
      .post(`/v1/friend-requests/${sent.body.id}/decision`)
      .set(auth(first.parent.accessToken))
      .send({ approve: true })
      .expect(200);
    expect(decision.body.status).toBe('APPROVED');

    // Staff: moderators see a student's friends and end one with a reason (audited).
    const moderator = await staffLogin(t, 'moderator');
    const list = await t
      .http()
      .get(`/v1/admin/students/${first.child.id}/friends`)
      .set(auth(moderator.token))
      .expect(200);
    expect(list.body).toMatchObject([{ userId: created.body.id }]);
    await t
      .http()
      .get(`/v1/admin/students/${first.child.id}/friends`)
      .set(auth(first.parent.accessToken))
      .expect(403);
    await t
      .http()
      .post(`/v1/admin/friendships/${list.body[0].friendshipId}/end`)
      .set(auth(moderator.token))
      .send({ reason: 'Reported by a parent' })
      .expect(204);
    const log = await t.prisma.auditLog.findFirstOrThrow({
      where: { action: 'friendship.end', entityId: list.body[0].friendshipId },
    });
    expect(log.after).toEqual({ reason: 'Reported by a parent' });
    expect((await friendsOf(first.student)).friends).toEqual([]);

    // Deleting a child takes their friendships and requests with them.
    await t.http().post('/v1/friends/requests').set(auth(first.student)).send({ code }).expect(200);
    await t
      .http()
      .delete(`/v1/children/${created.body.id}`)
      .set(auth(first.parent.accessToken))
      .send({ nickname: created.body.nickname })
      .expect(204);
    expect(
      await t.prisma.friendRequest.count({
        where: { OR: [{ fromId: created.body.id }, { toId: created.body.id }] },
      }),
    ).toBe(0);
  });
});
