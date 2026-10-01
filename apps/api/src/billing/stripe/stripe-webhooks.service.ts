import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import type { Redis } from 'ioredis';
import type { Prisma } from '@kcp/database';
import { PrismaService } from '../../database/prisma.service.js';
import { REDIS } from '../../redis/redis.constants.js';
import { BillingNotifier } from '../billing-notifier.service.js';
import { BillingRecordsService, LIVE } from '../billing-records.service.js';
import {
  idOf,
  type StripeCharge,
  type StripeCheckoutSession,
  type StripeEvent,
  type StripeInvoice,
  type StripeSubscription,
} from './stripe-api.js';
import { StripeGateway } from './stripe.gateway.js';

/** Events the platform acts on; others are logged and otherwise ignored. */
const HANDLED = new Set([
  'checkout.session.completed',
  'invoice.paid',
  'invoice.payment_failed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'charge.refunded',
]);

const LOCK_SECONDS = 60;

/**
 * Stripe's webhooks: the signature is checked, then each event is handled once. It
 * is logged (payment_events) only after it was handled, so a failure makes Stripe
 * send it again; everything it changes is keyed by Stripe's IDs, so handling an
 * event twice changes nothing. Events may arrive in any order: each one reads the
 * subscription's current state from Stripe.
 */
/**
 * What we keep of a Stripe object in the payment log: IDs, amounts and statuses.
 * Never names, emails, addresses or card details — the log can't be edited or
 * deleted, so it must not hold personal data (Stripe keeps the full record).
 */
const SUMMARY_FIELDS = [
  'id',
  'object',
  'status',
  'mode',
  'payment_status',
  'amount',
  'amount_total',
  'amount_paid',
  'amount_due',
  'amount_refunded',
  'currency',
  'customer',
  'subscription',
  'invoice',
  'payment_intent',
  'charge',
  'client_reference_id',
  'billing_reason',
  'cancel_at_period_end',
  'canceled_at',
  'refunded',
  'created',
] as const;

const OUR_METADATA = new Set(['parentId', 'planKey', 'countryCode', 'purpose', 'hubInvoiceId']);

export function stripeSummary(object: unknown): Prisma.InputJsonValue {
  const source = (object ?? {}) as Record<string, unknown>;
  const summary: Record<string, Prisma.InputJsonValue> = {};
  for (const field of SUMMARY_FIELDS) {
    const value = source[field];
    if (value === null || value === undefined) continue;
    // Expanded objects keep only their ID.
    if (typeof value === 'object') {
      const id = (value as { id?: unknown }).id;
      if (typeof id === 'string') summary[field] = id;
      continue;
    }
    if (['string', 'number', 'boolean'].includes(typeof value)) {
      summary[field] = value as string | number | boolean;
    }
  }
  const metadata = source['metadata'] as Record<string, unknown> | undefined;
  // Our own references (parent and plan), set when the checkout was created.
  if (metadata && typeof metadata === 'object') {
    const ours = Object.fromEntries(
      Object.entries(metadata).filter(
        ([key, value]) => OUR_METADATA.has(key) && typeof value === 'string',
      ),
    ) as Record<string, string>;
    if (Object.keys(ours).length) summary['metadata'] = ours;
  }
  return summary;
}

@Injectable()
export class StripeWebhooksService {
  private readonly logger = new Logger(StripeWebhooksService.name);

  constructor(
    private readonly stripe: StripeGateway,
    private readonly records: BillingRecordsService,
    private readonly prisma: PrismaService,
    private readonly notifier: BillingNotifier,
    @Inject(REDIS) private readonly redis: Redis,
  ) {
    stripe.useLocalWebhookHandler((rawBody, signature) => this.handle(rawBody, signature));
  }

  /** Card checks (Checkout in setup mode), by the `purpose` in their metadata. */
  private readonly setupHandlers = new Map<
    string,
    (session: StripeCheckoutSession) => Promise<{ parentId?: string }>
  >();

  /** Other modules act on completed card checks (e.g. verified parental consent). */
  onSetupCompleted(
    purpose: string,
    handler: (session: StripeCheckoutSession) => Promise<{ parentId?: string }>,
  ) {
    this.setupHandlers.set(purpose, handler);
  }

  /** One-off payments (Checkout in payment mode), by the `purpose` in their metadata. */
  private readonly paymentHandlers = new Map<
    string,
    (session: StripeCheckoutSession) => Promise<{ parentId?: string }>
  >();

  /** Other modules act on completed one-off payments (e.g. a hub client's invoice). */
  onPaymentCompleted(
    purpose: string,
    handler: (session: StripeCheckoutSession) => Promise<{ parentId?: string }>,
  ) {
    this.paymentHandlers.set(purpose, handler);
  }

  async handle(rawBody: Buffer | undefined, signature: string | undefined): Promise<void> {
    if (!rawBody?.length || !signature) {
      throw new BadRequestException({
        error: 'BAD_WEBHOOK',
        message: 'Missing body or signature.',
      });
    }
    let event: StripeEvent;
    try {
      event = this.stripe.verify(rawBody, signature);
    } catch {
      throw new BadRequestException({ error: 'BAD_SIGNATURE', message: 'Invalid signature.' });
    }
    const seen = await this.prisma.paymentEvent.findUnique({
      where: { provider_eventId: { provider: 'STRIPE', eventId: event.id } },
      select: { id: true },
    });
    if (seen) return;
    // Two deliveries of one event at once: the second waits for Stripe's retry.
    const lock = `stripe-event:${event.id}`;
    if (this.redis.status === 'wait') await this.redis.connect();
    if (!(await this.redis.set(lock, '1', 'EX', LOCK_SECONDS, 'NX'))) {
      throw new BadRequestException({ error: 'IN_PROGRESS', message: 'Already being handled.' });
    }
    try {
      const refs = HANDLED.has(event.type) ? await this.process(event) : {};
      await this.records.logEvent({
        provider: 'STRIPE',
        eventId: event.id,
        type: event.type,
        parentId: refs.parentId ?? null,
        subscriptionId: refs.subscriptionId ?? null,
        paymentId: refs.paymentId ?? null,
        payload: stripeSummary(event.data.object),
      });
    } finally {
      await this.redis.del(lock);
    }
  }

  private async process(
    event: StripeEvent,
  ): Promise<{ parentId?: string; subscriptionId?: string; paymentId?: string }> {
    const object = event.data.object as unknown;
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = object as StripeCheckoutSession;
        if (session.mode === 'setup') {
          const handler = this.setupHandlers.get(session.metadata?.['purpose'] ?? '');
          return handler ? handler(session) : {};
        }
        if (session.mode === 'payment') {
          const handler = this.paymentHandlers.get(session.metadata?.['purpose'] ?? '');
          return handler ? handler(session) : {};
        }
        const subscriptionId = idOf(session.subscription);
        if (session.mode !== 'subscription' || !subscriptionId) return {};
        const synced = await this.sync(subscriptionId);
        return { parentId: synced?.parentId, subscriptionId: synced?.id };
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const before = await this.prisma.subscription.findUnique({
          where: { providerSubscriptionId: (object as StripeSubscription).id },
          select: { status: true },
        });
        const synced = await this.sync((object as StripeSubscription).id);
        if (synced && before && before.status !== 'CANCELED' && synced.status === 'CANCELED') {
          await this.notifier.subscriptionEnded(synced.id);
        }
        return { parentId: synced?.parentId, subscriptionId: synced?.id };
      }
      case 'invoice.paid': {
        const invoice = object as StripeInvoice;
        const stripeSubscription = idOf(invoice.parent?.subscription_details?.subscription);
        if (!stripeSubscription || invoice.amount_paid <= 0) return {};
        const synced = await this.sync(stripeSubscription);
        if (!synced) return {};
        const paymentIntent = await this.paymentIntentOf(invoice.id);
        await this.records.recordStripeInvoicePaid(invoice, paymentIntent, synced);
        const saved = await this.prisma.invoice.findUnique({
          where: { providerInvoiceId: invoice.id },
          select: { id: true, paymentId: true },
        });
        if (saved) await this.notifier.invoicePaid(saved.id);
        return {
          parentId: synced.parentId,
          subscriptionId: synced.id,
          paymentId: saved?.paymentId ?? undefined,
        };
      }
      case 'invoice.payment_failed': {
        const invoice = object as StripeInvoice;
        const stripeSubscription = idOf(invoice.parent?.subscription_details?.subscription);
        if (!stripeSubscription) return {};
        const synced = await this.sync(stripeSubscription);
        if (synced) await this.notifier.paymentFailed(synced.id);
        return { parentId: synced?.parentId, subscriptionId: synced?.id };
      }
      case 'charge.refunded': {
        const charge = object as StripeCharge;
        const paymentIntent = idOf(charge.payment_intent);
        if (!paymentIntent) return {};
        const payment = await this.prisma.payment.findUnique({
          where: {
            provider_providerPaymentId: { provider: 'STRIPE', providerPaymentId: paymentIntent },
          },
        });
        if (!payment) {
          // The payment's invoice.paid hasn't arrived yet: Stripe will send this again.
          throw new Error(`Refund for a payment we don't know yet (${paymentIntent})`);
        }
        const result = await this.records.applyRefund({
          paymentId: payment.id,
          refundedTotalMinor: charge.amount_refunded,
          reason: 'Refunded in Stripe',
          createdById: null,
        });
        if (result.full && payment.subscriptionId) {
          await this.cancelAtStripe(payment.subscriptionId);
          await this.notifier.subscriptionEnded(payment.subscriptionId);
        }
        return {
          parentId: payment.parentId,
          subscriptionId: payment.subscriptionId ?? undefined,
          paymentId: payment.id,
        };
      }
      default:
        return {};
    }
  }

  private async sync(stripeSubscriptionId: string) {
    const subscription = await this.stripe.client.subscriptions.retrieve(stripeSubscriptionId);
    // Another live card plan of the same family (two checkouts finished at once):
    // the newest wins, and the other stops at Stripe too, not only here, so the
    // family is never billed twice.
    const parentId = subscription.metadata?.['parentId'];
    const others = parentId
      ? await this.prisma.subscription.findMany({
          where: {
            parentId,
            provider: 'STRIPE',
            status: { in: [...LIVE] },
            providerSubscriptionId: { not: subscription.id },
          },
          select: { id: true, createdAt: true },
        })
      : [];
    const synced = await this.records.syncStripeSubscription(subscription);
    // Only a plan that is live replaces older ones. An event about a plan that has
    // ended (the replaced plan's own "deleted", a late or repeated webhook) must
    // never cancel the family's current plan.
    if (synced && LIVE.includes(synced.status)) {
      for (const other of others) {
        if (other.createdAt <= synced.createdAt) await this.cancelAtStripe(other.id);
      }
    }
    return synced;
  }

  /** The payment intent that paid an invoice (Stripe lists it separately). */
  private async paymentIntentOf(invoiceId: string): Promise<string | null> {
    const payments = await this.stripe.client.invoicePayments.list({
      invoice: invoiceId,
      limit: 5,
    });
    for (const entry of payments.data) {
      const id = idOf(entry.payment.payment_intent ?? null);
      if (id) return id;
    }
    return null;
  }

  /** After a full refund the subscription stops at Stripe too (no more renewals). */
  async cancelAtStripe(subscriptionId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });
    if (subscription?.provider !== 'STRIPE' || !subscription.providerSubscriptionId) return;
    try {
      await this.stripe.client.subscriptions.cancel(subscription.providerSubscriptionId);
    } catch (error) {
      this.logger.error(
        `Could not cancel Stripe subscription ${subscription.providerSubscriptionId} (the nightly job retries): ${String(error)}`,
      );
    }
  }
}
