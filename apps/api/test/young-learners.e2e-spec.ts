import { PICTURE_MAX_FAILURES } from '@kcp/shared';
import { FeatureFlagsService } from '../src/feature-flags/feature-flags.service.js';
import { ParentalConsentJobs } from '../src/parental-consent/parental-consent-jobs.service.js';
import { StripeGateway } from '../src/billing/stripe/stripe.gateway.js';
import {
  CHILD_PASSWORD,
  childBody,
  createTestApp,
  lastMailTo,
  resetRateLimits,
  signUpAndLogin,
  staffLogin,
  type TestContext,
  tokenFrom,
} from './helpers.js';
import { auth } from './learning-fixture.js';

/** A tiny valid PNG (1×1). */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);
const DAY = 24 * 60 * 60 * 1000;

describe('Younger children: verified parental consent, picture passwords, pairing (e2e)', () => {
  let t: TestContext;
  const year = new Date().getUTCFullYear();

  beforeAll(async () => {
    t = await createTestApp();
    await t.prisma.featureFlag.update({
      where: { key: 'under_13_accounts' },
      data: { enabled: true, countryCodes: [] },
    });
    await t.prisma.country.update({
      where: { code: 'PK' },
      data: { under13ConsentMethods: ['CARD_CHECK', 'SIGNED_FORM', 'EMAIL_PLUS'] },
    });
    t.app.get(FeatureFlagsService).invalidate();
  });

  afterAll(async () => {
    await t.prisma.featureFlag.update({
      where: { key: 'under_13_accounts' },
      data: { enabled: false },
    });
    await t.prisma.country.update({ where: { code: 'PK' }, data: { under13ConsentMethods: [] } });
    await t.app.close();
  });

  beforeEach(async () => {
    await resetRateLimits(t.redis);
  });

  /** A parent with a 10-year-old waiting for consent. */
  async function youngFamily(
    overrides: { consents?: { publicLeaderboards: boolean; publicPortfolio: boolean } } = {},
  ) {
    const parent = await signUpAndLogin(t);
    const created = await t
      .http()
      .post('/v1/children')
      .set(auth(parent.accessToken))
      .send(childBody({ birthYear: year - 10, ...overrides }))
      .expect(201);
    return { parent, child: created.body as { id: string; username: string; nickname: string } };
  }

  const studentLogin = (username: string) =>
    t.http().post('/v1/auth/students/login').send({ username, password: CHILD_PASSWORD });

  it('keeps an under-13 account closed, and private, until the parent confirms by email', async () => {
    const { parent, child } = await youngFamily({
      consents: { publicLeaderboards: true, publicPortfolio: true },
    });
    const created = await t.prisma.user.findUniqueOrThrow({
      where: { id: child.id },
      include: { studentProfile: true },
    });
    // Stricter defaults: nothing public, whatever the form said, and no consent recorded yet.
    expect(created.status).toBe('PENDING_CONSENT');
    expect(created.studentProfile).toMatchObject({
      showOnPublicBoards: false,
      publicPortfolio: false,
    });
    expect(await t.prisma.consentRecord.count({ where: { childId: child.id } })).toBe(0);
    expect((await studentLogin(child.username).expect(403)).body.error).toBe('CONSENT_PENDING');
    const early = await t
      .http()
      .put(`/v1/children/${child.id}/consents`)
      .set(auth(parent.accessToken))
      .send({ publicLeaderboards: true, publicPortfolio: false })
      .expect(409);
    expect(early.body.error).toBe('CONSENT_PENDING');

    const status = await t
      .http()
      .get(`/v1/children/${child.id}/parental-consent`)
      .set(auth(parent.accessToken))
      .expect(200);
    expect(status.body).toMatchObject({
      status: 'PENDING',
      methods: ['CARD_CHECK', 'EMAIL_PLUS', 'SIGNED_FORM'],
    });

    const started = await t
      .http()
      .post(`/v1/children/${child.id}/parental-consent`)
      .set(auth(parent.accessToken))
      .send({ method: 'EMAIL_PLUS', locale: 'en' })
      .expect(200);
    expect(started.body).toEqual({ url: null, emailSent: true });
    const email = lastMailTo(t.mail, parent.email);
    expect(email?.template).toBe('parentalConsent');

    const confirmed = await t
      .http()
      .post('/v1/parental-consent/confirm')
      .send({ token: tokenFrom(email) })
      .expect(200);
    expect(confirmed.body.nickname).toBe(child.nickname);
    // A link works once.
    await t
      .http()
      .post('/v1/parental-consent/confirm')
      .send({ token: tokenFrom(email) })
      .expect(400);

    await studentLogin(child.username).expect(200);
    const records = await t.prisma.consentRecord.findMany({ where: { childId: child.id } });
    expect(records.map((r) => [r.type, r.method])).toEqual([['ACCOUNT', 'EMAIL_PLUS']]);

    // "Email plus": the second email goes a day later, once.
    const jobs = t.app.get(ParentalConsentJobs);
    expect(await jobs.followUps(new Date())).toBe(0);
    expect(await jobs.followUps(new Date(Date.now() + 25 * 60 * 60 * 1000))).toBeGreaterThan(0);
    expect(lastMailTo(t.mail, parent.email)?.template).toBe('parentalConsentFollowUp');
    const again = await jobs.followUps(new Date(Date.now() + 26 * 60 * 60 * 1000));
    expect(
      (await t.prisma.parentalConsentRequest.findFirstOrThrow({ where: { childId: child.id } }))
        .followUpSentAt,
    ).not.toBeNull();
    expect(again).toBe(0);
  });

  it('lets staff check a signed form: rejected with a reason, then sent again and approved', async () => {
    const { parent, child } = await youngFamily();
    const upload = (body: Buffer, type: string) =>
      t
        .http()
        .post(`/v1/children/${child.id}/parental-consent/form`)
        .set(auth(parent.accessToken))
        .set('Content-Type', type)
        .send(body);

    // Only real PDFs and pictures: the first bytes decide, not the label.
    expect(
      (await upload(Buffer.from('<html>not a form</html>'), 'image/png').expect(400)).body.error,
    ).toBe('CONSENT_FORM_TYPE');
    const sent = await upload(PNG, 'image/png').expect(200);
    expect(sent.body.status).toBe('SUBMITTED');

    const admin = await staffLogin(t, 'admin');
    const queue = await t
      .http()
      .get('/v1/admin/parental-consents?status=SUBMITTED')
      .set(auth(admin.token))
      .expect(200);
    const item = (queue.body.items as { id: string; childId: string; parentEmail: string }[]).find(
      (row) => row.childId === child.id,
    );
    expect(item).toMatchObject({ parentEmail: parent.email });
    const file = await t
      .http()
      .get(`/v1/admin/parental-consents/${item!.id}/form`)
      .set(auth(admin.token))
      .buffer(true)
      .parse((res, done) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => done(null, Buffer.concat(chunks)));
      })
      .expect(200);
    expect(file.headers['content-type']).toBe('image/png');
    expect(Buffer.compare(file.body as Buffer, PNG)).toBe(0);

    // A moderator can't see the forms.
    const moderator = await staffLogin(t, 'moderator');
    await t.http().get('/v1/admin/parental-consents').set(auth(moderator.token)).expect(403);

    await t
      .http()
      .post(`/v1/admin/parental-consents/${item!.id}/decision`)
      .set(auth(admin.token))
      .send({ decision: 'REJECT' })
      .expect(400);
    await t
      .http()
      .post(`/v1/admin/parental-consents/${item!.id}/decision`)
      .set(auth(admin.token))
      .send({ decision: 'REJECT', reason: 'The signature is missing' })
      .expect(204);
    const rejected = lastMailTo(t.mail, parent.email);
    expect(rejected?.template).toBe('parentalConsentRejected');
    expect(rejected?.text).toContain('The signature is missing');
    await studentLogin(child.username).expect(403);

    await upload(PNG, 'image/png').expect(200);
    const second = await t.prisma.parentalConsentRequest.findFirstOrThrow({
      where: { childId: child.id, status: 'SUBMITTED' },
    });
    await t
      .http()
      .post(`/v1/admin/parental-consents/${second.id}/decision`)
      .set(auth(admin.token))
      .send({ decision: 'APPROVE' })
      .expect(204);
    expect(lastMailTo(t.mail, parent.email)?.template).toBe('parentalConsentDone');
    await studentLogin(child.username).expect(200);
    const audit = await t.prisma.auditLog.findFirst({
      where: { action: 'child.consent_verified', entityId: child.id },
    });
    expect(audit?.actorId).toBe(admin.user.id);

    // Forms are deleted 30 days after the decision.
    const jobs = t.app.get(ParentalConsentJobs);
    await jobs.deleteOldForms(new Date(Date.now() + 31 * DAY));
    const after = await t.prisma.parentalConsentRequest.findUniqueOrThrow({
      where: { id: second.id },
    });
    expect(after).toMatchObject({ formKey: null });
    expect(after.formDeletedAt).not.toBeNull();
    await t
      .http()
      .get(`/v1/admin/parental-consents/${second.id}/form`)
      .set(auth(admin.token))
      .expect(404);
  });

  it('confirms consent with a card check (Stripe, nothing charged)', async () => {
    const stripe = t.app.get(StripeGateway);
    if (!stripe.mock) return; // Needs the development stand-in for Stripe.
    const { parent, child } = await youngFamily();
    const started = await t
      .http()
      .post(`/v1/children/${child.id}/parental-consent`)
      .set(auth(parent.accessToken))
      .send({ method: 'CARD_CHECK', locale: 'ar' })
      .expect(200);
    const sessionId = String(started.body.url).split('/').pop()!;
    await stripe.mock.completeSession(sessionId);
    // The mock delivers its webhook in the background.
    for (let i = 0; i < 50; i++) {
      const user = await t.prisma.user.findUniqueOrThrow({ where: { id: child.id } });
      if (user.status === 'ACTIVE') break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    await studentLogin(child.username).expect(200);
    const record = await t.prisma.consentRecord.findFirstOrThrow({ where: { childId: child.id } });
    expect(record.method).toBe('PAYMENT_CARD');
  });

  it('deletes an account whose consent never came, after 30 days', async () => {
    const { child } = await youngFamily();
    const jobs = t.app.get(ParentalConsentJobs);
    await jobs.removeUnconsented(new Date(Date.now() + 31 * DAY));
    const gone = await t.prisma.user.findUniqueOrThrow({ where: { id: child.id } });
    expect(gone.status).toBe('DELETED');
    expect(
      (await t.prisma.parentalConsentRequest.findFirstOrThrow({ where: { childId: child.id } }))
        .status,
    ).toBe('EXPIRED');
  });

  it('signs a child in with a picture password, and locks it after five wrong tries', async () => {
    const parent = await signUpAndLogin(t);
    const child = (
      await t
        .http()
        .post('/v1/children')
        .set(auth(parent.accessToken))
        .send(childBody())
        .expect(201)
    ).body as { id: string; username: string };
    const set = (pictures: string[] | null) =>
      t
        .http()
        .put(`/v1/children/${child.id}/picture-password`)
        .set(auth(parent.accessToken))
        .send({ pictures });
    expect((await set(['cat', 'cat', 'cat', 'cat']).expect(400)).body.error).toBe(
      'PICTURE_PASSWORD_WEAK',
    );
    await set(['cat', 'dog']).expect(400);
    expect((await set(['cat', 'sun', 'cat', 'tree']).expect(200)).body.hasPicturePassword).toBe(
      true,
    );

    const login = (pictures: string[]) =>
      t
        .http()
        .post('/v1/auth/students/picture-login')
        .send({ username: child.username, pictures, app: 'mobile' });
    const ok = await login(['cat', 'sun', 'cat', 'tree']).expect(200);
    expect(ok.body.refreshToken).toBeTruthy();

    for (let i = 0; i < PICTURE_MAX_FAILURES; i++)
      await login(['dog', 'sun', 'cat', 'tree']).expect(401);
    const locked = await login(['cat', 'sun', 'cat', 'tree']).expect(403);
    expect(locked.body.error).toBe('PICTURE_LOCKED');
    // The text password still works, and a new picture password unlocks it.
    await studentLogin(child.username).expect(200);
    await set(['moon', 'star', 'moon', 'car']).expect(200);
    await login(['moon', 'star', 'moon', 'car']).expect(200);

    // Unknown names get the same answer as wrong pictures.
    const unknown = await t
      .http()
      .post('/v1/auth/students/picture-login')
      .send({ username: 'nobody-here-0000', pictures: ['cat', 'sun', 'cat', 'tree'] })
      .expect(401);
    expect(unknown.body.error).toBe('INVALID_CREDENTIALS');
  });

  it("signs a child's device in from a parent's phone", async () => {
    const parent = await signUpAndLogin(t);
    const other = await signUpAndLogin(t);
    const child = (
      await t
        .http()
        .post('/v1/children')
        .set(auth(parent.accessToken))
        .send(childBody())
        .expect(201)
    ).body as { id: string; username: string };

    const started = await t
      .http()
      .post('/v1/auth/pairing')
      .set('User-Agent', 'Mozilla/5.0 (Linux; Android 14; Tab) Chrome/140.0 Safari/537.36')
      .send({ app: 'mobile' })
      .expect(200);
    const { pairingId, code, secret } = started.body as {
      pairingId: string;
      code: string;
      secret: string;
    };
    expect(code).toMatch(/^[2-9A-Z]{4}-[2-9A-Z]{4}$/);
    const device = { pairingId, secret, app: 'mobile' };
    expect(
      (await t.http().post('/v1/auth/pairing/status').send(device).expect(200)).body.status,
    ).toBe('waiting');
    await t.http().post('/v1/auth/pairing/claim').send(device).expect(400);
    // Someone else's secret doesn't work.
    await t
      .http()
      .post('/v1/auth/pairing/status')
      .send({ ...device, secret: `${secret.slice(0, -4)}AAAA` })
      .expect(404);

    const info = await t
      .http()
      .post('/v1/auth/pairing/lookup')
      .set(auth(parent.accessToken))
      .send({ code: code.toLowerCase().replace('-', ' ') })
      .expect(200);
    expect(info.body.device).toBe('Chrome on Android');

    // Another parent can't sign in someone else's child.
    await t
      .http()
      .post('/v1/auth/pairing/approve')
      .set(auth(other.accessToken))
      .send({ code, childId: child.id })
      .expect(404);
    await t
      .http()
      .post('/v1/auth/pairing/approve')
      .set(auth(parent.accessToken))
      .send({ code, childId: child.id })
      .expect(204);
    // A code works once.
    await t
      .http()
      .post('/v1/auth/pairing/approve')
      .set(auth(parent.accessToken))
      .send({ code, childId: child.id })
      .expect(404);

    expect(
      (await t.http().post('/v1/auth/pairing/status').send(device).expect(200)).body.status,
    ).toBe('approved');
    const claimed = await t.http().post('/v1/auth/pairing/claim').send(device).expect(200);
    expect(claimed.body.user.id).toBe(child.id);
    expect(claimed.body.refreshToken).toBeTruthy();
    await t.http().post('/v1/auth/pairing/claim').send(device).expect(410);

    // Only parents approve codes.
    const kid = await studentLogin(child.username).expect(200);
    const again = await t.http().post('/v1/auth/pairing').send({ app: 'web' }).expect(200);
    await t
      .http()
      .post('/v1/auth/pairing/approve')
      .set(auth(kid.body.accessToken))
      .send({ code: again.body.code, childId: child.id })
      .expect(403);
  });
});
