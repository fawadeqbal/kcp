import type { PrismaService } from '../src/database/prisma.service.js';
import { CHILD_PASSWORD, childBody, signUpAndLogin, type TestContext } from './helpers.js';

/*
 * A small track of its own ("e2e"), after the real content, with two active lessons
 * (and one switched off) and a module project. Specs switch it on in beforeAll and
 * off again in afterAll, so it never shows up next to the real lessons.
 */

export const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

export const H1_CHECKS = [
  { id: 'has-h1', expect: 'exists', selector: 'h1', hint: 'add_h1' },
  { id: 'h1-text', expect: 'text', selector: 'h1', notEmpty: true, hint: 'h1_text' },
];
export const P_CHECKS = [{ id: 'has-p', expect: 'exists', selector: 'p', hint: 'add_p' }];
export const pass = (checks: { id: string }[]) => checks.map((c) => ({ id: c.id, passed: true }));

/** A small track of its own, after the real content (which may also be imported). */
export async function seedLearningFixture(prisma: PrismaService) {
  await prisma.track.upsert({
    where: { id: 'e2e' },
    create: { id: 'e2e', titles: { en: 'E2E track', ar: 'مسار الاختبار' }, sortOrder: 900 },
    update: { isActive: true },
  });
  await prisma.module.upsert({
    where: { id: 'e2e-m01' },
    create: {
      id: 'e2e-m01',
      trackId: 'e2e',
      slug: 'm01',
      titles: { en: 'Module one', ar: 'الوحدة الأولى' },
      descriptions: { en: 'Testing' },
      publishedAt: new Date(),
    },
    update: { isActive: true, publishedAt: new Date() },
  });
  const lessons = [
    { id: 'e2e-m01-l01', slug: 'l01', sortOrder: 1, isActive: true },
    { id: 'e2e-m01-l02', slug: 'l02', sortOrder: 2, isActive: true },
    { id: 'e2e-m01-l03', slug: 'l03', sortOrder: 3, isActive: false },
  ];
  for (const lesson of lessons) {
    await prisma.lesson.upsert({
      where: { id: lesson.id },
      create: { ...lesson, moduleId: 'e2e-m01', xp: 20 },
      update: { isActive: lesson.isActive },
    });
    await prisma.lessonTranslation.upsert({
      where: { lessonId_languageCode: { lessonId: lesson.id, languageCode: 'en' } },
      create: {
        lessonId: lesson.id,
        languageCode: 'en',
        title: `Lesson ${lesson.slug}`,
        summary: 'Summary',
        body: 'Body with `<h1>`',
        ...(lesson.slug === 'l01' ? { videoProvider: 'youtube', videoId: 'abcd1234' } : {}),
      },
      update: {},
    });
  }
  await prisma.lessonTranslation.upsert({
    where: { lessonId_languageCode: { lessonId: 'e2e-m01-l01', languageCode: 'ar' } },
    create: {
      lessonId: 'e2e-m01-l01',
      languageCode: 'ar',
      title: 'الدرس الأول',
      summary: 'ملخص',
      body: 'نص',
    },
    update: {},
  });
  const challenges = [
    { id: 'e2e-m01-l01-c1', lessonId: 'e2e-m01-l01', sortOrder: 1, checks: H1_CHECKS },
    { id: 'e2e-m01-l01-c2', lessonId: 'e2e-m01-l01', sortOrder: 2, checks: P_CHECKS },
    { id: 'e2e-m01-l02-c1', lessonId: 'e2e-m01-l02', sortOrder: 1, checks: P_CHECKS },
  ];
  for (const challenge of challenges) {
    await prisma.challenge.upsert({
      where: { id: challenge.id },
      create: {
        ...challenge,
        type: 'HTML',
        xp: 10,
        starter: { html: '' },
      },
      update: { isActive: true },
    });
    await prisma.challengeTranslation.upsert({
      where: { challengeId_languageCode: { challengeId: challenge.id, languageCode: 'en' } },
      create: {
        challengeId: challenge.id,
        languageCode: 'en',
        title: 'Write it',
        instructions: 'Do it',
        hints: { add_h1: 'Use h1', h1_text: 'Write words', add_p: 'Use p' },
      },
      update: {},
    });
  }
  await prisma.challengeTranslation.upsert({
    where: { challengeId_languageCode: { challengeId: 'e2e-m01-l01-c1', languageCode: 'ar' } },
    create: {
      challengeId: 'e2e-m01-l01-c1',
      languageCode: 'ar',
      title: 'اكتبها',
      instructions: 'افعلها',
      hints: { add_h1: 'استخدم h1' },
    },
    update: {},
  });
}

/** The fixture project: a page with a heading and a paragraph. */
export const PROJECT_CHECKS = [
  { id: 'has-h1', expect: 'exists', selector: 'h1', hint: 'add_h1' },
  { id: 'has-p', expect: 'exists', selector: 'p', hint: 'add_p' },
];

export async function seedProjectFixture(prisma: PrismaService) {
  await prisma.projectBrief.upsert({
    where: { id: 'e2e-m01-project' },
    create: {
      id: 'e2e-m01-project',
      moduleId: 'e2e-m01',
      xp: 100,
      starter: { html: '<h1>Me</h1>', css: '', js: '' },
      checks: PROJECT_CHECKS,
    },
    update: { isActive: true },
  });
  for (const [languageCode, title] of [
    ['en', 'My page'],
    ['ar', 'صفحتي'],
  ] as const) {
    await prisma.projectBriefTranslation.upsert({
      where: { briefId_languageCode: { briefId: 'e2e-m01-project', languageCode } },
      create: {
        briefId: 'e2e-m01-project',
        languageCode,
        title,
        summary: 'Build a page',
        body: 'Build a page about you.',
        hints: languageCode === 'en' ? { add_h1: 'Use h1', add_p: 'Use p' } : { add_p: 'استخدم p' },
      },
      update: {},
    });
  }
}

/** Hides the fixture again, so it doesn't show up next to the real lessons. */
export async function hideLearningFixture(prisma: PrismaService) {
  await prisma.track.update({ where: { id: 'e2e' }, data: { isActive: false } });
}

/** A parent with one child who is logged in. */
export async function family(t: TestContext, overrides: Parameters<typeof childBody>[0] = {}) {
  const parent = await signUpAndLogin(t);
  const child = (
    await t
      .http()
      .post('/v1/children')
      .set(auth(parent.accessToken))
      .send(childBody(overrides))
      .expect(201)
  ).body as { id: string; username: string; nickname: string };
  const login = await t
    .http()
    .post('/v1/auth/students/login')
    .send({ username: child.username, password: CHILD_PASSWORD })
    .expect(200);
  return { parent, child, student: login.body.accessToken as string };
}
