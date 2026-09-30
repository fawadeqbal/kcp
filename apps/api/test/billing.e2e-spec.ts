import { Stripe } from 'stripe';
import { MOCK_STRIPE_WEBHOOK_SECRET } from '../src/config/env.js';
import { BillingJobsService } from '../src/billing/billing-jobs.service.js';
import { StripeGateway } from '../src/billing/stripe/stripe.gateway.js';
import {
  childBody,
  createTestApp,
  resetRateLimits,
  staffLogin,
  type TestContext,
} from './helpers.js';
import {
  auth,
  family,
  hideLearningFixture,
  P_CHECKS,
  pass,
  seedLearningFixture,
  seedProjectFixture,
} from './learning-fixture.js';

/** The premium lesson of the fixture (lesson 2 while this spec runs). */
const PREMIUM_LESSON = 'e2e-m01-l02';
const PREMIUM_CHALLENGE = 'e2e-m01-l02-c1';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Waits for the mock's webhooks to arrive and be handled. */
async function until<T>(read: () => Promise<T>, done: (value: T) => boolean): Promise<T> {
  for (let i = 0; i < 100; i++) {
    const value = await read();
    if (done(value)) return value;
    await sleep(50);
  }
  throw new Error('Timed out waiting for the webhook');
}

describe('plans and payments (e2e)', () => {
  let t: TestContext;
  let admin: { token: string };

  beforeAll(async () => {
    t = await createTestApp();
    await seedLearningFixture(t.prisma);
    await seedProjectFixture(t.prisma);
    await t.prisma.lesson.update({ where: { id: PREMIUM_LESSON }, data: { isPremium: true } });
    await t.prisma.featureFlag.update({ where: { key: 'payments' }, data: { enabled: true } });
    admin = await staffLogin(t, 'admin');
  });

  beforeEach(async () => {
    await resetRateLimits(t.redis);
  });

  afterAll(async () => {
    await t.prisma.lesson.update({ where: { id: PREMIUM_LESSON }, data: { isPremium: false } });
    await hideLearningFixture(t.prisma);
    await t.app.close();
  });

  /** Ends a student's trial, as if 14 days had passed. */
  const endTrial = (studentId: string) =>
    t.prisma.studentProfile.update({
      where: { userId: studentId },
      data: { trialEndsAt: new Date(Date.now() - 1000) },
    });

  const billingOf = async (token: string) =>
    (await t.http().get('/v1/billing').set(auth(token)).expect(200)).body as {
      subscription: {
        status: string;
        planKey: string;
        children: number;
        amountMinor: number;
      } | null;
      children: { id: string; premium: boolean; source: string | null }[];
      invoices: { id: string; number: string; status: string; amountMinor: number }[];
      plans: { key: string; totalMinor: number; extraChildren: number }[];
      checkoutAvailable: boolean;
      currency: string;
    };

  /** Pays by card through the mock's checkout page, like a parent in a browser. */
  async function payByCard(parentToken: string, planKey = 'monthly') {
    const checkout = await t
      .http()
      .post('/v1/billing/checkout')
      .set(auth(parentToken))
      .send({ planKey, locale: 'ur' })
      .expect(200);
    const url = new URL(checkout.body.url as string);
    expect(url.pathname).toMatch(/^\/v1\/payments\/mock-stripe\/checkout\/cs_mock_/);
    const page = await t.http().get(url.pathname).expect(200);
    expect(page.text).toContain('Test mode');
    expect(page.headers['content-security-policy']).toContain('form-action');
    const paid = await t.http().post(`${url.pathname}/pay`).expect(303);
    expect(paid.headers['location']).toMatch(/\/ur\/billing\?checkout=success$/);
    return until(
      () => billingOf(parentToken),
      (b) => b.subscription?.status === 'ACTIVE' && b.invoices.length > 0,
    );
  }

  it('prices the plans per country for the marketing site', async () => {
    const res = await t.http().get('/v1/public/pricing').expect(200);
    expect(res.body.trialDays).toBe(14);
    expect(res.body.familyDiscountPercent).toBe(30);
    const pk = res.body.countries.find((c: { code: string }) => c.code === 'PK');
    expect(pk).toMatchObject({ currency: 'PKR', monthlyMinor: 150_000, yearlyMinor: 1_500_000 });
  });

  it('gives new students a trial, then locks premium lessons until the family pays', async () => {
    const { parent, child, student } = await family(t);
    // During the trial, premium lessons open.
    await t.http().get(`/v1/learning/lessons/${PREMIUM_LESSON}`).set(auth(student)).expect(200);
    const map = await t.http().get('/v1/learning/tracks').set(auth(student)).expect(200);
    expect(map.body.premium).toMatchObject({ active: true, source: 'trial' });

    await endTrial(child.id);
    const locked = await t
      .http()
      .get(`/v1/learning/lessons/${PREMIUM_LESSON}`)
      .set(auth(student))
      .expect(403);
    expect(locked.body.error).toBe('PREMIUM_REQUIRED');
    await t
      .http()
      .post(`/v1/learning/challenges/${PREMIUM_CHALLENGE}/submissions`)
      .set(auth(student))
      .send({ code: { html: '<p>x</p>' }, results: pass(P_CHECKS) })
      .expect(403);
    const lockedMap = await t.http().get('/v1/learning/tracks').set(auth(student)).expect(200);
    const lesson = lockedMap.body.tracks
      .flatMap((tr: { modules: { lessons: { id: string; locked: boolean }[] }[] }) => tr.modules)
      .flatMap((m: { lessons: { id: string; locked: boolean }[] }) => m.lessons)
      .find((l: { id: string }) => l.id === PREMIUM_LESSON);
    expect(lesson.locked).toBe(true);
    // Free lessons stay open; parents can always look.
    await t.http().get('/v1/learning/lessons/e2e-m01-l01').set(auth(student)).expect(200);
    await t
      .http()
      .get(`/v1/learning/lessons/${PREMIUM_LESSON}`)
      .set(auth(parent.accessToken))
      .expect(200);

    // The parent pays by card (the Stripe mock, with signed webhooks).
    const before = await billingOf(parent.accessToken);
    expect(before.checkoutAvailable).toBe(true);
    expect(before.currency).toBe('PKR');
    expect(before.children[0]).toMatchObject({ premium: false, source: null });
    const after = await payByCard(parent.accessToken);
    expect(after.subscription).toMatchObject({ status: 'ACTIVE', planKey: 'monthly', children: 1 });
    expect(after.subscription?.amountMinor).toBe(150_000);
    expect(after.children[0]).toMatchObject({ premium: true, source: 'subscription' });
    expect(after.invoices[0]).toMatchObject({ status: 'PAID', amountMinor: 150_000 });
    expect(after.invoices[0]?.number).toMatch(/^KCP-\d{6}$/);
    await t.http().get(`/v1/learning/lessons/${PREMIUM_LESSON}`).set(auth(student)).expect(200);

    // Every event is logged once, in order of arrival.
    const events = await t.prisma.paymentEvent.findMany({
      where: { parentId: parent.user.id },
      orderBy: { createdAt: 'asc' },
    });
    expect(events.map((e) => e.type)).toEqual(
      expect.arrayContaining(['checkout.session.completed', 'invoice.paid']),
    );

    // The invoice: the family's own, and nobody else's.
    const invoiceId = after.invoices[0]!.id;
    const invoice = await t
      .http()
      .get(`/v1/billing/invoices/${invoiceId}`)
      .set(auth(parent.accessToken))
      .expect(200);
    expect(invoice.body).toMatchObject({ paidWith: 'CARD', planKey: 'monthly', currency: 'PKR' });
    expect(invoice.body.lines).toEqual([{ kind: 'first', quantity: 1, unitMinor: 150_000 }]);
    const other = await family(t);
    await t
      .http()
      .get(`/v1/billing/invoices/${invoiceId}`)
      .set(auth(other.parent.accessToken))
      .expect(404);
    await t.http().get('/v1/billing').set(auth(student)).expect(403);

    // A second plan can't be bought while one runs.
    await t
      .http()
      .post('/v1/billing/checkout')
      .set(auth(parent.accessToken))
      .send({ planKey: 'yearly', locale: 'en' })
      .expect(409);

    // A full refund (admin) reverses it: premium is gone straight away.
    const family$ = await t
      .http()
      .get(`/v1/admin/users/${parent.user.id}/billing`)
      .set(auth(admin.token))
      .expect(200);
    const payment = family$.body.payments[0];
    expect(payment).toMatchObject({
      provider: 'STRIPE',
      status: 'SUCCEEDED',
      amountMinor: 150_000,
    });
    await t
      .http()
      .post(`/v1/admin/billing/payments/${payment.id}/refunds`)
      .set(auth(admin.token))
      .send({ reason: 'x' })
      .expect(400);
    const refunded = await t
      .http()
      .post(`/v1/admin/billing/payments/${payment.id}/refunds`)
      .set(auth(admin.token))
      .send({ reason: 'Charged twice by mistake' })
      .expect(200);
    expect(refunded.body).toMatchObject({ status: 'REFUNDED', refundedMinor: 150_000 });
    expect(refunded.body.refunds).toHaveLength(1);
    await t.http().get(`/v1/learning/lessons/${PREMIUM_LESSON}`).set(auth(student)).expect(403);
    const ended = await billingOf(parent.accessToken);
    expect(ended.subscription?.status).toBe('CANCELED');
    expect(ended.invoices[0]?.status).toBe('REFUNDED');
    // Stripe's own webhook about the refund (and the cancellation) changes nothing more.
    await sleep(300);
    const refunds = await t.prisma.refund.count({ where: { paymentId: payment.id } });
    expect(refunds).toBe(1);
    const audit = await t.prisma.auditLog.findFirst({
      where: { action: 'payment.refund', entityId: payment.id },
    });
    expect(audit?.after).toMatchObject({ reason: 'Charged twice by mistake', full: true });
  });

  it('checks webhook signatures and handles each event once', async () => {
    const payload = JSON.stringify({
      id: `evt_test_${Date.now()}`,
      object: 'event',
      type: 'customer.created',
      created: Math.floor(Date.now() / 1000),
      data: { object: { id: 'cus_x', object: 'customer' } },
    });
    await t
      .http()
      .post('/v1/payments/webhooks/stripe')
      .set('content-type', 'application/json')
      .set('stripe-signature', 't=1,v1=bad')
      .send(payload)
      .expect(400);
    const signature = Stripe.webhooks.generateTestHeaderString({
      payload,
      secret: MOCK_STRIPE_WEBHOOK_SECRET,
    });
    for (let i = 0; i < 2; i++) {
      await t
        .http()
        .post('/v1/payments/webhooks/stripe')
        .set('content-type', 'application/json')
        .set('stripe-signature', signature)
        .send(payload)
        .expect(200);
    }
    const id = (JSON.parse(payload) as { id: string }).id;
    expect(await t.prisma.paymentEvent.count({ where: { eventId: id } })).toBe(1);
    // The log can't be changed afterwards.
    await expect(
      t.prisma.paymentEvent.updateMany({ where: { eventId: id }, data: { type: 'changed' } }),
    ).rejects.toThrow(/append-only/);
  });

  it('covers every child with the family discount, and handles cancel, resume and plan changes', async () => {
    const { parent, child } = await family(t);
    await endTrial(child.id);
    const second = await t
      .http()
      .post('/v1/children')
      .set(auth(parent.accessToken))
      .send(childBody())
      .expect(201);
    const quote = await billingOf(parent.accessToken);
    const monthly = quote.plans.find((p) => p.key === 'monthly');
    // 1,500 + 1,050 (30% off the second child).
    expect(monthly).toMatchObject({ extraChildren: 1, totalMinor: 255_000 });

    const paid = await payByCard(parent.accessToken);
    expect(paid.subscription).toMatchObject({ children: 2, amountMinor: 255_000 });
    expect(paid.children.every((c) => c.premium)).toBe(true);

    // Cancelling keeps premium until the period ends; resuming undoes it.
    const cancelled = await t
      .http()
      .post('/v1/billing/cancel')
      .set(auth(parent.accessToken))
      .expect(200);
    expect(cancelled.body.cancelAtPeriodEnd).toBe(true);
    expect((await billingOf(parent.accessToken)).children[0]?.premium).toBe(true);
    await t.http().post('/v1/billing/resume').set(auth(parent.accessToken)).expect(200);

    // A third child is covered at once, and the difference for the rest of the month
    // is charged now (so a family can't add children for free until the renewal).
    await t.http().post('/v1/children').set(auth(parent.accessToken)).send(childBody()).expect(201);
    const three = await until(
      () => billingOf(parent.accessToken),
      (b) => b.invoices.length === 2,
    );
    expect(three.subscription).toMatchObject({ children: 3, amountMinor: 360_000 });
    expect(three.children).toHaveLength(3);
    expect(three.children.every((c) => c.premium)).toBe(true);
    // 1,050 more a month, for (almost) the whole month that's left.
    expect(three.invoices[0]?.amountMinor).toBeGreaterThan(104_000);
    expect(three.invoices[0]?.amountMinor).toBeLessThanOrEqual(105_000);

    // Monthly → yearly starts a new, yearly period and charges it.
    const changed = await t
      .http()
      .post('/v1/billing/plan')
      .set(auth(parent.accessToken))
      .send({ planKey: 'yearly' })
      .expect(200);
    expect(changed.body.planKey).toBe('yearly');
    const yearly = await until(
      () => billingOf(parent.accessToken),
      (b) => b.invoices.length === 3,
    );
    expect(yearly.invoices[0]?.amountMinor).toBe(3_600_000);
    expect(yearly.subscription).toMatchObject({ planKey: 'yearly', status: 'ACTIVE' });

    // A failed renewal: the plan is past due, and premium stays while Stripe retries.
    const gateway = t.app.get(StripeGateway);
    const subscription = await t.prisma.subscription.findFirstOrThrow({
      where: { parentId: parent.user.id, status: 'ACTIVE' },
    });
    await gateway.mock!.renew(subscription.providerSubscriptionId!, true);
    const pastDue = await until(
      () => billingOf(parent.accessToken),
      (b) => b.subscription?.status === 'PAST_DUE',
    );
    expect(pastDue.children.every((c) => c.premium)).toBe(true);
    await gateway.mock!.renew(subscription.providerSubscriptionId!);
    await until(
      () => billingOf(parent.accessToken),
      (b) => b.subscription?.status === 'ACTIVE' && b.invoices.length === 4,
    );
    expect(second.body.id).toBeTruthy();
  });

  it('keeps the newest plan when two checkouts are paid, and bills the family once', async () => {
    const { parent, child } = await family(t);
    await endTrial(child.id);
    const open = async () => {
      const checkout = await t
        .http()
        .post('/v1/billing/checkout')
        .set(auth(parent.accessToken))
        .send({ planKey: 'monthly', locale: 'en' })
        .expect(200);
      return new URL(checkout.body.url as string).pathname;
    };
    // Two checkout pages open at once (a race: the second didn't see the first).
    const first = await open();
    await t.redis.del(`billing:open-checkout:${parent.user.id}`);
    const second = await open();
    await t.http().post(`${first}/pay`).expect(303);
    const a = await until(
      () => t.prisma.subscription.findFirst({ where: { parentId: parent.user.id } }),
      (s) => s?.status === 'ACTIVE',
    );
    await t.http().post(`${second}/pay`).expect(303);
    const b = await until(
      () =>
        t.prisma.subscription.findFirst({
          where: { parentId: parent.user.id, id: { not: a!.id } },
        }),
      (s) => s?.status === 'ACTIVE',
    );

    // The older plan stops at Stripe too; its own "deleted" event must not cancel
    // the plan that replaced it.
    const gateway = t.app.get(StripeGateway);
    await until(
      () =>
        t.prisma.paymentEvent.count({
          where: { type: 'customer.subscription.deleted', subscriptionId: a!.id },
        }),
      (count) => count > 0,
    );
    await sleep(300);
    const stripeA = await gateway.client.subscriptions.retrieve(a!.providerSubscriptionId!);
    const stripeB = await gateway.client.subscriptions.retrieve(b!.providerSubscriptionId!);
    expect(stripeA.status).toBe('canceled');
    expect(stripeB.status).toBe('active');
    const billing = await billingOf(parent.accessToken);
    expect(billing.subscription).toMatchObject({ status: 'ACTIVE' });
    expect((await t.prisma.subscription.findUniqueOrThrow({ where: { id: a!.id } })).status).toBe(
      'CANCELED',
    );
  });

  it('cancels at Stripe later when Stripe was unreachable at the time', async () => {
    const { parent, child } = await family(t);
    await endTrial(child.id);
    await payByCard(parent.accessToken);
    const live = await t.prisma.subscription.findFirstOrThrow({
      where: { parentId: parent.user.id, status: 'ACTIVE' },
    });
    // As if the account was deleted while Stripe was down: ended here, still running there.
    await t.prisma.subscription.update({
      where: { id: live.id },
      data: { status: 'CANCELED', canceledAt: new Date(), endedAt: new Date() },
    });
    const jobs = t.app.get(BillingJobsService);
    expect(await jobs.stopEndedPlansAtStripe()).toBeGreaterThanOrEqual(1);
    const gateway = t.app.get(StripeGateway);
    const atStripe = await gateway.client.subscriptions.retrieve(live.providerSubscriptionId!);
    expect(atStripe.status).toBe('canceled');
    // Nothing left to do the next night.
    const again = await jobs.stopEndedPlansAtStripe();
    const stillRunning = await gateway.client.subscriptions.retrieve(live.providerSubscriptionId!);
    expect(stillRunning.status).toBe('canceled');
    expect(again).toBe(0);
  });

  it('lets admins record manual payments, refund part of them, and end a plan', async () => {
    const { parent, child, student } = await family(t);
    await endTrial(child.id);
    await t
      .http()
      .post(`/v1/admin/users/${parent.user.id}/manual-payments`)
      .set(auth(admin.token))
      .send({ planKey: 'monthly', periods: 3, method: 'Bank transfer', reference: 'HBL-1234' })
      .expect(200);
    const view = await t
      .http()
      .get(`/v1/admin/users/${parent.user.id}/billing`)
      .set(auth(admin.token))
      .expect(200);
    expect(view.body.subscriptions[0]).toMatchObject({ provider: 'MANUAL', status: 'ACTIVE' });
    expect(view.body.payments[0]).toMatchObject({
      method: 'Bank transfer',
      reference: 'HBL-1234',
      amountMinor: 450_000,
    });
    await t.http().get(`/v1/learning/lessons/${PREMIUM_LESSON}`).set(auth(student)).expect(200);
    const parentView = await billingOf(parent.accessToken);
    expect(parentView.subscription).toMatchObject({ status: 'ACTIVE' });
    // Card plans can't be bought on top; switching plans is done by our team.
    await t
      .http()
      .post('/v1/billing/checkout')
      .set(auth(parent.accessToken))
      .send({ planKey: 'monthly', locale: 'en' })
      .expect(409);
    await t
      .http()
      .post('/v1/billing/plan')
      .set(auth(parent.accessToken))
      .send({ planKey: 'yearly' })
      .expect(409);

    // A partial refund keeps premium.
    const paymentId = view.body.payments[0].id as string;
    const partial = await t
      .http()
      .post(`/v1/admin/billing/payments/${paymentId}/refunds`)
      .set(auth(admin.token))
      .send({ amountMinor: 150_000, reason: 'One month back (moved abroad)' })
      .expect(200);
    expect(partial.body).toMatchObject({ status: 'PARTIALLY_REFUNDED', refundedMinor: 150_000 });
    await t
      .http()
      .post(`/v1/admin/billing/payments/${paymentId}/refunds`)
      .set(auth(admin.token))
      .send({ amountMinor: 400_000, reason: 'Too much' })
      .expect(400);
    await t.http().get(`/v1/learning/lessons/${PREMIUM_LESSON}`).set(auth(student)).expect(200);

    // Ending the plan now takes premium away.
    const subscriptionId = view.body.subscriptions[0].id as string;
    await t
      .http()
      .post(`/v1/admin/billing/subscriptions/${subscriptionId}/cancel`)
      .set(auth(admin.token))
      .send({ immediately: true, reason: 'Family asked to stop' })
      .expect(200);
    await t.http().get(`/v1/learning/lessons/${PREMIUM_LESSON}`).set(auth(student)).expect(403);

    // Lists for the Payments page.
    const payments = await t
      .http()
      .get('/v1/admin/billing/payments')
      .query({ provider: 'MANUAL', search: parent.email })
      .set(auth(admin.token))
      .expect(200);
    expect(payments.body.items).toHaveLength(1);
    const subscriptions = await t
      .http()
      .get('/v1/admin/billing/subscriptions')
      .query({ subscriptionStatus: 'CANCELED', search: parent.email })
      .set(auth(admin.token))
      .expect(200);
    expect(subscriptions.body.total).toBe(1);
  });

  it('keeps payments to admins, and lets them change prices with a reason', async () => {
    const moderator = await staffLogin(t, 'moderator');
    await t.http().get('/v1/admin/billing/payments').set(auth(moderator.token)).expect(403);
    await t.http().get('/v1/admin/prices').set(auth(moderator.token)).expect(403);
    const prices = await t.http().get('/v1/admin/prices').set(auth(admin.token)).expect(200);
    const eg = prices.body.countries.find((c: { code: string }) => c.code === 'EG');
    expect(eg.prices.monthly).toBe(25_000);
    await t
      .http()
      .put('/v1/admin/prices/EG')
      .set(auth(admin.token))
      .send({ monthlyMinor: 30_000, familyDiscountPercent: 25, reason: 'Launch prices' })
      .expect(200);
    const pricing = await t.http().get('/v1/public/pricing').expect(200);
    const egPublic = pricing.body.countries.find((c: { code: string }) => c.code === 'EG');
    expect(egPublic).toMatchObject({ monthlyMinor: 30_000, familyDiscountPercent: 25 });
    expect(pricing.body.familyDiscountPercent).toBe(25);
    await t
      .http()
      .put('/v1/admin/prices/EG')
      .set(auth(admin.token))
      .send({ monthlyMinor: 25_000, familyDiscountPercent: 30, reason: 'Back to the placeholders' })
      .expect(200);
  });
});
