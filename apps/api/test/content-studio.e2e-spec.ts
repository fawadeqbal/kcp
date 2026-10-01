import { createTestApp, resetRateLimits, staffLogin, type TestContext } from './helpers.js';
import {
  auth,
  family as familyOf,
  hideLearningFixture,
  seedLearningFixture,
} from './learning-fixture.js';

const LESSON = 'e2e-m01-l01';
const STUDIO = '/v1/admin/content/studio';
const URDU = {
  title: 'پہلا سبق',
  summary: 'خلاصہ',
  body: 'پہلے سبق کا متن',
  videoProvider: null,
  videoId: null,
};

describe('content studio (e2e)', () => {
  let t: TestContext;
  let writer: string;
  let reviewer: string;

  beforeAll(async () => {
    t = await createTestApp();
    await seedLearningFixture(t.prisma);
    writer = (await staffLogin(t, 'content_creator')).token;
    reviewer = (await staffLogin(t, 'content_creator')).token;
  });

  beforeEach(async () => {
    await resetRateLimits(t.redis);
    // Each test starts with no Urdu for the fixture lesson and no drafts.
    await t.prisma.contentDraft.deleteMany({ where: { entityId: { startsWith: 'e2e-m01' } } });
    await t.prisma.lessonTranslation.deleteMany({
      where: { lessonId: LESSON, languageCode: { in: ['ur', 'fr'] } },
    });
  });

  afterAll(async () => {
    await t.prisma.contentDraft.deleteMany({ where: { entityId: { startsWith: 'e2e-m01' } } });
    await t.prisma.lessonTranslation.deleteMany({
      where: { lessonId: LESSON, languageCode: { in: ['ur', 'fr'] } },
    });
    await hideLearningFixture(t.prisma);
    await t.app.close();
  });

  const text = (token: string, lang = 'ur') =>
    t.http().get(`${STUDIO}/texts/lesson/${LESSON}/${lang}`).set(auth(token));

  it('a translator drafts, a second translator reviews and publishes, and students see it', async () => {
    const { student } = await familyOf(t);
    const lessonFor = async () =>
      (await t.http().get(`/v1/learning/lessons/${LESSON}?lang=ur`).set(auth(student)).expect(200))
        .body as { language: string; title: string };

    // The module view lists the lesson as missing in Urdu.
    const before = await t.http().get(`${STUDIO}/modules/e2e-m01/ur`).set(auth(writer)).expect(200);
    const item = before.body.items.find((i: { entityId: string }) => i.entityId === LESSON);
    expect(item).toMatchObject({ entityType: 'LESSON', status: 'MISSING' });

    // A draft doesn't change what students read.
    await t
      .http()
      .put(`${STUDIO}/texts/lesson/${LESSON}/ur`)
      .set(auth(writer))
      .send({ data: URDU })
      .expect(204);
    expect((await lessonFor()).language).toBe('en');
    await t.http().post(`${STUDIO}/texts/lesson/${LESSON}/ur/submit`).set(auth(writer)).expect(204);

    // The translator can't publish their own work.
    const own = await text(writer).expect(200);
    expect(own.body).toMatchObject({ canPublish: false, draft: { status: 'IN_REVIEW' } });
    const refused = await t
      .http()
      .post(`${STUDIO}/texts/lesson/${LESSON}/ur/publish`)
      .set(auth(writer))
      .expect(409);
    expect(refused.body.error).toBe('OWN_DRAFT');

    // The reviewer sees it in the queue and publishes it.
    const queue = await t.http().get(`${STUDIO}/reviews`).set(auth(reviewer)).expect(200);
    expect(
      queue.body.items.some(
        (i: { entityId: string; language: string }) => i.entityId === LESSON && i.language === 'ur',
      ),
    ).toBe(true);
    expect((await text(reviewer).expect(200)).body.canPublish).toBe(true);
    await t
      .http()
      .post(`${STUDIO}/texts/lesson/${LESSON}/ur/publish`)
      .set(auth(reviewer))
      .expect(204);

    expect(await lessonFor()).toMatchObject({ language: 'ur', title: 'پہلا سبق' });
    const after = await text(writer).expect(200);
    expect(after.body.draft).toBeNull();
    expect(after.body.live).toMatchObject({ title: 'پہلا سبق' });
    expect(after.body.versions[0]).toMatchObject({ action: 'PUBLISH' });
    const live = await t.prisma.lessonTranslation.findUniqueOrThrow({
      where: { lessonId_languageCode: { lessonId: LESSON, languageCode: 'ur' } },
    });
    expect(live.source).toBe('STUDIO');
    const audit = await t.prisma.auditLog.findFirst({
      where: { action: 'content.text.publish', entityId: `LESSON:${LESSON}:ur` },
      orderBy: { createdAt: 'desc' },
    });
    expect(audit).not.toBeNull();
  });

  it('sends a draft back with a note, and restores an older version as a draft', async () => {
    await t
      .http()
      .put(`${STUDIO}/texts/lesson/${LESSON}/ur`)
      .set(auth(writer))
      .send({ data: URDU })
      .expect(204);
    await t.http().post(`${STUDIO}/texts/lesson/${LESSON}/ur/submit`).set(auth(writer)).expect(204);
    await t
      .http()
      .post(`${STUDIO}/texts/lesson/${LESSON}/ur/return`)
      .set(auth(reviewer))
      .send({ note: 'Please use a friendlier title.' })
      .expect(204);
    const returned = await text(writer).expect(200);
    expect(returned.body.draft).toMatchObject({
      status: 'DRAFT',
      reviewNote: 'Please use a friendlier title.',
    });

    // Publish it, then restore the English import… a version from this language only.
    await t.http().post(`${STUDIO}/texts/lesson/${LESSON}/ur/submit`).set(auth(writer)).expect(204);
    await t
      .http()
      .post(`${STUDIO}/texts/lesson/${LESSON}/ur/publish`)
      .set(auth(reviewer))
      .expect(204);
    const versions = (await text(writer).expect(200)).body.versions as { id: string }[];
    const english = (await text(writer, 'en').expect(200)).body.versions as { id: string }[];
    if (english[0]) {
      await t
        .http()
        .post(`${STUDIO}/texts/lesson/${LESSON}/ur/versions/${english[0].id}/restore`)
        .set(auth(writer))
        .expect(404);
    }
    await t
      .http()
      .post(`${STUDIO}/texts/lesson/${LESSON}/ur/versions/${versions[0]!.id}/restore`)
      .set(auth(writer))
      .expect(204);
    expect((await text(writer).expect(200)).body.draft).toMatchObject({
      status: 'DRAFT',
      data: { title: 'پہلا سبق' },
    });
    await t
      .http()
      .delete(`${STUDIO}/texts/lesson/${LESSON}/ur/draft`)
      .set(auth(writer))
      .expect(204);
    expect((await text(writer).expect(200)).body.draft).toBeNull();
  });

  it('checks drafts: required texts, real hint keys and check IDs', async () => {
    const missing = await t
      .http()
      .put(`${STUDIO}/texts/lesson/${LESSON}/ur`)
      .set(auth(writer))
      .send({ data: { ...URDU, body: '  ' } })
      .expect(400);
    expect(missing.body.error).toBe('INVALID_TEXT');
    await t
      .http()
      .put(`${STUDIO}/texts/challenge/e2e-m01-l01-c1/ur`)
      .set(auth(writer))
      .send({
        data: {
          title: 'لکھیں',
          instructions: 'کریں',
          hints: { no_such_hint: 'x' },
          checkLabels: {},
        },
      })
      .expect(400);
    await t
      .http()
      .put(`${STUDIO}/texts/challenge/e2e-m01-l01-c1/ur`)
      .set(auth(writer))
      .send({
        data: {
          title: 'لکھیں',
          instructions: 'کریں',
          hints: { add_h1: 'h1 استعمال کریں' },
          checkLabels: { 'has-h1': 'صفحے پر سرخی ہے' },
        },
      })
      .expect(204);
    const challenge = await t
      .http()
      .get(`${STUDIO}/texts/challenge/e2e-m01-l01-c1/ur`)
      .set(auth(writer))
      .expect(200);
    expect(challenge.body.hintKeys).toEqual(['add_h1', 'h1_text']);
    expect(challenge.body.checks.map((c: { id: string }) => c.id)).toEqual(['has-h1', 'h1-text']);
    // A language not switched on yet can be prepared too.
    await t
      .http()
      .put(`${STUDIO}/texts/lesson/${LESSON}/fr`)
      .set(auth(writer))
      .send({ data: { ...URDU, title: 'Première leçon' } })
      .expect(204);
    await t.http().get(`${STUDIO}/texts/lesson/${LESSON}/xx`).set(auth(writer)).expect(404);
  });

  it('is for content creators and admins only', async () => {
    const { parent, student } = await familyOf(t);
    const moderator = (await staffLogin(t, 'moderator')).token;
    for (const token of [parent.accessToken, student, moderator]) {
      await t.http().get(`${STUDIO}/reviews`).set(auth(token)).expect(403);
      await t
        .http()
        .put(`${STUDIO}/texts/lesson/${LESSON}/ur`)
        .set(auth(token))
        .send({ data: URDU })
        .expect(403);
    }
    const admin = (await staffLogin(t, 'admin')).token;
    await t.http().get(`${STUDIO}/languages`).set(auth(admin)).expect(200);
  });
});
