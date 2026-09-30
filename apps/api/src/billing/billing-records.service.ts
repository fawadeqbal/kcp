import { randomUUID } from 'node:crypto';
import { Prisma, type PaymentProvider, type SubscriptionStatus } from '@kcp/database';
import { familyPrice, type PlanKey } from '@kcp/shared';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { addMonths } from '../premium/premium.service.js';
import { idOf, type StripeInvoice, type StripeSubscription } from './stripe/stripe-api.js';

type Db = PrismaService | Prisma.TransactionClient;

/** One line of an invoice: the first child at full price, or the others with the discount. */
export interface InvoiceLine {
  kind: 'first' | 'extra';
  quantity: number;
  unitMinor: number;
}

/** Subscriptions that give premium (with the period still running). */
export const LIVE: SubscriptionStatus[] = ['ACTIVE', 'PAST_DUE'];

const fromUnix = (seconds: number) => new Date(seconds * 1000);

/** Stripe's subscription states, as ours. */
function statusFrom(stripe: StripeSubscription['status']): SubscriptionStatus | null {
  switch (stripe) {
    case 'active':
    case 'trialing':
      return 'ACTIVE';
    case 'past_due':
    case 'unpaid':
      return 'PAST_DUE';
    case 'canceled':
    case 'incomplete_expired':
      return 'CANCELED';
    case 'incomplete':
    case 'paused':
      return null;
  }
}

/** "kcp:monthly:PK:PKR:150000:first" → first; our Stripe prices say which line they are. */
export const lineKindOf = (lookupKey: string | null | undefined): InvoiceLine['kind'] =>
  lookupKey?.endsWith(':extra') ? 'extra' : 'first';

/**
 * The records behind payments: subscriptions, payments, invoices, refunds and the
 * append-only payment event log. Stripe's webhooks and staff actions both end up
 * here; every write is keyed by the provider's IDs, so a repeated event is harmless.
 */
@Injectable()
export class BillingRecordsService {
  private readonly logger = new Logger(BillingRecordsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Children a family pays for (at least one: a family without children can't buy). */
  async childrenCount(parentId: string, db: Db = this.prisma): Promise<number> {
    return db.parentChildLink.count({
      where: { parentId, child: { status: { not: 'DELETED' } } },
    });
  }

  /** A plan's price in the family's country, and what the whole family pays. */
  async priceFor(
    planKey: PlanKey,
    countryCode: string | null,
    children: number,
    db: Db = this.prisma,
  ) {
    if (!countryCode) {
      throw new BadRequestException({
        error: 'NO_COUNTRY',
        message: 'Choose your country in your account first.',
      });
    }
    const price = await db.planPrice.findUnique({
      where: { planKey_countryCode: { planKey, countryCode } },
      include: { plan: true, country: { select: { familyDiscountPercent: true } } },
    });
    if (!price || !price.plan.isActive) {
      throw new NotFoundException({
        error: 'NO_PRICE',
        message: 'This plan is not available in your country yet.',
      });
    }
    const family = familyPrice(price.amountMinor, children, price.country.familyDiscountPercent);
    const lines: InvoiceLine[] = [{ kind: 'first', quantity: 1, unitMinor: family.firstMinor }];
    if (family.extraChildren > 0) {
      lines.push({
        kind: 'extra',
        quantity: family.extraChildren,
        unitMinor: family.extraUnitMinor,
      });
    }
    return {
      planKey,
      interval: price.plan.interval,
      currency: price.currency,
      unitMinor: price.amountMinor,
      discountPercent: price.country.familyDiscountPercent,
      family,
      lines,
    };
  }

  /** The family's subscription that gives premium now, if any. */
  live(parentId: string, db: Db = this.prisma) {
    return db.subscription.findFirst({
      where: { parentId, status: { in: LIVE } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Adds an event to the log. Returns false when it was there already. */
  async logEvent(
    event: {
      provider: PaymentProvider;
      eventId?: string;
      type: string;
      parentId?: string | null;
      subscriptionId?: string | null;
      paymentId?: string | null;
      actorId?: string | null;
      payload: Prisma.InputJsonValue;
    },
    db: Db = this.prisma,
  ): Promise<boolean> {
    const result = await db.paymentEvent.createMany({
      data: [{ ...event, eventId: event.eventId ?? `kcp_${randomUUID()}` }],
      skipDuplicates: true,
    });
    return result.count === 1;
  }

  // ── Stripe ─────────────────────────────────────────────────────────────────

  /**
   * Brings our copy of a Stripe subscription up to date. A subscription we ended
   * (for example after a refund) stays ended even if an older event arrives late.
   */
  async syncStripeSubscription(stripe: StripeSubscription) {
    const status = statusFrom(stripe.status);
    const existing = await this.prisma.subscription.findUnique({
      where: { providerSubscriptionId: stripe.id },
    });
    if (!status) return existing;
    const customerId = idOf(stripe.customer);
    const parentId =
      existing?.parentId ??
      stripe.metadata['parentId'] ??
      (customerId
        ? (
            await this.prisma.billingCustomer.findUnique({
              where: { provider_customerId: { provider: 'STRIPE', customerId } },
            })
          )?.parentId
        : undefined);
    if (!parentId) {
      this.logger.warn(`Stripe subscription ${stripe.id} belongs to no family we know`);
      return null;
    }
    const items = stripe.items.data;
    const first = items[0];
    if (!first) return existing;
    const interval = first.price.recurring?.interval === 'year' ? 'yearly' : 'monthly';
    const data = {
      planKey: existing?.status === 'CANCELED' ? existing.planKey : interval,
      currency: first.price.currency.toUpperCase(),
      amountMinor: items.reduce(
        (sum, i) => sum + (i.price.unit_amount ?? 0) * (i.quantity ?? 1),
        0,
      ),
      children: items.reduce((sum, i) => sum + (i.quantity ?? 1), 0),
      currentPeriodStart: fromUnix(first.current_period_start),
      currentPeriodEnd: fromUnix(first.current_period_end),
      cancelAtPeriodEnd: stripe.cancel_at_period_end,
      canceledAt: stripe.canceled_at ? fromUnix(stripe.canceled_at) : null,
    };
    if (existing?.status === 'CANCELED') {
      // Ended here first (refund or staff); keep it ended.
      return existing;
    }
    if (existing) {
      return this.prisma.subscription.update({
        where: { id: existing.id },
        data: {
          ...data,
          status,
          endedAt:
            status === 'CANCELED'
              ? stripe.ended_at
                ? fromUnix(stripe.ended_at)
                : new Date()
              : null,
        },
      });
    }
    if (status === 'CANCELED') return null;
    return this.prisma.$transaction(async (tx) => {
      // A family has one live subscription: a card plan replaces a manual one.
      const others = await tx.subscription.findMany({
        where: { parentId, status: { in: LIVE } },
      });
      for (const other of others) {
        await tx.subscription.update({
          where: { id: other.id },
          data: { status: 'CANCELED', canceledAt: new Date(), endedAt: new Date() },
        });
        await this.logEvent(
          {
            provider: other.provider,
            type: 'subscription.replaced',
            parentId,
            subscriptionId: other.id,
            payload: { by: stripe.id },
          },
          tx,
        );
      }
      return tx.subscription.create({
        data: {
          ...data,
          parentId,
          provider: 'STRIPE',
          status,
          providerSubscriptionId: stripe.id,
        },
      });
    });
  }

  /** A paid Stripe invoice: the payment and our invoice, once each. */
  async recordStripeInvoicePaid(
    invoice: StripeInvoice,
    paymentIntentId: string | null,
    subscription: { id: string; parentId: string },
  ) {
    const period = invoice.lines.data[0]?.period;
    const lines = await this.linesOfStripeInvoice(subscription.id, invoice);
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.invoice.findUnique({ where: { providerInvoiceId: invoice.id } });
      if (existing) return;
      const payment = paymentIntentId
        ? await tx.payment.upsert({
            where: {
              provider_providerPaymentId: {
                provider: 'STRIPE',
                providerPaymentId: paymentIntentId,
              },
            },
            create: {
              parentId: subscription.parentId,
              subscriptionId: subscription.id,
              provider: 'STRIPE',
              providerPaymentId: paymentIntentId,
              status: 'SUCCEEDED',
              currency: invoice.currency.toUpperCase(),
              amountMinor: invoice.amount_paid,
              paidAt: new Date(),
            },
            update: {},
          })
        : null;
      await tx.invoice.create({
        data: {
          parentId: subscription.parentId,
          subscriptionId: subscription.id,
          paymentId: payment?.id ?? null,
          providerInvoiceId: invoice.id,
          status: 'PAID',
          currency: invoice.currency.toUpperCase(),
          amountMinor: invoice.amount_paid,
          lines: lines as unknown as Prisma.InputJsonValue,
          periodStart: period ? fromUnix(period.start) : new Date(),
          periodEnd: period ? fromUnix(period.end) : new Date(),
          paidAt: new Date(),
        },
      });
    });
  }

  private async linesOfStripeInvoice(
    subscriptionId: string,
    invoice: StripeInvoice,
  ): Promise<InvoiceLine[]> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });
    const lines = invoice.lines.data.map((line, index) => ({
      kind: (index === 0 ? 'first' : 'extra') as InvoiceLine['kind'],
      quantity: line.quantity ?? 1,
      unitMinor: Math.round(line.amount / Math.max(1, line.quantity ?? 1)),
    }));
    return lines.length
      ? lines
      : [{ kind: 'first', quantity: 1, unitMinor: subscription?.amountMinor ?? 0 }];
  }

  // ── Refunds and endings ────────────────────────────────────────────────────

  /**
   * Records money given back. `refundedTotalMinor` is the payment's new refunded
   * total (as Stripe reports it); nothing happens if we knew it already. A full
   * refund ends the family's premium straight away.
   */
  async applyRefund(params: {
    paymentId: string;
    refundedTotalMinor: number;
    reason: string;
    createdById: string | null;
    providerRefundId?: string | null;
    /** End premium straight away after a full refund (the caller may do it later). */
    endOnFull?: boolean;
  }) {
    const result = await this.prisma.$transaction(async (tx) => {
      const [payment] = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM payments WHERE id = ${params.paymentId}::uuid FOR UPDATE`;
      if (!payment) throw new NotFoundException('Payment not found.');
      const current = await tx.payment.findUniqueOrThrow({ where: { id: params.paymentId } });
      const total = Math.min(current.amountMinor, params.refundedTotalMinor);
      if (total <= current.refundedMinor) return { payment: current, refund: null, full: false };
      const refund = await tx.refund.create({
        data: {
          paymentId: current.id,
          amountMinor: total - current.refundedMinor,
          reason: params.reason,
          createdById: params.createdById,
          providerRefundId: params.providerRefundId ?? null,
        },
      });
      const full = total === current.amountMinor;
      const updated = await tx.payment.update({
        where: { id: current.id },
        data: { refundedMinor: total, status: full ? 'REFUNDED' : 'PARTIALLY_REFUNDED' },
      });
      if (full) {
        await tx.invoice.updateMany({
          where: { paymentId: current.id },
          data: { status: 'REFUNDED' },
        });
      }
      await this.logEvent(
        {
          provider: current.provider,
          type: full ? 'payment.refunded' : 'payment.partially_refunded',
          parentId: current.parentId,
          subscriptionId: current.subscriptionId,
          paymentId: current.id,
          actorId: params.createdById,
          payload: {
            amountMinor: refund.amountMinor,
            refundedTotalMinor: total,
            reason: params.reason,
          },
        },
        tx,
      );
      return { payment: updated, refund, full };
    });
    if (result.full && result.payment.subscriptionId && params.endOnFull !== false) {
      await this.endNow(result.payment.subscriptionId, 'refund', params.createdById);
    }
    return result;
  }

  /** Premium stops now (a full refund, or staff ending it). */
  async endNow(
    subscriptionId: string,
    why: 'refund' | 'staff' | 'provider' | 'account_deleted',
    actorId: string | null,
  ) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });
    if (!subscription || subscription.status === 'CANCELED') return subscription;
    const now = new Date();
    const ended = await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: 'CANCELED',
        canceledAt: subscription.canceledAt ?? now,
        endedAt: now,
        cancelAtPeriodEnd: false,
      },
    });
    await this.logEvent({
      provider: subscription.provider,
      type: 'subscription.ended',
      parentId: subscription.parentId,
      subscriptionId,
      actorId,
      payload: { why },
    });
    return ended;
  }

  // ── Manual payments ────────────────────────────────────────────────────────

  /**
   * A payment staff received outside the platform (bank transfer, wallet, cash):
   * premium for the family for the periods paid, starting now or when the current
   * manual period ends.
   */
  async recordManualPayment(params: {
    parentId: string;
    planKey: PlanKey;
    periods: number;
    amountMinor?: number;
    method: string;
    reference?: string;
    staffId: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const parent = await tx.user.findUnique({
        where: { id: params.parentId },
        select: { id: true, countryCode: true, status: true, role: { select: { key: true } } },
      });
      if (!parent || parent.role.key !== 'parent') throw new NotFoundException('Parent not found.');
      if (parent.status === 'DELETED') {
        throw new BadRequestException({
          error: 'ACCOUNT_DELETED',
          message: 'This account was deleted.',
        });
      }
      // One writer per family at a time.
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${parent.id}::uuid FOR UPDATE`;
      const live = await this.live(parent.id, tx);
      if (live && live.provider !== 'MANUAL') {
        throw new ConflictException({
          error: 'CARD_SUBSCRIPTION_ACTIVE',
          message: 'This family pays by card. Cancel that plan first.',
        });
      }
      const children = Math.max(1, await this.childrenCount(parent.id, tx));
      const price = await this.priceFor(params.planKey, parent.countryCode, children, tx);
      const monthsPerPeriod = price.interval === 'YEAR' ? 12 : 1;
      const now = new Date();
      const start = live && live.currentPeriodEnd > now ? live.currentPeriodEnd : now;
      const end = addMonths(start, monthsPerPeriod * params.periods);
      const amountMinor = params.amountMinor ?? price.family.totalMinor * params.periods;

      const subscription = live
        ? await tx.subscription.update({
            where: { id: live.id },
            data: {
              planKey: params.planKey,
              currency: price.currency,
              amountMinor: price.family.totalMinor,
              children,
              currentPeriodEnd: end,
              cancelAtPeriodEnd: false,
              canceledAt: null,
            },
          })
        : await tx.subscription.create({
            data: {
              parentId: parent.id,
              planKey: params.planKey,
              provider: 'MANUAL',
              status: 'ACTIVE',
              currency: price.currency,
              amountMinor: price.family.totalMinor,
              children,
              currentPeriodStart: now,
              currentPeriodEnd: end,
            },
          });
      const payment = await tx.payment.create({
        data: {
          parentId: parent.id,
          subscriptionId: subscription.id,
          provider: 'MANUAL',
          status: 'SUCCEEDED',
          currency: price.currency,
          amountMinor,
          method: params.method,
          reference: params.reference ?? null,
          recordedById: params.staffId,
          paidAt: now,
        },
      });
      const lines = price.lines.map((line) => ({
        ...line,
        quantity: line.quantity * params.periods,
      }));
      const invoice = await tx.invoice.create({
        data: {
          parentId: parent.id,
          subscriptionId: subscription.id,
          paymentId: payment.id,
          status: 'PAID',
          currency: price.currency,
          amountMinor,
          lines: lines as unknown as Prisma.InputJsonValue,
          periodStart: start,
          periodEnd: end,
          paidAt: now,
        },
      });
      await this.logEvent(
        {
          provider: 'MANUAL',
          type: 'payment.recorded',
          parentId: parent.id,
          subscriptionId: subscription.id,
          paymentId: payment.id,
          actorId: params.staffId,
          payload: {
            planKey: params.planKey,
            periods: params.periods,
            amountMinor,
            currency: price.currency,
            method: params.method,
            reference: params.reference ?? null,
            periodEnd: end.toISOString(),
          },
        },
        tx,
      );
      return { subscription, payment, invoice };
    });
  }

  /** Manual plans don't renew: after their period they end (run nightly). Returns their IDs. */
  async endExpiredManual(now = new Date()): Promise<string[]> {
    const expired = await this.prisma.subscription.findMany({
      where: { provider: 'MANUAL', status: { in: LIVE }, currentPeriodEnd: { lte: now } },
      select: { id: true },
    });
    for (const { id } of expired) {
      const subscription = await this.prisma.subscription.update({
        where: { id },
        data: { status: 'CANCELED', endedAt: now },
      });
      await this.logEvent({
        provider: 'MANUAL',
        type: 'subscription.expired',
        parentId: subscription.parentId,
        subscriptionId: id,
        payload: { periodEnd: subscription.currentPeriodEnd.toISOString() },
      });
    }
    return expired.map((e) => e.id);
  }
}

/** Prisma's error for a unique constraint. */
export const isUniqueViolation = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
