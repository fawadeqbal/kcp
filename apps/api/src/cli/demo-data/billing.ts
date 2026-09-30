import { randomBytes } from 'node:crypto';
import { type PaymentProvider, Prisma, ROLE_KEYS } from '@kcp/database';
import type { PlanKey } from '@kcp/shared';
import type { BillingRecordsService, InvoiceLine } from '../../billing/billing-records.service.js';
import { stripeSummary } from '../../billing/stripe/stripe-webhooks.service.js';
import type { StripeGateway } from '../../billing/stripe/stripe.gateway.js';
import type { PlanScenario } from './cast.js';
import {
  type DemoContext,
  type DemoFamily,
  type DemoStaff,
  demoIp,
  type PremiumCalendar,
  USER_AGENTS,
} from './context.js';
import { DAY_MS, plusDays, plusMinutes, plusMonths } from './timeline.js';

interface Period {
  start: Date;
  end: Date;
  /** False for a renewal that failed (past due). */
  paid: boolean;
}

interface PaymentPlan {
  family: DemoFamily;
  subscriptionId: string;
  provider: PaymentProvider;
  planKey: PlanKey;
  period: Period;
  /** Periods one payment covers (manual payments can pay several at once). */
  periods: number;
  stripe: { customerId: string; subscriptionId: string } | null;
  method?: string;
}

const mockId = (prefix: string) => `${prefix}_mock_demo${randomBytes(9).toString('base64url')}`;
const unix = (date: Date) => Math.floor(date.getTime() / 1000);
const invoiceNumber = (n: number) => `KCP-${String(n).padStart(6, '0')}`;

/** Children the family had at a moment (a plan's price follows them at renewal). */
const childrenAt = (family: DemoFamily, at: Date) =>
  Math.max(1, family.children.filter((c) => c.createdAt.getTime() <= at.getTime()).length);

/** Card plans need the Stripe mock; without it they become manual plans (history stays). */
function effective(plan: PlanScenario, cards: boolean): PlanScenario {
  if (cards || plan === 'card-ended' || !plan.startsWith('card-')) return plan;
  return 'manual';
}

/**
 * Plans, payments, invoices, refunds and the payment event log, as months of paying
 * would leave them: card plans through the Stripe mock (renewed monthly, one past due,
 * one being cancelled, one ended) and manual payments staff recorded (one refunded in
 * part, one in full, one not renewed). Fills `calendar` with who had premium when.
 */
export async function createBilling(
  ctx: DemoContext,
  deps: { records: BillingRecordsService; stripe: StripeGateway },
  families: DemoFamily[],
  staff: DemoStaff[],
  calendar: PremiumCalendar,
) {
  const admin = staff.find((s) => s.role === ROLE_KEYS.ADMIN) ?? staff[0]!;
  const cards = deps.stripe.mode === 'mock' && deps.stripe.mock !== null;
  const payments: PaymentPlan[] = [];
  const now = ctx.clock.now;
  let subscriptions = 0;

  for (const family of families) {
    const scenario = effective(family.spec.plan, cards);
    if (scenario === 'none') continue;
    const card = scenario.startsWith('card-');
    const planKey: PlanKey = scenario === 'card-yearly' ? 'yearly' : 'monthly';
    // Near the end of the first child's trial.
    const firstChild = family.children.reduce((a, b) => (a.createdAt < b.createdAt ? a : b));
    const start = plusMinutes(plusDays(firstChild.createdAt, ctx.rng.int(9, 13)), 95);

    const periods: Period[] = [];
    switch (scenario) {
      case 'card-monthly':
      case 'card-past-due':
      case 'card-canceling':
        for (let from = start; from.getTime() <= now.getTime(); from = plusMonths(from, 1)) {
          periods.push({ start: from, end: plusMonths(from, 1), paid: true });
        }
        if (scenario === 'card-past-due' && periods.length > 1) periods.at(-1)!.paid = false;
        break;
      case 'card-yearly':
        periods.push({ start, end: plusMonths(start, 12), paid: true });
        break;
      case 'manual':
      case 'manual-partial-refund':
        periods.push({ start, end: plusMonths(start, 3), paid: true });
        break;
      default:
        periods.push({ start, end: plusMonths(start, 1), paid: true });
    }
    const current = periods.at(-1)!;
    const price = await deps.records.priceFor(
      planKey,
      family.spec.country,
      childrenAt(family, current.start),
    );

    // How it ended, if it did.
    let status: 'ACTIVE' | 'PAST_DUE' | 'CANCELED' = 'ACTIVE';
    let canceledAt: Date | null = null;
    let endedAt: Date | null = null;
    let cancelAtPeriodEnd = false;
    if (scenario === 'card-past-due') status = 'PAST_DUE';
    if (scenario === 'card-canceling') {
      cancelAtPeriodEnd = true;
      canceledAt = ctx.clock.cap(
        new Date(Math.max(now.getTime() - 3 * DAY_MS, current.start.getTime() + DAY_MS)),
      );
    }
    if (scenario === 'card-ended') {
      status = 'CANCELED';
      cancelAtPeriodEnd = true;
      canceledAt = plusDays(start, 20);
      endedAt = current.end;
    }
    if (scenario === 'manual-refunded') {
      status = 'CANCELED';
      canceledAt = plusDays(start, 4);
      endedAt = canceledAt;
    }
    if (scenario === 'manual-expired') {
      status = 'CANCELED';
      endedAt = current.end;
    }
    const premiumEnd = endedAt ?? current.end;
    calendar.addFamily(family.parentId, { from: start, to: premiumEnd });

    const stripe = card ? { customerId: mockId('cus'), subscriptionId: mockId('sub') } : null;
    const subscription = await ctx.prisma.subscription.create({
      data: {
        parentId: family.parentId,
        planKey,
        provider: card ? 'STRIPE' : 'MANUAL',
        status,
        currency: price.currency,
        amountMinor: price.family.totalMinor,
        children: childrenAt(family, current.start),
        providerSubscriptionId: stripe?.subscriptionId ?? null,
        currentPeriodStart: current.start,
        currentPeriodEnd: current.end,
        cancelAtPeriodEnd,
        canceledAt,
        endedAt,
        createdAt: start,
        updatedAt: endedAt ?? canceledAt ?? current.start,
      },
    });
    subscriptions++;

    if (stripe) {
      await cardHistory(ctx, deps, family, {
        subscriptionId: subscription.id,
        stripe,
        planKey,
        start,
        periods,
        scenario,
        canceledAt,
        endedAt,
      });
    }
    for (const period of periods) {
      if (!period.paid) continue;
      payments.push({
        family,
        subscriptionId: subscription.id,
        provider: card ? 'STRIPE' : 'MANUAL',
        planKey,
        period,
        periods: card ? 1 : scenario === 'manual' || scenario === 'manual-partial-refund' ? 3 : 1,
        stripe,
        method: family.spec.method,
      });
    }
    if (scenario === 'card-past-due') {
      await ctx.prisma.notification.create({
        data: { userId: family.parentId, type: 'payment_failed', createdAt: current.start },
      });
    }
    if (endedAt && endedAt.getTime() <= now.getTime()) {
      await ctx.prisma.notification.create({
        data: { userId: family.parentId, type: 'plan_ended', createdAt: endedAt },
      });
    }
  }

  // Payments in the order they happened, so invoice numbers go up with time.
  payments.sort((a, b) => a.period.start.getTime() - b.period.start.getTime());
  const recorded: {
    paymentId: string;
    plan: PaymentPlan;
    amountMinor: number;
    currency: string;
  }[] = [];
  for (const plan of payments) {
    const children = childrenAt(plan.family, plan.period.start);
    const price = await deps.records.priceFor(plan.planKey, plan.family.spec.country, children);
    const amountMinor = price.family.totalMinor * plan.periods;
    const lines: InvoiceLine[] = price.lines.map((line) => ({
      ...line,
      quantity: line.quantity * plan.periods,
    }));
    const paidAt = plan.period.start;
    const paymentIntent = plan.stripe ? mockId('pi') : null;
    const providerInvoice = plan.stripe ? mockId('in') : null;
    const payment = await ctx.prisma.payment.create({
      data: {
        parentId: plan.family.parentId,
        subscriptionId: plan.subscriptionId,
        provider: plan.provider,
        providerPaymentId: paymentIntent,
        status: 'SUCCEEDED',
        currency: price.currency,
        amountMinor,
        method: plan.stripe ? null : (plan.method ?? 'Bank transfer'),
        reference: plan.stripe ? null : `TRX-${ctx.rng.int(100000, 999999)}`,
        recordedById: plan.stripe ? null : admin.id,
        paidAt,
        createdAt: paidAt,
        updatedAt: paidAt,
      },
    });
    const invoice = await ctx.prisma.invoice.create({
      data: {
        parentId: plan.family.parentId,
        subscriptionId: plan.subscriptionId,
        paymentId: payment.id,
        providerInvoiceId: providerInvoice,
        status: 'PAID',
        currency: price.currency,
        amountMinor,
        lines: lines as unknown as Prisma.InputJsonValue,
        periodStart: plan.period.start,
        periodEnd: plusMonths(
          plan.period.start,
          (plan.planKey === 'yearly' ? 12 : 1) * plan.periods,
        ),
        issuedAt: paidAt,
        paidAt,
      },
    });
    await ctx.prisma.notification.create({
      data: {
        userId: plan.family.parentId,
        type: 'payment_receipt',
        data: { invoiceId: invoice.id, number: invoiceNumber(invoice.number) },
        createdAt: plusMinutes(paidAt, 1),
      },
    });
    if (plan.stripe) {
      const stripeInvoice = {
        id: providerInvoice!,
        object: 'invoice',
        customer: plan.stripe.customerId,
        currency: price.currency.toLowerCase(),
        amount_paid: amountMinor,
        amount_due: amountMinor,
        parent: { subscription_details: { subscription: plan.stripe.subscriptionId } },
        lines: {
          data: lines.map((line) => ({
            amount: line.unitMinor * line.quantity,
            quantity: line.quantity,
            period: { start: unix(plan.period.start), end: unix(plan.period.end) },
          })),
        },
      };
      await ctx.prisma.paymentEvent.create({
        data: {
          provider: 'STRIPE',
          eventId: mockId('evt'),
          type: 'invoice.paid',
          parentId: plan.family.parentId,
          subscriptionId: plan.subscriptionId,
          paymentId: payment.id,
          payload: stripeSummary(stripeInvoice),
          createdAt: paidAt,
        },
      });
      if (deps.stripe.mock) {
        await deps.stripe.mock.store('invoice', stripeInvoice);
        await deps.stripe.mock.storeCharge(
          stripeInvoice.id,
          paymentIntent!,
          amountMinor,
          stripeInvoice.currency,
        );
      }
    } else {
      await ctx.prisma.paymentEvent.create({
        data: {
          provider: 'MANUAL',
          eventId: `kcp_demo_${randomBytes(12).toString('hex')}`,
          type: 'payment.recorded',
          parentId: plan.family.parentId,
          subscriptionId: plan.subscriptionId,
          paymentId: payment.id,
          actorId: payment.recordedById,
          payload: {
            planKey: plan.planKey,
            periods: plan.periods,
            amountMinor,
            currency: price.currency,
            method: payment.method,
            reference: payment.reference,
            periodEnd: invoice.periodEnd.toISOString(),
          },
          createdAt: paidAt,
        },
      });
      await ctx.prisma.auditLog.create({
        data: {
          actorId: admin.id,
          actorRole: admin.role,
          action: 'payment.manual',
          entityType: 'Payment',
          entityId: payment.id,
          after: {
            parentId: plan.family.parentId,
            planKey: plan.planKey,
            periods: plan.periods,
            amountMinor,
            currency: price.currency,
            method: payment.method,
            periodEnd: invoice.periodEnd.toISOString(),
          },
          ipAddress: demoIp(ctx.rng),
          userAgent: USER_AGENTS.mac,
          createdAt: paidAt,
        },
      });
    }
    recorded.push({ paymentId: payment.id, plan, amountMinor, currency: price.currency });
  }

  await refunds(ctx, recorded, admin);
  await manualEndings(ctx, families);
  return { subscriptions, payments: recorded.length, cards };
}

/** What Stripe (the mock) told us about a card plan, and the mock's own copy of it. */
async function cardHistory(
  ctx: DemoContext,
  deps: { records: BillingRecordsService; stripe: StripeGateway },
  family: DemoFamily,
  params: {
    subscriptionId: string;
    stripe: { customerId: string; subscriptionId: string };
    planKey: PlanKey;
    start: Date;
    periods: Period[];
    scenario: PlanScenario;
    canceledAt: Date | null;
    endedAt: Date | null;
  },
) {
  const { stripe, start } = params;
  const current = params.periods.at(-1)!;
  const metadata = {
    parentId: family.parentId,
    planKey: params.planKey,
    countryCode: family.spec.country,
  };
  await ctx.prisma.billingCustomer.create({
    data: {
      parentId: family.parentId,
      provider: 'STRIPE',
      customerId: stripe.customerId,
      createdAt: plusMinutes(start, -4),
    },
  });
  await ctx.prisma.auditLog.create({
    data: {
      actorId: family.parentId,
      actorRole: ROLE_KEYS.PARENT,
      action: 'billing.checkout',
      entityType: 'User',
      entityId: family.parentId,
      after: { planKey: params.planKey, children: family.children.length },
      ipAddress: demoIp(ctx.rng),
      userAgent: USER_AGENTS.desktop,
      createdAt: plusMinutes(start, -3),
    },
  });
  const event = (type: string, object: unknown, at: Date) =>
    ctx.prisma.paymentEvent.create({
      data: {
        provider: 'STRIPE',
        eventId: mockId('evt'),
        type,
        parentId: family.parentId,
        subscriptionId: params.subscriptionId,
        payload: stripeSummary(object),
        createdAt: at,
      },
    });
  await event(
    'checkout.session.completed',
    {
      id: mockId('cs'),
      object: 'checkout.session',
      mode: 'subscription',
      customer: stripe.customerId,
      subscription: stripe.subscriptionId,
      metadata,
    },
    start,
  );

  // The mock's copy, so the family (or staff) can cancel, resume or switch plans.
  const children = Math.max(
    1,
    family.children.filter((c) => c.createdAt.getTime() <= current.start.getTime()).length,
  );
  const price = await deps.records.priceFor(params.planKey, family.spec.country, children);
  const items = [];
  for (const line of price.lines) {
    const stripePrice = deps.stripe.mock
      ? await deps.stripe.priceFor({
          currency: price.currency,
          unitMinor: line.unitMinor,
          interval: params.planKey === 'yearly' ? 'year' : 'month',
          lookupKey: `kcp:${params.planKey}:${family.spec.country}:${price.currency}:${line.unitMinor}:${line.kind}`,
          name: `Kids Coding Platform (${params.planKey})`,
        })
      : null;
    if (!stripePrice) continue;
    items.push({
      id: mockId('si'),
      price: stripePrice,
      quantity: line.quantity,
      current_period_start: unix(current.start),
      current_period_end: unix(current.end),
    });
  }
  const status =
    params.scenario === 'card-ended'
      ? 'canceled'
      : params.scenario === 'card-past-due'
        ? 'past_due'
        : 'active';
  const subscription = {
    id: stripe.subscriptionId,
    object: 'subscription',
    customer: stripe.customerId,
    status,
    cancel_at_period_end: params.canceledAt !== null,
    canceled_at: params.canceledAt ? unix(params.canceledAt) : null,
    ended_at: params.endedAt ? unix(params.endedAt) : null,
    metadata,
    items: { data: items },
  };
  if (deps.stripe.mock) {
    await deps.stripe.mock.store('customer', {
      id: stripe.customerId,
      object: 'customer',
      email: family.email,
      name: family.name,
      metadata: { parentId: family.parentId },
    });
    await deps.stripe.mock.store('subscription', subscription);
  }

  if (params.scenario === 'card-past-due') {
    await event(
      'invoice.payment_failed',
      { id: mockId('in'), object: 'invoice', customer: stripe.customerId, amount_paid: 0 },
      current.start,
    );
    await event('customer.subscription.updated', subscription, plusMinutes(current.start, 1));
  }
  if (params.canceledAt) {
    await event(
      'customer.subscription.updated',
      { ...subscription, status: 'active', ended_at: null },
      params.canceledAt,
    );
  }
  if (params.endedAt) {
    await event('customer.subscription.deleted', subscription, params.endedAt);
  }
}

/** Money given back: part of one manual payment, all of another (premium ends at once). */
async function refunds(
  ctx: DemoContext,
  recorded: { paymentId: string; plan: PaymentPlan; amountMinor: number; currency: string }[],
  admin: DemoStaff,
) {
  const cases: [PlanScenario, (amount: number) => number, string][] = [
    [
      'manual-partial-refund',
      (amount) => Math.round(amount / 3),
      'Paid for three months, wanted two',
    ],
    ['manual-refunded', (amount) => amount, 'The family changed their mind in the first week'],
  ];
  for (const [scenario, part, reason] of cases) {
    const item = recorded.find((r) => r.plan.family.spec.plan === scenario);
    if (!item) continue;
    const at =
      scenario === 'manual-refunded'
        ? plusDays(item.plan.period.start, 4)
        : ctx.clock.cap(plusDays(item.plan.period.start, 6));
    const amount = part(item.amountMinor);
    const full = amount === item.amountMinor;
    const refund = await ctx.prisma.refund.create({
      data: {
        paymentId: item.paymentId,
        amountMinor: amount,
        reason,
        createdById: admin.id,
        createdAt: at,
      },
    });
    await ctx.prisma.payment.update({
      where: { id: item.paymentId },
      data: {
        refundedMinor: amount,
        status: full ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
        updatedAt: at,
      },
    });
    if (full) {
      await ctx.prisma.invoice.updateMany({
        where: { paymentId: item.paymentId },
        data: { status: 'REFUNDED' },
      });
    }
    await ctx.prisma.paymentEvent.create({
      data: {
        provider: 'MANUAL',
        eventId: `kcp_demo_${randomBytes(12).toString('hex')}`,
        type: full ? 'payment.refunded' : 'payment.partially_refunded',
        parentId: item.plan.family.parentId,
        subscriptionId: item.plan.subscriptionId,
        paymentId: item.paymentId,
        actorId: admin.id,
        payload: { amountMinor: amount, refundedTotalMinor: amount, reason },
        createdAt: at,
      },
    });
    if (full) {
      await ctx.prisma.paymentEvent.create({
        data: {
          provider: 'MANUAL',
          eventId: `kcp_demo_${randomBytes(12).toString('hex')}`,
          type: 'subscription.ended',
          parentId: item.plan.family.parentId,
          subscriptionId: item.plan.subscriptionId,
          actorId: admin.id,
          payload: { why: 'refund' },
          createdAt: plusMinutes(at, 1),
        },
      });
    }
    await ctx.prisma.auditLog.create({
      data: {
        actorId: admin.id,
        actorRole: admin.role,
        action: 'payment.refund',
        entityType: 'Payment',
        entityId: item.paymentId,
        after: {
          amountMinor: amount,
          currency: item.currency,
          reason,
          full,
          refundId: refund.id,
        },
        ipAddress: demoIp(ctx.rng),
        userAgent: USER_AGENTS.mac,
        createdAt: at,
      },
    });
  }
}

/** A manual plan that ran out without being renewed (the nightly job ends it). */
async function manualEndings(ctx: DemoContext, families: DemoFamily[]) {
  for (const family of families.filter((f) => f.spec.plan === 'manual-expired')) {
    const subscription = await ctx.prisma.subscription.findFirst({
      where: { parentId: family.parentId },
    });
    if (!subscription?.endedAt) continue;
    await ctx.prisma.paymentEvent.create({
      data: {
        provider: 'MANUAL',
        eventId: `kcp_demo_${randomBytes(12).toString('hex')}`,
        type: 'subscription.expired',
        parentId: family.parentId,
        subscriptionId: subscription.id,
        payload: { periodEnd: subscription.currentPeriodEnd.toISOString() },
        createdAt: plusMinutes(subscription.endedAt, 15),
      },
    });
  }
}

/** Premium given by staff: a pilot class, one given by mistake (revoked), one that ran out. */
export async function createGrants(
  ctx: DemoContext,
  families: DemoFamily[],
  staff: DemoStaff[],
  calendar: PremiumCalendar,
) {
  const admin = staff.find((s) => s.role === ROLE_KEYS.ADMIN) ?? staff[0]!;
  let count = 0;
  for (const family of families) {
    const kind = family.spec.grant;
    const child = family.children[0];
    if (!kind || !child) continue;
    const startsAt = plusDays(child.createdAt, kind === 'revoked' ? 3 : 2);
    const months = kind === 'active' ? 6 : 1;
    const endsAt = plusMonths(startsAt, months);
    const reason =
      kind === 'active'
        ? 'Pilot class at a partner school'
        : kind === 'expired'
          ? 'Prize for the pilot week challenge'
          : 'Pilot class at a partner school';
    const revokedAt = kind === 'revoked' ? plusDays(startsAt, 1) : null;
    const grant = await ctx.prisma.premiumGrant.create({
      data: {
        userId: child.id,
        grantedById: admin.id,
        reason,
        startsAt,
        endsAt,
        revokedAt,
        revokedById: revokedAt ? admin.id : null,
        createdAt: startsAt,
      },
    });
    count++;
    calendar.addChild(child.id, { from: startsAt, to: revokedAt ?? endsAt });
    await ctx.prisma.auditLog.create({
      data: {
        actorId: admin.id,
        actorRole: admin.role,
        action: 'premium.grant',
        entityType: 'User',
        entityId: child.id,
        after: { grantId: grant.id, months, endsAt: endsAt.toISOString(), reason },
        ipAddress: demoIp(ctx.rng),
        userAgent: USER_AGENTS.mac,
        createdAt: startsAt,
      },
    });
    if (revokedAt) {
      await ctx.prisma.auditLog.create({
        data: {
          actorId: admin.id,
          actorRole: admin.role,
          action: 'premium.revoke',
          entityType: 'User',
          entityId: child.id,
          after: { grantId: grant.id, reason: 'Given to the wrong family by mistake' },
          ipAddress: demoIp(ctx.rng),
          userAgent: USER_AGENTS.mac,
          createdAt: revokedAt,
        },
      });
    }
  }
  return count;
}
