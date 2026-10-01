import { MENTOR_CODE_OF_CONDUCT_VERSION } from '@kcp/database';
import {
  createTestApp,
  resetRateLimits,
  staffLogin,
  type TestContext,
  webTwoFactorLogin,
} from './helpers.js';
import {
  auth,
  family,
  hideLearningFixture,
  PROJECT_CHECKS,
  seedLearningFixture,
  seedProjectFixture,
} from './learning-fixture.js';

const BRIEF = 'e2e-m01-project';
const PAGE = { html: '<h1>Me</h1>\n<p>I like space.</p>', css: '', js: '' };
const allPassed = PROJECT_CHECKS.map((check) => ({ id: check.id, passed: true }));
const SCORES = { works: 4, code: 3, design: 3, creativity: 4 };

describe('mentor reviews (e2e)', () => {
  let t: TestContext;
  let admin: string;

  beforeAll(async () => {
    t = await createTestApp();
    await seedLearningFixture(t.prisma);
    await seedProjectFixture(t.prisma);
    admin = (await staffLogin(t, 'admin')).token;
    // Earlier runs' reviews wait in the same queue: close them.
    await t.prisma.review.updateMany({
      where: { status: { in: ['WAITING', 'IN_REVIEW'] } },
      data: { status: 'CANCELLED' },
    });
  });

  beforeEach(async () => {
    await resetRateLimits(t.redis);
  });

  afterAll(async () => {
    await hideLearningFixture(t.prisma);
    await t.app.close();
  });

  const ship = (token: string) =>
    t
      .http()
      .post(`/v1/projects/${BRIEF}/ship`)
      .set(auth(token))
      .send({ code: PAGE, results: allPassed })
      .expect(200);

  /** A mentor who passed the background check and signed the code of conduct. */
  async function readyMentor(languages = ['en', 'ar', 'ur']) {
    const mentor = await webTwoFactorLogin(t, 'mentor');
    await t
      .http()
      .post('/v1/mentor/code-of-conduct')
      .set(auth(mentor.token))
      .send({ version: MENTOR_CODE_OF_CONDUCT_VERSION })
      .expect(204);
    await t
      .http()
      .patch(`/v1/admin/mentors/${mentor.user.id}`)
      .set(auth(admin))
      .send({ backgroundCheck: 'PASSED', languages, reason: 'Check came back clear' })
      .expect(204);
    return mentor;
  }

  it('a premium project is reviewed line by line, and the family sees the result', async () => {
    const { parent, child, student } = await family(t);
    await ship(student);
    const waiting = await t.prisma.review.findFirstOrThrow({ where: { studentId: child.id } });
    const language = (await t.prisma.user.findUniqueOrThrow({ where: { id: child.id } }))
      .languageCode;
    expect(waiting).toMatchObject({ status: 'WAITING', version: 1, languageCode: language });

    // A mentor can't review before onboarding is done.
    const newcomer = await webTwoFactorLogin(t, 'mentor');
    const early = await t.http().get('/v1/mentor/queue').set(auth(newcomer.token)).expect(403);
    expect(early.body.error).toBe('MENTOR_NOT_READY');
    const status = await t.http().get('/v1/mentor/status').set(auth(newcomer.token)).expect(200);
    expect(status.body).toMatchObject({ ready: false, backgroundCheck: 'NOT_STARTED' });

    const mentor = await readyMentor();
    const queue = await t.http().get('/v1/mentor/queue').set(auth(mentor.token)).expect(200);
    const item = queue.body.waiting.find((i: { id: string }) => i.id === waiting.id);
    expect(item).toMatchObject({ nickname: child.nickname, title: 'My page', overdue: false });
    // Mentors see the nickname only.
    expect(JSON.stringify(queue.body)).not.toContain(child.username);

    await t
      .http()
      .post(`/v1/mentor/reviews/${waiting.id}/claim`)
      .set(auth(mentor.token))
      .expect(204);
    const other = await readyMentor();
    const taken = await t
      .http()
      .post(`/v1/mentor/reviews/${waiting.id}/claim`)
      .set(auth(other.token))
      .expect(409);
    expect(taken.body.error).toBe('REVIEW_TAKEN');

    const review = `/v1/mentor/reviews/${waiting.id}`;
    const detail = await t.http().get(review).set(auth(mentor.token)).expect(200);
    expect(detail.body).toMatchObject({
      isMine: true,
      files: { html: PAGE.html },
      criteria: Object.keys(SCORES),
    });
    await t
      .http()
      .post(`${review}/comments`)
      .set(auth(mentor.token))
      .send({ file: 'html', line: 2, body: 'Great paragraph! Could you add a second one?' })
      .expect(204);
    await t
      .http()
      .post(`${review}/comments`)
      .set(auth(mentor.token))
      .send({ file: 'html', line: 40, body: 'No such line' })
      .expect(409);
    const partial = await t
      .http()
      .post(`${review}/decision`)
      .set(auth(mentor.token))
      .send({ decision: 'APPROVED', scores: { works: 4 }, summary: 'Well done' })
      .expect(409);
    expect(partial.body.error).toBe('SCORES_NEEDED');
    await t
      .http()
      .post(`${review}/decision`)
      .set(auth(mentor.token))
      .send({
        decision: 'APPROVED',
        scores: SCORES,
        summary: 'Well done, a clear and friendly page.',
      })
      .expect(204);

    // The student sees it on the project page and opens it.
    const project = await t.http().get(`/v1/projects/${BRIEF}`).set(auth(student)).expect(200);
    expect(project.body.review).toMatchObject({ id: waiting.id, status: 'APPROVED', seen: false });
    const result = await t.http().get(`/v1/reviews/${waiting.id}`).set(auth(student)).expect(200);
    expect(result.body).toMatchObject({
      status: 'APPROVED',
      summary: 'Well done, a clear and friendly page.',
      scores: SCORES,
      comments: [{ file: 'html', line: 2 }],
    });
    expect(result.body.mentorName).toBeTruthy();
    await t.http().post(`/v1/reviews/${waiting.id}/seen`).set(auth(student)).expect(204);

    // The parent can read it too; another family can't.
    await t.http().get(`/v1/reviews/${waiting.id}`).set(auth(parent.accessToken)).expect(200);
    const stranger = await family(t);
    await t.http().get(`/v1/reviews/${waiting.id}`).set(auth(stranger.student)).expect(404);
    await t
      .http()
      .get(`/v1/reviews/${waiting.id}`)
      .set(auth(stranger.parent.accessToken))
      .expect(404);

    const bell = (await t.http().get('/v1/notifications').set(auth(parent.accessToken)).expect(200))
      .body as { items: { type: string; data: Record<string, unknown> }[] };
    expect(bell.items.some((n) => n.type === 'child_reviewed')).toBe(true);

    // Notes are for mentors only.
    await t
      .http()
      .post(`/v1/mentor/students/${child.id}/notes`)
      .set(auth(mentor.token))
      .send({ body: 'Loves space; responds well to specific praise.' })
      .expect(204);
    const again = await t.http().get(review).set(auth(other.token)).expect(200);
    expect(again.body.notes[0]).toMatchObject({
      body: 'Loves space; responds well to specific praise.',
    });
    expect(JSON.stringify(result.body)).not.toContain('responds well');
  });

  it('keeps one open review per project, and hands reviews back when a mentor stops', async () => {
    const { child, student } = await family(t);
    await ship(student);
    await ship(student);
    const open = await t.prisma.review.findMany({
      where: { studentId: child.id, status: { in: ['WAITING', 'IN_REVIEW'] } },
    });
    expect(open).toHaveLength(1);
    expect(open[0]!.version).toBe(2);

    const mentor = await readyMentor();
    await t
      .http()
      .post(`/v1/mentor/reviews/${open[0]!.id}/claim`)
      .set(auth(mentor.token))
      .expect(204);
    await t
      .http()
      .patch(`/v1/admin/mentors/${mentor.user.id}`)
      .set(auth(admin))
      .send({ isActive: false, reason: 'Taking a break' })
      .expect(204);
    expect((await t.prisma.review.findUniqueOrThrow({ where: { id: open[0]!.id } })).status).toBe(
      'WAITING',
    );
    const stopped = await t.http().get('/v1/mentor/queue').set(auth(mentor.token)).expect(403);
    expect(stopped.body.error).toBe('MENTOR_NOT_READY');
  });

  it('lets admins invite mentors, and shows the workload', async () => {
    const email = `mentor-${Date.now()}@kcp-test.test`;
    const invited = await t
      .http()
      .post('/v1/admin/mentors')
      .set(auth(admin))
      .send({
        email,
        displayName: 'Sara Ahmed',
        languageCode: 'ar',
        languages: ['ar', 'en'],
        capacity: 3,
      })
      .expect(201);
    const mail = t.mail.outbox.filter((m) => m.to === email).at(-1);
    expect(mail?.subject).toContain('مرشد');
    expect(mail?.text).toContain('/ar/reset-password?token=');
    const list = await t.http().get('/v1/admin/mentors').set(auth(admin)).expect(200);
    expect(list.body.mentors).toContainEqual(
      expect.objectContaining({
        id: invited.body.id,
        invited: true,
        languages: ['ar', 'en'],
        capacity: 3,
        ready: false,
      }),
    );
    await t
      .http()
      .post('/v1/admin/mentors')
      .set(auth(admin))
      .send({ email, displayName: 'Again', languageCode: 'en', languages: [], capacity: 3 })
      .expect(409);
    // Families and moderators can't see or manage mentors.
    const { parent, student } = await family(t);
    const moderator = (await staffLogin(t, 'moderator')).token;
    for (const token of [parent.accessToken, student, moderator]) {
      await t.http().get('/v1/admin/mentors').set(auth(token)).expect(403);
      await t.http().get('/v1/mentor/queue').set(auth(token)).expect(403);
    }
  });
});
