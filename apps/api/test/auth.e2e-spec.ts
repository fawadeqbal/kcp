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
  tokenFrom,
  uniqueEmail,
} from './helpers.js';

describe('auth (e2e)', () => {
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

  const signUp = (email: string, overrides: Record<string, unknown> = {}) =>
    t
      .http()
      .post('/v1/auth/parents/sign-up')
      .send({
        email,
        password: PASSWORD,
        displayName: 'Amina',
        languageCode: 'ur',
        countryCode: 'PK',
        acceptTerms: true,
        ...overrides,
      });

  describe('parent sign-up and email verification', () => {
    it('signs up, sends a confirmation email in the parent’s language, and verifies', async () => {
      const email = uniqueEmail();
      const res = await signUp(email).expect(202);
      expect(res.body).toEqual({ status: 'accepted' });

      const user = await t.prisma.user.findUniqueOrThrow({
        where: { email },
        include: { role: true },
      });
      expect(user.status).toBe('PENDING_VERIFICATION');
      expect(user.role.key).toBe('parent');
      expect(user.termsVersion).toBeTruthy();
      expect(user.passwordHash).toMatch(/^\$argon2id\$/);

      const mail = lastMailTo(t.mail, email);
      expect(mail?.template).toBe('verifyEmail');
      expect(mail?.language).toBe('ur');
      expect(mail?.params.actionUrl).toMatch(/\/ur\/verify-email\?token=/);

      // Can't log in before confirming.
      const early = await t
        .http()
        .post('/v1/auth/login')
        .send({ email, password: PASSWORD })
        .expect(403);
      expect(early.body.error).toBe('EMAIL_NOT_VERIFIED');

      const token = tokenFrom(mail);
      await t.http().post('/v1/auth/email/verify').send({ token }).expect(200);
      const verified = await t.prisma.user.findUniqueOrThrow({ where: { email } });
      expect(verified.status).toBe('ACTIVE');
      expect(verified.emailVerifiedAt).toBeInstanceOf(Date);

      // Links work once.
      const again = await t.http().post('/v1/auth/email/verify').send({ token }).expect(400);
      expect(again.body.error).toBe('INVALID_OR_EXPIRED_TOKEN');

      const audit = await t.prisma.auditLog.findFirst({
        where: { action: 'auth.sign_up', entityId: user.id },
      });
      expect(audit).not.toBeNull();
    });

    it('does not reveal whether an email is registered', async () => {
      const { email } = await signUpAndLogin(t);
      const before = t.mail.outbox.length;
      const res = await signUp(email).expect(202);
      expect(res.body).toEqual({ status: 'accepted' });
      // The owner gets an "you already have an account" email instead.
      expect(t.mail.outbox.length).toBe(before + 1);
      expect(lastMailTo(t.mail, email)?.template).toBe('accountExists');
    });

    it('rejects weak input with readable messages', async () => {
      const res = await signUp('not-an-email', { password: 'short', acceptTerms: false }).expect(
        400,
      );
      const messages = (res.body.message as string[]).join(' | ');
      expect(messages).toMatch(/email/);
      expect(messages).toMatch(/password/);
      expect(messages).toMatch(/terms/);
    });

    it('only accepts countries and languages the platform is open in', async () => {
      const res = await signUp(uniqueEmail(), { countryCode: 'AE' }).expect(400);
      expect(res.body.error).toBe('UNSUPPORTED_COUNTRY');
      const lang = await signUp(uniqueEmail(), { languageCode: 'fr' }).expect(400);
      expect(lang.body.error).toBe('UNSUPPORTED_LANGUAGE');
    });

    it('resends the confirmation email with a new link that replaces the old one', async () => {
      const email = uniqueEmail();
      await signUp(email).expect(202);
      const first = tokenFrom(lastMailTo(t.mail, email));
      await t.http().post('/v1/auth/email/resend').send({ email }).expect(202);
      const second = tokenFrom(lastMailTo(t.mail, email));
      expect(second).not.toBe(first);
      await t.http().post('/v1/auth/email/verify').send({ token: first }).expect(400);
      await t.http().post('/v1/auth/email/verify').send({ token: second }).expect(200);
    });
  });

  describe('login, refresh and logout', () => {
    it('logs in with a secure refresh cookie and returns the profile', async () => {
      const email = uniqueEmail();
      await signUp(email).expect(202);
      await t
        .http()
        .post('/v1/auth/email/verify')
        .send({ token: tokenFrom(lastMailTo(t.mail, email)) });

      const res = await t
        .http()
        .post('/v1/auth/login')
        .send({ email: ` ${email.toUpperCase()} `, password: PASSWORD })
        .expect(200);
      expect(res.body.status).toBe('authenticated');
      expect(res.body.accessToken).toBeTruthy();
      expect(res.body.refreshToken).toBeUndefined();
      expect(res.body.user).toMatchObject({ email, role: { key: 'parent' }, languageCode: 'ur' });

      const cookie = (res.headers['set-cookie'] as unknown as string[]).find((c) =>
        c.startsWith('kcp_refresh='),
      );
      expect(cookie).toMatch(/HttpOnly/);
      expect(cookie).toMatch(/SameSite=Strict/);
      expect(cookie).toMatch(/Path=\/v1\/auth/);

      const me = await t
        .http()
        .get('/v1/auth/me')
        .set('Authorization', `Bearer ${res.body.accessToken}`)
        .expect(200);
      expect(me.body.email).toBe(email);
      expect(me.body.rules.length).toBeGreaterThan(0);
    });

    it('gives the same answer for a wrong password and an unknown email', async () => {
      const { email } = await signUpAndLogin(t);
      const wrong = await t
        .http()
        .post('/v1/auth/login')
        .send({ email, password: 'wrong password!!' })
        .expect(401);
      const unknown = await t
        .http()
        .post('/v1/auth/login')
        .send({ email: uniqueEmail(), password: PASSWORD })
        .expect(401);
      expect(wrong.body.error).toBe('INVALID_CREDENTIALS');
      expect(unknown.body.error).toBe('INVALID_CREDENTIALS');
      expect(wrong.body.message).toBe(unknown.body.message);
    });

    it('rotates the refresh token and refuses the old one', async () => {
      const { cookie } = await signUpAndLogin(t);
      const refreshed = await t
        .http()
        .post('/v1/auth/refresh')
        .set('Cookie', cookie)
        .send({})
        .expect(200);
      expect(refreshed.body.accessToken).toBeTruthy();
      const newCookie = refreshCookie(refreshed.headers['set-cookie']);
      expect(newCookie).not.toBe(cookie);

      await t.http().post('/v1/auth/refresh').set('Cookie', cookie).send({}).expect(401);
      await t.http().post('/v1/auth/refresh').set('Cookie', newCookie).send({}).expect(200);
    });

    it('treats a reused old refresh token as theft and signs out every session', async () => {
      const { cookie, user, email } = await signUpAndLogin(t);
      const other = await t
        .http()
        .post('/v1/auth/login')
        .send({ email, password: PASSWORD, tokenDelivery: 'body' })
        .expect(200);
      const first = await t
        .http()
        .post('/v1/auth/refresh')
        .set('Cookie', cookie)
        .send({})
        .expect(200);
      // The rightful browser has moved on to a newer token since.
      const second = await t
        .http()
        .post('/v1/auth/refresh')
        .set('Cookie', refreshCookie(first.headers['set-cookie']))
        .send({})
        .expect(200);
      const liveAccess = second.body.accessToken as string;

      // Pretend the rotations happened a while ago (outside the tab-race grace period).
      await t.prisma.session.updateMany({
        where: { userId: user.id, replacedById: { not: null } },
        data: { revokedAt: new Date(Date.now() - 60_000) },
      });
      await t.http().post('/v1/auth/refresh').set('Cookie', cookie).send({}).expect(401);

      const open = await t.prisma.session.count({ where: { userId: user.id, revokedAt: null } });
      expect(open).toBe(0);
      await t.http().get('/v1/auth/me').set('Authorization', `Bearer ${liveAccess}`).expect(401);
      await t
        .http()
        .get('/v1/auth/me')
        .set('Authorization', `Bearer ${other.body.accessToken as string}`)
        .expect(401);
    });

    it('ends only that sign-in when a lost answer made a phone reuse its old token', async () => {
      const { user, email } = await signUpAndLogin(t);
      const phone = await t
        .http()
        .post('/v1/auth/login')
        .send({ email, password: PASSWORD, tokenDelivery: 'body' })
        .expect(200);
      // The server rotated the token, but the answer never reached the phone.
      const lost = await t
        .http()
        .post('/v1/auth/refresh')
        .send({ refreshToken: phone.body.refreshToken })
        .expect(200);
      await t.prisma.session.updateMany({
        where: { userId: user.id, replacedById: { not: null } },
        data: { revokedAt: new Date(Date.now() - 60_000) },
      });
      await t
        .http()
        .post('/v1/auth/refresh')
        .send({ refreshToken: phone.body.refreshToken })
        .expect(401);

      // The lost token is dead too; the browser session carries on.
      await t
        .http()
        .post('/v1/auth/refresh')
        .send({ refreshToken: lost.body.refreshToken })
        .expect(401);
      const open = await t.prisma.session.count({ where: { userId: user.id, revokedAt: null } });
      expect(open).toBe(1);
    });

    it('supports token delivery in the body for the mobile app', async () => {
      const { email } = await signUpAndLogin(t);
      const login = await t
        .http()
        .post('/v1/auth/login')
        .send({ email, password: PASSWORD, tokenDelivery: 'body' })
        .expect(200);
      expect(login.body.refreshToken).toBeTruthy();
      expect(login.headers['set-cookie']).toBeUndefined();
      const refreshed = await t
        .http()
        .post('/v1/auth/refresh')
        .send({ refreshToken: login.body.refreshToken })
        .expect(200);
      expect(refreshed.body.refreshToken).toBeTruthy();
    });

    it('logs out: the session ends and the access token stops working', async () => {
      const { cookie, accessToken } = await signUpAndLogin(t);
      await t.http().get('/v1/auth/me').set('Authorization', `Bearer ${accessToken}`).expect(200);
      const out = await t.http().post('/v1/auth/logout').set('Cookie', cookie).send({}).expect(204);
      expect(String(out.headers['set-cookie'])).toMatch(/kcp_refresh=;/);
      await t.http().post('/v1/auth/refresh').set('Cookie', cookie).send({}).expect(401);
      await t.http().get('/v1/auth/me').set('Authorization', `Bearer ${accessToken}`).expect(401);
    });

    it('refuses requests without or with a forged token', async () => {
      await t.http().get('/v1/auth/me').expect(401);
      await t.http().get('/v1/auth/me').set('Authorization', 'Bearer not.a.jwt').expect(401);
    });

    it('slows down password guessing', async () => {
      const { email } = await signUpAndLogin(t);
      for (let i = 0; i < 10; i++) {
        await t
          .http()
          .post('/v1/auth/login')
          .send({ email, password: 'wrong password!!' })
          .expect(401);
      }
      const blocked = await t
        .http()
        .post('/v1/auth/login')
        .send({ email, password: PASSWORD })
        .expect(429);
      expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
    });
  });

  describe('password reset', () => {
    it('resets the password with the emailed link and signs out old sessions', async () => {
      const { email, accessToken } = await signUpAndLogin(t);
      await t.http().post('/v1/auth/password/forgot').send({ email }).expect(202);
      const mail = lastMailTo(t.mail, email);
      expect(mail?.template).toBe('resetPassword');

      const newPassword = 'a brand new password 456';
      await t
        .http()
        .post('/v1/auth/password/reset')
        .send({ token: tokenFrom(mail), password: newPassword })
        .expect(200);

      await t.http().get('/v1/auth/me').set('Authorization', `Bearer ${accessToken}`).expect(401);
      await t.http().post('/v1/auth/login').send({ email, password: PASSWORD }).expect(401);
      await t.http().post('/v1/auth/login').send({ email, password: newPassword }).expect(200);
    });

    it('answers the same for unknown emails and sends nothing', async () => {
      const email = uniqueEmail();
      const before = t.mail.outbox.length;
      const res = await t.http().post('/v1/auth/password/forgot').send({ email }).expect(202);
      expect(res.body).toEqual({ status: 'accepted' });
      expect(t.mail.outbox.length).toBe(before);
    });
  });

  describe('staff two-factor login', () => {
    it('makes staff set up an authenticator app, then asks for a code every time', async () => {
      const admin = await createUser(t.prisma, 'admin');

      const first = await t
        .http()
        .post('/v1/auth/login')
        .send({ email: admin.email, password: PASSWORD, app: 'admin' })
        .expect(200);
      expect(first.body.status).toBe('mfa_setup_required');
      expect(first.body.accessToken).toBeUndefined();
      expect(first.headers['set-cookie']).toBeUndefined();

      const setup = await t
        .http()
        .post('/v1/auth/mfa/setup')
        .send({ mfaToken: first.body.mfaToken })
        .expect(200);
      expect(setup.body.otpauthUrl).toMatch(/^otpauth:\/\/totp\//);
      const stored = await t.prisma.user.findUniqueOrThrow({ where: { id: admin.id } });
      expect(stored.totpSecret).not.toContain(setup.body.secret); // encrypted at rest

      const bad = await t
        .http()
        .post('/v1/auth/mfa/verify')
        .send({ mfaToken: first.body.mfaToken, code: '000000', app: 'admin' })
        .expect(401);
      expect(bad.body.error).toBe('INVALID_CODE');

      const now = Date.now();
      const code = totp(setup.body.secret, now);
      const done = await t
        .http()
        .post('/v1/auth/mfa/verify')
        .send({ mfaToken: first.body.mfaToken, code, app: 'admin' })
        .expect(200);
      expect(done.body.status).toBe('authenticated');
      expect(done.body.user.twoFactorEnabled).toBe(true);

      // Next time: a code is required, and the same code can't be used twice.
      const second = await t
        .http()
        .post('/v1/auth/login')
        .send({ email: admin.email, password: PASSWORD, app: 'admin' })
        .expect(200);
      expect(second.body.status).toBe('mfa_required');
      await t
        .http()
        .post('/v1/auth/mfa/verify')
        .send({ mfaToken: second.body.mfaToken, code, app: 'admin' })
        .expect(401);
      const nextCode = totp(setup.body.secret, now + 30_000);
      await t
        .http()
        .post('/v1/auth/mfa/verify')
        .send({ mfaToken: second.body.mfaToken, code: nextCode, app: 'admin' })
        .expect(200);

      const actions = await t.prisma.auditLog.findMany({
        where: { entityId: admin.id },
        select: { action: true },
      });
      expect(actions.map((a) => a.action)).toEqual(
        expect.arrayContaining(['auth.mfa_enabled', 'auth.staff_login']),
      );
    });

    it('sends staff to the admin panel, and mentors and teachers through two-factor on the web', async () => {
      const admin = await createUser(t.prisma, 'admin');
      const refused = await t
        .http()
        .post('/v1/auth/login')
        .send({ email: admin.email, password: PASSWORD, app: 'web' })
        .expect(403);
      expect(refused.body.error).toBe('STAFF_ACCOUNT');

      for (const role of ['mentor', 'teacher']) {
        const adult = await createUser(t.prisma, role);
        const first = await t
          .http()
          .post('/v1/auth/login')
          .send({ email: adult.email, password: PASSWORD, app: 'web' })
          .expect(200);
        expect(first.body.status).toBe('mfa_setup_required');
        const setup = await t
          .http()
          .post('/v1/auth/mfa/setup')
          .send({ mfaToken: first.body.mfaToken })
          .expect(200);
        // Not in the admin panel…
        const inAdmin = await t
          .http()
          .post('/v1/auth/mfa/verify')
          .send({ mfaToken: first.body.mfaToken, code: totp(setup.body.secret), app: 'admin' })
          .expect(403);
        expect(inAdmin.body.error).toBe('NOT_STAFF');
        // …but in the web app, with the web cookie.
        const done = await t
          .http()
          .post('/v1/auth/mfa/verify')
          .send({ mfaToken: first.body.mfaToken, code: totp(setup.body.secret), app: 'web' })
          .expect(200);
        expect(done.body.user.role.key).toBe(role);
        expect(String(done.headers['set-cookie'])).toContain('kcp_refresh=');
        // The app is for families only.
        await t
          .http()
          .post('/v1/auth/login')
          .send({ email: adult.email, password: PASSWORD, app: 'mobile' })
          .expect(403);
      }
    });

    it('refuses an expired or forged two-factor token', async () => {
      const res = await t
        .http()
        .post('/v1/auth/mfa/verify')
        .send({ mfaToken: 'x'.repeat(40), code: '123456' })
        .expect(401);
      expect(res.body.error).toBe('MFA_EXPIRED');
    });
  });
});
