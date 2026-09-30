import { STUDENT_USERNAME_PATTERN } from '@kcp/shared';
import { FeatureFlagsService } from '../src/feature-flags/feature-flags.service.js';
import {
  CHILD_PASSWORD,
  childBody,
  createTestApp,
  resetRateLimits,
  signUpAndLogin,
  staffLogin,
  type TestContext,
} from './helpers.js';

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

describe('child accounts and consent (e2e)', () => {
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

  const createChild = async (token: string, overrides = {}) =>
    (await t.http().post('/v1/children').set(auth(token)).send(childBody(overrides)).expect(201))
      .body;

  const studentLogin = (username: string, password = CHILD_PASSWORD) =>
    t.http().post('/v1/auth/students/login').send({ username, password });

  it('a parent creates two children with different consent settings, and both can log in', async () => {
    const parent = await signUpAndLogin(t);
    const [first, second] = [
      await createChild(parent.accessToken, {
        nickname: 'SwiftFalcon27',
        consents: { publicLeaderboards: true, publicPortfolio: false },
      }),
      await createChild(parent.accessToken, {
        nickname: 'PixelWizard',
        avatarKey: 'robot',
        consents: { publicLeaderboards: false, publicPortfolio: true },
      }),
    ];
    expect(first.username).toMatch(STUDENT_USERNAME_PATTERN);
    expect(first.consents).toEqual({ publicLeaderboards: true, publicPortfolio: false });
    expect(second.consents).toEqual({ publicLeaderboards: false, publicPortfolio: true });

    const list = await t.http().get('/v1/children').set(auth(parent.accessToken)).expect(200);
    expect(list.body.map((c: { nickname: string }) => c.nickname)).toEqual([
      'SwiftFalcon27',
      'PixelWizard',
    ]);

    // Every consent is on record, with the policy version and method.
    const records = await t.prisma.consentRecord.findMany({ where: { childId: first.id } });
    expect(records.map((r) => r.type).toSorted()).toEqual(['ACCOUNT', 'PUBLIC_LEADERBOARDS']);
    expect(
      records.every(
        (r) => r.parentId === parent.user.id && r.policyVersion && r.revokedAt === null,
      ),
    ).toBe(true);

    for (const child of [first, second]) {
      const login = await studentLogin(child.username).expect(200);
      expect(login.body.user.role.key).toBe('student');
      expect(login.body.user.email).toBeNull();
      expect(login.body.user.student).toEqual({
        nickname: child.nickname,
        avatarKey: child.avatarKey,
      });
    }

    const audits = await t.prisma.auditLog.count({
      where: { action: 'child.create', actorId: parent.user.id },
    });
    expect(audits).toBe(2);
  });

  it('keeps every family separate', async () => {
    const parent = await signUpAndLogin(t);
    const other = await signUpAndLogin(t);
    const child = await createChild(parent.accessToken);

    const otherList = await t.http().get('/v1/children').set(auth(other.accessToken)).expect(200);
    expect(otherList.body).toEqual([]);
    await t.http().get(`/v1/children/${child.id}`).set(auth(other.accessToken)).expect(404);
    await t
      .http()
      .put(`/v1/children/${child.id}/consents`)
      .set(auth(other.accessToken))
      .send({ publicLeaderboards: true, publicPortfolio: true })
      .expect(404);
    await t
      .http()
      .delete(`/v1/children/${child.id}`)
      .set(auth(other.accessToken))
      .send({ nickname: child.nickname })
      .expect(404);

    // Children can't manage accounts at all.
    const kid = await studentLogin(child.username).expect(200);
    await t.http().get('/v1/children').set(auth(kid.body.accessToken)).expect(403);
    await t
      .http()
      .post('/v1/children')
      .set(auth(kid.body.accessToken))
      .send(childBody())
      .expect(403);
  });

  it('keeps the family routes for the child’s own parent, even from super admins', async () => {
    const parent = await signUpAndLogin(t);
    const child = await createChild(parent.accessToken);
    for (const role of ['super_admin', 'admin', 'moderator']) {
      const staff = await staffLogin(t, role);
      const as = auth(staff.token);
      await t.http().get(`/v1/children/${child.id}`).set(as).expect(404);
      await t.http().get(`/v1/children/${child.id}/consents`).set(as).expect(404);
      if (role === 'super_admin') {
        // Allowed by "manage all", but consent can only come from the child's parent.
        await t
          .http()
          .put(`/v1/children/${child.id}/consents`)
          .set(as)
          .send({ publicLeaderboards: true, publicPortfolio: true })
          .expect(404);
        await t
          .http()
          .post(`/v1/children/${child.id}/password`)
          .set(as)
          .send({ password: 'staff chose this' })
          .expect(404);
        await t
          .http()
          .delete(`/v1/children/${child.id}`)
          .set(as)
          .send({ nickname: child.nickname })
          .expect(404);
        const created = await t.http().post('/v1/children').set(as).send(childBody()).expect(403);
        expect(created.body.error).toBe('PARENTS_ONLY');
      }
    }
    const records = await t.prisma.consentRecord.count({ where: { childId: child.id } });
    expect(records).toBe(1); // only the parent's account consent
  });

  it('never leaves a child public without an active consent, even with quick toggles', async () => {
    const parent = await signUpAndLogin(t);
    const child = await createChild(parent.accessToken);
    const put = (on: boolean) =>
      t
        .http()
        .put(`/v1/children/${child.id}/consents`)
        .set(auth(parent.accessToken))
        .send({ publicLeaderboards: on, publicPortfolio: false });

    for (let round = 0; round < 5; round++) {
      await Promise.all([put(true), put(false), put(true)]);
      const [profile, active] = await Promise.all([
        t.prisma.studentProfile.findUniqueOrThrow({ where: { userId: child.id } }),
        t.prisma.consentRecord.count({
          where: { childId: child.id, type: 'PUBLIC_LEADERBOARDS', revokedAt: null },
        }),
      ]);
      expect(active).toBe(profile.showOnPublicBoards ? 1 : 0);
    }
  });

  it('refuses nicknames that could identify a child', async () => {
    const parent = await signUpAndLogin(t);
    const realName = await t
      .http()
      .post('/v1/children')
      .set(auth(parent.accessToken))
      .send(childBody({ nickname: 'Ayesha2012' }))
      .expect(400);
    expect(realName.body.error).toBe('NICKNAME_LOOKS_LIKE_REAL_NAME');

    // The parent's own name ("Test Parent") can't be used either.
    const family = await t
      .http()
      .post('/v1/children')
      .set(auth(parent.accessToken))
      .send(childBody({ nickname: 'ParentRocket' }))
      .expect(400);
    expect(family.body.error).toBe('NICKNAME_LOOKS_LIKE_REAL_NAME');

    const suggestions = await t
      .http()
      .get('/v1/children/nickname-suggestions')
      .set(auth(parent.accessToken))
      .expect(200);
    expect(suggestions.body.suggestions).toHaveLength(6);
    await createChild(parent.accessToken, { nickname: suggestions.body.suggestions[0] });
  });

  it('keeps under-13 accounts closed until the feature flag is switched on', async () => {
    const parent = await signUpAndLogin(t);
    const year = new Date().getUTCFullYear();
    const rules = await t
      .http()
      .get('/v1/children/rules')
      .set(auth(parent.accessToken))
      .expect(200);
    expect(rules.body.under13Open).toBe(false);
    expect(rules.body.birthYears).not.toContain(year - 11);

    const young = await t
      .http()
      .post('/v1/children')
      .set(auth(parent.accessToken))
      .send(childBody({ birthYear: year - 11 }))
      .expect(400);
    expect(young.body.error).toBe('BIRTH_YEAR_NOT_ALLOWED');

    const flags = t.app.get(FeatureFlagsService);
    await t.prisma.featureFlag.update({
      where: { key: 'under_13_accounts' },
      data: { enabled: true, countryCodes: [] },
    });
    flags.invalidate();
    try {
      await createChild(parent.accessToken, { birthYear: year - 11 });
    } finally {
      await t.prisma.featureFlag.update({
        where: { key: 'under_13_accounts' },
        data: { enabled: false },
      });
      flags.invalidate();
    }

    // Too old for the platform, flag or not.
    await t
      .http()
      .post('/v1/children')
      .set(auth(parent.accessToken))
      .send(childBody({ birthYear: year - 20 }))
      .expect(400);
  });

  it('checks that the region and city belong to the country', async () => {
    const parent = await signUpAndLogin(t);
    const egypt = await t.prisma.region.findFirstOrThrow({ where: { countryCode: 'EG' } });
    const res = await t
      .http()
      .post('/v1/children')
      .set(auth(parent.accessToken))
      .send({ ...childBody(), regionId: egypt.id })
      .expect(400);
    expect(res.body.error).toBe('INVALID_LOCATION');

    const punjab = await t.prisma.region.findFirstOrThrow({
      where: { countryCode: 'PK', slug: 'punjab' },
    });
    const lahore = await t.prisma.city.findFirstOrThrow({
      where: { regionId: punjab.id, slug: 'lahore' },
    });
    const ok = await t
      .http()
      .post('/v1/children')
      .set(auth(parent.accessToken))
      .send({ ...childBody(), regionId: punjab.id, cityId: lahore.id })
      .expect(201);
    expect(ok.body.cityId).toBe(lahore.id);
  });

  it('records every consent switch and keeps the history', async () => {
    const parent = await signUpAndLogin(t);
    const child = await createChild(parent.accessToken);

    const on = await t
      .http()
      .put(`/v1/children/${child.id}/consents`)
      .set(auth(parent.accessToken))
      .send({ publicLeaderboards: true, publicPortfolio: false })
      .expect(200);
    expect(on.body.consents.publicLeaderboards).toBe(true);

    await t
      .http()
      .put(`/v1/children/${child.id}/consents`)
      .set(auth(parent.accessToken))
      .send({ publicLeaderboards: false, publicPortfolio: false })
      .expect(200);

    const history = await t
      .http()
      .get(`/v1/children/${child.id}/consents`)
      .set(auth(parent.accessToken))
      .expect(200);
    const boards = history.body.filter((r: { type: string }) => r.type === 'PUBLIC_LEADERBOARDS');
    expect(boards).toHaveLength(1);
    expect(boards[0].revokedAt).not.toBeNull();

    const profile = await t.prisma.studentProfile.findUniqueOrThrow({
      where: { userId: child.id },
    });
    expect(profile.showOnPublicBoards).toBe(false);

    const audit = await t.prisma.auditLog.findMany({
      where: { action: 'child.consent_change', entityId: child.id },
      orderBy: { createdAt: 'asc' },
    });
    expect(audit.map((a) => a.after)).toEqual([
      { publicLeaderboards: true, publicPortfolio: false },
      { publicLeaderboards: false, publicPortfolio: false },
    ]);
  });

  it('lets a parent reset a child’s password, signing the child out', async () => {
    const parent = await signUpAndLogin(t);
    const child = await createChild(parent.accessToken);
    const session = await studentLogin(child.username).expect(200);

    await t
      .http()
      .post(`/v1/children/${child.id}/password`)
      .set(auth(parent.accessToken))
      .send({ password: 'new kid pass 7' })
      .expect(204);

    await t.http().get('/v1/auth/me').set(auth(session.body.accessToken)).expect(401);
    await studentLogin(child.username).expect(401);
    await studentLogin(child.username, 'new kid pass 7').expect(200);
  });

  it('deletes a child’s personal data but keeps consent evidence', async () => {
    const parent = await signUpAndLogin(t);
    const child = await createChild(parent.accessToken, {
      consents: { publicLeaderboards: true, publicPortfolio: true },
    });
    await studentLogin(child.username).expect(200);

    const wrong = await t
      .http()
      .delete(`/v1/children/${child.id}`)
      .set(auth(parent.accessToken))
      .send({ nickname: 'NotTheName' })
      .expect(400);
    expect(wrong.body.error).toBe('CONFIRMATION_MISMATCH');

    await t
      .http()
      .delete(`/v1/children/${child.id}`)
      .set(auth(parent.accessToken))
      .send({ nickname: child.nickname.toLowerCase() })
      .expect(204);

    const stored = await t.prisma.user.findUniqueOrThrow({
      where: { id: child.id },
      include: { studentProfile: true, parentLinks: true },
    });
    expect(stored.status).toBe('DELETED');
    expect(stored.studentProfile).toBeNull();
    expect(stored.parentLinks).toEqual([]);
    expect(stored.passwordHash).toBeNull();
    expect(stored.username).not.toBe(child.username);
    expect(stored.cityId).toBeNull();

    const consents = await t.prisma.consentRecord.findMany({ where: { childId: child.id } });
    expect(consents).toHaveLength(3);
    expect(consents.every((c) => c.revokedAt !== null)).toBe(true);

    const entry = await t.prisma.auditLog.findFirstOrThrow({
      where: { action: 'child.delete', entityId: child.id },
    });
    expect(JSON.stringify(entry)).not.toContain(child.nickname);

    await studentLogin(child.username).expect(401);
    const list = await t.http().get('/v1/children').set(auth(parent.accessToken)).expect(200);
    expect(list.body).toEqual([]);
    // Sessions (with the child's IP addresses and devices) are gone, not just ended.
    expect(await t.prisma.session.count({ where: { userId: child.id } })).toBe(0);
  });

  it('student login gives nothing away and slows down guessing', async () => {
    const unknown = await studentLogin('brave-otter-1234', 'whatever').expect(401);
    expect(unknown.body.error).toBe('INVALID_CREDENTIALS');
    const parent = await signUpAndLogin(t);
    const child = await createChild(parent.accessToken);
    for (let i = 0; i < 10; i++) {
      await studentLogin(child.username, 'wrong guess').expect(401);
    }
    await studentLogin(child.username).expect(429);
  });

  it('keeps children out of the admin app', async () => {
    const parent = await signUpAndLogin(t);
    const child = await createChild(parent.accessToken);
    const refused = await t
      .http()
      .post('/v1/auth/students/login')
      .send({ username: child.username, password: CHILD_PASSWORD, app: 'admin' })
      .expect(403);
    expect(refused.body.error).toBe('NOT_STAFF');
    expect(refused.headers['set-cookie']).toBeUndefined();
  });
});
