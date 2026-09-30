import { FamilyEmailsService } from '../src/family-emails/family-emails.service.js';
import { PushJobsService } from '../src/push/push-jobs.service.js';
import { PushService } from '../src/push/push.service.js';
import {
  CHILD_PASSWORD,
  createTestApp,
  createUser,
  PASSWORD,
  resetRateLimits,
  staffLogin,
  type TestContext,
} from './helpers.js';
import { auth, family, hideLearningFixture, seedLearningFixture } from './learning-fixture.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/** A made-up Firebase push token. */
const pushToken = (label: string) => `${label}:APA91b${'x'.repeat(40)}${Date.now()}`;

interface QuizLine {
  id: string;
  text: string;
}
interface Quiz {
  id: string;
  kind: string;
  prompt: string;
  lines: QuizLine[];
  options: { id: string; text: string | null; code: string | null }[];
  solved: boolean;
}

/** Quizzes for the fixture's two lessons: six, so a day's practice comes only from them. */
const ORDER_CODE = ['<body>', '  <h1>Hi</h1>', '</body>'];
const QUIZZES = [
  {
    id: 'e2e-m01-l01-q1',
    lessonId: 'e2e-m01-l01',
    sortOrder: 1,
    kind: 'ORDER' as const,
    codeLanguage: 'html',
    code: ORDER_CODE,
    options: undefined,
    answer: {},
    texts: {
      en: { prompt: 'Put the lines in order.', explanation: 'The heading goes inside body.' },
      ar: { prompt: 'رتّب الأسطر.', explanation: 'العنوان داخل body.' },
    },
  },
  {
    id: 'e2e-m01-l01-q2',
    lessonId: 'e2e-m01-l01',
    sortOrder: 2,
    kind: 'BUG' as const,
    codeLanguage: 'html',
    code: ['<h1>Hi</h1>', '<p>Hi<p>'],
    options: undefined,
    answer: { line: 2 },
    texts: { en: { prompt: 'Which line has a mistake?', explanation: 'Close the p tag.' } },
  },
  {
    id: 'e2e-m01-l01-q3',
    lessonId: 'e2e-m01-l01',
    sortOrder: 3,
    kind: 'CHOICE' as const,
    codeLanguage: null,
    code: undefined,
    options: [{ id: 'a' }, { id: 'b' }],
    answer: { option: 'a' },
    texts: {
      en: {
        prompt: 'What is <h1>?',
        explanation: 'A tag for the biggest heading.',
        options: { a: 'A tag', b: 'A colour' },
      },
    },
  },
  {
    id: 'e2e-m01-l02-q1',
    lessonId: 'e2e-m01-l02',
    sortOrder: 1,
    kind: 'OUTPUT' as const,
    codeLanguage: 'python',
    code: ['print(1 + 1)'],
    options: [
      { id: 'a', code: '2' },
      { id: 'b', code: '11' },
    ],
    answer: { option: 'a' },
    texts: { en: { prompt: 'What does it print?', explanation: '1 + 1 is 2.' } },
  },
  ...[2, 3].map((n) => ({
    id: `e2e-m01-l02-q${n}`,
    lessonId: 'e2e-m01-l02',
    sortOrder: n,
    kind: 'CHOICE' as const,
    codeLanguage: null,
    code: undefined,
    options: [{ id: 'a' }, { id: 'b' }],
    answer: { option: 'b' },
    texts: {
      en: { prompt: `Question ${n}`, explanation: 'Because.', options: { a: 'No', b: 'Yes' } },
    },
  })),
];

/** The right answer, worked out the way a student would (ORDER: by the lines' text). */
function rightAnswer(quiz: Quiz) {
  const stored = QUIZZES.find((q) => q.id === quiz.id)!;
  if (quiz.kind === 'ORDER') {
    const byText = new Map(quiz.lines.map((line) => [line.text, line.id]));
    return { order: ORDER_CODE.map((text) => byText.get(text)!) };
  }
  return stored.answer;
}

function wrongAnswer(quiz: Quiz) {
  if (quiz.kind === 'ORDER') {
    const [first, second, ...rest] = (rightAnswer(quiz) as { order: string[] }).order;
    return { order: [second, first, ...rest] };
  }
  if (quiz.kind === 'BUG') return { line: 1 };
  const right = (QUIZZES.find((q) => q.id === quiz.id)!.answer as { option: string }).option;
  return { option: right === 'a' ? 'b' : 'a' };
}

describe('the mobile app (e2e)', () => {
  let t: TestContext;
  let push: PushService;

  beforeAll(async () => {
    t = await createTestApp();
    push = t.app.get(PushService);
    await seedLearningFixture(t.prisma);
    for (const { code, options, ...quiz } of QUIZZES) {
      const data = {
        ...quiz,
        ...(code ? { code } : {}),
        ...(options ? { options } : {}),
        isActive: true,
      };
      await t.prisma.quiz.upsert({ where: { id: quiz.id }, create: data, update: data });
    }
  });

  beforeEach(async () => {
    await resetRateLimits(t.redis);
  });

  afterAll(async () => {
    await hideLearningFixture(t.prisma);
    await t.app.close();
  });

  const lessonQuizzes = async (token: string, lessonId: string, lang = 'en') =>
    (
      await t
        .http()
        .get(`/v1/learning/lessons/${lessonId}?lang=${lang}`)
        .set(auth(token))
        .expect(200)
    ).body.quizzes as Quiz[];

  const streakPushes = () => push.outbox.filter((p) => p.kind === 'streakReminder');

  const answer = (token: string, quizId: string, body: object) =>
    t.http().post(`/v1/learning/quizzes/${quizId}/answers`).set(auth(token)).send(body);

  describe('signing in', () => {
    it('gives the app its refresh token in the body, for students and parents only', async () => {
      const { parent, child } = await family(t);
      const login = await t
        .http()
        .post('/v1/auth/login')
        .send({ email: parent.email, password: PASSWORD, app: 'mobile' })
        .expect(200);
      expect(login.body.refreshToken).toEqual(expect.any(String));
      expect(login.headers['set-cookie']).toBeUndefined();

      const student = await t
        .http()
        .post('/v1/auth/students/login')
        .send({ username: child.username, password: CHILD_PASSWORD, app: 'mobile' })
        .expect(200);
      expect(student.body.refreshToken).toEqual(expect.any(String));

      // The refresh token works from the body.
      const refreshed = await t
        .http()
        .post('/v1/auth/refresh')
        .send({ refreshToken: student.body.refreshToken, tokenDelivery: 'body' })
        .expect(200);
      expect(refreshed.body.refreshToken).not.toBe(student.body.refreshToken);

      const staff = await createUser(t.prisma, 'moderator');
      const refused = await t
        .http()
        .post('/v1/auth/login')
        .send({ email: staff.email, password: PASSWORD, app: 'mobile' })
        .expect(403);
      expect(refused.body.error).toBe('NOT_FAMILY');
    });
  });

  describe('quizzes', () => {
    it('shows a lesson’s quizzes without their answers, and grades them on the server', async () => {
      const { student } = await family(t);
      const quizzes = await lessonQuizzes(student, 'e2e-m01-l01');
      expect(quizzes.map((q) => q.id)).toEqual([
        'e2e-m01-l01-q1',
        'e2e-m01-l01-q2',
        'e2e-m01-l01-q3',
      ]);
      const [order, bug, choice] = quizzes as [Quiz, Quiz, Quiz];
      expect(JSON.stringify(quizzes)).not.toMatch(/answer|explanation/);
      // ORDER lines come shuffled, never in order, with IDs that don't give it away.
      expect(order.lines.map((l) => l.text)).not.toEqual(ORDER_CODE);
      expect(order.lines.every((l) => /^[a-f0-9]{12}$/.test(l.id))).toBe(true);
      expect(bug.lines).toEqual([
        { id: '1', text: '<h1>Hi</h1>' },
        { id: '2', text: '<p>Hi<p>' },
      ]);
      expect(choice.options).toEqual([
        { id: 'a', text: 'A tag', code: null },
        { id: 'b', text: 'A colour', code: null },
      ]);

      // Right first time: XP and the explanation.
      const right = await answer(student, order.id, rightAnswer(order)).expect(200);
      expect(right.body).toMatchObject({
        correct: true,
        explanation: 'The heading goes inside body.',
        reveal: null,
        xpAwarded: 5,
        practice: null,
      });
      // Again: still right, no more XP.
      const again = await answer(student, order.id, rightAnswer(order)).expect(200);
      expect(again.body).toMatchObject({ correct: true, xpAwarded: 0 });
      expect((await lessonQuizzes(student, 'e2e-m01-l01'))[0]!.solved).toBe(true);

      // Wrong: no explanation yet; wrong twice: the right answer is shown.
      const wrong = await answer(student, bug.id, wrongAnswer(bug)).expect(200);
      expect(wrong.body).toMatchObject({
        correct: false,
        explanation: null,
        reveal: null,
        xpAwarded: 0,
      });
      const revealed = await answer(student, bug.id, wrongAnswer(bug)).expect(200);
      expect(revealed.body).toMatchObject({
        correct: false,
        explanation: 'Close the p tag.',
        reveal: { line: 2, option: null, order: null },
      });
      // Right after being shown the answer: no XP for this one.
      const after = await answer(student, bug.id, { line: 2 }).expect(200);
      expect(after.body).toMatchObject({ correct: true, xpAwarded: 0 });

      // Answers that don't fit the quiz, and quizzes that don't exist.
      expect((await answer(student, choice.id, { option: 'z' }).expect(400)).body.error).toBe(
        'BAD_ANSWER',
      );
      await answer(student, choice.id, { line: 1 }).expect(400);
      await answer(student, order.id, { order: ['nothex'] }).expect(400);
      await answer(student, 'e2e-m01-l01-q9', { option: 'a' }).expect(404);
    });

    it('shows the texts in the student’s language, falling back to English', async () => {
      const { student } = await family(t);
      const quizzes = await lessonQuizzes(student, 'e2e-m01-l01', 'ar');
      expect(quizzes[0]!.prompt).toBe('رتّب الأسطر.');
      expect(quizzes[1]!.prompt).toBe('Which line has a mistake?');
    });

    it('lets only students answer', async () => {
      const { parent } = await family(t);
      await answer(parent.accessToken, 'e2e-m01-l01-q3', { option: 'a' }).expect(403);
      await t.http().get('/v1/learning/practice').set(auth(parent.accessToken)).expect(403);
    });
  });

  describe('daily practice', () => {
    it('keeps a streak alive from the phone: five quizzes, then the practice XP once', async () => {
      const { child, student } = await family(t);
      // The student is on the fixture's lessons, so today's practice comes from them.
      for (const lessonId of ['e2e-m01-l01', 'e2e-m01-l02']) {
        await t.prisma.lessonProgress.create({ data: { userId: child.id, lessonId } });
      }
      const first = await t.http().get('/v1/learning/practice').set(auth(student)).expect(200);
      expect(first.body).toMatchObject({ xp: 20, total: 5, done: false, answeredQuizIds: [] });
      const quizzes = first.body.quizzes as (Quiz & { lessonTitle: string })[];
      expect(new Set(quizzes.map((q) => q.id)).size).toBe(5);
      expect(quizzes.every((q) => q.id.startsWith('e2e-m01-'))).toBe(true);
      expect(quizzes[0]!.lessonTitle).toMatch(/^Lesson l0[12]$/);

      // The same practice all day.
      const second = await t.http().get('/v1/learning/practice').set(auth(student)).expect(200);
      expect((second.body.quizzes as Quiz[]).map((q) => q.id)).toEqual(quizzes.map((q) => q.id));

      let xp = 0;
      for (const [index, quiz] of quizzes.entries()) {
        const result = await answer(student, quiz.id, rightAnswer(quiz)).expect(200);
        expect(result.body.practice).toMatchObject({ total: 5, answered: index + 1 });
        xp += result.body.xpAwarded as number;
        if (index < 4) expect(result.body.practice.done).toBe(false);
      }
      // 5 × 5 for the quizzes and 20 for the practice.
      expect(xp).toBe(45);
      const done = await t.http().get('/v1/learning/practice').set(auth(student)).expect(200);
      expect(done.body).toMatchObject({ done: true });
      expect(done.body.answeredQuizIds).toHaveLength(5);

      // The practice XP comes once a day; the goal was met, so the streak started.
      const again = await answer(student, quizzes[0]!.id, rightAnswer(quizzes[0]!)).expect(200);
      expect(again.body.xpAwarded).toBe(0);
      const events = await t.prisma.xpEvent.findMany({
        where: { userId: child.id, source: 'PRACTICE' },
      });
      expect(events).toHaveLength(1);
      const progress = await t.http().get('/v1/progress').set(auth(student)).expect(200);
      expect(progress.body.streak.current).toBe(1);
    });
  });

  describe('phones and notifications', () => {
    it('registers a phone for a student or parent, and forgets it at logout', async () => {
      const { parent, child } = await family(t);
      const login = await t
        .http()
        .post('/v1/auth/students/login')
        .send({ username: child.username, password: CHILD_PASSWORD, app: 'mobile' })
        .expect(200);
      let student = login.body.accessToken as string;
      const phone = pushToken('phone');
      await t
        .http()
        .put('/v1/devices')
        .set(auth(student))
        .send({ token: phone, platform: 'android', language: 'ur' })
        .expect(204);
      const registered = await t.prisma.deviceToken.findUniqueOrThrow({ where: { token: phone } });
      expect(registered).toMatchObject({
        userId: child.id,
        platform: 'ANDROID',
        languageCode: 'ur',
      });

      // The phone's sign-in carries on under a new refresh token: so do its notifications.
      const refreshed = await t
        .http()
        .post('/v1/auth/refresh')
        .send({ refreshToken: login.body.refreshToken, tokenDelivery: 'body' })
        .expect(200);
      student = refreshed.body.accessToken as string;
      const moved = await t.prisma.deviceToken.findUniqueOrThrow({ where: { token: phone } });
      expect(moved.sessionId).not.toBe(registered.sessionId);
      const session = await t.prisma.session.findUniqueOrThrow({ where: { id: moved.sessionId! } });
      expect(session.revokedAt).toBeNull();

      // The same phone, now signed in as the parent: it moves over.
      await t
        .http()
        .put('/v1/devices')
        .set(auth(parent.accessToken))
        .send({ token: phone, platform: 'android', language: 'en' })
        .expect(204);
      expect(await t.prisma.deviceToken.count({ where: { token: phone } })).toBe(1);
      expect((await t.prisma.deviceToken.findUnique({ where: { token: phone } }))?.userId).toBe(
        parent.user.id,
      );

      // Logging out stops notifications to it (no session needed).
      await t.http().post('/v1/devices/remove').send({ token: phone }).expect(204);
      expect(await t.prisma.deviceToken.count({ where: { token: phone } })).toBe(0);

      // Bad tokens, and staff, are refused.
      await t
        .http()
        .put('/v1/devices')
        .set(auth(student))
        .send({ token: 'short', platform: 'android', language: 'en' })
        .expect(400);
      const admin = await staffLogin(t, 'admin');
      const refused = await t
        .http()
        .put('/v1/devices')
        .set(auth(admin.token))
        .send({ token: pushToken('staff'), platform: 'ios', language: 'en' })
        .expect(403);
      expect(refused.body.error).toBe('NOT_FAMILY');
      await t
        .http()
        .put('/v1/devices')
        .send({ token: pushToken('anon'), platform: 'ios', language: 'en' })
        .expect(401);
    });

    it('reminds a student at 6 pm when their streak is about to end, once, unless switched off', async () => {
      const jobs = t.app.get(PushJobsService);
      const { parent, child, student } = await family(t);
      const quiet = await family(t);
      // 13:05 UTC is 18:05 in Pakistan, where the fixture's children live.
      const now = new Date(Date.UTC(2031, 2, 10, 13, 5));
      const yesterday = new Date(Date.UTC(2031, 2, 9));
      const phones: Record<string, string> = {};
      for (const [id, access] of [
        [child.id, student],
        [quiet.child.id, quiet.student],
      ] as const) {
        await t.prisma.streak.upsert({
          where: { userId: id },
          create: { userId: id, current: 4, longest: 4, lastGoalDay: yesterday },
          update: { current: 4, longest: 4, lastGoalDay: yesterday },
        });
        phones[id] = pushToken(id.slice(0, 8));
        await t
          .http()
          .put('/v1/devices')
          .set(auth(access))
          .send({ token: phones[id], platform: 'android', language: 'ur' })
          .expect(204);
        // Sessions last 30 days: keep them live at the job's "now".
        await t.prisma.session.updateMany({
          where: { userId: id },
          data: { expiresAt: new Date(now.getTime() + DAY_MS) },
        });
      }
      // The second child's parent switched the reminders off.
      const off = await t
        .http()
        .patch(`/v1/children/${quiet.child.id}`)
        .set(auth(quiet.parent.accessToken))
        .send({ streakReminders: false })
        .expect(200);
      expect(off.body.streakReminders).toBe(false);

      const before = streakPushes().length;
      await jobs.sendStreakReminders(new Date(Date.UTC(2031, 2, 10, 12, 5)));
      expect(streakPushes()).toHaveLength(before);
      await jobs.sendStreakReminders(now);
      const mine = streakPushes().filter((p) => p.userId === child.id);
      expect(mine).toHaveLength(1);
      expect(mine[0]).toMatchObject({
        token: phones[child.id],
        language: 'ur',
        title: 'آپ کا سلسلہ: 4 دن',
        data: { type: 'streakReminder', route: '/practice' },
      });
      expect(streakPushes().filter((p) => p.userId === quiet.child.id)).toEqual([]);
      // Again within the day: nothing new.
      await jobs.sendStreakReminders(new Date(now.getTime() + 60_000));
      expect(streakPushes().filter((p) => p.userId === child.id)).toHaveLength(1);

      // Signed out on the phone, still signed in on the web: nothing goes to the phone.
      const { sessionId: phoneSession } = await t.prisma.deviceToken.findUniqueOrThrow({
        where: { token: phones[child.id]! },
      });
      await t
        .http()
        .post('/v1/auth/students/login')
        .send({ username: child.username, password: CHILD_PASSWORD })
        .expect(200);
      await t.prisma.session.updateMany({
        where: { userId: child.id },
        data: { expiresAt: new Date(now.getTime() + 3 * DAY_MS) },
      });
      await t.prisma.session.update({
        where: { id: phoneSession! },
        data: { revokedAt: new Date() },
      });
      const nextDay = new Date(now.getTime() + DAY_MS);
      await t.prisma.streak.update({
        where: { userId: child.id },
        data: { lastGoalDay: new Date(Date.UTC(2031, 2, 10)) },
      });
      await jobs.sendStreakReminders(nextDay);
      expect(streakPushes().filter((p) => p.userId === child.id)).toHaveLength(1);
      await t.redis.del(`push:streak:2031-03-10:${child.id}`, `push:streak:2031-03-11:${child.id}`);

      // Deleting the child forgets the phone.
      await t
        .http()
        .delete(`/v1/children/${child.id}`)
        .set(auth(parent.accessToken))
        .send({ nickname: child.nickname })
        .expect(204);
      expect(await t.prisma.deviceToken.count({ where: { userId: child.id } })).toBe(0);
    });

    it('tells a parent’s phone that a trial ends soon, in the phone’s language', async () => {
      const { parent, child } = await family(t);
      const endsAt = new Date(Date.now() + 2 * DAY_MS);
      await t.prisma.studentProfile.update({
        where: { userId: child.id },
        data: { trialEndsAt: endsAt },
      });
      const phone = pushToken('parent');
      await t
        .http()
        .put('/v1/devices')
        .set(auth(parent.accessToken))
        .send({ token: phone, platform: 'ios', language: 'ar' })
        .expect(204);
      await t.app.get(FamilyEmailsService).sendTrialReminders(new Date());
      const [sent, ...more] = push.outbox.filter(
        (p) => p.kind === 'trialEnding' && p.userId === parent.user.id,
      );
      expect(more).toEqual([]);
      expect(sent).toMatchObject({
        token: phone,
        language: 'ar',
        title: `تجربة ${child.nickname} تنتهي قريبًا`,
        data: { type: 'trialEnding', route: '/parent', childId: child.id },
      });
    });
  });

  describe('crash reports', () => {
    it('keeps a report without anything personal in it, for staff to read', async () => {
      const marker = `e2e-${Math.random().toString(36).slice(2, 8)}`;
      const crash = {
        appVersion: '1.0.0+1',
        platform: 'android',
        osVersion: 'Android 15 (API 35)',
        fatal: true,
        message: `StateError ${marker} for sara@example.com`,
        stack: '#0 main (package:kcp_app/main.dart:10:5)',
      };
      // The same crash twice in an hour is kept once.
      for (let i = 0; i < 2; i++) {
        await t.http().post('/v1/app/crashes').send(crash).expect(204);
      }
      expect(await t.prisma.appCrash.count({ where: { message: { contains: marker } } })).toBe(1);
      await t.http().post('/v1/app/crashes').send({ platform: 'android' }).expect(400);

      const { parent } = await family(t);
      await t.http().get('/v1/admin/app-crashes').set(auth(parent.accessToken)).expect(403);
      const admin = await staffLogin(t, 'admin');
      const list = await t
        .http()
        .get('/v1/admin/app-crashes?platform=android')
        .set(auth(admin.token))
        .expect(200);
      const report = (list.body.items as { message: string }[]).find((item) =>
        item.message.includes(marker),
      );
      expect(report).toMatchObject({
        appVersion: '1.0.0+1',
        fatal: true,
        message: `StateError ${marker} for [email]`,
      });
      expect(list.body.lastWeek).toEqual(
        expect.arrayContaining([expect.objectContaining({ appVersion: '1.0.0+1' })]),
      );
    });
  });
});
