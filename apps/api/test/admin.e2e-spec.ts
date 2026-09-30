import {
  childBody,
  createTestApp,
  createUser,
  PASSWORD,
  resetRateLimits,
  signUpAndLogin,
  staffLogin as adminLogin,
  type TestContext,
} from './helpers.js';

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

describe('admin panel API (e2e)', () => {
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

  it('keeps the admin app for staff, with its own refresh cookie', async () => {
    const parent = await signUpAndLogin(t);
    const refused = await t
      .http()
      .post('/v1/auth/login')
      .send({ email: parent.email, password: PASSWORD, app: 'admin' })
      .expect(403);
    expect(refused.body.error).toBe('NOT_STAFF');

    const admin = await adminLogin(t, 'admin');
    const cookie = admin.setCookie.find((c) => c.startsWith('kcp_admin_refresh='));
    expect(cookie).toMatch(/HttpOnly/);
    expect(admin.setCookie.some((c) => c.startsWith('kcp_refresh='))).toBe(false);

    const refreshed = await t
      .http()
      .post('/v1/auth/refresh')
      .set('Cookie', cookie!.split(';')[0]!)
      .send({ app: 'admin' })
      .expect(200);
    expect(refreshed.body.user.role.key).toBe('admin');
    // The web app's cookie name is untouched by the admin session.
    await t
      .http()
      .post('/v1/auth/refresh')
      .set('Cookie', cookie!.split(';')[0]!)
      .send({})
      .expect(401);
  });

  it('shows the overview, consent records, audit log, roles and families', async () => {
    const admin = await adminLogin(t, 'admin');
    const parent = await signUpAndLogin(t);
    const child = (
      await t
        .http()
        .post('/v1/children')
        .set(auth(parent.accessToken))
        .send(childBody({ consents: { publicLeaderboards: true, publicPortfolio: false } }))
        .expect(201)
    ).body;

    const overview = await t.http().get('/v1/admin/overview').set(auth(admin.token)).expect(200);
    expect(overview.body.parents.active).toBeGreaterThan(0);
    expect(overview.body.students.active).toBeGreaterThan(0);
    expect(overview.body.recentActivity.length).toBeGreaterThan(0);

    const consents = await t
      .http()
      .get('/v1/admin/consents')
      .query({ search: parent.email })
      .set(auth(admin.token))
      .expect(200);
    expect(consents.body.total).toBe(2);
    expect(consents.body.items[0]).toMatchObject({
      parent: { email: parent.email },
      child: { username: child.username, displayName: child.nickname },
    });

    const audit = await t
      .http()
      .get('/v1/admin/audit-logs')
      .query({ action: 'child.', actorId: parent.user.id })
      .set(auth(admin.token))
      .expect(200);
    expect(audit.body.items[0]).toMatchObject({
      action: 'child.create',
      entityId: child.id,
      actor: { id: parent.user.id, email: parent.email, role: 'parent' },
    });

    const roles = await t.http().get('/v1/admin/roles').set(auth(admin.token)).expect(200);
    expect(roles.body.map((r: { key: string }) => r.key)).toContain('parent');

    const family = await t
      .http()
      .get(`/v1/admin/users/${parent.user.id}/family`)
      .set(auth(admin.token))
      .expect(200);
    expect(family.body.children).toEqual([
      expect.objectContaining({
        id: child.id,
        username: child.username,
        displayName: child.nickname,
      }),
    ]);
  });

  it('signs an account out everywhere and records it', async () => {
    const admin = await adminLogin(t, 'admin');
    const parent = await signUpAndLogin(t);
    await t
      .http()
      .post(`/v1/users/${parent.user.id}/sessions/revoke`)
      .set(auth(admin.token))
      .expect(204);
    await t.http().get('/v1/auth/me').set(auth(parent.accessToken)).expect(401);
    const entry = await t.prisma.auditLog.findFirst({
      where: { action: 'user.sign_out_everywhere', entityId: parent.user.id },
    });
    expect(entry?.actorId).toBe(admin.user.id);
  });

  it('limits moderators and parents', async () => {
    const moderator = await adminLogin(t, 'moderator');
    const otherAdmin = await createUser(t.prisma, 'admin');
    await t.http().get('/v1/admin/consents').set(auth(moderator.token)).expect(403);
    await t.http().get('/v1/admin/audit-logs').set(auth(moderator.token)).expect(403);
    // Moderators see the numbers, but not the audit trail inside the overview.
    const overview = await t
      .http()
      .get('/v1/admin/overview')
      .set(auth(moderator.token))
      .expect(200);
    expect(overview.body.recentActivity).toEqual([]);
    await t
      .http()
      .post(`/v1/users/${otherAdmin.id}/sessions/revoke`)
      .set(auth(moderator.token))
      .expect(403);

    const parent = await signUpAndLogin(t);
    for (const path of [
      '/v1/admin/overview',
      '/v1/admin/consents',
      '/v1/admin/audit-logs',
      '/v1/admin/roles',
    ]) {
      await t.http().get(path).set(auth(parent.accessToken)).expect(403);
    }
  });
});
