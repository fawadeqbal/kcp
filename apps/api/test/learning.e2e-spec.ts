import {
  auth,
  family as familyOf,
  H1_CHECKS,
  hideLearningFixture,
  P_CHECKS,
  pass,
  seedLearningFixture,
} from './learning-fixture.js';
import { createTestApp, resetRateLimits, staffLogin, type TestContext } from './helpers.js';

describe('learning (e2e)', () => {
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

  const family = () => familyOf(t);

  it('shows lessons in the student’s language, falling back to English', async () => {
    const { student } = await family();
    const overview = await t
      .http()
      .get('/v1/learning/tracks?lang=ar')
      .set(auth(student))
      .expect(200);
    const track = overview.body.tracks.find((tr: { id: string }) => tr.id === 'e2e');
    expect(track.title).toBe('مسار الاختبار');
    const lessons = track.modules[0].lessons;
    expect(lessons.map((l: { id: string }) => l.id)).toEqual(['e2e-m01-l01', 'e2e-m01-l02']);
    expect(lessons[0]).toMatchObject({
      title: 'الدرس الأول',
      status: 'NOT_STARTED',
      challengeCount: 2,
    });
    expect(lessons[1].title).toBe('Lesson l02');

    const lesson = await t
      .http()
      .get('/v1/learning/lessons/e2e-m01-l01?lang=ar')
      .set(auth(student))
      .expect(200);
    expect(lesson.body).toMatchObject({
      language: 'ar',
      title: 'الدرس الأول',
      number: 1,
      lessonCount: 2,
      video: null,
      status: 'NOT_STARTED',
      nextLessonId: 'e2e-m01-l02',
    });
    const [first] = lesson.body.challenges;
    expect(first).toMatchObject({ title: 'اكتبها', files: ['html'], draft: null, passed: false });
    // Arabic hints first, English for the rest.
    expect(first.hints).toEqual({ add_h1: 'استخدم h1', h1_text: 'Write words', add_p: 'Use p' });
    expect(first.checks).toEqual(H1_CHECKS);

    const english = await t
      .http()
      .get('/v1/learning/lessons/e2e-m01-l01')
      .set(auth(student))
      .expect(200);
    expect(english.body.video).toEqual({ provider: 'youtube', id: 'abcd1234' });

    await t.http().get('/v1/learning/lessons/e2e-m01-l03').set(auth(student)).expect(404);
    await t.http().get('/v1/learning/lessons/Not_An_Id').set(auth(student)).expect(400);
    await t.http().get('/v1/learning/lessons/e2e-m01-l01').expect(401);
  });

  it('saves drafts, stores submissions and completes a lesson when every challenge passes', async () => {
    const { student, parent } = await family();
    const as = auth(student);

    await t
      .http()
      .post('/v1/learning/lessons/e2e-m01-l01/start')
      .set(as)
      .expect(200, { status: 'STARTED' });

    await t
      .http()
      .put('/v1/learning/challenges/e2e-m01-l01-c1/draft')
      .set(as)
      .send({ code: { html: '<h1>Hi' } })
      .expect(204);
    await t
      .http()
      .put('/v1/learning/challenges/e2e-m01-l01-c1/draft')
      .set(as)
      .send({ code: { html: 'x', python: 'print(1)' } })
      .expect(400);
    await t
      .http()
      .put('/v1/learning/challenges/e2e-m01-l01-c1/draft')
      .set(as)
      .send({ code: { html: 'x'.repeat(20_001) } })
      .expect(400);
    // Three full files fit the request limit, even in Urdu (two bytes per letter)…
    const urdu = 'ک'.repeat(20_000);
    await t
      .http()
      .put('/v1/learning/challenges/e2e-m01-l01-c1/draft')
      .set(as)
      .send({ code: { html: urdu, css: urdu, js: urdu } })
      .expect(204);
    // …and anything far bigger is refused as too large, not as a server error.
    const tooLarge = await t
      .http()
      .put('/v1/learning/challenges/e2e-m01-l01-c1/draft')
      .set(as)
      .send({ code: { html: 'x'.repeat(600_000) } })
      .expect(413);
    expect(tooLarge.body.error).toBe('PAYLOAD_TOO_LARGE');
    await t
      .http()
      .put('/v1/learning/challenges/e2e-m01-l01-c1/draft')
      .set(as)
      .send({ code: { html: '<h1>Hi' } })
      .expect(204);
    let lesson = await t.http().get('/v1/learning/lessons/e2e-m01-l01').set(as).expect(200);
    expect(lesson.body.challenges[0].draft).toEqual({ html: '<h1>Hi' });

    // A failing check, or a check that wasn't reported, means not passed.
    const failed = await t
      .http()
      .post('/v1/learning/challenges/e2e-m01-l01-c1/submissions')
      .set(as)
      .send({
        code: { html: '<h1></h1>' },
        results: [
          { id: 'has-h1', passed: true },
          { id: 'h1-text', passed: false, hint: 'h1_text' },
        ],
      })
      .expect(201);
    expect(failed.body).toMatchObject({ passed: false, lessonCompleted: false });
    const partial = await t
      .http()
      .post('/v1/learning/challenges/e2e-m01-l01-c1/submissions')
      .set(as)
      .send({
        code: { html: '<h1>x</h1>' },
        results: [
          { id: 'has-h1', passed: true },
          { id: 'made-up', passed: true },
        ],
      })
      .expect(201);
    expect(partial.body.passed).toBe(false);
    expect(partial.body.results).toEqual([
      { id: 'has-h1', passed: true },
      { id: 'h1-text', passed: false },
    ]);

    const first = await t
      .http()
      .post('/v1/learning/challenges/e2e-m01-l01-c1/submissions')
      .set(as)
      .send({ code: { html: '<h1>Hello</h1>' }, results: pass(H1_CHECKS) })
      .expect(201);
    expect(first.body).toMatchObject({ passed: true, lessonCompleted: false });

    const second = await t
      .http()
      .post('/v1/learning/challenges/e2e-m01-l01-c2/submissions')
      .set(as)
      .send({ code: { html: '<p>Hi</p>' }, results: pass(P_CHECKS) })
      .expect(201);
    expect(second.body).toMatchObject({
      passed: true,
      lessonCompleted: true,
      nextLessonId: 'e2e-m01-l02',
    });

    // Passing again doesn't complete the lesson a second time.
    const again = await t
      .http()
      .post('/v1/learning/challenges/e2e-m01-l01-c2/submissions')
      .set(as)
      .send({ code: { html: '<p>Hi</p>' }, results: pass(P_CHECKS) })
      .expect(201);
    expect(again.body.lessonCompleted).toBe(false);

    lesson = await t.http().get('/v1/learning/lessons/e2e-m01-l01').set(as).expect(200);
    expect(lesson.body.status).toBe('COMPLETED');
    // The draft follows the last submitted code.
    expect(lesson.body.challenges[0]).toMatchObject({
      passed: true,
      draft: { html: '<h1>Hello</h1>' },
    });

    const overview = await t.http().get('/v1/learning/tracks').set(as).expect(200);
    expect(overview.body.lessonsCompleted).toBeGreaterThanOrEqual(1);
    const track = overview.body.tracks.find((tr: { id: string }) => tr.id === 'e2e');
    expect(track.modules[0].lessons[0].status).toBe('COMPLETED');

    // The parent sees the progress on the dashboard.
    const children = await t.http().get('/v1/children').set(auth(parent.accessToken)).expect(200);
    expect(children.body[0].lessonsCompleted).toBe(1);
  });

  it('keeps the newest submissions and the first pass, and completes lessons with nothing left', async () => {
    const { student } = await family();
    const as = auth(student);
    const submit = (html: string, results: { id: string; passed: boolean }[]) =>
      t
        .http()
        .post('/v1/learning/challenges/e2e-m01-l01-c1/submissions')
        .set(as)
        .send({ code: { html }, results })
        .expect(201);

    await submit('<h1>Done</h1>', pass(H1_CHECKS));
    for (let i = 0; i < 22; i++) {
      await submit(`<h1></h1><!-- ${i} -->`, [{ id: 'has-h1', passed: true }]);
    }
    const me = await t.http().get('/v1/auth/me').set(as).expect(200);
    const kept = await t.prisma.submission.findMany({
      where: { userId: me.body.id, challengeId: 'e2e-m01-l01-c1' },
      orderBy: { createdAt: 'asc' },
    });
    expect(kept).toHaveLength(21);
    expect(kept[0]?.passed).toBe(true);
    expect(kept.at(-1)?.code).toEqual({ html: '<h1></h1><!-- 21 -->' });
    let lesson = await t.http().get('/v1/learning/lessons/e2e-m01-l01').set(as).expect(200);
    expect(lesson.body.challenges[0].passed).toBe(true);
    expect(lesson.body.status).toBe('STARTED');

    // The other step is taken out of the lesson: opening it now completes it.
    await t.prisma.challenge.update({
      where: { id: 'e2e-m01-l01-c2' },
      data: { isActive: false },
    });
    try {
      await t
        .http()
        .post('/v1/learning/lessons/e2e-m01-l01/start')
        .set(as)
        .expect(200, { status: 'COMPLETED' });
      lesson = await t.http().get('/v1/learning/lessons/e2e-m01-l01').set(as).expect(200);
      expect(lesson.body.status).toBe('COMPLETED');
    } finally {
      await t.prisma.challenge.update({
        where: { id: 'e2e-m01-l01-c2' },
        data: { isActive: true },
      });
    }
  });

  it('keeps saving code and progress for students only', async () => {
    const { parent, child, student } = await family();

    // Parents can read lessons (to see what their children learn), without anyone's code.
    const seen = await t
      .http()
      .get('/v1/learning/lessons/e2e-m01-l01')
      .set(auth(parent.accessToken))
      .expect(200);
    expect(seen.body.challenges[0].draft).toBeNull();
    const studentOnly = [
      () => t.http().post('/v1/learning/lessons/e2e-m01-l01/start'),
      () =>
        t
          .http()
          .put('/v1/learning/challenges/e2e-m01-l01-c1/draft')
          .send({ code: { html: 'x' } }),
      () =>
        t
          .http()
          .post('/v1/learning/challenges/e2e-m01-l01-c1/submissions')
          .send({ code: {}, results: [] }),
    ];
    for (const request of studentOnly) {
      await request().set(auth(parent.accessToken)).expect(403);
    }

    // Super admins pass the permission check, but aren't students.
    const admin = await staffLogin(t, 'super_admin');
    const refused = await t
      .http()
      .post('/v1/learning/lessons/e2e-m01-l01/start')
      .set(auth(admin.token))
      .expect(403);
    expect(refused.body.error).toBe('STUDENTS_ONLY');

    // Deleting the child removes their code; progress stays anonymous.
    await t
      .http()
      .post('/v1/learning/challenges/e2e-m01-l01-c1/submissions')
      .set(auth(student))
      .send({ code: { html: '<h1>My name is secret</h1>' }, results: pass(H1_CHECKS) })
      .expect(201);
    const { body: profile } = await t
      .http()
      .get(`/v1/children/${child.id}`)
      .set(auth(parent.accessToken));
    await t
      .http()
      .delete(`/v1/children/${child.id}`)
      .set(auth(parent.accessToken))
      .send({ nickname: profile.nickname })
      .expect(204);
    expect(await t.prisma.submission.count({ where: { userId: child.id } })).toBe(0);
    expect(await t.prisma.challengeDraft.count({ where: { userId: child.id } })).toBe(0);
    expect(await t.prisma.lessonProgress.count({ where: { userId: child.id } })).toBe(1);
  });

  it('limits how fast code can be checked', async () => {
    const { student } = await family();
    const submit = () =>
      t
        .http()
        .post('/v1/learning/challenges/e2e-m01-l02-c1/submissions')
        .set(auth(student))
        .send({ code: { html: '<p>x</p>' }, results: pass(P_CHECKS) });
    for (let i = 0; i < 30; i++) await submit().expect(201);
    const limited = await submit().expect(429);
    expect(limited.body.error).toBe('TOO_MANY_REQUESTS');
  });
});
