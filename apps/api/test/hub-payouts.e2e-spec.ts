import { DeliveriesService } from '../src/hub/deliveries.service.js';
import { LedgerService } from '../src/hub/ledger/ledger.service.js';
import { PayoutsService } from '../src/hub/payouts.service.js';
import { HubEarningsService } from '../src/hub/earnings.service.js';
import { WiseGateway } from '../src/hub/payouts/wise.gateway.js';
import { FeatureFlagsService } from '../src/feature-flags/feature-flags.service.js';
import {
  createTestApp,
  lastMailTo,
  PASSWORD,
  resetRateLimits,
  staffLogin,
  type TestContext,
} from './helpers.js';
import {
  approvedProject,
  clientProject,
  eligibleStudent,
  payByCard,
  readyMentor,
  setHubCountry,
  until,
} from './hub-fixture.js';
import { auth } from './learning-fixture.js';

const PRICE = 120_000;
const DAY = 86_400_000;
const PK_IBAN = 'PK36 SCBL 0000 0011 2345 6702';
const AE_IBAN = 'AE070331234567890123456';

type Person = Awaited<ReturnType<typeof eligibleStudent>>;

describe('hub earnings and payouts (e2e)', () => {
  let t: TestContext;
  let admin: string;
  let superA: string;
  let superB: string;
  let lead: { user: { id: string }; token: string };
  let wasOpen: boolean;
  let kid1: Person;
  let kid2: Person;
  let projectId: string;
  let taxBefore = 0;
  let clearingBefore = 0;

  const setFlag = async (enabled: boolean, countryCodes: string[] = []) => {
    await t.prisma.featureFlag.upsert({
      where: { key: 'hub_payouts' },
      create: { key: 'hub_payouts', description: 'Hub payouts', enabled, countryCodes },
      update: { enabled, countryCodes },
    });
    t.app.get(FeatureFlagsService).invalidate();
  };

  const balance = async (type: string, owner: string | null, currency = 'USD') => {
    const account = await t.prisma.ledgerAccount.findUnique({
      where: {
        type_currency_ownerKey: {
          type: type as 'CASH',
          currency,
          ownerKey: owner ?? '',
        },
      },
      include: { entries: true },
    });
    const sum = (side: string) =>
      (account?.entries ?? [])
        .filter((e) => e.side === side)
        .reduce((total, e) => total + e.amountMinor, 0);
    return type === 'CASH' || type === 'CLIENT_RECEIVABLE'
      ? sum('DEBIT') - sum('CREDIT')
      : sum('CREDIT') - sum('DEBIT');
  };

  /** The payout account becomes usable (as if 48 hours passed) and staff check it. */
  const readyAccount = async (parentId: string) => {
    const account = await t.prisma.payoutAccount.findFirstOrThrow({
      where: { parentId, removedAt: null },
    });
    await t.prisma.payoutAccount.update({
      where: { id: account.id },
      data: { usableFrom: new Date(Date.now() - 1000) },
    });
    await t
      .http()
      .post(`/v1/admin/hub/payout-accounts/${account.id}/verify`)
      .set(auth(admin))
      .expect(200);
    return account.id;
  };

  /** A batch through both approvals, with every parent's confirmation. */
  const approvedBatch = async (provider: 'WISE' | 'MANUAL', parents: string[]) => {
    const made = await t
      .http()
      .post('/v1/admin/hub/payouts/batches')
      .set(auth(admin))
      .send({ currency: 'USD', provider })
      .expect(201);
    for (const parent of parents) {
      const mine = await t.http().get('/v1/payouts').set(auth(parent)).expect(200);
      const waiting = mine.body.find((p: { canConfirm: boolean }) => p.canConfirm);
      await t.http().post(`/v1/payouts/${waiting.id}/confirm`).set(auth(parent)).expect(200);
    }
    await t
      .http()
      .post(`/v1/admin/hub/payouts/batches/${made.body.id}/approve`)
      .set(auth(superA))
      .expect(200);
    await t
      .http()
      .post(`/v1/admin/hub/payouts/batches/${made.body.id}/approve`)
      .set(auth(superB))
      .expect(200);
    return made.body.id as string;
  };

  beforeAll(async () => {
    t = await createTestApp();
    admin = (await staffLogin(t, 'admin')).token;
    superA = (await staffLogin(t, 'super_admin')).token;
    superB = (await staffLogin(t, 'super_admin')).token;
    lead = await readyMentor(t, admin, true);
    wasOpen = await setHubCountry(t, 'PK', true);
    await setFlag(false);
    // Earlier runs' families are left out: only this run's accounts can be paid.
    await t.prisma.payout.updateMany({
      where: { status: { in: ['AWAITING_PARENT', 'CONFIRMED'] } },
      data: { status: 'CANCELLED', failureReason: 'TEST_RESET' },
    });
    await t.prisma.payoutAccount.updateMany({
      where: { removedAt: null },
      data: { removedAt: new Date() },
    });
    taxBefore = await balance('TAX_WITHHELD', null);
    clearingBefore = await balance('PAYOUT_CLEARING', null);
  });

  beforeEach(async () => {
    await resetRateLimits(t.redis);
  });

  afterAll(async () => {
    await setFlag(false);
    await t.prisma.country.update({ where: { code: 'PK' }, data: { hubWithholdingBp: 0 } });
    await setHubCountry(t, 'PK', wasOpen);
    await t.app.close();
  });

  it('shares out each paid invoice once its work is accepted, holds it, then makes it payable', async () => {
    const { client, projectId: id } = await clientProject(t, admin, lead.user.id);
    projectId = id;
    const { quoteId, project } = await approvedProject(t, lead.token, client.token, id, PRICE);
    await payByCard(t, client.token, project.invoices[0].id);
    // Paid, but the work isn't accepted yet: nothing is shared out.
    expect(await t.prisma.hubEarning.count({ where: { projectId } })).toBe(0);
    expect(await balance('PROJECT_FUNDS', projectId)).toBe(PRICE * 0.3);

    kid1 = await eligibleStudent(t, lead.token);
    kid2 = await eligibleStudent(t, lead.token);
    const tasks = await t.prisma.hubTask.findMany({
      where: { quoteId },
      orderBy: { number: 'asc' },
    });
    // 50% and 30% of the pool finished; the 20% task cancelled (its share is spread over the rest).
    await t.prisma.hubTask.update({
      where: { id: tasks[0]!.id },
      data: { assigneeId: kid1.child.id, status: 'DONE' },
    });
    await t.prisma.hubTask.update({
      where: { id: tasks[1]!.id },
      data: { assigneeId: kid2.child.id, status: 'DONE' },
    });
    await t.prisma.hubTask.update({ where: { id: tasks[2]!.id }, data: { status: 'CANCELLED' } });
    const deliveryId = await t.app
      .get(DeliveriesService)
      .save(
        projectId,
        quoteId,
        { title: 'The site', notes: 'Everything is done.', final: true, commit: 'b'.repeat(40) },
        async () => [],
        null,
      );
    await t
      .http()
      .post(`/v1/client/projects/${projectId}/deliveries/${deliveryId}/accept`)
      .set(auth(client.token))
      .send({ allowPortfolio: true })
      .expect(204);

    // The deposit (36,000) is shared: 18,000 to the pool (5:3), 9,000 lead, 9,000 platform.
    const first = await t.prisma.hubEarning.findMany({ where: { projectId } });
    expect(first.map((e) => [e.studentId, e.amountMinor]).toSorted()).toEqual(
      [
        [kid1.child.id, 11_250],
        [kid2.child.id, 6_750],
      ].toSorted(),
    );
    expect(await balance('LEAD_PAYABLE', lead.user.id)).toBe(9_000);
    expect(await balance('PLATFORM_REVENUE', null)).toBeGreaterThanOrEqual(9_000);

    const view = await t
      .http()
      .get(`/v1/client/projects/${projectId}`)
      .set(auth(client.token))
      .expect(200);
    const final = view.body.invoices.find((i: { kind: string }) => i.kind === 'FINAL');
    await payByCard(t, client.token, final.id);
    // Paid in full and shared out: the project is complete.
    await until(
      () => t.prisma.hubProject.findUniqueOrThrow({ where: { id: projectId } }),
      (p) => p.status === 'COMPLETED',
    );
    expect(await balance('PROJECT_FUNDS', projectId)).toBe(0);
    expect(await balance('STUDENT_HELD', kid1.child.id)).toBe(37_500);
    expect(await balance('STUDENT_HELD', kid2.child.id)).toBe(22_500);
    expect(await balance('LEAD_PAYABLE', lead.user.id)).toBe(30_000);
    // Shared out once, however often it's asked.
    await t.app.get(HubEarningsService).distributeDue();
    expect(await t.prisma.hubEarning.count({ where: { projectId } })).toBe(4);

    const mine = await t.http().get('/v1/hub/earnings').set(auth(kid1.student)).expect(200);
    expect(mine.body.totals).toEqual([
      {
        currency: 'USD',
        earnedMinor: 37_500,
        heldMinor: 37_500,
        payableMinor: 0,
        paidMinor: 0,
        withheldMinor: 0,
      },
    ]);
    expect(mine.body.earnings[0]).toMatchObject({ projectReference: expect.stringMatching(/^P-/) });
    const asParent = await t
      .http()
      .get(`/v1/children/${kid1.child.id}/hub/earnings`)
      .set(auth(kid1.parent.accessToken))
      .expect(200);
    expect(asParent.body.totals[0].earnedMinor).toBe(37_500);
    await t
      .http()
      .get(`/v1/children/${kid1.child.id}/hub/earnings`)
      .set(auth(kid2.parent.accessToken))
      .expect(404);
    const leadView = await t
      .http()
      .get('/v1/mentor/hub/earnings')
      .set(auth(lead.token))
      .expect(200);
    expect(leadView.body.payable).toContainEqual({ currency: 'USD', amountMinor: 30_000 });

    // Nothing the client can read names a student (they did the work: tasks, deliveries).
    for (const path of [
      '/v1/client/me',
      '/v1/client/projects',
      `/v1/client/projects/${projectId}`,
      `/v1/client/projects/${projectId}/team`,
      `/v1/client/projects/${projectId}/deliveries`,
      `/v1/client/projects/${projectId}/comments`,
      `/v1/client/projects/${projectId}/changes`,
      '/v1/client/invoices',
    ]) {
      const answer = await t.http().get(path).set(auth(client.token)).expect(200);
      const text = JSON.stringify(answer.body);
      for (const kid of [kid1, kid2]) {
        for (const secret of [
          kid.child.id,
          kid.child.username,
          kid.child.nickname,
          kid.parent.email,
        ]) {
          expect(text, `${path} shows ${secret}`).not.toContain(secret);
        }
      }
    }

    // The hold ends (14 days in Pakistan).
    const earnings = t.app.get(HubEarningsService);
    expect(await earnings.releaseDue(new Date(Date.now() + 13 * DAY))).toBe(0);
    expect(await earnings.releaseDue(new Date(Date.now() + 15 * DAY))).toBeGreaterThanOrEqual(4);
    expect(await balance('STUDENT_PAYABLE', kid1.child.id)).toBe(37_500);
    expect(await balance('STUDENT_HELD', kid1.child.id)).toBe(0);
  });

  it('keeps payout accounts safe: password, IBAN check, 48 hours, staff check', async () => {
    const parent = kid1.parent.accessToken;
    const body = {
      password: PASSWORD,
      kind: 'IBAN',
      holderName: 'Ayesha Khan',
      iban: PK_IBAN,
      currency: 'PKR',
    };
    await t
      .http()
      .put('/v1/payout-account')
      .set(auth(parent))
      .send({ ...body, password: 'not my password' })
      .expect(400);
    const bad = await t
      .http()
      .put('/v1/payout-account')
      .set(auth(parent))
      .send({ ...body, iban: 'PK36 SCBL 0000 0011 2345 6703' })
      .expect(400);
    expect(bad.body.error).toBe('BAD_IBAN');
    const set = await t.http().put('/v1/payout-account').set(auth(parent)).send(body).expect(200);
    expect(set.body).toMatchObject({
      kind: 'IBAN',
      countryCode: 'PK',
      last4: '6702',
      state: 'COOLING',
      holderName: 'Ayesha Khan',
    });
    expect(lastMailTo(t.mail, kid1.parent.user.email!)?.template).toBe('hubPayoutAccountChanged');
    const stored = await t.prisma.payoutAccount.findFirstOrThrow({
      where: { parentId: kid1.parent.user.id },
    });
    expect(stored.detailsCipher).not.toContain('SCBL');
    // Students and other parents see nothing of it.
    await t.http().get('/v1/payout-account').set(auth(kid1.student)).expect(403);

    // Cooling off: no batch can include it.
    await t
      .http()
      .post('/v1/admin/hub/payouts/batches')
      .set(auth(admin))
      .send({ currency: 'USD', provider: 'WISE' })
      .expect(409);
    const ready = await t
      .http()
      .get('/v1/admin/hub/payouts/ready?currency=USD')
      .set(auth(admin))
      .expect(200);
    expect(
      ready.body.find((r: { studentId: string }) => r.studentId === kid1.child.id),
    ).toMatchObject({
      payableMinor: 37_500,
      parentId: kid1.parent.user.id,
      accountState: 'COOLING',
    });

    const waiting = await t
      .http()
      .get('/v1/admin/hub/payout-accounts')
      .set(auth(admin))
      .expect(200);
    expect(waiting.body.some((a: { id: string }) => a.id === stored.id)).toBe(true);
    const shown = await t
      .http()
      .get(`/v1/admin/hub/payout-accounts/${stored.id}/details`)
      .set(auth(admin))
      .expect(200);
    expect(shown.body).toEqual({
      holderName: 'Ayesha Khan',
      iban: 'PK36SCBL0000001123456702',
      details: null,
    });
    expect(
      await t.prisma.auditLog.count({
        where: { action: 'payout_account.reveal', entityId: stored.id },
      }),
    ).toBe(1);
    await readyAccount(kid1.parent.user.id);
  });

  it('pays through Wise (mock) after the parent confirms and two super admins approve', async () => {
    const parent = kid1.parent.accessToken;
    // Nothing is batched (no parent asked to confirm) while payouts are switched off.
    const closed = await t
      .http()
      .post('/v1/admin/hub/payouts/batches')
      .set(auth(admin))
      .send({ currency: 'USD', provider: 'WISE', note: 'October' })
      .expect(409);
    expect(closed.body.error).toBe('PAYOUTS_OFF');
    await setFlag(true);
    const made = await t
      .http()
      .post('/v1/admin/hub/payouts/batches')
      .set(auth(admin))
      .send({ currency: 'USD', provider: 'WISE', note: 'October' })
      .expect(201);
    expect(made.body).toMatchObject({ status: 'DRAFT', payoutCount: 1 });
    expect(made.body.payouts[0]).toMatchObject({
      studentId: kid1.child.id,
      amountMinor: 37_500,
      withheldMinor: 0,
      netMinor: 37_500,
      status: 'AWAITING_PARENT',
      accountLast4: '6702',
    });
    expect(lastMailTo(t.mail, kid1.parent.user.email!)?.template).toBe('hubPayoutConfirm');
    const batchId = made.body.id as string;

    // Only super admins approve, and two different ones.
    await t
      .http()
      .post(`/v1/admin/hub/payouts/batches/${batchId}/approve`)
      .set(auth(admin))
      .expect(403);
    await t
      .http()
      .post(`/v1/admin/hub/payouts/batches/${batchId}/approve`)
      .set(auth(superA))
      .expect(200);
    const again = await t
      .http()
      .post(`/v1/admin/hub/payouts/batches/${batchId}/approve`)
      .set(auth(superA))
      .expect(409);
    expect(again.body.error).toBe('SECOND_APPROVER_NEEDED');
    const approved = await t
      .http()
      .post(`/v1/admin/hub/payouts/batches/${batchId}/approve`)
      .set(auth(superB))
      .expect(200);
    expect(approved.body).toMatchObject({ status: 'APPROVED' });
    expect(approved.body.approvals).toHaveLength(2);

    const mine = await t.http().get('/v1/payouts').set(auth(parent)).expect(200);
    expect(mine.body[0]).toMatchObject({
      canConfirm: true,
      netMinor: 37_500,
      accountLast4: '6702',
    });
    await t
      .http()
      .post(`/v1/payouts/${mine.body[0].id}/confirm`)
      .set(auth(kid2.parent.accessToken))
      .expect(404);
    await t.http().post(`/v1/payouts/${mine.body[0].id}/confirm`).set(auth(parent)).expect(200);

    // Nothing moves while payouts are switched off.
    await setFlag(false);
    const off = await t
      .http()
      .post(`/v1/admin/hub/payouts/batches/${batchId}/send`)
      .set(auth(superA))
      .expect(409);
    expect(off.body.error).toBe('PAYOUTS_OFF');
    await setFlag(true);
    await t
      .http()
      .post(`/v1/admin/hub/payouts/batches/${batchId}/send`)
      .set(auth(admin))
      .expect(403);
    const sent = await t
      .http()
      .post(`/v1/admin/hub/payouts/batches/${batchId}/send`)
      .set(auth(superA))
      .expect(200);
    expect(sent.body.status).toBe('SENT');
    expect(sent.body.payouts[0].providerTransferId).toBeTruthy();
    expect(await balance('STUDENT_PAYABLE', kid1.child.id)).toBe(0);

    const paid = await until(
      async () => (await t.http().get('/v1/payouts').set(auth(parent))).body[0],
      (payout: { status: string; paidAt: string | null }) => payout.status === 'PAID',
    );
    expect(paid.paidAt).toBeTruthy();
    expect(lastMailTo(t.mail, kid1.parent.user.email!)?.template).toBe('hubPayoutPaid');
    expect(await balance('PAYOUT_CLEARING', null)).toBe(clearingBefore);
    const statement = await t.http().get('/v1/hub/earnings').set(auth(kid1.student)).expect(200);
    expect(statement.body.totals[0]).toMatchObject({ paidMinor: 37_500, payableMinor: 0 });
    expect(statement.body.payouts[0]).toMatchObject({ status: 'PAID', accountLast4: null });
    await setFlag(false);
  });

  it('stops payouts when the account changes, puts bounced money back, and records manual ones (with withholding)', async () => {
    const parent = kid2.parent.accessToken;
    await setFlag(true);
    await t
      .http()
      .put('/v1/payout-account')
      .set(auth(parent))
      .send({
        password: PASSWORD,
        kind: 'OTHER',
        holderName: 'Bilal Ahmed',
        details: 'JazzCash 0300 1234567',
        currency: 'PKR',
        countryCode: 'PK',
      })
      .expect(200);
    await readyAccount(kid2.parent.user.id);
    // Wise pays IBANs only.
    await t
      .http()
      .post('/v1/admin/hub/payouts/batches')
      .set(auth(admin))
      .send({ currency: 'USD', provider: 'WISE' })
      .expect(409);
    const manual = await t
      .http()
      .post('/v1/admin/hub/payouts/batches')
      .set(auth(admin))
      .send({ currency: 'USD', provider: 'MANUAL' })
      .expect(201);
    expect(manual.body.payouts).toHaveLength(1);
    // The parent changes the account: the waiting payout stops.
    await t
      .http()
      .put('/v1/payout-account')
      .set(auth(parent))
      .send({
        password: PASSWORD,
        kind: 'IBAN',
        holderName: 'Bilal Ahmed',
        iban: AE_IBAN,
        currency: 'AED',
      })
      .expect(200);
    const stopped = await t
      .http()
      .get(`/v1/admin/hub/payouts/batches/${manual.body.id}`)
      .set(auth(admin))
      .expect(200);
    expect(stopped.body.payouts[0]).toMatchObject({
      status: 'CANCELLED',
      failureReason: 'ACCOUNT_CHANGED',
    });
    await t
      .http()
      .post(`/v1/admin/hub/payouts/batches/${manual.body.id}/cancel`)
      .set(auth(admin))
      .expect(200);
    await readyAccount(kid2.parent.user.id);

    // 10% withheld for tax in this country (for the test).
    await t.prisma.country.update({ where: { code: 'PK' }, data: { hubWithholdingBp: 1000 } });
    await setFlag(true);
    await t.app.get(WiseGateway).mock!.failNext();
    const wiseBatch = await approvedBatch('WISE', [parent]);
    const sent = await t
      .http()
      .post(`/v1/admin/hub/payouts/batches/${wiseBatch}/send`)
      .set(auth(superB))
      .expect(200);
    expect(sent.body.payouts[0]).toMatchObject({
      amountMinor: 22_500,
      withheldMinor: 2_250,
      netMinor: 20_250,
      status: 'SENT',
    });
    // Sent with 10% set aside for tax (the mock may have bounced it already: check the posting).
    const posted = await t
      .http()
      .get(`/v1/admin/hub/ledger/transactions?refId=${sent.body.payouts[0].id}&kind=payout.sent`)
      .set(auth(admin))
      .expect(200);
    expect(posted.body[0].entries).toContainEqual({
      accountType: 'TAX_WITHHELD',
      owner: '',
      side: 'CREDIT',
      amountMinor: 2_250,
    });
    // The bank sent it back: the money is payable again, the withholding undone.
    await until(
      async () =>
        (await t.http().get(`/v1/admin/hub/payouts/batches/${wiseBatch}`).set(auth(admin))).body
          .payouts[0],
      (payout: { status: string }) => payout.status === 'FAILED',
    );
    expect(await balance('STUDENT_PAYABLE', kid2.child.id)).toBe(22_500);
    expect(await balance('TAX_WITHHELD', null)).toBe(taxBefore);
    expect(lastMailTo(t.mail, kid2.parent.user.email!)?.template).toBe('hubPayoutFailed');

    // Paid by hand instead.
    const handBatch = await approvedBatch('MANUAL', [parent]);
    const released = await t
      .http()
      .post(`/v1/admin/hub/payouts/batches/${handBatch}/send`)
      .set(auth(superA))
      .expect(200);
    const payoutId = released.body.payouts[0].id as string;
    expect(released.body.payouts[0].status).toBe('CONFIRMED');
    const recorded = await t
      .http()
      .post(`/v1/admin/hub/payouts/${payoutId}/record`)
      .set(auth(admin))
      .send({ method: 'Bank transfer', reference: 'TRX-20261101' })
      .expect(200);
    expect(recorded.body.payouts[0]).toMatchObject({
      status: 'PAID',
      method: 'Bank transfer',
      paymentReference: 'TRX-20261101',
    });
    await t
      .http()
      .post(`/v1/admin/hub/payouts/${payoutId}/record`)
      .set(auth(admin))
      .send({ method: 'Bank transfer', reference: 'TRX-20261101' })
      .expect(409);
    expect(await balance('STUDENT_PAYABLE', kid2.child.id)).toBe(0);
    expect(await balance('TAX_WITHHELD', null)).toBe(taxBefore + 2_250);
    await setFlag(false);
  });

  it('shows hub work in portfolios (the client allowed it), and stories only with a parent’s yes', async () => {
    const portfolio = await t.http().get('/v1/portfolio').set(auth(kid1.student)).expect(200);
    expect(portfolio.body.hubWork).toEqual([
      expect.objectContaining({
        projectId,
        title: 'A website for our bakery',
        tasks: ['Home page with the menu'],
        skills: ['html', 'css'],
      }),
    ]);
    expect(JSON.stringify(portfolio.body.hubWork)).not.toMatch(/Bakery|amount|Minor/);

    const made = await t
      .http()
      .post('/v1/admin/hub/stories')
      .set(auth(admin))
      .send({
        studentId: kid1.child.id,
        projectId,
        languageCode: 'en',
        firstName: 'Ayesha',
        headline: 'Built the menu page for a bakery',
        body: 'Ayesha built the menu page of a real bakery’s website, reviewed by a lead developer.',
      })
      .expect(201);
    expect(made.body.status).toBe('AWAITING_PARENT');
    expect(lastMailTo(t.mail, kid1.parent.user.email!)?.template).toBe('hubStoryConsent');
    // Not without the parent's yes.
    await t
      .http()
      .post(`/v1/admin/hub/stories/${made.body.id}/publish`)
      .set(auth(admin))
      .expect(409);
    await t
      .http()
      .post(`/v1/hub/stories/${made.body.id}/answer`)
      .set(auth(kid2.parent.accessToken))
      .send({ approve: true })
      .expect(404);
    await t
      .http()
      .post(`/v1/hub/stories/${made.body.id}/answer`)
      .set(auth(kid1.parent.accessToken))
      .send({ approve: true })
      .expect(200);
    await t
      .http()
      .post(`/v1/admin/hub/stories/${made.body.id}/publish`)
      .set(auth(admin))
      .expect(200);
    const site = await t.http().get('/v1/public/hub/stories?lang=en').expect(200);
    expect(site.headers['cache-control']).toBe('public, max-age=60');
    expect(site.body.find((s: { id: string }) => s.id === made.body.id)).toEqual({
      id: made.body.id,
      firstName: 'Ayesha',
      countryCode: 'PK',
      headline: 'Built the menu page for a bakery',
      body: expect.any(String),
      publishedAt: expect.any(String),
    });
    // The parent takes it back: off the site at once.
    await t
      .http()
      .post(`/v1/hub/stories/${made.body.id}/withdraw`)
      .set(auth(kid1.parent.accessToken))
      .expect(200);
    const after = await t.http().get('/v1/public/hub/stories?lang=en').expect(200);
    expect(after.body.some((s: { id: string }) => s.id === made.body.id)).toBe(false);
    await t
      .http()
      .post(`/v1/admin/hub/stories/${made.body.id}/publish`)
      .set(auth(admin))
      .expect(409);
    // Only students with paid hub work have stories.
    await t
      .http()
      .post('/v1/admin/hub/stories')
      .set(auth(admin))
      .send({
        studentId: lead.user.id,
        languageCode: 'en',
        firstName: 'X',
        headline: 'Nope',
        body: 'Not a hub student at all.',
      })
      .expect(400);

    const stats = await t.http().get('/v1/public/hub/stats').expect(200);
    expect(stats.body.projectsCompleted).toBeGreaterThanOrEqual(1);
    expect(stats.body.studentsEarning).toBeGreaterThanOrEqual(2);
    expect(
      stats.body.earned.find((e: { currency: string }) => e.currency === 'USD').amountMinor,
    ).toBeGreaterThanOrEqual(60_000);
  });

  it('never pays twice: lost answers, unfunded transfers, money returned after payment, sent batches', async () => {
    const kid3 = await eligibleStudent(t, lead.token);
    const parent = kid3.parent.accessToken;
    const mock = t.app.get(WiseGateway).mock!;
    const service = t.app.get(PayoutsService);
    let topUp = 0;
    /** Money the student can be paid (as if their earnings had been released). */
    const payable = async (amountMinor: number) => {
      topUp += 1;
      await t.app.get(LedgerService).post({
        kind: 'test.payable',
        memo: 'Test: released earnings',
        currency: 'USD',
        refType: 'User',
        refId: kid3.child.id,
        idempotencyKey: `test.payable:${kid3.child.id}:${topUp}`,
        lines: [
          { type: 'CASH', side: 'DEBIT', amountMinor },
          { type: 'STUDENT_PAYABLE', owner: kid3.child.id, side: 'CREDIT', amountMinor },
        ],
      });
    };
    const payoutOf = (batchId: string) =>
      t.prisma.payout.findFirstOrThrow({ where: { batchId, studentId: kid3.child.id } });
    const postings = (payoutId: string, kind: string) =>
      t.prisma.ledgerTransaction.count({ where: { refId: payoutId, kind } });
    await t
      .http()
      .put('/v1/payout-account')
      .set(auth(parent))
      .send({
        password: PASSWORD,
        kind: 'IBAN',
        holderName: 'Sana Malik',
        iban: PK_IBAN,
        currency: 'PKR',
      })
      .expect(200);
    await readyAccount(kid3.parent.user.id);
    await payable(5_000);

    // Payouts on for another country only: nothing is batched for this family.
    await setFlag(true, ['AE']);
    const off = await t
      .http()
      .post('/v1/admin/hub/payouts/batches')
      .set(auth(admin))
      .send({ currency: 'USD', provider: 'WISE' });
    expect(off.body).toMatchObject({ error: 'PAYOUTS_OFF' });
    await setFlag(true, ['PK']);

    // 1. Wise makes the transfer but doesn't fund it: the payout is sent (never failed,
    //    so it can't be paid a second time); Wise later cancels it: payable again.
    await mock.failNextFunding();
    const unfunded = await approvedBatch('WISE', [parent]);
    await t
      .http()
      .post(`/v1/admin/hub/payouts/batches/${unfunded}/send`)
      .set(auth(superA))
      .expect(200);
    const first = await payoutOf(unfunded);
    expect(first.status).toBe('SENT');
    expect(first.providerTransferId).toBeTruthy();
    expect(first.failureReason).toMatch(/not funded/);
    expect(await balance('STUDENT_PAYABLE', kid3.child.id)).toBe(0);
    await mock.settle(first.providerTransferId!, 'cancelled');
    await until(
      () => payoutOf(unfunded),
      (payout) => payout.status === 'FAILED',
    );
    expect(await balance('STUDENT_PAYABLE', kid3.child.id)).toBe(5_000);

    // 2. The answer is lost after Wise made the transfer: the payout stays sending (not
    //    failed); the status job asks again and finds the same transfer, then it's paid.
    await mock.loseNextAnswer();
    const lost = await approvedBatch('WISE', [parent]);
    await t.http().post(`/v1/admin/hub/payouts/batches/${lost}/send`).set(auth(superB)).expect(200);
    const sending = await payoutOf(lost);
    expect(sending).toMatchObject({ status: 'SENDING', providerTransferId: null });
    expect(sending.failureReason).toMatch(/^UNCLEAR/);
    // Not batched again while it's on its way (other families may be).
    const meanwhile = await t
      .http()
      .post('/v1/admin/hub/payouts/batches')
      .set(auth(admin))
      .send({ currency: 'USD', provider: 'WISE' });
    if (meanwhile.status === 201) {
      expect(meanwhile.body.payouts.map((p: { studentId: string }) => p.studentId)).not.toContain(
        kid3.child.id,
      );
    } else {
      expect(meanwhile.status).toBe(409);
    }
    const backdate = () =>
      t.prisma.payout.update({
        where: { id: sending.id },
        data: { updatedAt: new Date(Date.now() - 11 * 60_000) },
      });
    // Wise is down when the job asks again: still sending, never failed.
    await backdate();
    await mock.refuseNext();
    await service.reconcile();
    expect(await payoutOf(lost)).toMatchObject({ status: 'SENDING' });
    expect((await payoutOf(lost)).failureReason).toMatch(/^UNCLEAR: .*503/);
    await backdate();
    await until(
      async () => {
        await service.poll();
        return payoutOf(lost);
      },
      (payout) => payout.status === 'PAID',
    );
    const paid = await payoutOf(lost);
    expect(await t.redis.get(`mockwise:ctid:${paid.id}`)).toBe(paid.providerTransferId);
    expect(await postings(paid.id, 'payout.sent')).toBe(1);
    expect(await postings(paid.id, 'payout.paid')).toBe(1);
    expect(await balance('STUDENT_PAYABLE', kid3.child.id)).toBe(0);

    // 3. The bank sends it back after it was paid: payable again, and nothing is lost.
    const cashBefore = await balance('CASH', null);
    await mock.settle(paid.providerTransferId!, 'bounced_back');
    await until(
      () => payoutOf(lost),
      (payout) => payout.status === 'FAILED',
    );
    expect((await payoutOf(lost)).failureReason).toBe('RETURNED_AFTER_PAID: bounced_back');
    expect(await postings(paid.id, 'payout.returned')).toBe(1);
    expect(await balance('STUDENT_PAYABLE', kid3.child.id)).toBe(5_000);
    expect(await balance('CASH', null)).toBe(cashBefore + paid.netMinor);
    expect(lastMailTo(t.mail, kid3.parent.user.email!)?.template).toBe('hubPayoutFailed');

    // 4. Stuck in "sending": a super admin looks it up in Wise and settles it.
    await mock.loseNextAnswer();
    const stuck = await approvedBatch('WISE', [parent]);
    await t
      .http()
      .post(`/v1/admin/hub/payouts/batches/${stuck}/send`)
      .set(auth(superA))
      .expect(200);
    const unsure = await payoutOf(stuck);
    expect(unsure.status).toBe('SENDING');
    const settle = (token: string, body: object) =>
      t.http().post(`/v1/admin/hub/payouts/${unsure.id}/settle`).set(auth(token)).send(body);
    await settle(admin, { outcome: 'NO_TRANSFER', reason: 'Not in Wise' }).expect(403);
    // Only this payout's own transfer (made with its ID) settles it.
    const wrong = await settle(superB, {
      outcome: 'TRANSFER_FOUND',
      transferId: '999',
      reason: 'Found a transfer',
    }).expect(409);
    expect(wrong.body.error).toBe('TRANSFER_NOT_THIS_PAYOUT');
    const found = (await t.redis.get(`mockwise:ctid:${unsure.id}`))!;
    await settle(superB, {
      outcome: 'TRANSFER_FOUND',
      transferId: found,
      reason: 'Found KCP transfer in Wise',
    }).expect(200);
    await until(
      () => payoutOf(stuck),
      (payout) => payout.status === 'PAID',
    );
    expect(await postings(unsure.id, 'payout.sent')).toBe(1);
    await settle(superB, { outcome: 'NO_TRANSFER', reason: 'Not in Wise' }).expect(409);
    await payable(5_000);

    // 5. Once a manual batch is sent, staff may be paying it: the parent can't take it
    //    back, and changing the account leaves it for staff to record.
    const byHand = await approvedBatch('MANUAL', [parent]);
    await t
      .http()
      .post(`/v1/admin/hub/payouts/batches/${byHand}/send`)
      .set(auth(superA))
      .expect(200);
    const inHand = await payoutOf(byHand);
    expect(inHand.status).toBe('CONFIRMED');
    await t.http().post(`/v1/payouts/${inHand.id}/decline`).set(auth(parent)).expect(409);
    await t
      .http()
      .post('/v1/payout-account/remove')
      .set(auth(parent))
      .send({ password: PASSWORD })
      .expect(204);
    expect((await payoutOf(byHand)).status).toBe('CONFIRMED');
    await t
      .http()
      .post(`/v1/admin/hub/payouts/${inHand.id}/record`)
      .set(auth(admin))
      .send({ method: 'Bank transfer', reference: 'TRX-20261102' })
      .expect(200);
    expect(await balance('STUDENT_PAYABLE', kid3.child.id)).toBe(0);
    await setFlag(false);
  });

  it('pays lead developers by hand, keeps the books balanced and refuses forged webhooks', async () => {
    await setFlag(true);
    const tooMuch = await t
      .http()
      .post(`/v1/admin/hub/leads/${lead.user.id}/payments`)
      .set(auth(admin))
      .send({ currency: 'USD', amountMinor: 30_001, reference: 'Bank TRX-9' })
      .expect(409);
    expect(tooMuch.body.error).toBe('MORE_THAN_OWED');
    await t
      .http()
      .post(`/v1/admin/hub/leads/${lead.user.id}/payments`)
      .set(auth(admin))
      .send({ currency: 'USD', amountMinor: 10_000, reference: 'Bank TRX-8' })
      .expect(201);
    // A double click (or a retry) records it once: one payment per bank reference.
    const again = await t
      .http()
      .post(`/v1/admin/hub/leads/${lead.user.id}/payments`)
      .set(auth(admin))
      .send({ currency: 'USD', amountMinor: 10_000, reference: ' bank  trx-8 ' })
      .expect(409);
    expect(again.body.error).toBe('ALREADY_RECORDED');
    await t
      .http()
      .post(`/v1/admin/hub/leads/${lead.user.id}/payments`)
      .set(auth(admin))
      .send({ currency: 'USD', amountMinor: 20_000, reference: 'Bank TRX-9' })
      .expect(201);
    expect(await balance('LEAD_PAYABLE', lead.user.id)).toBe(0);
    await setFlag(false);
    const leadView = await t
      .http()
      .get('/v1/mentor/hub/earnings')
      .set(auth(lead.token))
      .expect(200);
    expect(leadView.body.lines[0]).toMatchObject({ kind: 'lead.paid', amountMinor: -20_000 });

    const books = await t
      .http()
      .get('/v1/admin/hub/ledger/trial-balance')
      .set(auth(admin))
      .expect(200);
    for (const currency of books.body) expect(currency.debits).toBe(currency.credits);
    const posted = await t
      .http()
      .get(`/v1/admin/hub/ledger/transactions?refId=${projectId}`)
      .set(auth(admin))
      .expect(200);
    expect(Array.isArray(posted.body)).toBe(true);
    const shared = await t
      .http()
      .get('/v1/admin/hub/ledger/transactions?kind=earnings.shared')
      .set(auth(admin))
      .expect(200);
    const entry = shared.body[0];
    const debits = entry.entries
      .filter((e: { side: string }) => e.side === 'DEBIT')
      .reduce((sum: number, e: { amountMinor: number }) => sum + e.amountMinor, 0);
    const credits = entry.entries
      .filter((e: { side: string }) => e.side === 'CREDIT')
      .reduce((sum: number, e: { amountMinor: number }) => sum + e.amountMinor, 0);
    expect(debits).toBe(credits);

    await t
      .http()
      .post('/v1/payouts/webhooks/wise')
      .set('content-type', 'application/json')
      .set('x-signature-sha256', Buffer.from('forged').toString('base64'))
      .send(
        JSON.stringify({
          event_type: 'transfers#state-change',
          data: { resource: { id: 1 }, current_state: 'outgoing_payment_sent' },
        }),
      )
      .expect(400);
    // Parents and students never see staff pages.
    await t
      .http()
      .get('/v1/admin/hub/payouts/batches')
      .set(auth(kid1.parent.accessToken))
      .expect(403);
    await t.http().get('/v1/payouts').set(auth(kid1.student)).expect(403);
  });
});
