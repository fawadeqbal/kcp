import { randomUUID } from 'node:crypto';
import { totp } from '../src/common/crypto/totp.js';
import {
  createTestApp,
  createUser,
  PASSWORD,
  resetRateLimits,
  signUpAndLogin,
  type TestContext,
} from './helpers.js';

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

/** Logs a staff member in through the full two-factor flow and returns an access token. */
async function staffToken(t: TestContext, roleKey: string) {
  const user = await createUser(t.prisma, roleKey);
  const login = await t
    .http()
    .post('/v1/auth/login')
    .send({ email: user.email, password: PASSWORD })
    .expect(200);
  const setup = await t
    .http()
    .post('/v1/auth/mfa/setup')
    .send({ mfaToken: login.body.mfaToken })
    .expect(200);
  const done = await t
    .http()
    .post('/v1/auth/mfa/verify')
    .send({ mfaToken: login.body.mfaToken, code: totp(setup.body.secret) })
    .expect(200);
  return { user, token: done.body.accessToken as string };
}

describe('users and permissions (e2e)', () => {
  let t: TestContext;

  beforeAll(async () => {
    t = await createTestApp();
  });

  beforeEach(async () => {
    await resetRateLimits(t.redis);
  });

  afterAll(async () => {
    await t.app.close();
  });

  it('lets staff list and search accounts, but not parents', async () => {
    const admin = await staffToken(t, 'admin');
    const parent = await signUpAndLogin(t);

    const list = await t
      .http()
      .get('/v1/users')
      .query({ search: parent.email })
      .set(auth(admin.token))
      .expect(200);
    expect(list.body.total).toBe(1);
    expect(list.body.items[0]).toMatchObject({ email: parent.email, role: { key: 'parent' } });

    await t.http().get('/v1/users').set(auth(parent.accessToken)).expect(403);
  });

  it('lets a parent see their own child and nobody else', async () => {
    const parent = await signUpAndLogin(t);
    const child = await createUser(t.prisma, 'student', { kind: 'STUDENT' });
    const otherChild = await createUser(t.prisma, 'student', { kind: 'STUDENT' });
    await t.prisma.parentChildLink.create({
      data: { parentId: parent.user.id, childId: child.id },
    });

    await t.http().get(`/v1/users/${parent.user.id}`).set(auth(parent.accessToken)).expect(200);
    await t.http().get(`/v1/users/${child.id}`).set(auth(parent.accessToken)).expect(200);
    // Other children look exactly like missing accounts.
    await t.http().get(`/v1/users/${otherChild.id}`).set(auth(parent.accessToken)).expect(404);
    await t.http().get(`/v1/users/${randomUUID()}`).set(auth(parent.accessToken)).expect(404);
  });

  it('suspends an account, signs it out at once, and records who did it and why', async () => {
    const admin = await staffToken(t, 'admin');
    const parent = await signUpAndLogin(t);

    const res = await t
      .http()
      .patch(`/v1/users/${parent.user.id}/status`)
      .set(auth(admin.token))
      .send({ status: 'SUSPENDED', reason: 'Reported by a school' })
      .expect(200);
    expect(res.body.status).toBe('SUSPENDED');

    await t.http().get('/v1/auth/me').set(auth(parent.accessToken)).expect(401);
    await t
      .http()
      .post('/v1/auth/login')
      .send({ email: parent.email, password: PASSWORD })
      .expect(403);

    const entry = await t.prisma.auditLog.findFirst({
      where: { action: 'user.suspend', entityId: parent.user.id },
    });
    expect(entry).toMatchObject({
      actorId: admin.user.id,
      actorRole: 'admin',
      before: { status: 'ACTIVE' },
      after: { status: 'SUSPENDED', reason: 'Reported by a school' },
    });
    expect(entry?.requestId).toBeTruthy();

    await t
      .http()
      .patch(`/v1/users/${parent.user.id}/status`)
      .set(auth(admin.token))
      .send({ status: 'ACTIVE', reason: 'Resolved' })
      .expect(200);
    await t
      .http()
      .post('/v1/auth/login')
      .send({ email: parent.email, password: PASSWORD })
      .expect(200);
  });

  it('keeps each role inside its limits', async () => {
    const admin = await staffToken(t, 'admin');
    const moderator = await staffToken(t, 'moderator');
    const superAdmin = await createUser(t.prisma, 'super_admin');
    const mentor = await createUser(t.prisma, 'mentor');
    const body = { status: 'SUSPENDED', reason: 'Testing limits' };

    // Admins can't touch super admins; moderators can't touch staff or mentors.
    await t
      .http()
      .patch(`/v1/users/${superAdmin.id}/status`)
      .set(auth(admin.token))
      .send(body)
      .expect(403);
    await t
      .http()
      .patch(`/v1/users/${admin.user.id}/status`)
      .set(auth(moderator.token))
      .send(body)
      .expect(403);
    await t
      .http()
      .patch(`/v1/users/${mentor.id}/status`)
      .set(auth(moderator.token))
      .send(body)
      .expect(403);
    // Nobody changes their own status.
    const self = await t
      .http()
      .patch(`/v1/users/${admin.user.id}/status`)
      .set(auth(admin.token))
      .send(body)
      .expect(400);
    expect(self.body.error).toBe('CANNOT_CHANGE_OWN_STATUS');
    // Parents can't suspend anyone. Accounts they can't see look like missing ones.
    const parent = await signUpAndLogin(t);
    await t
      .http()
      .patch(`/v1/users/${mentor.id}/status`)
      .set(auth(parent.accessToken))
      .send(body)
      .expect(404);
    await t
      .http()
      .patch(`/v1/users/${parent.user.id}/status`)
      .set(auth(parent.accessToken))
      .send(body)
      .expect(400);
  });

  it('validates input', async () => {
    const admin = await staffToken(t, 'admin');
    await t.http().get('/v1/users/not-a-uuid').set(auth(admin.token)).expect(400);
    await t.http().get('/v1/users').query({ pageSize: 1000 }).set(auth(admin.token)).expect(400);
    const parent = await signUpAndLogin(t);
    await t
      .http()
      .patch(`/v1/users/${parent.user.id}/status`)
      .set(auth(admin.token))
      .send({ status: 'DELETED', reason: 'x' })
      .expect(400);
  });
});
