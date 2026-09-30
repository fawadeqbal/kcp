import { TERMS_VERSION } from '@kcp/shared';
import { StripeGateway } from '../src/billing/stripe/stripe.gateway.js';
import { totp } from '../src/common/crypto/totp.js';
import {
  createTestApp,
  createUser,
  lastMailTo,
  PASSWORD,
  refreshCookie,
  resetRateLimits,
  signUpAndLogin,
  type TestContext,
  uniqueEmail,
} from './helpers.js';
import {
  auth,
  family,
  H1_CHECKS,
  hideLearningFixture,
  pass,
  seedLearningFixture,
} from './learning-fixture.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

describe('security hardening (e2e)', () => {
  let t: TestContext;

  beforeAll(async () => {
    t = await createTestApp();
    await seedLearningFixture(t.prisma);
  });

  beforeEach(async () => {
    await resetRateLimits(t.redis);
  });

  afterAll(async () => {
    await hideLearningFixture(t.prisma);
    await t.app.close();
  });

  /** A submission that says every check passed, whatever the code. */
  const submit = (token: string, html: string) =>
    t
      .http()
      .post('/v1/learning/challenges/e2e-m01-l01-c1/submissions')
      .set(auth(token))
      .send({ code: { html }, results: pass(H1_CHECKS) });

  describe('sessions', () => {
    it('end a fixed time after the password was typed, however often they refresh', async () => {
      const parent = await signUpAndLogin(t);
      const first = await t.prisma.session.findFirstOrThrow({
        where: { userId: parent.user.id, revokedAt: null },
      });
      expect(first.expiresAt.getTime() - first.authenticatedAt.getTime()).toBe(30 * DAY_MS);

      const refreshed = await t
        .http()
        .post('/v1/auth/refresh')
        .set('Cookie', parent.cookie)
        .send({})
        .expect(200);
      const second = await t.prisma.session.findFirstOrThrow({
        where: { userId: parent.user.id, revokedAt: null },
      });
      expect(second.id).not.toBe(first.id);
      expect(second.authenticatedAt).toEqual(first.authenticatedAt);
      expect(second.expiresAt).toEqual(first.expiresAt);

      // 30 days after logging in, refreshing no longer works: log in again. (Measured
      // from the login time, even if the session row says it ends later: a row from
      // before a shorter limit, or one the migration backfilled.)
      await t.prisma.session.update({
        where: { id: second.id },
        data: {
          authenticatedAt: new Date(Date.now() - 30 * DAY_MS),
          expiresAt: new Date(Date.now() + DAY_MS),
        },
      });
      await t
        .http()
        .post('/v1/auth/refresh')
        .set('Cookie', refreshCookie(refreshed.headers['set-cookie']))
        .send({})
        .expect(401);
    });

    it('never hands a cookie-held refresh token to a script', async () => {
      const parent = await signUpAndLogin(t);
      const res = await t
        .http()
        .post('/v1/auth/refresh')
        .set('Cookie', parent.cookie)
        .send({ tokenDelivery: 'body' })
        .expect(200);
      expect(res.body.refreshToken).toBeUndefined();
      expect(refreshCookie(res.headers['set-cookie'])).toMatch(/^kcp_refresh=/);
    });

    it('keeps staff signed in for 12 hours at most', async () => {
      const staff = await createUser(t.prisma, 'admin');
      const login = await t
        .http()
        .post('/v1/auth/login')
        .send({ email: staff.email, password: PASSWORD, app: 'admin' })
        .expect(200);
      const setup = await t
        .http()
        .post('/v1/auth/mfa/setup')
        .send({ mfaToken: login.body.mfaToken })
        .expect(200);
      await t
        .http()
        .post('/v1/auth/mfa/verify')
        .send({ mfaToken: login.body.mfaToken, code: totp(setup.body.secret), app: 'admin' })
        .expect(200);
      const session = await t.prisma.session.findFirstOrThrow({ where: { userId: staff.id } });
      expect(session.expiresAt.getTime() - session.authenticatedAt.getTime()).toBe(12 * HOUR_MS);

      // The setup token can't replace the authenticator now that it's enrolled.
      const again = await t
        .http()
        .post('/v1/auth/mfa/setup')
        .send({ mfaToken: login.body.mfaToken })
        .expect(400);
      expect(again.body.error).toBe('MFA_ALREADY_ENABLED');
    });
  });

  it('pauses two-factor login for an account after 10 wrong codes, whatever the IP', async () => {
    const staff = await createUser(t.prisma, 'moderator');
    const start = async () =>
      (
        await t
          .http()
          .post('/v1/auth/login')
          .send({ email: staff.email, password: PASSWORD, app: 'admin' })
          .expect(200)
      ).body.mfaToken as string;
    const setupToken = await start();
    const setup = await t
      .http()
      .post('/v1/auth/mfa/setup')
      .send({ mfaToken: setupToken })
      .expect(200);
    const secret = setup.body.secret as string;
    await t
      .http()
      .post('/v1/auth/mfa/verify')
      .send({ mfaToken: setupToken, code: totp(secret), app: 'admin' })
      .expect(200);

    const wrong = totp(secret, Date.now() + 10 * 60_000);
    for (let i = 0; i < 10; i++) {
      // A fresh login (and rate-limit window) each time, as an attacker would.
      await resetRateLimits(t.redis);
      const mfaToken = await start();
      await t
        .http()
        .post('/v1/auth/mfa/verify')
        .send({ mfaToken, code: wrong, app: 'admin' })
        .expect(401);
    }
    await resetRateLimits(t.redis);
    const lastToken = await start();
    const locked = await t
      .http()
      .post('/v1/auth/mfa/verify')
      .send({ mfaToken: lastToken, code: totp(secret, Date.now() + 30_000), app: 'admin' })
      .expect(429);
    expect(locked.body.error).toBe('TOO_MANY_ATTEMPTS');
    const logged = await t.prisma.auditLog.findFirst({
      where: { action: 'auth.mfa_locked', entityId: staff.id },
    });
    expect(logged).not.toBeNull();
  });

  describe('passwords', () => {
    it('refuses common passwords when one is set', async () => {
      const res = await t
        .http()
        .post('/v1/auth/parents/sign-up')
        .send({
          email: uniqueEmail(),
          password: 'Password2026!',
          displayName: 'Test Parent',
          languageCode: 'en',
          countryCode: 'PK',
          acceptTerms: true,
        })
        .expect(400);
      expect(res.body.error).toBe('PASSWORD_TOO_WEAK');
      // Too short for an adult (12 characters).
      await t
        .http()
        .post('/v1/auth/parents/sign-up')
        .send({
          email: uniqueEmail(),
          password: 'purple tig 7',
          displayName: 'Test Parent',
          languageCode: 'en',
          countryCode: 'PK',
          acceptTerms: true,
        })
        .expect(202); // exactly 12 characters is enough
    });

    it('lets an adult change their password: other devices are signed out, email sent', async () => {
      const parent = await signUpAndLogin(t);
      const otherDevice = await t
        .http()
        .post('/v1/auth/login')
        .send({ email: parent.email, password: PASSWORD, tokenDelivery: 'body' })
        .expect(200);
      expect(otherDevice.body.refreshToken).toEqual(expect.any(String));
      const change = (body: object) =>
        t.http().post('/v1/auth/password/change').set(auth(parent.accessToken)).send(body);
      expect(
        (
          await change({
            currentPassword: 'wrong password 000',
            newPassword: 'blue whale swims 42',
          })
        ).body.error,
      ).toBe('WRONG_PASSWORD');
      expect(
        (await change({ currentPassword: PASSWORD, newPassword: 'qwertyuiop1234' })).body.error,
      ).toBe('PASSWORD_TOO_WEAK');
      await change({ currentPassword: PASSWORD, newPassword: 'blue whale swims 42' }).expect(204);

      expect(lastMailTo(t.mail, parent.email)?.template).toBe('passwordChanged');
      // This device goes on; the other one is signed out.
      await t.http().get('/v1/auth/me').set(auth(parent.accessToken)).expect(200);
      await t
        .http()
        .post('/v1/auth/refresh')
        .send({ refreshToken: otherDevice.body.refreshToken })
        .expect(401);
      await t
        .http()
        .post('/v1/auth/login')
        .send({ email: parent.email, password: 'blue whale swims 42' })
        .expect(200);
      // Students can't: their parent changes it.
      const { student } = await family(t);
      await t
        .http()
        .post('/v1/auth/password/change')
        .set(auth(student))
        .send({ currentPassword: 'kid pass 42', newPassword: 'blue whale swims 42' })
        .expect(403);
    });
  });

  it('asks parents to accept new terms, once, for the current version only', async () => {
    const parent = await signUpAndLogin(t);
    const me = async () =>
      (await t.http().get('/v1/auth/me').set(auth(parent.accessToken)).expect(200)).body as {
        mustAcceptTerms: boolean;
      };
    expect((await me()).mustAcceptTerms).toBe(false);
    await t.prisma.user.update({
      where: { id: parent.user.id },
      data: { termsVersion: '2020-01' },
    });
    expect((await me()).mustAcceptTerms).toBe(true);
    const old = await t
      .http()
      .post('/v1/auth/terms/accept')
      .set(auth(parent.accessToken))
      .send({ version: '2020-01' })
      .expect(400);
    expect(old.body.error).toBe('TERMS_VERSION_OUTDATED');
    await t
      .http()
      .post('/v1/auth/terms/accept')
      .set(auth(parent.accessToken))
      .send({ version: TERMS_VERSION })
      .expect(204);
    expect((await me()).mustAcceptTerms).toBe(false);
    const log = await t.prisma.auditLog.findFirstOrThrow({
      where: { action: 'auth.terms_accepted', entityId: parent.user.id },
    });
    expect(log.after).toEqual({ termsVersion: TERMS_VERSION });
  });

  it('never lets answers about accounts be cached, and still lets reference data be', async () => {
    const parent = await signUpAndLogin(t);
    const me = await t.http().get('/v1/auth/me').set(auth(parent.accessToken)).expect(200);
    expect(me.headers['cache-control']).toBe('no-store');
    const countries = await t.http().get('/v1/countries').expect(200);
    expect(countries.headers['cache-control']).toBe('public, max-age=300');
    // JSON only: a form post (which another site could send) is not read.
    await t
      .http()
      .post('/v1/auth/login')
      .type('form')
      .send({ email: parent.email, password: PASSWORD })
      .expect(400);
  });

  describe('challenges', () => {
    it('confirms HTML and CSS checks on the server: a pass typed by hand does not count', async () => {
      const { student } = await family(t);
      const forged = await submit(student, '<p>No heading here</p>').expect(201);
      expect(forged.body.passed).toBe(false);
      expect(forged.body.results).toContainEqual({ id: 'has-h1', passed: false });
      expect(forged.body.xpAwarded).toBe(0);
      // The starter (empty) can't pass either.
      expect((await submit(student, '').expect(201)).body.passed).toBe(false);
      // Real work passes.
      const real = await submit(student, '<h1>Hello, I am here</h1>').expect(201);
      expect(real.body.passed).toBe(true);
      expect(real.body.xpAwarded).toBeGreaterThan(0);
    });
  });

  describe('payments', () => {
    it('closes an earlier checkout page when a new one opens, and keeps no personal data', async () => {
      const { parent, child } = await family(t);
      await t.prisma.studentProfile.update({
        where: { userId: child.id },
        data: { trialEndsAt: new Date(Date.now() - 1000) },
      });
      const open = async () =>
        new URL(
          (
            await t
              .http()
              .post('/v1/billing/checkout')
              .set(auth(parent.accessToken))
              .send({ planKey: 'monthly', locale: 'en' })
              .expect(200)
          ).body.url as string,
        ).pathname
          .split('/')
          .at(-1)!;
      const first = await open();
      const second = await open();
      const mock = t.app.get(StripeGateway).mock!;
      expect((await mock.session(first)).status).toBe('expired');
      expect((await mock.session(second)).status).toBe('open');

      await t.http().post(`/v1/payments/mock-stripe/checkout/${second}/pay`).expect(303);
      for (let i = 0; i < 100; i++) {
        if (await t.prisma.paymentEvent.count({ where: { parentId: parent.user.id } })) break;
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      const events = await t.prisma.paymentEvent.findMany({
        where: { parentId: parent.user.id },
      });
      expect(events.length).toBeGreaterThan(0);
      expect(JSON.stringify(events.map((e) => e.payload))).not.toContain(parent.email);
    });
  });
});
