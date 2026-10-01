import { randomUUID } from 'node:crypto';
import { HUB_AGREEMENTS } from '@kcp/shared';
import { LedgerError, LedgerService } from '../src/hub/ledger/ledger.service.js';
import { createTestApp, resetRateLimits, staffLogin, type TestContext } from './helpers.js';
import { passedStudent, readyMentor, setHubCountry } from './hub-fixture.js';
import { auth } from './learning-fixture.js';

describe('hub foundations: eligibility, contracts, country rules and the ledger (e2e)', () => {
  let t: TestContext;
  let admin: string;
  let wasOpen: boolean;

  beforeAll(async () => {
    t = await createTestApp();
    admin = (await staffLogin(t, 'admin')).token;
    wasOpen = await setHubCountry(t, 'PK', false);
  });

  beforeEach(async () => {
    await resetRateLimits(t.redis);
  });

  afterAll(async () => {
    await setHubCountry(t, 'PK', wasOpen);
    await t.app.close();
  });

  it('makes a student hub-eligible only after every step, with an audit entry for each approval', async () => {
    const lead = await readyMentor(t, admin, true);
    const notLead = await readyMentor(t, admin, false);
    const person = await passedStudent(t);
    const steps = async () =>
      (await t.http().get('/v1/hub/me').set(auth(person.student)).expect(200)).body as {
        eligible: boolean;
        steps: { key: string; done: boolean }[];
        rules: { minAge: number; weeklyMinutes: number; studentPercent: number } | null;
      };
    const start = await steps();
    expect(start.eligible).toBe(false);
    expect(start.rules).toMatchObject({ minAge: 15, weeklyMinutes: 360, studentPercent: 50 });
    const done = (body: Awaited<ReturnType<typeof steps>>) =>
      Object.fromEntries(body.steps.map((s) => [s.key, s.done]));
    expect(done(start)).toEqual({
      PRO_TRACK: true,
      READINESS: true,
      SIGN_OFF: false,
      PARENT_CONSENT: false,
      AGE: true,
      PREMIUM: true,
      COUNTRY: false,
    });

    // Only lead developers sign students off.
    const refused = await t
      .http()
      .get('/v1/mentor/hub/candidates')
      .set(auth(notLead.token))
      .expect(403);
    expect(refused.body.error).toBe('NOT_LEAD');
    const candidates = await t
      .http()
      .get('/v1/mentor/hub/candidates')
      .set(auth(lead.token))
      .expect(200);
    const candidate = candidates.body.find(
      (c: { studentId: string }) => c.studentId === person.child.id,
    );
    expect(candidate).toMatchObject({ signedOffAt: null, maxScore: 16, eligible: false });
    expect(candidate).not.toHaveProperty('username');
    await t
      .http()
      .post(`/v1/mentor/hub/candidates/${person.child.id}/sign-off`)
      .set(auth(lead.token))
      .send({ note: 'Careful and clear.' })
      .expect(204);
    const twice = await t
      .http()
      .post(`/v1/mentor/hub/candidates/${person.child.id}/sign-off`)
      .set(auth(lead.token))
      .send({})
      .expect(409);
    expect(twice.body.error).toBe('ALREADY_SIGNED_OFF');
    const consentMail = t.mail.outbox.find(
      (m) => m.to === person.parent.email && m.template === 'hubConsent',
    );
    expect(consentMail).toBeTruthy();

    // The parent reads the agreement and consents to its current version.
    const agreement = await t.http().get('/v1/hub/contracts/parent?language=ur').expect(200);
    expect(agreement.body).toMatchObject({
      kind: 'parent',
      language: 'ur',
      version: HUB_AGREEMENTS.parent,
    });
    const stale = await t
      .http()
      .post(`/v1/children/${person.child.id}/hub/consent`)
      .set(auth(person.parent.accessToken))
      .send({ version: '2000-01', agree: true })
      .expect(409);
    expect(stale.body.error).toBe('AGREEMENT_CHANGED');
    await t
      .http()
      .post(`/v1/children/${person.child.id}/hub/consent`)
      .set(auth(person.parent.accessToken))
      .send({ version: HUB_AGREEMENTS.parent, agree: false })
      .expect(400);
    // Someone else's child: not found.
    const stranger = await passedStudent(t);
    await t
      .http()
      .post(`/v1/children/${person.child.id}/hub/consent`)
      .set(auth(stranger.parent.accessToken))
      .send({ version: HUB_AGREEMENTS.parent, agree: true })
      .expect(404);
    const consented = await t
      .http()
      .post(`/v1/children/${person.child.id}/hub/consent`)
      .set(auth(person.parent.accessToken))
      .send({ version: HUB_AGREEMENTS.parent, agree: true })
      .expect(200);
    expect(consented.body).toMatchObject({ readinessPassed: true, signedOff: true });
    expect(consented.body.consent.version).toBe(HUB_AGREEMENTS.parent);
    // Consenting again records nothing new.
    await t
      .http()
      .post(`/v1/children/${person.child.id}/hub/consent`)
      .set(auth(person.parent.accessToken))
      .send({ version: HUB_AGREEMENTS.parent, agree: true })
      .expect(200);
    expect(
      await t.prisma.consentRecord.count({
        where: { childId: person.child.id, type: { in: ['HUB_WORK', 'EARNINGS'] } },
      }),
    ).toBe(2);

    // Still closed in the country: not eligible yet.
    expect((await steps()).eligible).toBe(false);
    await setHubCountry(t, 'PK', true);
    const open = await steps();
    expect(open.eligible).toBe(true);
    const row = await t.prisma.hubEligibility.findUniqueOrThrow({
      where: { studentId: person.child.id },
    });
    expect(row.eligibleAt).toBeTruthy();
    expect(row.signedOffById).toBe(lead.user.id);

    // Who approved each step is in the audit log.
    const audit = await t.prisma.auditLog.findMany({
      where: { entityId: person.child.id, action: { startsWith: 'hub.' } },
      orderBy: { createdAt: 'asc' },
    });
    expect(audit.map((a) => [a.action, a.actorId])).toEqual([
      ['hub.sign_off', lead.user.id],
      ['hub.consent', person.parent.user.id],
      ['hub.eligible', null],
    ]);

    // The family view shows it too.
    const familyView = await t
      .http()
      .get('/v1/hub/family')
      .set(auth(person.parent.accessToken))
      .expect(200);
    expect(familyView.body[0].eligibility.eligible).toBe(true);

    // Staff pause the student (with a reason), then let them back.
    await t
      .http()
      .post(`/v1/admin/hub/students/${person.child.id}/pause`)
      .set(auth(admin))
      .send({ reason: 'Looking into a report' })
      .expect(204);
    expect(await steps()).toMatchObject({ eligible: false, paused: true });
    const paused = await t
      .http()
      .get('/v1/admin/hub/students?status=paused')
      .set(auth(admin))
      .expect(200);
    expect(
      paused.body.find((s: { studentId: string }) => s.studentId === person.child.id),
    ).toMatchObject({ pausedReason: 'Looking into a report' });
    await t
      .http()
      .post(`/v1/admin/hub/students/${person.child.id}/resume`)
      .set(auth(admin))
      .expect(204);
    expect((await steps()).eligible).toBe(true);
    // Mentors can't pause anyone.
    await t
      .http()
      .post(`/v1/admin/hub/students/${person.child.id}/pause`)
      .set(auth(lead.token))
      .send({ reason: 'Not allowed here' })
      .expect(403);

    // The parent takes the consent back: hub work stops at once.
    const withdrawn = await t
      .http()
      .delete(`/v1/children/${person.child.id}/hub/consent`)
      .set(auth(person.parent.accessToken))
      .expect(200);
    expect(withdrawn.body.consent).toBeNull();
    expect((await steps()).eligible).toBe(false);
  });

  it('keeps a student too young for the country out', async () => {
    await setHubCountry(t, 'PK', true);
    const person = await passedStudent(t);
    await t.prisma.studentProfile.update({
      where: { userId: person.child.id },
      data: { birthYear: new Date().getUTCFullYear() - 14 },
    });
    const view = await t.http().get('/v1/hub/me').set(auth(person.student)).expect(200);
    expect(view.body.steps.find((s: { key: string }) => s.key === 'AGE').done).toBe(false);
    // Parents of children who haven't passed the readiness check can't consent yet.
    await t.prisma.readinessCheck.deleteMany({ where: { studentId: person.child.id } });
    const early = await t
      .http()
      .post(`/v1/children/${person.child.id}/hub/consent`)
      .set(auth(person.parent.accessToken))
      .send({ version: HUB_AGREEMENTS.parent, agree: true })
      .expect(409);
    expect(early.body.error).toBe('HUB_NOT_READY');
  });

  it('lets staff set a country’s rules, keeping the split at 100%', async () => {
    const list = await t.http().get('/v1/admin/hub/countries').set(auth(admin)).expect(200);
    const pk = list.body.find((c: { countryCode: string }) => c.countryCode === 'PK');
    expect(pk).toMatchObject({ studentPercent: 50, leadPercent: 25, platformPercent: 25 });
    const bad = await t
      .http()
      .put('/v1/admin/hub/countries/PK')
      .set(auth(admin))
      .send({ studentPercent: 60 })
      .expect(409);
    expect(bad.body.error).toBe('SPLIT_NOT_100');
    await t
      .http()
      .put('/v1/admin/hub/countries/PK')
      .set(auth(admin))
      .send({ weeklyMinutes: 0 })
      .expect(400);
    const changed = await t
      .http()
      .put('/v1/admin/hub/countries/pk')
      .set(auth(admin))
      .send({ holdDays: 21, studentPercent: 55, platformPercent: 20 })
      .expect(200);
    expect(changed.body).toMatchObject({ holdDays: 21, studentPercent: 55, leadPercent: 25 });
    await t
      .http()
      .put('/v1/admin/hub/countries/PK')
      .set(auth(admin))
      .send({ holdDays: pk.holdDays, studentPercent: 50, platformPercent: 25 })
      .expect(200);
    const moderator = await staffLogin(t, 'moderator');
    await t
      .http()
      .put('/v1/admin/hub/countries/PK')
      .set(auth(moderator.token))
      .send({ holdDays: 3 })
      .expect(403);
  });

  it('keeps a ledger whose postings always balance and never change', async () => {
    const ledger = t.app.get(LedgerService);
    const project = randomUUID();
    const org = randomUUID();
    const key = `test:${randomUUID()}`;
    const posting = {
      kind: 'invoice.issued',
      memo: 'Test invoice',
      currency: 'USD',
      refType: 'Test',
      refId: project,
      idempotencyKey: key,
      lines: [
        {
          type: 'CLIENT_RECEIVABLE' as const,
          owner: org,
          side: 'DEBIT' as const,
          amountMinor: 10_000,
        },
        {
          type: 'PROJECT_FUNDS' as const,
          owner: project,
          side: 'CREDIT' as const,
          amountMinor: 10_000,
        },
      ],
    };
    const first = await ledger.post(posting);
    const again = await ledger.post(posting);
    expect(first.created).toBe(true);
    expect(again).toEqual({ transactionId: first.transactionId, created: false });
    expect(await ledger.balance('CLIENT_RECEIVABLE', 'USD', org)).toBe(10_000);
    expect(await ledger.balance('PROJECT_FUNDS', 'USD', project)).toBe(10_000);
    await expect(
      ledger.post({
        ...posting,
        idempotencyKey: `${key}:bad`,
        lines: [posting.lines[0]!, { ...posting.lines[1]!, amountMinor: 9_999 }],
      }),
    ).rejects.toThrow(LedgerError);

    // The database refuses an unbalanced posting, and any change, even without the service.
    await expect(
      t.prisma.$transaction(async (tx) => {
        const account = await tx.ledgerAccount.findFirstOrThrow({
          where: { type: 'CLIENT_RECEIVABLE', ownerKey: org },
        });
        await tx.ledgerTransaction.create({
          data: {
            kind: 'test',
            memo: 'one-sided',
            idempotencyKey: `${key}:raw`,
            entries: {
              create: [{ accountId: account.id, side: 'DEBIT', amountMinor: 5, currency: 'USD' }],
            },
          },
        });
      }),
    ).rejects.toThrow(/does not balance/);
    await expect(
      t.prisma.ledgerEntry.updateMany({
        where: { transactionId: first.transactionId },
        data: { amountMinor: 1 },
      }),
    ).rejects.toThrow(/append-only/);
    const trial = await ledger.trialBalance();
    for (const currency of trial) expect(currency.debits).toBe(currency.credits);
  });
});
