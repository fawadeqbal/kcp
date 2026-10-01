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

const MODULE = 'e2e-m01';
const BRIEF = 'e2e-m01-project';
const PAGE = { html: '<h1>Me</h1><p>I like space.</p>', css: '', js: '' };
const allPassed = PROJECT_CHECKS.map((check) => ({ id: check.id, passed: true }));

interface Notification {
  id: string;
  type: string;
  data: Record<string, unknown>;
  read: boolean;
}

describe('certificates and notifications (e2e)', () => {
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

  /** Every lesson of the fixture module done (as if the student had passed them). */
  const finishLessons = (userId: string) =>
    t.prisma.lessonProgress.createMany({
      data: ['e2e-m01-l01', 'e2e-m01-l02'].map((lessonId) => ({
        userId,
        lessonId,
        status: 'COMPLETED' as const,
        completedAt: new Date(),
      })),
      skipDuplicates: true,
    });

  /**
   * Ships the project; a premium student's project goes to a mentor for review, and
   * (unless `review: 'wait'`) this approves it straight away, as a mentor would.
   */
  const ship = async (
    token: string,
    { review = 'approve' }: { review?: 'approve' | 'wait' } = {},
  ) => {
    const res = await t
      .http()
      .post(`/v1/projects/${BRIEF}/ship`)
      .set(auth(token))
      .send({ code: PAGE, results: allPassed })
      .expect(200);
    if (review === 'approve') {
      await t.prisma.review.updateMany({
        where: { project: { portfolioItem: { id: res.body.portfolioItemId } } },
        data: { status: 'APPROVED', decidedAt: new Date(), turnaroundHours: 1 },
      });
    }
    return res;
  };

  const notificationsOf = async (token: string) =>
    (await t.http().get('/v1/notifications').set(auth(token)).expect(200)).body as {
      unread: number;
      items: Notification[];
    };

  const issue = (token: string) =>
    t.http().post('/v1/certificates?lang=ar').set(auth(token)).send({ moduleId: MODULE });

  it('gives a certificate for a finished module, which anyone can check by its code', async () => {
    const { parent, child, student } = await family(t);

    // Not finished yet: listed, but no certificate.
    const before = await t.http().get('/v1/certificates').set(auth(student)).expect(200);
    expect(before.body.premium).toBe(true);
    expect(before.body.modules).toContainEqual({
      moduleId: MODULE,
      moduleTitle: 'Module one',
      finished: false,
      awaitingReview: false,
      certificate: null,
    });
    await finishLessons(child.id);
    const early = await issue(student).expect(400);
    expect(early.body.error).toBe('MODULE_NOT_FINISHED');

    // Shipping the project finishes the module, and tells the parent; a mentor reviews
    // it before the certificate.
    await ship(student, { review: 'wait' });
    const waiting = await issue(student).expect(409);
    expect(waiting.body.error).toBe('REVIEW_PENDING');
    const listed = await t.http().get('/v1/certificates').set(auth(student)).expect(200);
    expect(listed.body.modules).toContainEqual(
      expect.objectContaining({ moduleId: MODULE, finished: true, awaitingReview: true }),
    );
    await t.prisma.review.updateMany({
      where: { studentId: child.id },
      data: { status: 'APPROVED', decidedAt: new Date(), turnaroundHours: 1 },
    });
    const parentBell = await notificationsOf(parent.accessToken);
    expect(parentBell.items[0]).toMatchObject({
      type: 'child_shipped',
      read: false,
      data: { childId: child.id, nickname: child.nickname, titles: { en: 'My page' } },
    });

    const issued = await issue(student).expect(200);
    expect(issued.body).toMatchObject({
      moduleId: MODULE,
      nickname: child.nickname,
      // Arabic title from the module; the track has one too.
      moduleTitle: 'الوحدة الأولى',
      trackTitle: 'مسار الاختبار',
      revoked: false,
    });
    expect(issued.body.code).toMatch(/^KCP-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/);
    // Asking again gives the same certificate.
    const again = await issue(student).expect(200);
    expect(again.body.id).toBe(issued.body.id);
    expect(await t.prisma.certificate.count({ where: { userId: child.id } })).toBe(1);

    // The student and the parent hear about it (once).
    const studentBell = await notificationsOf(student);
    expect(studentBell.items.filter((n) => n.type === 'certificate_issued')).toHaveLength(1);
    const parentAfter = await notificationsOf(parent.accessToken);
    expect(parentAfter.items.filter((n) => n.type === 'child_certificate')).toEqual([
      expect.objectContaining({
        data: expect.objectContaining({ childId: child.id, certificateId: issued.body.id }),
      }),
    ]);

    // The PDF, for the student and the parent.
    for (const token of [student, parent.accessToken]) {
      const pdf = await t
        .http()
        .get(`/v1/certificates/${issued.body.id}/pdf`)
        .set(auth(token))
        .buffer(true)
        .parse((res, done) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => chunks.push(chunk));
          res.on('end', () => done(null, Buffer.concat(chunks)));
        })
        .expect(200);
      expect(pdf.headers['content-type']).toBe('application/pdf');
      expect(pdf.headers['content-disposition']).toContain(`kcp-certificate-${issued.body.code}`);
      expect((pdf.body as Buffer).subarray(0, 5).toString()).toBe('%PDF-');
    }
    const children = await t
      .http()
      .get(`/v1/children/${child.id}/certificates`)
      .set(auth(parent.accessToken))
      .expect(200);
    expect(children.body.certificates).toEqual([
      expect.objectContaining({ id: issued.body.id, moduleTitle: 'Module one' }),
    ]);

    // Checking the code: public, with the nickname only.
    const verified = await t.http().get(`/v1/public/certificates/${issued.body.code}`).expect(200);
    expect(verified.body).toMatchObject({
      code: issued.body.code,
      nickname: child.nickname,
      valid: true,
      moduleTitles: { en: 'Module one', ar: 'الوحدة الأولى' },
    });
    expect(JSON.stringify(verified.body)).not.toContain(child.username);
    await t.http().get('/v1/public/certificates/KCP-2222-2222').expect(404);
    await t.http().get('/v1/public/certificates/not-a-code').expect(400);
  });

  it('keeps certificates to the family, and to premium', async () => {
    const { child, student } = await family(t);
    await finishLessons(child.id);
    await ship(student);
    const issued = await issue(student).expect(200);

    // Other families (parent or student) can't get the PDF or the list.
    const other = await family(t);
    for (const token of [other.student, other.parent.accessToken]) {
      await t.http().get(`/v1/certificates/${issued.body.id}/pdf`).set(auth(token)).expect(404);
    }
    await t
      .http()
      .get(`/v1/children/${child.id}/certificates`)
      .set(auth(other.parent.accessToken))
      .expect(404);
    // Parents don't earn certificates.
    await t
      .http()
      .post('/v1/certificates')
      .set(auth(other.parent.accessToken))
      .send({ moduleId: MODULE })
      .expect(403);
    await t.http().get('/v1/certificates').expect(401);

    // A student whose trial ended can't get one, even with the module finished.
    await t.prisma.studentProfile.update({
      where: { userId: other.child.id },
      data: { trialEndsAt: new Date(Date.now() - 1000) },
    });
    await finishLessons(other.child.id);
    await t.prisma.project.create({
      data: { userId: other.child.id, briefId: BRIEF, status: 'SHIPPED', files: PAGE },
    });
    const locked = await issue(other.student).expect(403);
    expect(locked.body.error).toBe('PREMIUM_REQUIRED');
    const list = await t.http().get('/v1/certificates').set(auth(other.student)).expect(200);
    expect(list.body.premium).toBe(false);
    expect(list.body.modules).toContainEqual(
      expect.objectContaining({ moduleId: MODULE, finished: true, certificate: null }),
    );
  });

  it('lets admins revoke a certificate with a reason, and verification says so', async () => {
    const { child, student } = await family(t);
    await finishLessons(child.id);
    await ship(student);
    const issued = await issue(student).expect(200);
    const admin = await staffLogin(t, 'admin');
    const moderator = await staffLogin(t, 'moderator');

    await t
      .http()
      .post(`/v1/admin/certificates/${issued.body.id}/revoke`)
      .set(auth(moderator.token))
      .send({ reason: 'Copied the project' })
      .expect(403);
    await t
      .http()
      .post(`/v1/admin/certificates/${issued.body.id}/revoke`)
      .set(auth(admin.token))
      .send({ reason: '' })
      .expect(400);
    await t
      .http()
      .post(`/v1/admin/certificates/${issued.body.id}/revoke`)
      .set(auth(admin.token))
      .send({ reason: 'Copied the project' })
      .expect(204);

    const verified = await t.http().get(`/v1/public/certificates/${issued.body.code}`).expect(200);
    expect(verified.body.valid).toBe(false);
    // Staff see it on the student's page, marked revoked.
    const listed = await t
      .http()
      .get(`/v1/admin/users/${child.id}/certificates`)
      .set(auth(admin.token))
      .expect(200);
    expect(listed.body.certificates).toEqual([
      expect.objectContaining({ id: issued.body.id, revoked: true }),
    ]);
    await t
      .http()
      .get(`/v1/admin/users/${child.id}/certificates`)
      .set(auth(moderator.token))
      .expect(403);
    const pdf = await t
      .http()
      .get(`/v1/certificates/${issued.body.id}/pdf`)
      .set(auth(student))
      .expect(409);
    expect(pdf.body.error).toBe('CERTIFICATE_REVOKED');
    // Staff who may read certificates still can (to check what happened).
    await t.http().get(`/v1/certificates/${issued.body.id}/pdf`).set(auth(admin.token)).expect(409);
    const log = await t.prisma.auditLog.findFirstOrThrow({
      where: { action: 'certificate.revoke', entityId: issued.body.id },
    });
    expect(log.actorId).toBe(admin.user.id);
    expect(log.after).toMatchObject({ reason: 'Copied the project' });
  });

  it('marks notifications read, one or all, for their owner only', async () => {
    const { parent, child, student } = await family(t);
    await finishLessons(child.id);
    await ship(student);
    await issue(student).expect(200);
    const bell = await notificationsOf(parent.accessToken);
    expect(bell.unread).toBe(2);
    const [newest, older] = bell.items;

    // Someone else can't mark them.
    const stranger = await signUpAndLogin(t);
    await t
      .http()
      .post('/v1/notifications/read')
      .set(auth(stranger.accessToken))
      .send({ ids: [newest!.id] })
      .expect(204);
    expect((await notificationsOf(parent.accessToken)).unread).toBe(2);

    await t
      .http()
      .post('/v1/notifications/read')
      .set(auth(parent.accessToken))
      .send({ ids: [newest!.id] })
      .expect(204);
    const one = await notificationsOf(parent.accessToken);
    expect(one.unread).toBe(1);
    expect(one.items.find((n) => n.id === older!.id)?.read).toBe(false);

    await t
      .http()
      .post('/v1/notifications/read')
      .set(auth(parent.accessToken))
      .send({ all: true })
      .expect(204);
    expect((await notificationsOf(parent.accessToken)).unread).toBe(0);
    await t
      .http()
      .post('/v1/notifications/read')
      .set(auth(parent.accessToken))
      .send({ ids: ['not-a-uuid'] })
      .expect(400);
    await t.http().get('/v1/notifications').expect(401);
  });
});
