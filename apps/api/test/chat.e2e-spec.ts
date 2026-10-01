import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { CHAT_RETENTION_DAYS } from '@kcp/shared';
import { io, type Socket } from 'socket.io-client';
import { ChatService } from '../src/chat/chat.service.js';
import {
  createTestApp,
  resetRateLimits,
  staffLogin,
  type TestContext,
  webTwoFactorLogin,
} from './helpers.js';
import { auth, family } from './learning-fixture.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const thisYear = new Date().getUTCFullYear();

/** The next event of this kind on a socket. */
const next = <T>(socket: Socket, event: string) =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`no ${event}`)), 5000);
    socket.once(event, (data: T) => {
      clearTimeout(timer);
      resolve(data);
    });
  });

describe('rooms and moderation (e2e)', () => {
  let t: TestContext;
  let chat: ChatService;
  let url: string;
  const sockets: Socket[] = [];

  beforeAll(async () => {
    t = await createTestApp();
    await t.app.listen(0, '127.0.0.1');
    url = `http://127.0.0.1:${(t.app.getHttpServer().address() as AddressInfo).port}`;
    chat = t.app.get(ChatService);
  });

  beforeEach(async () => {
    await resetRateLimits(t.redis);
  });

  afterAll(async () => {
    for (const socket of sockets) socket.disconnect();
    await t.app.close();
  });

  /** A socket for the rooms, resolved with what the server said first. */
  function connect(token: string): Promise<{ socket: Socket; first: string; rooms: string[] }> {
    const socket = io(`${url}/chat`, {
      path: '/socket.io',
      auth: { token },
      transports: ['websocket'],
      reconnection: false,
    });
    sockets.push(socket);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('no answer')), 5000);
      socket.on('ready', (data: { rooms: string[] }) => {
        clearTimeout(timer);
        resolve({ socket, first: 'ready', rooms: data.rooms });
      });
      socket.on('refused', () => {
        clearTimeout(timer);
        resolve({ socket, first: 'refused', rooms: [] });
      });
    });
  }

  /** A team room with a younger student, an older one and a mentor. */
  async function team() {
    const young = await family(t);
    const older = await family(t);
    // The younger one is 11 this year (phrases only); the older one is 14.
    await t.prisma.studentProfile.update({
      where: { userId: young.child.id },
      data: { birthYear: thisYear - 11 },
    });
    const mentor = await webTwoFactorLogin(t, 'mentor');
    const room = await chat.createRoom('TEAM', randomUUID(), 'Team Rocket', [
      { userId: young.child.id },
      { userId: older.child.id },
      { userId: mentor.user.id, role: 'ADULT' },
    ]);
    return { young, older, mentor, room };
  }

  const send = (token: string, roomId: string, body: object) =>
    t.http().post(`/v1/rooms/${roomId}/messages`).set(auth(token)).send(body);

  it('lets members send phrases, older students type filtered text, and nobody else in', async () => {
    const { young, older, mentor, room } = await team();

    const rooms = await t.http().get('/v1/rooms').set(auth(young.student)).expect(200);
    expect(rooms.body).toEqual([
      expect.objectContaining({
        id: room.id,
        kind: 'TEAM',
        name: 'Team Rocket',
        unread: 0,
        canType: false,
        mutedUntil: null,
        archived: false,
      }),
    ]);
    // Under 13: phrases only.
    const typing = await send(young.student, room.id, { text: 'hi everyone' }).expect(403);
    expect(typing.body).toMatchObject({ error: 'PHRASES_ONLY' });
    await send(young.student, room.id, { phrase: 'not-a-phrase' }).expect(400);
    await send(young.student, room.id, {}).expect(400);
    await send(young.student, room.id, { phrase: 'hello', text: 'hi' }).expect(400);
    const hello = await send(young.student, room.id, { phrase: 'hello' }).expect(201);
    expect(hello.body).toMatchObject({
      roomId: room.id,
      kind: 'PHRASE',
      phraseKey: 'hello',
      text: null,
      hidden: false,
      author: { id: young.child.id, name: young.child.nickname, isAdult: false },
    });

    // 13 and older type text, which is filtered first.
    const theirs = await t.http().get('/v1/rooms').set(auth(older.student)).expect(200);
    expect(theirs.body[0]).toMatchObject({ unread: 1, canType: true });
    for (const [text, reason] of [
      ['call me on 0300 1234567', 'PHONE'],
      ['look at example.com/page', 'LINK'],
      ['my email is kid@example.com', 'EMAIL'],
      ['add me on whats app', 'CONTACT'],
      ['you are stup1d', 'WORDS'],
    ] as const) {
      const refused = await send(older.student, room.id, { text }).expect(400);
      expect(refused.body).toMatchObject({ error: 'MESSAGE_BLOCKED', details: { reason } });
    }
    await resetRateLimits(t.redis);
    const typed = await send(older.student, room.id, { text: '  Let us build the page  ' }).expect(
      201,
    );
    expect(typed.body).toMatchObject({ kind: 'TEXT', text: 'Let us build the page' });
    // Sending marks the room read for the sender.
    expect((await t.http().get('/v1/rooms').set(auth(older.student))).body[0].unread).toBe(0);
    // The mentor (an adult) writes too.
    const tip = await send(mentor.token, room.id, { text: 'Start with the heading.' }).expect(201);
    expect(tip.body.author).toMatchObject({ isAdult: true, avatarKey: null });

    const list = await t
      .http()
      .get(`/v1/rooms/${room.id}/messages`)
      .set(auth(young.student))
      .expect(200);
    expect(list.body.messages.map((m: { id: string }) => m.id)).toEqual([
      hello.body.id,
      typed.body.id,
      tip.body.id,
    ]);
    expect(list.body).toMatchObject({ hasMore: false, room: { unread: 2 } });
    await t.http().post(`/v1/rooms/${room.id}/read`).set(auth(young.student)).expect(204);
    expect((await t.http().get('/v1/rooms').set(auth(young.student))).body[0].unread).toBe(0);
    // Paging back.
    const older2 = await t
      .http()
      .get(`/v1/rooms/${room.id}/messages?before=${encodeURIComponent(typed.body.createdAt)}`)
      .set(auth(young.student))
      .expect(200);
    expect(older2.body.messages.map((m: { id: string }) => m.id)).toEqual([hello.body.id]);

    // Not a member: the room doesn't exist for them.
    const outsider = await family(t);
    expect((await t.http().get('/v1/rooms').set(auth(outsider.student))).body).toEqual([]);
    await t.http().get(`/v1/rooms/${room.id}/messages`).set(auth(outsider.student)).expect(404);
    await send(outsider.student, room.id, { phrase: 'hello' }).expect(404);

    // Parents read their child's rooms, and never write.
    const parentRooms = await t
      .http()
      .get(`/v1/children/${young.child.id}/rooms`)
      .set(auth(young.parent.accessToken))
      .expect(200);
    expect(parentRooms.body).toMatchObject([{ id: room.id, canType: false }]);
    const parentView = await t
      .http()
      .get(`/v1/children/${young.child.id}/rooms/${room.id}/messages`)
      .set(auth(young.parent.accessToken))
      .expect(200);
    expect(parentView.body.messages).toHaveLength(3);
    await send(young.parent.accessToken, room.id, { phrase: 'hello' }).expect(403);
    await t
      .http()
      .get(`/v1/children/${young.child.id}/rooms`)
      .set(auth(outsider.parent.accessToken))
      .expect(404);
    await t
      .http()
      .get(`/v1/children/${outsider.child.id}/rooms/${room.id}/messages`)
      .set(auth(outsider.parent.accessToken))
      .expect(404);

    // Too many at once.
    await resetRateLimits(t.redis);
    for (let i = 0; i < 5; i++) await send(older.student, room.id, { phrase: 'yes' }).expect(201);
    const slow = await send(older.student, room.id, { phrase: 'yes' }).expect(429);
    expect(slow.body.error).toBe('TOO_MANY_MESSAGES');

    // A closed room stays readable.
    await chat.archive(room.id);
    await resetRateLimits(t.redis);
    await send(older.student, room.id, { phrase: 'see-you' }).expect(409);
    expect((await t.http().get('/v1/rooms').set(auth(older.student))).body[0]).toMatchObject({
      archived: true,
      canType: false,
    });
  });

  it('delivers messages live to members only', async () => {
    const { young, older, room } = await team();
    const outsider = await family(t);

    const refused = await connect('not a token');
    expect(refused.first).toBe('refused');
    const mine = await connect(young.student);
    expect(mine.rooms).toEqual([room.id]);
    const theirs = await connect(outsider.student);
    expect(theirs.rooms).toEqual([]);

    const reached: string[] = [];
    theirs.socket.on('message', (m: { roomId: string }) => reached.push(m.roomId));
    const arriving = next<{ id: string; text: string }>(mine.socket, 'message');
    const sent = await send(older.student, room.id, { text: 'Ready when you are' }).expect(201);
    expect(await arriving).toMatchObject({ id: sent.body.id, text: 'Ready when you are' });

    // Joining a room later: open connections follow.
    const later = await chat.createRoom('EVENT', randomUUID(), 'Spring jam', [
      { userId: outsider.child.id },
      { userId: young.child.id },
    ]);
    const inLater = next<{ roomId: string }>(theirs.socket, 'message');
    await send(young.student, later.id, { phrase: 'lets-go' }).expect(201);
    expect(await inLater).toMatchObject({ roomId: later.id });
    // Nothing from the team room they're not in.
    expect(reached).toEqual([later.id]);
    await chat.removeMember(later.id, outsider.child.id);
    await send(outsider.student, later.id, { phrase: 'hello' }).expect(404);
  });

  it('takes reports to the moderators, who warn, mute, hide and dismiss', async () => {
    const { young, older, room } = await team();
    const moderator = await staffLogin(t, 'moderator');
    const admin = await staffLogin(t, 'admin');
    const bad = await send(older.student, room.id, { text: 'Nobody wants you on the team' }).expect(
      201,
    );
    const watching = await connect(young.student);

    // Reports: a message, again (one report), a member, and never oneself.
    const report = await t
      .http()
      .post(`/v1/rooms/${room.id}/reports`)
      .set(auth(young.student))
      .send({ messageId: bad.body.id, reason: 'UNKIND' })
      .expect(201);
    const again = await t
      .http()
      .post(`/v1/rooms/${room.id}/reports`)
      .set(auth(young.student))
      .send({ messageId: bad.body.id, reason: 'UNKIND' })
      .expect(201);
    expect(again.body.id).toBe(report.body.id);
    await t
      .http()
      .post(`/v1/rooms/${room.id}/reports`)
      .set(auth(older.student))
      .send({ messageId: bad.body.id, reason: 'UNKIND' })
      .expect(400);
    await t
      .http()
      .post(`/v1/rooms/${room.id}/reports`)
      .set(auth(young.student))
      .send({ reason: 'SPAM' })
      .expect(400);
    const member = await t
      .http()
      .post(`/v1/rooms/${room.id}/reports`)
      .set(auth(older.student))
      .send({ userId: young.child.id, reason: 'SPAM' })
      .expect(201);

    // The queue: students and parents can't see it.
    await t.http().get('/v1/admin/moderation/reports').set(auth(young.student)).expect(403);
    await t
      .http()
      .get('/v1/admin/moderation/reports')
      .set(auth(young.parent.accessToken))
      .expect(403);
    const queue = await t
      .http()
      .get('/v1/admin/moderation/reports')
      .set(auth(moderator.token))
      .expect(200);
    const item = queue.body.reports.find((r: { id: string }) => r.id === report.body.id);
    expect(item).toMatchObject({
      reason: 'UNKIND',
      status: 'OPEN',
      room: { id: room.id, name: 'Team Rocket', kind: 'TEAM' },
      reporter: { id: young.child.id, isAdult: false },
      subject: {
        id: older.child.id,
        username: older.child.username,
        status: 'ACTIVE',
        mutedUntil: null,
        openReports: 1,
        pastActions: 0,
      },
      snapshot: 'Nobody wants you on the team',
      message: { id: bad.body.id, hidden: false },
      actions: [],
    });
    expect(item.context.map((m: { id: string }) => m.id)).toContain(bad.body.id);
    expect(queue.body.open).toBeGreaterThanOrEqual(2);

    // Mute for a day and remove the message.
    await t
      .http()
      .post(`/v1/admin/moderation/reports/${report.body.id}/actions`)
      .set(auth(moderator.token))
      .send({ kind: 'MUTE', reason: 'Unkind to a teammate' })
      .expect(400);
    const hiding = next<{ roomId: string; messageId: string }>(watching.socket, 'hidden');
    const done = await t
      .http()
      .post(`/v1/admin/moderation/reports/${report.body.id}/actions`)
      .set(auth(moderator.token))
      .send({ kind: 'MUTE', hours: 24, hideMessage: true, reason: 'Unkind to a teammate' })
      .expect(200);
    expect(done.body).toMatchObject({
      status: 'RESOLVED',
      message: { hidden: true, text: null },
      actions: [
        { kind: 'MUTE', reason: 'Unkind to a teammate' },
        { kind: 'HIDE', reason: 'Unkind to a teammate' },
      ],
    });
    expect(await hiding).toEqual({ roomId: room.id, messageId: bad.body.id });
    const mutedUntil = new Date(done.body.actions[0].until).getTime();
    expect(mutedUntil - Date.now()).toBeGreaterThan(23 * 60 * 60 * 1000);
    await t
      .http()
      .post(`/v1/admin/moderation/reports/${report.body.id}/actions`)
      .set(auth(moderator.token))
      .send({ kind: 'DISMISS', reason: 'Again' })
      .expect(409);

    // The student is muted everywhere; the message shows as removed.
    const muted = await send(older.student, room.id, { phrase: 'hello' }).expect(403);
    expect(muted.body).toMatchObject({
      error: 'CHAT_MUTED',
      details: { mutedUntil: expect.any(String) },
    });
    expect((await t.http().get('/v1/rooms').set(auth(older.student))).body[0].mutedUntil).not.toBe(
      null,
    );
    const view = await t
      .http()
      .get(`/v1/rooms/${room.id}/messages`)
      .set(auth(young.student))
      .expect(200);
    expect(view.body.messages.find((m: { id: string }) => m.id === bad.body.id)).toMatchObject({
      hidden: true,
      text: null,
    });
    // Who heard about it.
    const types = async (userId: string) =>
      (await t.prisma.notification.findMany({ where: { userId } })).map((n) => n.type);
    expect(await types(older.child.id)).toContain('chat_muted');
    expect(await types(older.parent.user.id)).toContain('child_chat_action');
    expect(await types(young.child.id)).toContain('chat_report_done');
    const audit = await t.prisma.auditLog.findFirstOrThrow({
      where: { action: 'moderation.mute', entityId: report.body.id },
    });
    expect(audit.actorId).toBe(moderator.user.id);

    // Their history, and ending the mute early.
    const history = await t
      .http()
      .get(`/v1/admin/moderation/students/${older.child.id}`)
      .set(auth(moderator.token))
      .expect(200);
    expect(history.body).toMatchObject({ openReports: 0 });
    expect(history.body.actions.map((a: { kind: string }) => a.kind).toSorted()).toEqual([
      'HIDE',
      'MUTE',
    ]);
    await t
      .http()
      .post(`/v1/admin/moderation/students/${older.child.id}/unmute`)
      .set(auth(moderator.token))
      .expect(204);
    await send(older.student, room.id, { phrase: 'hello' }).expect(201);

    // A report about a member: dismissed. Staff read any room for context.
    await t
      .http()
      .post(`/v1/admin/moderation/reports/${member.body.id}/actions`)
      .set(auth(moderator.token))
      .send({ kind: 'HIDE', reason: 'Nothing to hide' })
      .expect(400);
    await t
      .http()
      .post(`/v1/admin/moderation/reports/${member.body.id}/actions`)
      .set(auth(moderator.token))
      .send({ kind: 'DISMISS', reason: 'Nothing wrong' })
      .expect(200);
    expect(await types(young.child.id)).not.toContain('chat_warning');
    const staffView = await t
      .http()
      .get(`/v1/admin/rooms/${room.id}/messages`)
      .set(auth(moderator.token))
      .expect(200);
    expect(staffView.body.room).toMatchObject({ name: 'Team Rocket', canType: false });
    await t.http().get(`/v1/admin/rooms/${room.id}/messages`).set(auth(admin.token)).expect(200);

    // A warning, then a suspension (which signs them out).
    const second = await send(older.student, room.id, { text: 'Whatever' }).expect(201);
    const warnReport = await t
      .http()
      .post(`/v1/rooms/${room.id}/reports`)
      .set(auth(young.student))
      .send({ messageId: second.body.id, reason: 'OTHER' })
      .expect(201);
    await t
      .http()
      .post(`/v1/admin/moderation/reports/${warnReport.body.id}/actions`)
      .set(auth(moderator.token))
      .send({ kind: 'WARN', reason: 'Be kind' })
      .expect(200);
    expect(await types(older.child.id)).toContain('chat_warning');
    const third = await send(older.student, room.id, { phrase: 'no' }).expect(201);
    const last = await t
      .http()
      .post(`/v1/rooms/${room.id}/reports`)
      .set(auth(young.student))
      .send({ messageId: third.body.id, reason: 'SCARY' })
      .expect(201);
    await t
      .http()
      .post(`/v1/admin/moderation/reports/${last.body.id}/actions`)
      .set(auth(moderator.token))
      .send({ kind: 'SUSPEND', reason: 'Kept going after a warning' })
      .expect(200);
    expect((await t.prisma.user.findUniqueOrThrow({ where: { id: older.child.id } })).status).toBe(
      'SUSPENDED',
    );
    await t.http().get('/v1/rooms').set(auth(older.student)).expect(401);
  });

  it('lets admins add words to the filter (moderators only read the list)', async () => {
    const { older, room } = await team();
    const moderator = await staffLogin(t, 'moderator');
    const admin = await staffLogin(t, 'admin');
    // Letters only, none twice in a row (the filter reads digits as letters and
    // squeezes stretched letters).
    const word = `zorbl${[...'cdfgkmpqvwx']
      .toSorted(() => Math.random() - 0.5)
      .slice(0, 4)
      .join('')}`;

    await t
      .http()
      .post('/v1/admin/blocked-terms')
      .set(auth(moderator.token))
      .send({ term: word, language: 'any' })
      .expect(403);
    const created = await t
      .http()
      .post('/v1/admin/blocked-terms')
      .set(auth(admin.token))
      .send({ term: `  ${word.toUpperCase()} `, language: 'any' })
      .expect(201);
    expect(created.body).toMatchObject({ term: word, language: 'any' });
    await t
      .http()
      .post('/v1/admin/blocked-terms')
      .set(auth(admin.token))
      .send({ term: word, language: 'en' })
      .expect(409);
    const list = await t
      .http()
      .get('/v1/admin/blocked-terms')
      .set(auth(moderator.token))
      .expect(200);
    expect(list.body.map((r: { term: string }) => r.term)).toContain(word);
    const checked = await t
      .http()
      .post('/v1/admin/blocked-terms/check')
      .set(auth(moderator.token))
      .send({ text: `what a ${word}` })
      .expect(200);
    expect(checked.body).toEqual({ problem: 'WORDS' });

    const refused = await send(older.student, room.id, { text: `you ${word}` });
    expect(refused.body).toMatchObject({ error: 'MESSAGE_BLOCKED', details: { reason: 'WORDS' } });
    await t
      .http()
      .delete(`/v1/admin/blocked-terms/${created.body.id}`)
      .set(auth(admin.token))
      .expect(204);
    await send(older.student, room.id, { text: `you ${word}` }).expect(201);
  });

  it('deletes messages after the retention period', async () => {
    const { older, room } = await team();
    const old = await t.prisma.chatMessage.create({
      data: {
        roomId: room.id,
        authorId: older.child.id,
        kind: 'PHRASE',
        phraseKey: 'hello',
        createdAt: new Date(Date.now() - (CHAT_RETENTION_DAYS + 1) * DAY_MS),
      },
    });
    const recent = await send(older.student, room.id, { phrase: 'hello' }).expect(201);
    expect(await chat.deleteOld()).toBeGreaterThanOrEqual(1);
    expect(await t.prisma.chatMessage.findUnique({ where: { id: old.id } })).toBeNull();
    expect(await t.prisma.chatMessage.findUnique({ where: { id: recent.body.id } })).not.toBeNull();
  });
});
