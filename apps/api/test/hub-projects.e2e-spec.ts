import { HUB_AGREEMENTS } from '@kcp/shared';
import { ChatService } from '../src/chat/chat.service.js';
import { DeliveriesService } from '../src/hub/deliveries.service.js';
import { LedgerService } from '../src/hub/ledger/ledger.service.js';
import {
  createTestApp,
  lastMailTo,
  resetRateLimits,
  staffLogin,
  type TestContext,
} from './helpers.js';
import {
  approvedProject,
  clientProject,
  payByCard,
  readyMentor,
  THREE_TASKS,
} from './hub-fixture.js';
import { auth } from './learning-fixture.js';

describe('hub projects: scoping, quotes and invoices (e2e)', () => {
  let t: TestContext;
  let admin: string;
  let lead: { user: { id: string }; token: string };
  let ledger: LedgerService;

  beforeAll(async () => {
    t = await createTestApp();
    admin = (await staffLogin(t, 'admin')).token;
    lead = await readyMentor(t, admin, true);
    ledger = t.app.get(LedgerService);
  });

  beforeEach(async () => {
    await resetRateLimits(t.redis);
  });

  afterAll(async () => {
    await t.app.close();
  });

  it('scopes a project, quotes it, takes the deposit by card and starts the work', async () => {
    const { client, contactEmail, projectId, orgId } = await clientProject(t, admin, lead.user.id);
    const leadView = await t
      .http()
      .get(`/v1/mentor/hub/projects/${projectId}`)
      .set(auth(lead.token))
      .expect(200);
    expect(leadView.body).toMatchObject({
      status: 'SCOPING',
      split: { student: 50, lead: 25, platform: 25 },
    });
    // Another lead (or a mentor) doesn't see it.
    const other = await readyMentor(t, admin, true);
    await t.http().get(`/v1/mentor/hub/projects/${projectId}`).set(auth(other.token)).expect(404);

    // The lead plans three tasks; the shares must add up to 100% before sending.
    const draft = await t
      .http()
      .post(`/v1/mentor/hub/projects/${projectId}/quotes`)
      .set(auth(lead.token))
      .send({ kind: 'MAIN', priceMinor: 120_000, note: 'Hosting is not included.' })
      .expect(201);
    const quoteId = draft.body.quotes[0].id as string;
    await t
      .http()
      .post(`/v1/mentor/hub/projects/${projectId}/quotes`)
      .set(auth(lead.token))
      .send({ kind: 'MAIN', priceMinor: 1000 })
      .expect(409);
    for (const task of THREE_TASKS) {
      await t
        .http()
        .post(`/v1/mentor/hub/quotes/${quoteId}/tasks`)
        .set(auth(lead.token))
        .send({ ...task, shareBp: task.shareBp === 2000 ? 1500 : task.shareBp })
        .expect(201);
    }
    const unbalanced = await t
      .http()
      .post(`/v1/mentor/hub/quotes/${quoteId}/send`)
      .set(auth(lead.token))
      .expect(409);
    expect(unbalanced.body).toMatchObject({ error: 'SHARES_NOT_100', details: { total: 9500 } });
    const scoped = await t
      .http()
      .get(`/v1/mentor/hub/projects/${projectId}`)
      .set(auth(lead.token))
      .expect(200);
    const tasks = scoped.body.quotes[0].tasks as {
      id: string;
      reference: string;
      shareBp: number;
    }[];
    expect(tasks.map((task) => task.reference)).toEqual(['T-1', 'T-2', 'T-3']);
    await t
      .http()
      .put(`/v1/mentor/hub/quotes/${quoteId}/shares`)
      .set(auth(lead.token))
      .send({ shares: [{ taskId: tasks[2]!.id, shareBp: 2500 }] })
      .expect(409);
    await t
      .http()
      .put(`/v1/mentor/hub/quotes/${quoteId}/shares`)
      .set(auth(lead.token))
      .send({ shares: [{ taskId: tasks[2]!.id, shareBp: 2000 }] })
      .expect(200);
    const sent = await t
      .http()
      .post(`/v1/mentor/hub/quotes/${quoteId}/send`)
      .set(auth(lead.token))
      .expect(200);
    expect(sent.body.status).toBe('QUOTED');
    expect(sent.body.quotes[0]).toMatchObject({
      status: 'SENT',
      depositMinor: 36_000,
      sowVersion: HUB_AGREEMENTS.sow,
    });
    expect(lastMailTo(t.mail, contactEmail)?.template).toBe('hubQuoteSent');
    // What's with the client doesn't change under them.
    const locked = await t
      .http()
      .patch(`/v1/mentor/hub/tasks/${tasks[0]!.id}`)
      .set(auth(lead.token))
      .send({ title: 'Something else' })
      .expect(409);
    expect(locked.body.error).toBe('QUOTE_WITH_CLIENT');

    // The client sees the deliverables and the statement of work — not specs, shares or who.
    const clientView = await t
      .http()
      .get(`/v1/client/projects/${projectId}`)
      .set(auth(client.token))
      .expect(200);
    const quote = clientView.body.quotes[0];
    expect(quote.deliverables.map((d: { title: string }) => d.title)).toEqual(
      THREE_TASKS.map((task) => task.title),
    );
    expect(quote.sowText).toContain('Home page with the menu');
    expect(quote.sowText).toContain('1,200.00 USD');
    expect(JSON.stringify(clientView.body)).not.toMatch(/shareBp|"spec"|assignee/);
    const stale = await t
      .http()
      .post(`/v1/client/projects/${projectId}/quotes/${quoteId}/approve`)
      .set(auth(client.token))
      .send({ sowVersion: '2000-01', agree: true })
      .expect(409);
    expect(stale.body.error).toBe('AGREEMENT_CHANGED');
    const approved = await t
      .http()
      .post(`/v1/client/projects/${projectId}/quotes/${quoteId}/approve`)
      .set(auth(client.token))
      .send({ sowVersion: HUB_AGREEMENTS.sow, agree: true })
      .expect(200);
    expect(approved.body.status).toBe('AWAITING_DEPOSIT');
    const deposit = approved.body.invoices[0];
    expect(deposit).toMatchObject({
      kind: 'DEPOSIT',
      status: 'OPEN',
      amountMinor: 36_000,
      currency: 'USD',
    });
    expect(deposit.reference).toMatch(/^H-\d{4,}$/);
    expect(lastMailTo(t.mail, contactEmail)?.template).toBe('hubInvoiceIssued');
    expect(await ledger.balance('CLIENT_RECEIVABLE', 'USD', orgId)).toBe(36_000);
    expect(await ledger.balance('PROJECT_FUNDS', 'USD', projectId)).toBe(36_000);

    // The client pays by card (the mock of Stripe): the work starts.
    const paid = await payByCard(t, client.token, deposit.id);
    expect(paid.payments).toEqual([
      expect.objectContaining({ provider: 'STRIPE', amountMinor: 36_000 }),
    ]);
    expect(lastMailTo(t.mail, contactEmail)?.template).toBe('hubInvoicePaid');
    const active = await t
      .http()
      .get(`/v1/mentor/hub/projects/${projectId}`)
      .set(auth(lead.token))
      .expect(200);
    expect(active.body.status).toBe('ACTIVE');
    expect(await ledger.balance('CLIENT_RECEIVABLE', 'USD', orgId)).toBe(0);
    expect(await ledger.balance('PROJECT_FUNDS', 'USD', projectId)).toBe(36_000);
    // Paying again: nothing to pay.
    await t
      .http()
      .post(`/v1/client/invoices/${deposit.id}/checkout`)
      .set(auth(client.token))
      .expect(409);

    // A change beyond the statement of work: its own quote (no deposit).
    const change = await t
      .http()
      .post(`/v1/mentor/hub/projects/${projectId}/quotes`)
      .set(auth(lead.token))
      .send({ kind: 'CHANGE', priceMinor: 20_000 })
      .expect(201);
    const changeId = change.body.quotes.at(-1).id as string;
    await t
      .http()
      .post(`/v1/mentor/hub/quotes/${changeId}/tasks`)
      .set(auth(lead.token))
      .send({ ...THREE_TASKS[0], title: 'Gallery page', shareBp: 10_000 })
      .expect(201);
    await t.http().post(`/v1/mentor/hub/quotes/${changeId}/send`).set(auth(lead.token)).expect(200);
    const both = await t
      .http()
      .post(`/v1/client/projects/${projectId}/quotes/${changeId}/approve`)
      .set(auth(client.token))
      .send({ sowVersion: HUB_AGREEMENTS.sow, agree: true })
      .expect(200);
    expect(both.body.status).toBe('ACTIVE');
    expect(both.body.quotes.find((q: { id: string }) => q.id === changeId)).toMatchObject({
      kind: 'CHANGE',
      status: 'APPROVED',
      depositMinor: 0,
    });
    expect(both.body.invoices).toHaveLength(1);
    const trial = await ledger.trialBalance();
    for (const currency of trial) expect(currency.debits).toBe(currency.credits);
  });

  it('lets the lead withdraw a quote, the client decline one, and staff run invoices and projects', async () => {
    const { client, projectId, orgId } = await clientProject(t, admin, lead.user.id);
    const { quoteId: firstQuote, project } = await approvedProject(
      t,
      lead.token,
      client.token,
      projectId,
    );
    // Staff record a bank transfer for the deposit.
    const deposit = project.invoices[0];
    await t
      .http()
      .post(`/v1/admin/hub/invoices/${deposit.id}/payments`)
      .set(auth(admin))
      .send({ method: 'Bank transfer', reference: 'MEEZAN-778812', paidAt: '2026-10-02' })
      .expect(204);
    await t
      .http()
      .post(`/v1/admin/hub/invoices/${deposit.id}/payments`)
      .set(auth(admin))
      .send({ method: 'Bank transfer', reference: 'AGAIN', paidAt: '2026-10-02' })
      .expect(409);
    const invoices = await t
      .http()
      .get('/v1/admin/hub/invoices?status=PAID')
      .set(auth(admin))
      .expect(200);
    expect(
      invoices.body.find((i: { id: string }) => i.id === deposit.id).payments[0],
    ).toMatchObject({
      provider: 'MANUAL',
      reference: 'MEEZAN-778812',
    });
    expect(firstQuote).toBeTruthy();

    // A change quote, withdrawn by the lead and declined by the client.
    const change = await t
      .http()
      .post(`/v1/mentor/hub/projects/${projectId}/quotes`)
      .set(auth(lead.token))
      .send({ kind: 'CHANGE', priceMinor: 30_000 })
      .expect(201);
    const changeId = change.body.quotes.at(-1).id as string;
    await t
      .http()
      .post(`/v1/mentor/hub/quotes/${changeId}/tasks`)
      .set(auth(lead.token))
      .send({ ...THREE_TASKS[1], shareBp: 10_000 })
      .expect(201);
    await t.http().post(`/v1/mentor/hub/quotes/${changeId}/send`).set(auth(lead.token)).expect(200);
    await t
      .http()
      .post(`/v1/mentor/hub/quotes/${changeId}/withdraw`)
      .set(auth(lead.token))
      .expect(200);
    await t
      .http()
      .post(`/v1/client/projects/${projectId}/quotes/${changeId}/approve`)
      .set(auth(client.token))
      .send({ sowVersion: HUB_AGREEMENTS.sow, agree: true })
      .expect(409);
    const again = await t
      .http()
      .post(`/v1/mentor/hub/projects/${projectId}/quotes`)
      .set(auth(lead.token))
      .send({ kind: 'CHANGE', priceMinor: 25_000 })
      .expect(201);
    const againId = again.body.quotes.at(-1).id as string;
    await t
      .http()
      .post(`/v1/mentor/hub/quotes/${againId}/tasks`)
      .set(auth(lead.token))
      .send({ ...THREE_TASKS[1], shareBp: 10_000 })
      .expect(201);
    await t.http().post(`/v1/mentor/hub/quotes/${againId}/send`).set(auth(lead.token)).expect(200);
    const declined = await t
      .http()
      .post(`/v1/client/projects/${projectId}/quotes/${againId}/decline`)
      .set(auth(client.token))
      .send({ reason: 'Not this month' })
      .expect(200);
    expect(declined.body.quotes.find((q: { id: string }) => q.id === againId).status).toBe(
      'DECLINED',
    );
    expect(declined.body.status).toBe('ACTIVE');

    // Staff: the split is fixed once the main quote went out; a paid project can't be cancelled.
    const fixed = await t
      .http()
      .patch(`/v1/admin/hub/projects/${projectId}`)
      .set(auth(admin))
      .send({ studentPercent: 60, platformPercent: 15, reason: 'Pilot terms' })
      .expect(409);
    expect(fixed.body.error).toBe('QUOTE_SENT');
    const paidProject = await t
      .http()
      .post(`/v1/admin/hub/projects/${projectId}/cancel`)
      .set(auth(admin))
      .send({ reason: 'Client went quiet' })
      .expect(409);
    expect(paidProject.body.error).toBe('PAID_INVOICES');
    const adminView = await t
      .http()
      .get(`/v1/admin/hub/projects/${projectId}`)
      .set(auth(admin))
      .expect(200);
    expect(adminView.body).toMatchObject({ orgId, fundsMinor: 36_000, status: 'ACTIVE' });

    // A new lead takes the old one's place in the team's room.
    const room = await t.app
      .get(ChatService)
      .createRoom('HUB', projectId, 'Team room', [{ userId: lead.user.id, role: 'ADULT' }]);
    const lead2 = await readyMentor(t, admin, true);
    await t
      .http()
      .patch(`/v1/admin/hub/projects/${projectId}`)
      .set(auth(admin))
      .send({ leadId: lead2.user.id, reason: 'The lead is on leave' })
      .expect(200);
    const members = await t.prisma.chatMember.findMany({ where: { roomId: room.id } });
    expect(members.map((m) => [m.userId, m.role])).toEqual([[lead2.user.id, 'ADULT']]);
    // No longer a lead: out of the hub rooms at once.
    await t
      .http()
      .patch(`/v1/admin/mentors/${lead2.user.id}`)
      .set(auth(admin))
      .send({ isLead: false, reason: 'Back to reviews only' })
      .expect(204);
    expect(await t.prisma.chatMember.count({ where: { roomId: room.id } })).toBe(0);

    // A second project: its deposit voided, then the project cancelled.
    const second = await clientProject(t, admin, lead.user.id);
    const quoted = await approvedProject(
      t,
      lead.token,
      second.client.token,
      second.projectId,
      50_000,
    );
    const open = quoted.project.invoices[0];
    // A lead who loses the role (or is paused) can't act on their projects any more.
    await t.prisma.mentorProfile.update({
      where: { userId: lead.user.id },
      data: { isLead: false },
    });
    const lockedTask = await t.prisma.hubTask.findFirstOrThrow({
      where: { quoteId: quoted.quoteId },
    });
    await t
      .http()
      .patch(`/v1/mentor/hub/tasks/${lockedTask.id}`)
      .set(auth(lead.token))
      .send({ title: 'Renamed' })
      .expect(404);
    await t.prisma.mentorProfile.update({
      where: { userId: lead.user.id },
      data: { isLead: true },
    });
    // A milestone waiting for the client when the project is cancelled goes with it.
    const waitingDelivery = await t.app
      .get(DeliveriesService)
      .save(
        second.projectId,
        quoted.quoteId,
        { title: 'First look', notes: 'The menu.', final: false, commit: 'c'.repeat(40) },
        async () => [],
        null,
      );
    const withOpen = await t
      .http()
      .post(`/v1/admin/hub/projects/${second.projectId}/cancel`)
      .set(auth(admin))
      .send({ reason: 'Client went quiet' })
      .expect(409);
    expect(withOpen.body.error).toBe('OPEN_INVOICES');
    await t
      .http()
      .post(`/v1/admin/hub/invoices/${open.id}/void`)
      .set(auth(admin))
      .send({ reason: 'Client changed their mind' })
      .expect(204);
    expect(await ledger.balance('PROJECT_FUNDS', 'USD', second.projectId)).toBe(0);
    expect(await ledger.balance('CLIENT_RECEIVABLE', 'USD', second.orgId)).toBe(0);
    const cancelled = await t
      .http()
      .post(`/v1/admin/hub/projects/${second.projectId}/cancel`)
      .set(auth(admin))
      .send({ reason: 'Client changed their mind' })
      .expect(200);
    expect(cancelled.body.status).toBe('CANCELLED');
    expect(
      (await t.prisma.hubDelivery.findUniqueOrThrow({ where: { id: waitingDelivery } })).status,
    ).toBe('WITHDRAWN');
    const lateAccept = await t
      .http()
      .post(`/v1/client/projects/${second.projectId}/deliveries/${waitingDelivery}/accept`)
      .set(auth(second.client.token))
      .send({})
      .expect(409);
    expect(lateAccept.body.error).toBe('PROJECT_NOT_ACTIVE');
    // Mentors can't reach staff routes; clients can't reach the lead's.
    await t.http().get('/v1/admin/hub/projects').set(auth(lead.token)).expect(403);
    const notLead = await t
      .http()
      .get('/v1/mentor/hub/projects')
      .set(auth(client.token))
      .expect(403);
    expect(notLead.body.error).toBe('NOT_LEAD');
  });
});
