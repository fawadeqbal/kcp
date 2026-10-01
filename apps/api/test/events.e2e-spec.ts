import { execFile } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { MENTOR_CODE_OF_CONDUCT_VERSION } from '@kcp/database';
import {
  createTestApp,
  lastMailTo,
  resetRateLimits,
  staffLogin,
  type TestContext,
  webTwoFactorLogin,
} from './helpers.js';
import { auth, family } from './learning-fixture.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const GIT = Boolean(process.env['FORGEJO_URL'] && process.env['FORGEJO_TOKEN']);

describe('hackathons: teams, parents, mentors, judging (e2e)', () => {
  let t: TestContext;
  let admin: string;
  let url: string;

  beforeAll(async () => {
    t = await createTestApp();
    await t.app.listen(0, '127.0.0.1');
    url = `http://127.0.0.1:${(t.app.getHttpServer().address() as AddressInfo).port}`;
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
      .send({ backgroundCheck: 'PASSED', languages: ['en'], reason: 'Check came back clear' })
      .expect(204);
    return mentor;
  }

  async function newEvent(teamSize = 2) {
    const slug = `jam-${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
    const made = await t
      .http()
      .post('/v1/admin/events')
      .set(auth(admin))
      .send({
        title: 'Spring Jam',
        slug,
        description: 'Build a website for your school club in a weekend.',
        startsAt: new Date(Date.now() + DAY_MS),
        endsAt: new Date(Date.now() + 3 * DAY_MS),
        teamSize,
        minAge: 13,
      })
      .expect(200);
    return { id: made.body.id as string, slug };
  }

  const step = (id: string, status: string) =>
    t.http().post(`/v1/admin/events/${id}/status`).set(auth(admin)).send({ status });

  /** A team of approved students: the first makes it, the others join with its code. */
  async function team(slug: string, size: number) {
    const people = [];
    for (let i = 0; i < size; i++) people.push(await family(t));
    const made = await t
      .http()
      .post(`/v1/events/${slug}/teams`)
      .set(auth(people[0]!.student))
      .send({ name: `Team ${Math.floor(Math.random() * 90000)}` })
      .expect(200);
    const teamId = made.body.team.id as string;
    const { joinCode } = await t.prisma.eventTeam.findUniqueOrThrow({ where: { id: teamId } });
    for (const [index, person] of people.entries()) {
      if (index > 0) {
        await t
          .http()
          .post(`/v1/events/${slug}/join`)
          .set(auth(person.student))
          .send({ code: joinCode })
          .expect(200);
      }
      await t
        .http()
        .post(`/v1/event-requests/${teamId}/decision`)
        .set(auth(person.parent.accessToken))
        .send({ childId: person.child.id, approve: true })
        .expect(200, { status: 'APPROVED' });
    }
    return { teamId, people };
  }

  it('students make and join teams once a parent approves; staff run the event to results', async () => {
    const event = await newEvent(2);
    const captain = await family(t);

    // Drafts are staff-only.
    expect(
      (await t.http().get('/v1/events').set(auth(captain.student)).expect(200)).body.some(
        (e: { slug: string }) => e.slug === event.slug,
      ),
    ).toBe(false);
    await t.http().get(`/v1/events/${event.slug}`).set(auth(captain.student)).expect(404);
    await step(event.id, 'RUNNING').expect(409);
    await step(event.id, 'OPEN').expect(200);

    const listed = await t.http().get('/v1/events').set(auth(captain.student)).expect(200);
    expect(listed.body.find((e: { slug: string }) => e.slug === event.slug)).toMatchObject({
      status: 'OPEN',
      canJoin: true,
      myTeam: null,
      teamSize: 2,
    });

    // Too young for this event.
    const young = await family(t);
    await t.prisma.studentProfile.update({
      where: { userId: young.child.id },
      data: { birthYear: new Date().getUTCFullYear() - 12 },
    });
    const refused = await t
      .http()
      .post(`/v1/events/${event.slug}/teams`)
      .set(auth(young.student))
      .send({ name: 'Tiny Coders' })
      .expect(403);
    expect(refused.body.error).toBe('TOO_YOUNG_FOR_EVENT');

    // Team names: letters, digits and spaces, and nothing the filter refuses.
    await t
      .http()
      .post(`/v1/events/${event.slug}/teams`)
      .set(auth(captain.student))
      .send({ name: 'visit www.example.com' })
      .expect(400);
    const blocked = await t
      .http()
      .post(`/v1/events/${event.slug}/teams`)
      .set(auth(captain.student))
      .send({ name: 'Stupid Team' })
      .expect(400);
    expect(blocked.body).toMatchObject({
      error: 'TEAM_NAME_BLOCKED',
      details: { reason: 'WORDS' },
    });

    const made = await t
      .http()
      .post(`/v1/events/${event.slug}/teams`)
      .set(auth(captain.student))
      .send({ name: 'Code Comets' })
      .expect(200);
    expect(made.body.team).toMatchObject({
      name: 'Code Comets',
      approved: false,
      joinCode: null,
      roomId: null,
      members: [{ isCaptain: true, status: 'PENDING', isMe: true }],
    });
    const teamId = made.body.team.id as string;

    // The captain's parent hears about it, and approves.
    expect(lastMailTo(t.mail, captain.parent.email)?.subject).toMatch(
      new RegExp(`^${captain.child.nickname} wants to join a team in Spring Jam`),
    );
    const requests = await t
      .http()
      .get('/v1/event-requests')
      .set(auth(captain.parent.accessToken))
      .expect(200);
    expect(requests.body).toMatchObject([
      {
        teamId,
        child: { id: captain.child.id },
        event: { slug: event.slug, title: 'Spring Jam' },
        team: { name: 'Code Comets', members: [] },
      },
    ]);
    const stranger = await family(t);
    await t
      .http()
      .post(`/v1/event-requests/${teamId}/decision`)
      .set(auth(stranger.parent.accessToken))
      .send({ childId: captain.child.id, approve: true })
      .expect(404);
    await t
      .http()
      .post(`/v1/event-requests/${teamId}/decision`)
      .set(auth(captain.parent.accessToken))
      .send({ childId: captain.child.id, approve: true })
      .expect(200, { status: 'APPROVED' });
    const approved = await t
      .http()
      .get(`/v1/events/${event.slug}`)
      .set(auth(captain.student))
      .expect(200);
    expect(approved.body).toMatchObject({ canJoin: false, myTeam: { id: teamId, approved: true } });
    const code = approved.body.team.joinCode as string;
    expect(code).toMatch(/^[2-9A-Z]{6}$/);
    expect(approved.body.team.roomId).toEqual(expect.any(String));
    const rooms = await t.http().get('/v1/rooms').set(auth(captain.student)).expect(200);
    expect(rooms.body.map((r: { kind: string }) => r.kind).toSorted()).toEqual(['EVENT', 'TEAM']);

    // A friend joins with the code; their parent says no, then yes.
    const friend = await family(t);
    await t
      .http()
      .post(`/v1/events/${event.slug}/join`)
      .set(auth(friend.student))
      .send({ code: code.toLowerCase() })
      .expect(200);
    await t
      .http()
      .post(`/v1/events/${event.slug}/join`)
      .set(auth(friend.student))
      .send({ code })
      .expect(409);
    await t
      .http()
      .post(`/v1/event-requests/${teamId}/decision`)
      .set(auth(friend.parent.accessToken))
      .send({ childId: friend.child.id, approve: false })
      .expect(200, { status: 'DECLINED' });
    expect((await t.http().get('/v1/events').set(auth(friend.student))).body[0].myTeam).toBeNull();
    await t
      .http()
      .post(`/v1/events/${event.slug}/join`)
      .set(auth(friend.student))
      .send({ code })
      .expect(200);
    // Full: two places, both taken (one waiting for a parent).
    const third = await family(t);
    const full = await t
      .http()
      .post(`/v1/events/${event.slug}/join`)
      .set(auth(third.student))
      .send({ code })
      .expect(409);
    expect(full.body.error).toBe('TEAM_FULL');
    await t
      .http()
      .post(`/v1/event-requests/${teamId}/decision`)
      .set(auth(friend.parent.accessToken))
      .send({ childId: friend.child.id, approve: true })
      .expect(200);
    const note = await t.prisma.notification.findFirstOrThrow({
      where: { userId: friend.child.id, type: 'event_joined' },
    });
    expect(note.data).toMatchObject({ slug: event.slug, team: 'Code Comets' });

    // Staff: a mentor for the team, judges for the event.
    const mentor = await readyMentor();
    const unready = await webTwoFactorLogin(t, 'mentor');
    await t
      .http()
      .put(`/v1/admin/events/teams/${teamId}/mentor`)
      .set(auth(admin))
      .send({ mentorId: unready.user.id })
      .expect(400);
    await t
      .http()
      .put(`/v1/admin/events/teams/${teamId}/mentor`)
      .set(auth(admin))
      .send({ mentorId: mentor.user.id })
      .expect(200);
    await t
      .http()
      .put(`/v1/admin/events/${event.id}/judges`)
      .set(auth(admin))
      .send({ judgeIds: [mentor.user.id] })
      .expect(200);
    const mentoring = await t.http().get('/v1/mentor/events').set(auth(mentor.token)).expect(200);
    expect(mentoring.body.teams).toEqual([
      expect.objectContaining({ id: teamId, name: 'Code Comets', roomId: expect.any(String) }),
    ]);
    expect(mentoring.body.judging).toEqual([
      expect.objectContaining({ slug: event.slug, status: 'OPEN' }),
    ]);
    const mentorRooms = await t.http().get('/v1/rooms').set(auth(mentor.token)).expect(200);
    expect(mentorRooms.body).toEqual([expect.objectContaining({ kind: 'TEAM', canType: true })]);
    // Moderators read events; only admins change them.
    const moderator = await staffLogin(t, 'moderator');
    await t.http().get(`/v1/admin/events/${event.id}`).set(auth(moderator.token)).expect(200);
    await step(event.id, 'RUNNING').set(auth(moderator.token)).expect(403);

    // Running: the team hands its work in (no git server needed for that).
    await step(event.id, 'RUNNING').expect(200);
    await t
      .http()
      .put(`/v1/teams/${teamId}/submission`)
      .set(auth(third.student))
      .send({ title: 'Club page', description: 'A page for our chess club.' })
      .expect(404);
    await t
      .http()
      .put(`/v1/teams/${teamId}/submission`)
      .set(auth(friend.student))
      .send({ title: 'Club page', description: 'A page for our chess club, with a timetable.' })
      .expect(200);
    await step(event.id, 'JUDGING').expect(200);
    await t
      .http()
      .put(`/v1/teams/${teamId}/submission`)
      .set(auth(friend.student))
      .send({ title: 'Too late', description: 'After the end: not accepted.' })
      .expect(409);

    // Judging.
    const judging = await t
      .http()
      .get(`/v1/mentor/judging/${event.slug}`)
      .set(auth(mentor.token))
      .expect(200);
    expect(judging.body).toMatchObject({
      status: 'JUDGING',
      rubric: [{ key: 'idea' }, { key: 'code' }, { key: 'design' }, { key: 'teamwork' }],
      teams: [{ id: teamId, submission: { title: 'Club page' }, myScores: null }],
    });
    await t
      .http()
      .put(`/v1/mentor/judging/teams/${teamId}/score`)
      .set(auth(mentor.token))
      .send({ scores: { idea: 9, code: 3, design: 4, teamwork: 5 } })
      .expect(400);
    await t
      .http()
      .put(`/v1/mentor/judging/teams/${teamId}/score`)
      .set(auth(mentor.token))
      .send({ scores: { idea: 5, code: 3, design: 4, teamwork: 5 }, comment: 'Lovely idea' })
      .expect(204);
    await t.http().get(`/v1/mentor/judging/${event.slug}`).set(auth(unready.token)).expect(404);

    // Results.
    await step(event.id, 'FINISHED').expect(200);
    const done = await t
      .http()
      .get(`/v1/events/${event.slug}`)
      .set(auth(captain.student))
      .expect(200);
    expect(done.body.results).toEqual([
      {
        rank: 1,
        team: 'Code Comets',
        score: 17,
        members: [
          { nickname: captain.child.nickname, avatarKey: expect.any(String) },
          { nickname: friend.child.nickname, avatarKey: expect.any(String) },
        ],
      },
    ]);
    expect(
      (
        await t.prisma.notification.findFirstOrThrow({
          where: { userId: captain.child.id, type: 'event_results' },
        })
      ).data,
    ).toMatchObject({ rank: 1 });
    const closed = await t.http().get('/v1/rooms').set(auth(captain.student)).expect(200);
    expect(closed.body.every((r: { archived: boolean }) => r.archived)).toBe(true);
    const log = await t.prisma.auditLog.findMany({
      where: { entityId: event.id },
      orderBy: { createdAt: 'asc' },
    });
    expect(log.map((l) => l.action)).toEqual([
      'event.create',
      'event.status',
      'event.judges',
      'event.status',
      'event.status',
      'event.status',
    ]);
  });

  it('takes a mentor whose check failed off their teams and the events they judge', async () => {
    const event = await newEvent(2);
    await step(event.id, 'OPEN').expect(200);
    const { teamId } = await team(event.slug, 1);
    const mentor = await readyMentor();
    await t
      .http()
      .put(`/v1/admin/events/teams/${teamId}/mentor`)
      .set(auth(admin))
      .send({ mentorId: mentor.user.id })
      .expect(200);
    await t
      .http()
      .put(`/v1/admin/events/${event.id}/judges`)
      .set(auth(admin))
      .send({ judgeIds: [mentor.user.id] })
      .expect(200);
    const before = await t.http().get('/v1/mentor/events').set(auth(mentor.token)).expect(200);
    expect(before.body.teams.map((x: { id: string }) => x.id)).toContain(teamId);

    await t
      .http()
      .patch(`/v1/admin/mentors/${mentor.user.id}`)
      .set(auth(admin))
      .send({ backgroundCheck: 'FAILED', reason: 'Check came back with a problem' })
      .expect(204);
    const after = await t.http().get('/v1/mentor/events').set(auth(mentor.token)).expect(200);
    expect(after.body).toEqual({ teams: [], judging: [] });
    const saved = await t.prisma.eventTeam.findUniqueOrThrow({ where: { id: teamId } });
    expect(saved.mentorId).toBeNull();
    expect(await t.prisma.eventJudge.count({ where: { userId: mentor.user.id } })).toBe(0);
    await t.http().get(`/v1/teams/${teamId}/pulls`).set(auth(mentor.token)).expect(404);
  });

  it('checks git lessons on the server by replaying the steps', async () => {
    const { student } = await family(t);
    const setup = await t.prisma.challenge.findUnique({ where: { id: 'pro-m01-l01-c1' } });
    if (!setup) return; // Content not imported in this database.
    const submit = (steps: object[], results: boolean) =>
      t
        .http()
        .post('/v1/learning/challenges/pro-m01-l01-c1/submissions')
        .set(auth(student))
        .send({
          code: { git: JSON.stringify(steps) },
          results: ['initialized', 'first-commit', 'clean'].map((id) => ({ id, passed: results })),
        })
        .expect(201);
    // Claiming every check passed without doing it doesn't count.
    const forged = await submit([{ run: 'git init' }], true);
    expect(forged.body.passed).toBe(false);
    const real = await submit(
      [{ run: 'git init' }, { run: 'git add .' }, { run: 'git commit -m "Add my page"' }],
      true,
    );
    expect(real.body.passed).toBe(true);
  });

  describe.skipIf(!GIT)('team repositories (Forgejo)', () => {
    // Async: git talks to this same process, which must keep serving meanwhile.
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

    it('members clone, push their branch, open a pull request, and merge once a teammate approves', async () => {
      const event = await newEvent(3);
      await step(event.id, 'OPEN').expect(200);
      const { teamId, people } = await team(event.slug, 2);
      const [a, b] = people as [
        Awaited<ReturnType<typeof family>>,
        Awaited<ReturnType<typeof family>>,
      ];
      await step(event.id, 'RUNNING').expect(200);

      const outsider = await family(t);
      await t.http().get(`/v1/teams/${teamId}/workspace`).set(auth(outsider.student)).expect(404);
      const space = await t
        .http()
        .get(`/v1/teams/${teamId}/workspace`)
        .set(auth(a.student))
        .expect(200);
      expect(space.body).toMatchObject({
        teamId,
        canPush: true,
        author: { name: a.child.nickname, email: expect.stringMatching(/@noreply\.kcp\.invalid$/) },
      });
      const branch = space.body.branch as string;

      const dir = mkdtempSync(path.join(tmpdir(), 'kcp-git-'));
      try {
        const remote = `${url}/v1/git/teams/${teamId}`;
        await git(dir, a.student, 'clone', '-q', remote, 'repo');
        const repo = path.join(dir, 'repo');
        expect(readFileSync(path.join(repo, 'index.html'), 'utf8')).toContain(
          '<h1>Our project</h1>',
        );
        // Someone else's token can't read it.
        await expect(git(dir, outsider.student, 'clone', '-q', remote, 'nope')).rejects.toThrow();

        writeFileSync(path.join(repo, 'index.html'), '<h1>Chess club</h1>\n');
        await git(repo, a.student, 'commit', '-qam', 'Name the page');
        await expect(git(repo, a.student, 'push', '-q', 'origin', 'HEAD:main')).rejects.toThrow(
          /403|main changes/,
        );
        await git(repo, a.student, 'push', '-q', 'origin', `HEAD:${branch}`);

        const opened = await t
          .http()
          .post(`/v1/teams/${teamId}/pulls`)
          .set(auth(a.student))
          .send({ branch, title: 'Name the page', body: 'Our club is chess.' })
          .expect(200);
        expect(opened.body).toMatchObject({
          title: 'Name the page',
          state: 'open',
          author: { isMe: true },
        });
        const number = opened.body.number as number;
        await t
          .http()
          .post(`/v1/teams/${teamId}/pulls`)
          .set(auth(a.student))
          .send({ branch, title: 'Again' })
          .expect(409);

        const seen = await t
          .http()
          .get(`/v1/teams/${teamId}/pulls/${number}`)
          .set(auth(b.student))
          .expect(200);
        expect(seen.body).toMatchObject({
          author: { name: a.child.nickname, isMe: false },
          canReview: true,
          canMerge: false,
          mergeBlocked: 'APPROVAL_NEEDED',
        });
        expect(seen.body.diff).toContain('+<h1>Chess club</h1>');

        // Not before a teammate approves; nobody approves their own.
        const early = await t
          .http()
          .post(`/v1/teams/${teamId}/pulls/${number}/merge`)
          .set(auth(a.student))
          .expect(409);
        expect(early.body.error).toBe('APPROVAL_NEEDED');
        await t
          .http()
          .post(`/v1/teams/${teamId}/pulls/${number}/reviews`)
          .set(auth(a.student))
          .send({ event: 'APPROVED' })
          .expect(409);
        await t
          .http()
          .post(`/v1/teams/${teamId}/pulls/${number}/comments`)
          .set(auth(b.student))
          .send({ body: 'call me on 0300 1234567' })
          .expect(400);
        await t
          .http()
          .post(`/v1/teams/${teamId}/pulls/${number}/comments`)
          .set(auth(b.student))
          .send({ body: 'Nice title!' })
          .expect(204);
        // A teammate can't push to someone else's branch.
        await git(dir, b.student, 'clone', '-q', remote, 'other');
        const other = path.join(dir, 'other');
        writeFileSync(path.join(other, 'index.html'), '<h1>Not yours</h1>\n');
        await git(other, b.student, 'commit', '-qam', 'Sneaky');
        await expect(
          git(other, b.student, 'push', '-q', '--force', 'origin', `HEAD:${branch}`),
        ).rejects.toThrow(/403|own branch/);
        await t
          .http()
          .post(`/v1/teams/${teamId}/pulls/${number}/reviews`)
          .set(auth(b.student))
          .send({ event: 'APPROVED', body: 'Ship it' })
          .expect(204);
        // New commits after the approval need a new one.
        writeFileSync(path.join(repo, 'style.css'), 'h1 { color: teal; }\n');
        await git(repo, a.student, 'commit', '-qam', 'Colour');
        await git(repo, a.student, 'push', '-q', 'origin', `HEAD:${branch}`);
        const stale = await t
          .http()
          .get(`/v1/teams/${teamId}/pulls/${number}`)
          .set(auth(a.student))
          .expect(200);
        expect(stale.body).toMatchObject({ canMerge: false, mergeBlocked: 'APPROVAL_NEEDED' });
        await t
          .http()
          .post(`/v1/teams/${teamId}/pulls/${number}/reviews`)
          .set(auth(b.student))
          .send({ event: 'APPROVED', body: 'Still good' })
          .expect(204);
        const ready = await t
          .http()
          .get(`/v1/teams/${teamId}/pulls/${number}`)
          .set(auth(a.student))
          .expect(200);
        expect(ready.body).toMatchObject({ canMerge: true, mergeBlocked: null });
        expect(ready.body.comments).toEqual([expect.objectContaining({ body: 'Nice title!' })]);
        expect(ready.body.reviews).toContainEqual(
          expect.objectContaining({
            state: 'APPROVED',
            body: 'Still good',
            author: expect.objectContaining({ name: b.child.nickname }),
          }),
        );
        await t
          .http()
          .post(`/v1/teams/${teamId}/pulls/${number}/merge`)
          .set(auth(a.student))
          .expect(204);
        const list = await t
          .http()
          .get(`/v1/teams/${teamId}/pulls`)
          .set(auth(b.student))
          .expect(200);
        expect(list.body).toEqual([expect.objectContaining({ number, state: 'merged' })]);

        // Handing in takes main as it is now; judges preview those files.
        const handed = await t
          .http()
          .put(`/v1/teams/${teamId}/submission`)
          .set(auth(b.student))
          .send({ title: 'Chess club', description: 'A page for our chess club.' })
          .expect(200);
        expect(handed.body.commit).toMatch(/^[0-9a-f]{40}$/);
        const files = await t
          .http()
          .get(`/v1/teams/${teamId}/files`)
          .set(auth(a.student))
          .expect(200);
        expect(files.body).toMatchObject({
          ref: handed.body.commit,
          files: { 'index.html': '<h1>Chess club</h1>\n', 'style.css': expect.any(String) },
        });
        await step(event.id, 'JUDGING').expect(409); // no judges yet
        const judge = await readyMentor();
        await t
          .http()
          .put(`/v1/admin/events/${event.id}/judges`)
          .set(auth(admin))
          .send({ judgeIds: [judge.user.id] })
          .expect(200);
        await step(event.id, 'JUDGING').expect(200);
        await t.http().get(`/v1/teams/${teamId}/files`).set(auth(judge.token)).expect(200);
        // The event isn't running any more: read-only.
        await expect(
          git(repo, a.student, 'push', '-q', 'origin', `HEAD:${branch}-2`),
        ).rejects.toThrow();
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });
  });
});
