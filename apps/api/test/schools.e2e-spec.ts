import { MENTOR_CODE_OF_CONDUCT_VERSION } from '@kcp/database';
import { SchoolPremiumService } from '../src/schools/school-premium.service.js';
import {
  createTestApp,
  resetRateLimits,
  staffLogin,
  type TestContext,
  webTwoFactorLogin,
} from './helpers.js';
import { auth, family } from './learning-fixture.js';

const DAY_MS = 24 * 60 * 60 * 1000;

describe('schools, classes and the readiness check (e2e)', () => {
  let t: TestContext;
  let admin: string;

  beforeAll(async () => {
    t = await createTestApp();
    admin = (await staffLogin(t, 'admin')).token;
  });

  beforeEach(async () => {
    await resetRateLimits(t.redis);
  });

  afterAll(async () => {
    await t.app.close();
  });

  async function readyMentor() {
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
      .send({ backgroundCheck: 'PASSED', languages: ['en', 'ur'], reason: 'Check came back clear' })
      .expect(204);
    return mentor;
  }

  async function finishPro(userId: string) {
    const lessons = await t.prisma.lesson.findMany({
      where: { isActive: true, module: { trackId: 'pro', isActive: true } },
      select: { id: true },
    });
    await t.prisma.lessonProgress.createMany({
      data: lessons.map((l) => ({
        userId,
        lessonId: l.id,
        status: 'COMPLETED' as const,
        completedAt: new Date(),
      })),
      skipDuplicates: true,
    });
  }

  async function school() {
    const made = await t
      .http()
      .post('/v1/admin/schools')
      .set(auth(admin))
      .send({
        name: `Crescent School ${Math.floor(Math.random() * 9000)}`,
        countryCode: 'PK',
        city: 'Lahore',
        contactName: 'Mrs Aslam',
        contactEmail: 'office@crescent.test',
      })
      .expect(200);
    return made.body.id as string;
  }

  async function joinAndApprove(code: string) {
    const person = await family(t);
    const joined = await t
      .http()
      .post('/v1/classes/join')
      .set(auth(person.student))
      .send({ code: code.toLowerCase() })
      .expect(200);
    expect(joined.body.status).toBe('PENDING');
    const requests = await t
      .http()
      .get('/v1/class-requests')
      .set(auth(person.parent.accessToken))
      .expect(200);
    expect(requests.body).toHaveLength(1);
    await t
      .http()
      .post(`/v1/class-requests/${joined.body.id}/decision`)
      .set(auth(person.parent.accessToken))
      .send({ childId: person.child.id, approve: true })
      .expect(200, { status: 'APPROVED' });
    return person;
  }

  it('runs a class: a teacher at a school, students with a parent’s OK, assignments, premium from the licence', async () => {
    const schoolId = await school();
    const teacher = await webTwoFactorLogin(t, 'teacher');
    const outsider = await webTwoFactorLogin(t, 'teacher');

    // Staff add the teacher (an existing teacher account is linked, no invitation).
    const added = await t
      .http()
      .post(`/v1/admin/schools/${schoolId}/teachers`)
      .set(auth(admin))
      .send({ email: teacher.user.email })
      .expect(200);
    expect(added.body).toEqual({ userId: teacher.user.id, invited: false });
    const home = await t.http().get('/v1/teacher/classes').set(auth(teacher.token)).expect(200);
    expect(home.body.schools.map((s: { id: string }) => s.id)).toContain(schoolId);

    // Only the school's teachers make classes there.
    const refused = await t
      .http()
      .post('/v1/teacher/classes')
      .set(auth(outsider.token))
      .send({ schoolId, name: 'Not mine' })
      .expect(404);
    expect(refused.body.error).toBe('SCHOOL_NOT_FOUND');
    const made = await t
      .http()
      .post('/v1/teacher/classes')
      .set(auth(teacher.token))
      .send({ schoolId, name: 'Grade 7 Blue', trackId: 'builder' })
      .expect(200);
    const classId = made.body.id as string;
    expect(made.body).toMatchObject({ name: 'Grade 7 Blue', approved: 0, seats: null });
    expect(made.body.joinCode).toMatch(/^[A-Z0-9]{6}$/);
    expect(made.body.roomId).toBeTruthy();
    await t.http().get(`/v1/teacher/classes/${classId}`).set(auth(outsider.token)).expect(404);

    // A student joins with the code; their parent approves.
    const first = await joinAndApprove(made.body.joinCode);
    const mine = await t.http().get('/v1/classes').set(auth(first.student)).expect(200);
    expect(mine.body[0]).toMatchObject({
      id: classId,
      name: 'Grade 7 Blue',
      status: 'APPROVED',
      teacher: teacher.user.displayName,
    });
    expect(mine.body[0].roomId).toBe(made.body.roomId);
    const again = await t
      .http()
      .post('/v1/classes/join')
      .set(auth(first.student))
      .send({ code: made.body.joinCode })
      .expect(409);
    expect(again.body.error).toBe('ALREADY_IN_CLASS');
    const notified = await t.prisma.notification.findFirst({
      where: { userId: first.child.id, type: 'class_joined' },
    });
    expect(notified).toBeTruthy();

    // A licence: invoiced first (no premium yet), then paid (premium for the class).
    const invoiced = await t
      .http()
      .post(`/v1/admin/schools/${schoolId}/licenses`)
      .set(auth(admin))
      .send({
        seats: 1,
        startsAt: new Date(Date.now() - DAY_MS),
        endsAt: new Date(Date.now() + 300 * DAY_MS),
        invoiceNumber: `INV-${Date.now()}`,
        amountMinor: 5_000_000,
        currency: 'PKR',
      })
      .expect(200);
    const license = invoiced.body.licenses[0];
    expect(license).toMatchObject({ state: 'INVOICED', used: 0, seats: 1 });
    const paid = await t
      .http()
      .post(`/v1/admin/schools/licenses/${license.id}/paid`)
      .set(auth(admin))
      .send({ paymentReference: 'HBL 123456' })
      .expect(200);
    expect(paid.body.licenses[0]).toMatchObject({ state: 'PAID', used: 1 });
    expect(paid.body.seats).toMatchObject({ total: 1, used: 1 });
    const grant = await t.prisma.premiumGrant.findFirstOrThrow({
      where: { userId: first.child.id, source: 'SCHOOL' },
    });
    expect(grant).toMatchObject({ licenseId: license.id, revokedAt: null });

    // The seat is taken: the next student is in the class without school premium.
    const second = await joinAndApprove(made.body.joinCode);
    let detail = await t
      .http()
      .get(`/v1/teacher/classes/${classId}`)
      .set(auth(teacher.token))
      .expect(200);
    const premiumOf = (userId: string) =>
      detail.body.students.find((s: { userId: string }) => s.userId === userId).schoolPremium;
    expect(premiumOf(first.child.id)).toBe(true);
    expect(premiumOf(second.child.id)).toBe(false);

    // An assignment: students hear about it, and the teacher sees progress on it.
    const catalog = await t.http().get('/v1/teacher/lessons').set(auth(teacher.token)).expect(200);
    const lessonId = catalog.body.find((track: { id: string }) => track.id === 'builder').modules[0]
      .lessons[0].id as string;
    const due = new Date(Date.now() + 7 * DAY_MS);
    detail = await t
      .http()
      .post(`/v1/teacher/classes/${classId}/assignments`)
      .set(auth(teacher.token))
      .send({ lessonId, dueAt: due })
      .expect(200);
    expect(detail.body.assignmentList).toEqual([
      expect.objectContaining({ lessonId, done: 0, dueAt: due.toISOString() }),
    ]);
    const twice = await t
      .http()
      .post(`/v1/teacher/classes/${classId}/assignments`)
      .set(auth(teacher.token))
      .send({ lessonId })
      .expect(409);
    expect(twice.body.error).toBe('ALREADY_ASSIGNED');
    expect(
      await t.prisma.notification.count({
        where: { userId: second.child.id, type: 'assignment_new' },
      }),
    ).toBe(1);
    await t.prisma.lessonProgress.create({
      data: { userId: first.child.id, lessonId, status: 'COMPLETED', completedAt: new Date() },
    });
    detail = await t
      .http()
      .get(`/v1/teacher/classes/${classId}`)
      .set(auth(teacher.token))
      .expect(200);
    const assignmentId = detail.body.assignmentList[0].id as string;
    expect(detail.body.assignmentList[0].done).toBe(1);
    const row = (userId: string) =>
      detail.body.progress.find((r: { userId: string }) => r.userId === userId);
    expect(row(first.child.id).lessons[assignmentId]).toBe('DONE');
    expect(row(second.child.id).lessons[assignmentId]).toBe('NOT_STARTED');
    expect(detail.body.board).toHaveLength(2);
    // Nicknames only.
    expect(JSON.stringify(detail.body)).not.toContain(first.child.username);
    const studentView = await t.http().get('/v1/classes').set(auth(first.student)).expect(200);
    expect(studentView.body[0].assignments[0]).toMatchObject({ lessonId, done: true });

    // Who may do what.
    await t.http().get('/v1/teacher/classes').set(auth(first.student)).expect(403);
    await t.http().get('/v1/admin/schools').set(auth(teacher.token)).expect(403);
    await t
      .http()
      .post(`/v1/class-requests/${classId}/decision`)
      .set(auth(first.parent.accessToken))
      .send({ childId: second.child.id, approve: true })
      .expect(404);

    // Leaving the class ends the school's premium; the free seat goes to the next approval.
    await t.http().post(`/v1/classes/${classId}/leave`).set(auth(first.student)).expect(204);
    expect(
      (await t.prisma.premiumGrant.findUniqueOrThrow({ where: { id: grant.id } })).revokedAt,
    ).not.toBeNull();
    const third = await joinAndApprove(made.body.joinCode);
    expect(
      await t.prisma.premiumGrant.count({
        where: { userId: third.child.id, licenseId: license.id, revokedAt: null },
      }),
    ).toBe(1);

    // A cancelled licence ends it for everyone; archiving closes the class.
    await t
      .http()
      .post(`/v1/admin/schools/licenses/${license.id}/cancel`)
      .set(auth(admin))
      .send({ reason: 'School asked to stop' })
      .expect(200);
    expect(
      await t.prisma.premiumGrant.count({ where: { licenseId: license.id, revokedAt: null } }),
    ).toBe(0);
    await t
      .http()
      .post(`/v1/teacher/classes/${classId}/archive`)
      .set(auth(teacher.token))
      .expect(200);
    expect((await t.http().get('/v1/classes').set(auth(third.student)).expect(200)).body).toEqual(
      [],
    );
    const latecomer = await family(t);
    const closed = await t
      .http()
      .post('/v1/classes/join')
      .set(auth(latecomer.student))
      .send({ code: made.body.joinCode })
      .expect(404);
    expect(closed.body.error).toBe('CLASS_CODE_NOT_FOUND');
    const room = await t.prisma.chatRoom.findUniqueOrThrow({ where: { id: made.body.roomId } });
    expect(room.isArchived).toBe(true);

    // Staff see it all, and it's in the audit log.
    const view = await t.http().get(`/v1/admin/schools/${schoolId}`).set(auth(admin)).expect(200);
    expect(view.body.teacherList).toEqual([
      expect.objectContaining({ id: teacher.user.id, invited: false }),
    ]);
    expect(view.body.classList[0]).toMatchObject({ name: 'Grade 7 Blue', archived: true });
    expect(
      await t.prisma.auditLog.count({ where: { action: 'license.paid', entityId: license.id } }),
    ).toBe(1);
  });

  it('starts next year’s licence when its date comes, and never gives more places than seats', async () => {
    const schoolId = await school();
    const teacher = await webTwoFactorLogin(t, 'teacher');
    await t
      .http()
      .post(`/v1/admin/schools/${schoolId}/teachers`)
      .set(auth(admin))
      .send({ email: teacher.user.email })
      .expect(200);
    const made = await t
      .http()
      .post('/v1/teacher/classes')
      .set(auth(teacher.token))
      .send({ schoolId, name: 'Year 9' })
      .expect(200);
    const students = [];
    for (let i = 0; i < 3; i++) students.push(await joinAndApprove(made.body.joinCode));

    // Paid early, starting tomorrow: nothing yet; the hourly job starts it on the day.
    const added = await t
      .http()
      .post(`/v1/admin/schools/${schoolId}/licenses`)
      .set(auth(admin))
      .send({
        seats: 2,
        startsAt: new Date(Date.now() + DAY_MS),
        endsAt: new Date(Date.now() + 200 * DAY_MS),
        invoiceNumber: `INV-NEXT-${Date.now()}`,
        amountMinor: 100_000,
        currency: 'PKR',
      })
      .expect(200);
    const licenseId = added.body.licenses[0].id as string;
    await t
      .http()
      .post(`/v1/admin/schools/licenses/${licenseId}/paid`)
      .set(auth(admin))
      .send({ paymentReference: 'HBL 555' })
      .expect(200);
    expect(await t.prisma.premiumGrant.count({ where: { licenseId } })).toBe(0);
    const premium = t.app.get(SchoolPremiumService);
    const tomorrow = new Date(Date.now() + DAY_MS + 60_000);
    // Two runs at once (two servers): still only as many grants as seats.
    await Promise.all([
      premium.grantRunningLicenses(tomorrow),
      premium.grantRunningLicenses(tomorrow),
    ]);
    const grants = await t.prisma.premiumGrant.findMany({ where: { licenseId, revokedAt: null } });
    expect(grants).toHaveLength(2);
    expect(new Set(grants.map((g) => g.userId)).size).toBe(2);
  });

  it('invites a new teacher, and keeps a teacher with classes at the school', async () => {
    const schoolId = await school();
    const email = `teacher-${Date.now()}@school.test`;
    const invited = await t
      .http()
      .post(`/v1/admin/schools/${schoolId}/teachers`)
      .set(auth(admin))
      .send({ email, displayName: 'Mr Khan', languageCode: 'ur' })
      .expect(200);
    expect(invited.body.invited).toBe(true);
    const account = await t.prisma.user.findUniqueOrThrow({
      where: { email },
      include: { role: true },
    });
    expect(account.role.key).toBe('teacher');
    const parent = await family(t);
    const wrong = await t
      .http()
      .post(`/v1/admin/schools/${schoolId}/teachers`)
      .set(auth(admin))
      .send({ email: parent.parent.email })
      .expect(409);
    expect(wrong.body.error).toBe('EMAIL_TAKEN');
    await t.prisma.schoolClass.create({
      data: {
        schoolId,
        teacherId: account.id,
        name: 'Year 8',
        joinCode: Math.random().toString(36).slice(2, 8).toUpperCase().padEnd(6, 'Q'),
      },
    });
    const kept = await t
      .http()
      .delete(`/v1/admin/schools/${schoolId}/teachers/${account.id}`)
      .set(auth(admin))
      .expect(409);
    expect(kept.body.error).toBe('TEACHER_HAS_CLASSES');
  });

  describe('the hub readiness check', () => {
    it('a student who finished the Pro track takes it in time and a mentor passes it', async () => {
      const person = await family(t);
      const before = await t.http().get('/v1/readiness').set(auth(person.student)).expect(200);
      expect(before.body).toMatchObject({ canStart: false, minutes: 180, current: null });
      expect(before.body.blockers).toContain('PRO_TRACK');
      expect(before.body.brief.requirements.form).toBeTruthy();
      await t.http().post('/v1/readiness/start').set(auth(person.student)).expect(409);

      await finishPro(person.child.id);
      const ready = await t.http().get('/v1/readiness').set(auth(person.student)).expect(200);
      expect(ready.body).toMatchObject({ canStart: true, blockers: [] });
      expect(ready.body.proLessonsDone).toBe(ready.body.proLessons);

      const started = await t
        .http()
        .post('/v1/readiness/start')
        .set(auth(person.student))
        .expect(200);
      expect(started.body.status).toBe('STARTED');
      expect(
        new Date(started.body.dueAt).getTime() - new Date(started.body.startedAt).getTime(),
      ).toBe(180 * 60 * 1000);
      expect(started.body.files.html).toContain('<header>');
      const twice = await t
        .http()
        .post('/v1/readiness/start')
        .set(auth(person.student))
        .expect(409);
      expect(twice.body.details.blockers).toContain('OPEN');

      const files = {
        html: '<header><h1>Crumbs Bakery</h1></header>\n<ul><li>Bread 100</li></ul>',
        css: 'body { margin: 0; }',
        js: '// toggle hours',
      };
      await t
        .http()
        .put('/v1/readiness/current')
        .set(auth(person.student))
        .send({ files })
        .expect(200);
      const handed = await t
        .http()
        .post('/v1/readiness/current/submit')
        .set(auth(person.student))
        .send({ files })
        .expect(200);
      expect(handed.body).toMatchObject({ status: 'SUBMITTED', maxScore: 16 });
      const reviewId = handed.body.reviewId as string;
      await t
        .http()
        .put('/v1/readiness/current')
        .set(auth(person.student))
        .send({ files })
        .expect(404);

      // The mentor console shows it with the brief, and grades it with the rubric.
      const mentor = await readyMentor();
      const queue = await t
        .http()
        .get('/v1/mentor/queue?languages=all')
        .set(auth(mentor.token))
        .expect(200);
      expect(queue.body.waiting.find((i: { id: string }) => i.id === reviewId)).toMatchObject({
        kind: 'READINESS',
        title: 'Hub readiness check',
      });
      await t
        .http()
        .post(`/v1/mentor/reviews/${reviewId}/claim`)
        .set(auth(mentor.token))
        .expect(204);
      const review = await t
        .http()
        .get(`/v1/mentor/reviews/${reviewId}`)
        .set(auth(mentor.token))
        .expect(200);
      expect(review.body.brief.checkLabels.form).toBeTruthy();
      expect(review.body.criteria).toEqual(['works', 'code', 'design', 'independence']);
      expect(review.body.files.html).toContain('Crumbs Bakery');
      await t
        .http()
        .post(`/v1/mentor/reviews/${reviewId}/decision`)
        .set(auth(mentor.token))
        .send({
          decision: 'APPROVED',
          scores: { works: 4, code: 3, design: 3, independence: 4 },
          summary: 'Ready: a clear page, built on your own.',
        })
        .expect(204);

      const after = await t.http().get('/v1/readiness').set(auth(person.student)).expect(200);
      expect(after.body.current).toBeNull();
      expect(after.body.history[0]).toMatchObject({ status: 'PASSED', score: 14, reviewId });
      expect(after.body.blockers).toContain('PASSED');
      expect(
        await t.prisma.notification.count({
          where: { userId: person.child.id, type: 'readiness_result' },
        }),
      ).toBe(1);
      expect(
        await t.prisma.notification.count({
          where: { userId: person.parent.user.id, type: 'child_readiness' },
        }),
      ).toBe(1);
      // The family reads the mentor's result like a project review.
      const result = await t
        .http()
        .get(`/v1/reviews/${reviewId}`)
        .set(auth(person.parent.accessToken))
        .expect(200);
      expect(result.body).toMatchObject({ kind: 'READINESS', status: 'APPROVED' });
    });

    it('hands in what was saved when the time runs out, and waits before another try', async () => {
      const saver = await family(t);
      const idle = await family(t);
      const young = await family(t);
      await t.prisma.studentProfile.update({
        where: { userId: young.child.id },
        data: { birthYear: new Date().getUTCFullYear() - 11 },
      });
      for (const p of [saver, idle, young]) await finishPro(p.child.id);

      const youngView = await t.http().get('/v1/readiness').set(auth(young.student)).expect(200);
      expect(youngView.body.blockers).toContain('AGE');

      for (const p of [saver, idle]) {
        await t.http().post('/v1/readiness/start').set(auth(p.student)).expect(200);
      }
      await t
        .http()
        .put('/v1/readiness/current')
        .set(auth(saver.student))
        .send({ files: { html: '<h1>Spokes</h1>', css: '', js: '' } })
        .expect(200);
      await t.prisma.readinessCheck.updateMany({
        where: { studentId: { in: [saver.child.id, idle.child.id] } },
        data: { dueAt: new Date(Date.now() - 30 * 60 * 1000) },
      });

      const late = await t
        .http()
        .post('/v1/readiness/current/submit')
        .set(auth(saver.student))
        .send({ files: { html: '<h1>Too late</h1>' } })
        .expect(409);
      expect(late.body.error).toBe('TIME_UP');
      const saved = await t.http().get('/v1/readiness').set(auth(saver.student)).expect(200);
      expect(saved.body.current).toMatchObject({ status: 'SUBMITTED' });
      const review = await t.prisma.review.findUniqueOrThrow({
        where: { id: saved.body.current.reviewId },
      });
      expect(review.files).toMatchObject({ html: '<h1>Spokes</h1>' });

      const empty = await t.http().get('/v1/readiness').set(auth(idle.student)).expect(200);
      expect(empty.body.history[0].status).toBe('EXPIRED');
      expect(empty.body.blockers).toContain('WAIT');
      expect(new Date(empty.body.retryAt).getTime()).toBeGreaterThan(Date.now() + 6 * DAY_MS);
    });

    it('starts and hands in once, even from two tabs at the same moment', async () => {
      const person = await family(t);
      await finishPro(person.child.id);
      const starts = await Promise.all([
        t.http().post('/v1/readiness/start').set(auth(person.student)),
        t.http().post('/v1/readiness/start').set(auth(person.student)),
      ]);
      expect(starts.map((r) => r.status).toSorted()).toEqual([200, 409]);
      const files = { html: '<h1>Two tabs</h1>', css: '', js: '' };
      await Promise.all([
        t.http().post('/v1/readiness/current/submit').set(auth(person.student)).send({ files }),
        t.http().post('/v1/readiness/current/submit').set(auth(person.student)).send({ files }),
      ]);
      expect(
        await t.prisma.review.count({ where: { studentId: person.child.id, kind: 'READINESS' } }),
      ).toBe(1);
      expect(await t.prisma.readinessCheck.count({ where: { studentId: person.child.id } })).toBe(
        1,
      );
    });

    it('is for students only', async () => {
      const person = await family(t);
      await t.http().get('/v1/readiness').set(auth(person.parent.accessToken)).expect(403);
    });
  });
});
