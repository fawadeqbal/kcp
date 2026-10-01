import { execFile } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { HubTimeService } from '../src/hub/time.service.js';
import {
  createTestApp,
  lastMailTo,
  resetRateLimits,
  staffLogin,
  type TestContext,
} from './helpers.js';
import {
  approvedProject,
  clientProject,
  eligibleStudent,
  passedStudent,
  payByCard,
  readyMentor,
  setHubCountry,
} from './hub-fixture.js';
import { auth } from './learning-fixture.js';

const GIT = Boolean(process.env['FORGEJO_URL'] && process.env['FORGEJO_TOKEN']);
const ALL_DAY = { dayStartMinute: 0, dayEndMinute: 1440, schoolDays: [], weeklyMinutes: 360 };

describe('the hub team: matching, approvals, the timer and the repository (e2e)', () => {
  let t: TestContext;
  let admin: string;
  let lead: { user: { id: string }; token: string };
  let url: string;
  let rulesBefore: Record<string, unknown>;
  let wasOpen: boolean;

  beforeAll(async () => {
    t = await createTestApp();
    await t.app.listen(0, '127.0.0.1');
    url = `http://127.0.0.1:${(t.app.getHttpServer().address() as AddressInfo).port}`;
    admin = (await staffLogin(t, 'admin')).token;
    lead = await readyMentor(t, admin, true);
    wasOpen = await setHubCountry(t, 'PK', true);
    const rules = await t.http().get('/v1/admin/hub/countries').set(auth(admin)).expect(200);
    rulesBefore = rules.body.find((c: { countryCode: string }) => c.countryCode === 'PK');
    // Hub work allowed at any time for these tests (the hours rules have their own tests).
    await t.http().put('/v1/admin/hub/countries/PK').set(auth(admin)).send(ALL_DAY).expect(200);
    // Students left eligible by earlier runs would crowd the suggestions (the best 30).
    await t.prisma.hubEligibility.updateMany({
      where: { revokedAt: null, createdAt: { lt: new Date(Date.now() - 60_000) } },
      data: { revokedAt: new Date(), revokedReason: 'Old test data' },
    });
  });

  beforeEach(async () => {
    await resetRateLimits(t.redis);
  });

  afterAll(async () => {
    const r = rulesBefore as {
      dayStartMinute: number;
      dayEndMinute: number;
      schoolDays: number[];
      weeklyMinutes: number;
    };
    await t.http().put('/v1/admin/hub/countries/PK').set(auth(admin)).send({
      dayStartMinute: r.dayStartMinute,
      dayEndMinute: r.dayEndMinute,
      schoolDays: r.schoolDays,
      weeklyMinutes: r.weeklyMinutes,
    });
    await setHubCountry(t, 'PK', wasOpen);
    await t.app.close();
  });

  /** An active project (deposit paid) with its three tasks. */
  async function activeProject() {
    const { client, projectId } = await clientProject(t, admin, lead.user.id);
    const { project } = await approvedProject(t, lead.token, client.token, projectId);
    await payByCard(t, client.token, project.invoices[0].id);
    const view = await t
      .http()
      .get(`/v1/mentor/hub/projects/${projectId}`)
      .set(auth(lead.token))
      .expect(200);
    const tasks = view.body.quotes[0].tasks as { id: string; skillTags: string[] }[];
    return { client, projectId, tasks };
  }

  it('matches students to a task, and a parent approves each project', async () => {
    const { client, projectId, tasks } = await activeProject();
    const a = await eligibleStudent(t, lead.token);
    const b = await eligibleStudent(t, lead.token);
    const notYet = await passedStudent(t);
    // A has done lessons with the first task's skills.
    const lesson = await t.prisma.lesson.findFirst({
      where: { skills: { has: 'html' } },
      select: { id: true },
    });
    if (lesson) {
      await t.prisma.lessonProgress.create({
        data: {
          userId: a.child.id,
          lessonId: lesson.id,
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });
    }
    await t.prisma.hubTask.update({ where: { id: tasks[0]!.id }, data: { skillTags: ['html'] } });

    const suggestions = await t
      .http()
      .get(`/v1/mentor/hub/projects/${projectId}/tasks/${tasks[0]!.id}/suggestions`)
      .set(auth(lead.token))
      .expect(200);
    const ids = suggestions.body.map((m: { studentId: string }) => m.studentId);
    expect(ids).toContain(a.child.id);
    expect(ids).toContain(b.child.id);
    expect(ids).not.toContain(notYet.child.id);
    const scoreOf = (id: string) =>
      suggestions.body.find((m: { studentId: string }) => m.studentId === id);
    if (lesson) {
      expect(scoreOf(a.child.id).matchedSkills).toEqual(['html']);
      expect(scoreOf(a.child.id).score.skills).toBeGreaterThan(scoreOf(b.child.id).score.skills);
    }
    expect(scoreOf(a.child.id).minutesLeft).toBe(360);
    expect(scoreOf(a.child.id)).not.toHaveProperty('username');

    // Invite A for the first task; a student who isn't eligible can't be invited.
    await t
      .http()
      .post(`/v1/mentor/hub/projects/${projectId}/invites`)
      .set(auth(lead.token))
      .send({ studentId: notYet.child.id })
      .expect(400);
    const team = await t
      .http()
      .post(`/v1/mentor/hub/projects/${projectId}/invites`)
      .set(auth(lead.token))
      .send({
        studentId: a.child.id,
        taskId: tasks[0]!.id,
        note: 'You did great forms in the check.',
      })
      .expect(200);
    expect(team.body[0]).toMatchObject({ status: 'INVITED', pseudonym: 'Developer A' });
    await t
      .http()
      .post(`/v1/mentor/hub/projects/${projectId}/invites`)
      .set(auth(lead.token))
      .send({ studentId: a.child.id })
      .expect(409);

    // A sees what it offers and says yes; a parent approves.
    const invites = await t.http().get('/v1/hub/invites').set(auth(a.student)).expect(200);
    expect(invites.body[0]).toMatchObject({
      projectId,
      status: 'INVITED',
      estimatedEarningsMinor: 30_000,
      currency: 'USD',
      note: 'You did great forms in the check.',
    });
    expect(invites.body[0]).not.toHaveProperty('clientName');
    await t
      .http()
      .post(`/v1/hub/invites/${invites.body[0].memberId}/answer`)
      .set(auth(a.student))
      .send({ accept: true })
      .expect(204);
    expect(lastMailTo(t.mail, a.parent.email)?.template).toBe('hubProjectApproval');
    // Another parent can't decide for this child.
    await t
      .http()
      .post(`/v1/hub/approvals/${invites.body[0].memberId}`)
      .set(auth(b.parent.accessToken))
      .send({ approve: true })
      .expect(404);
    const approvals = await t
      .http()
      .get('/v1/hub/approvals')
      .set(auth(a.parent.accessToken))
      .expect(200);
    expect(approvals.body[0]).toMatchObject({
      childId: a.child.id,
      shareBp: 5000,
      studentPercent: 50,
    });
    await t
      .http()
      .post(`/v1/hub/approvals/${invites.body[0].memberId}`)
      .set(auth(a.parent.accessToken))
      .send({ approve: true })
      .expect(204);
    const approvedAudit = await t.prisma.auditLog.findFirst({
      where: { action: 'hub.member_approve', entityId: projectId },
    });
    expect(approvedAudit?.actorId).toBe(a.parent.user.id);

    // A is on the team: the task is theirs, the room has them and the lead.
    const studentView = await t
      .http()
      .get(`/v1/hub/projects/${projectId}`)
      .set(auth(a.student))
      .expect(200);
    expect(studentView.body.memberStatus).toBe('APPROVED');
    expect(studentView.body.tasks[0].assignee).toMatchObject({
      id: a.child.id,
      pseudonym: 'Developer A',
    });
    expect(studentView.body.roomId).toBeTruthy();
    expect(JSON.stringify(studentView.body)).not.toContain('Green Leaf Bakery');
    const members = await t.prisma.chatMember.findMany({
      where: { roomId: studentView.body.roomId },
    });
    expect(members.map((m) => m.userId).toSorted()).toEqual([a.child.id, lead.user.id].toSorted());
    const childProjects = await t
      .http()
      .get(`/v1/children/${a.child.id}/hub/projects`)
      .set(auth(a.parent.accessToken))
      .expect(200);
    expect(childProjects.body[0]).toMatchObject({ projectId, memberStatus: 'APPROVED' });

    // B says no.
    await t
      .http()
      .post(`/v1/mentor/hub/projects/${projectId}/invites`)
      .set(auth(lead.token))
      .send({ studentId: b.child.id, taskId: tasks[1]!.id })
      .expect(200);
    const bInvite = (await t.http().get('/v1/hub/invites').set(auth(b.student)).expect(200))
      .body[0];
    await t
      .http()
      .post(`/v1/hub/invites/${bInvite.memberId}/answer`)
      .set(auth(b.student))
      .send({ accept: false })
      .expect(204);

    // The client sees an anonymous team: no names, accounts or ages.
    const anonymous = await t
      .http()
      .get(`/v1/client/projects/${projectId}/team`)
      .set(auth(client.token))
      .expect(200);
    expect(anonymous.body).toEqual([
      expect.objectContaining({ pseudonym: 'Developer A', tasksDone: 0 }),
    ]);
    const text = JSON.stringify(anonymous.body);
    for (const secret of [a.child.id, a.child.username, a.child.nickname, a.parent.email]) {
      expect(text).not.toContain(secret);
    }
    // And the client can't see students' rooms or invitations.
    await t.http().get('/v1/hub/invites').set(auth(client.token)).expect(403);
    await t.http().get(`/v1/hub/projects/${projectId}`).set(auth(client.token)).expect(404);

    // The parent takes the hub consent back: A leaves the project.
    await t
      .http()
      .delete(`/v1/children/${a.child.id}/hub/consent`)
      .set(auth(a.parent.accessToken))
      .expect(200);
    const after = await t
      .http()
      .get(`/v1/mentor/hub/projects/${projectId}/team`)
      .set(auth(lead.token))
      .expect(200);
    expect(after.body.find((m: { id: string }) => m.id === a.child.id).status).toBe('REMOVED');
    const task = await t.prisma.hubTask.findUniqueOrThrow({ where: { id: tasks[0]!.id } });
    expect(task.assigneeId).toBeNull();
  });

  it('keeps hub time inside the weekly cap and the allowed hours', async () => {
    const { projectId, tasks } = await activeProject();
    const kid = await eligibleStudent(t, lead.token);
    await t
      .http()
      .post(`/v1/mentor/hub/projects/${projectId}/invites`)
      .set(auth(lead.token))
      .send({ studentId: kid.child.id, taskId: tasks[2]!.id })
      .expect(200);
    const invite = (await t.http().get('/v1/hub/invites').set(auth(kid.student)).expect(200))
      .body[0];
    await t
      .http()
      .post(`/v1/hub/invites/${invite.memberId}/answer`)
      .set(auth(kid.student))
      .send({ accept: true })
      .expect(204);
    await t
      .http()
      .post(`/v1/hub/approvals/${invite.memberId}`)
      .set(auth(kid.parent.accessToken))
      .send({ approve: true })
      .expect(204);

    // Only their own task.
    await t.http().post(`/v1/hub/tasks/${tasks[0]!.id}/timer`).set(auth(kid.student)).expect(404);
    const started = await t
      .http()
      .post(`/v1/hub/tasks/${tasks[2]!.id}/timer`)
      .set(auth(kid.student))
      .expect(200);
    expect(started.body.running).toMatchObject({ taskId: tasks[2]!.id, projectId });
    await t.http().post(`/v1/hub/tasks/${tasks[2]!.id}/timer`).set(auth(kid.student)).expect(409);
    const board = await t
      .http()
      .get(`/v1/hub/projects/${projectId}`)
      .set(auth(kid.student))
      .expect(200);
    expect(board.body.tasks.find((x: { id: string }) => x.id === tasks[2]!.id).status).toBe(
      'IN_PROGRESS',
    );
    await t.http().post('/v1/hub/timer/stop').set(auth(kid.student)).expect(200);

    // Nearly the whole week's time used: the next timer stops by itself at the cap.
    const time = t.app.get(HubTimeService);
    const usage = await time.usage(kid.child.id);
    await t.prisma.hubTimeEntry.create({
      data: {
        projectId,
        taskId: tasks[2]!.id,
        studentId: kid.child.id,
        startedAt: new Date(Date.now() - 400 * 60_000),
        endedAt: new Date(Date.now() - 41 * 60_000),
        minutes: 359 - usage.usedMinutes,
        weekKey: usage.weekKey,
      },
    });
    const nearly = await t
      .http()
      .post(`/v1/hub/tasks/${tasks[2]!.id}/timer`)
      .set(auth(kid.student))
      .expect(200);
    expect(nearly.body.leftMinutes).toBe(1);
    expect(
      new Date(nearly.body.running.stopsAt).getTime() -
        new Date(nearly.body.running.startedAt).getTime(),
    ).toBe(60_000);
    await time.settleDue(new Date(Date.now() + 5 * 60_000));
    const capped = await t.prisma.hubTimeEntry.findFirstOrThrow({
      where: { studentId: kid.child.id },
      orderBy: { startedAt: 'desc' },
    });
    expect(capped).toMatchObject({ minutes: 1, stoppedBy: 'CAP' });
    const full = await t
      .http()
      .post(`/v1/hub/tasks/${tasks[2]!.id}/timer`)
      .set(auth(kid.student))
      .expect(409);
    expect(full.body.error).toBe('WEEKLY_CAP');
    const week = await t.http().get('/v1/hub/time').set(auth(kid.student)).expect(200);
    expect(week.body).toMatchObject({
      capMinutes: 360,
      usedMinutes: 360,
      leftMinutes: 0,
      running: null,
    });

    // Outside the allowed hours nobody can start (a day with no allowed time at all).
    await t.prisma.hubTimeEntry.deleteMany({ where: { studentId: kid.child.id } });
    await t
      .http()
      .put('/v1/admin/hub/countries/PK')
      .set(auth(admin))
      .send({ schoolDays: [0, 1, 2, 3, 4, 5, 6], schoolStartMinute: 0, schoolEndMinute: 1440 })
      .expect(200);
    const closed = await t
      .http()
      .post(`/v1/hub/tasks/${tasks[2]!.id}/timer`)
      .set(auth(kid.student))
      .expect(409);
    expect(closed.body.error).toBe('OUTSIDE_HOURS');
    await t
      .http()
      .put('/v1/admin/hub/countries/PK')
      .set(auth(admin))
      .send({ ...ALL_DAY, schoolStartMinute: 480, schoolEndMinute: 840 })
      .expect(200);
  });

  describe.skipIf(!GIT)('the project’s repository (Forgejo)', () => {
    const run = promisify(execFile);
    const git = async (cwd: string, token: string, ...args: string[]) =>
      (
        await run(
          'git',
          [
            '-c',
            `http.extraHeader=Authorization: Bearer ${token}`,
            '-c',
            'user.name=Kid',
            '-c',
            'user.email=kid@noreply.kcp.invalid',
            ...args,
          ],
          { cwd, env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }, timeout: 30_000 },
        )
      ).stdout;

    it('pushes only with the timer running, and merges only what the lead approved (scored)', async () => {
      const { projectId, tasks } = await activeProject();
      const kid = await eligibleStudent(t, lead.token);
      await t
        .http()
        .post(`/v1/mentor/hub/projects/${projectId}/invites`)
        .set(auth(lead.token))
        .send({ studentId: kid.child.id, taskId: tasks[0]!.id })
        .expect(200);
      const invite = (await t.http().get('/v1/hub/invites').set(auth(kid.student)).expect(200))
        .body[0];
      await t
        .http()
        .post(`/v1/hub/invites/${invite.memberId}/answer`)
        .set(auth(kid.student))
        .send({ accept: true })
        .expect(204);
      await t
        .http()
        .post(`/v1/hub/approvals/${invite.memberId}`)
        .set(auth(kid.parent.accessToken))
        .send({ approve: true })
        .expect(204);

      const space = await t
        .http()
        .get(`/v1/hub/projects/${projectId}/workspace`)
        .set(auth(kid.student))
        .expect(200);
      expect(space.body).toMatchObject({ teamId: `hub-${projectId}`, canPush: false });
      const branch = space.body.branch as string;
      const dir = mkdtempSync(path.join(tmpdir(), 'kcp-hub-git-'));
      try {
        const remote = `${url}/v1/git/hub/${projectId}`;
        await git(dir, kid.student, 'clone', '-q', remote, 'repo');
        const repo = path.join(dir, 'repo');
        writeFileSync(path.join(repo, 'index.html'), '<h1>Green Leaf Bakery</h1>\n');
        await git(repo, kid.student, 'commit', '-qam', 'Menu page');
        // No timer: no push.
        await expect(
          git(repo, kid.student, 'push', '-q', 'origin', `HEAD:${branch}`),
        ).rejects.toThrow(/409|timer/i);
        await t
          .http()
          .post(`/v1/hub/tasks/${tasks[0]!.id}/timer`)
          .set(auth(kid.student))
          .expect(200);
        await expect(git(repo, kid.student, 'push', '-q', 'origin', 'HEAD:main')).rejects.toThrow(
          /403|main changes/,
        );
        await git(repo, kid.student, 'push', '-q', 'origin', `HEAD:${branch}`);
        await t.http().post('/v1/hub/timer/stop').set(auth(kid.student)).expect(200);

        // Only from their own branch (a task is paid to whoever did the work).
        const notMine = await t
          .http()
          .post(`/v1/hub/projects/${projectId}/pulls`)
          .set(auth(kid.student))
          .send({ branch: 'someone-else-1234', title: 'The menu' })
          .expect(403);
        expect(notMine.body.error).toBe('NOT_YOUR_BRANCH');
        const opened = await t
          .http()
          .post(`/v1/hub/projects/${projectId}/pulls`)
          .set(auth(kid.student))
          .send({ branch, title: 'The menu', taskId: tasks[0]!.id })
          .expect(201);
        expect(opened.body.title).toBe('T-1: The menu');
        const number = opened.body.number as number;
        const waiting = await t
          .http()
          .get(`/v1/hub/projects/${projectId}/pulls/${number}`)
          .set(auth(lead.token))
          .expect(200);
        expect(waiting.body).toMatchObject({
          canReview: true,
          canMerge: false,
          mergeBlocked: 'APPROVAL_NEEDED',
        });
        // The student can't review or merge.
        await t
          .http()
          .post(`/v1/hub/projects/${projectId}/pulls/${number}/merge`)
          .set(auth(kid.student))
          .expect(404);
        await t
          .http()
          .post(`/v1/hub/projects/${projectId}/pulls/${number}/review`)
          .set(auth(lead.token))
          .send({ decision: 'APPROVED', score: 4, body: 'Clean and readable.' })
          .expect(204);
        await t
          .http()
          .post(`/v1/hub/projects/${projectId}/pulls/${number}/merge`)
          .set(auth(lead.token))
          .expect(204);
        const done = await t.prisma.hubTask.findUniqueOrThrow({ where: { id: tasks[0]!.id } });
        expect(done.status).toBe('DONE');
        const review = await t.prisma.hubCodeReview.findFirstOrThrow({
          where: { projectId, pullNumber: number },
        });
        expect(review).toMatchObject({
          studentId: kid.child.id,
          score: 4,
          decision: 'APPROVED',
          taskId: tasks[0]!.id,
        });
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });
  });
});
