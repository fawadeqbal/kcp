import { randomBytes } from 'node:crypto';
import type { Redis } from 'ioredis';
import { Stripe } from 'stripe';
import type {
  CheckoutSessionParams,
  Metadata,
  StripeApi,
  StripeCharge,
  StripeCheckoutSession,
  StripeInvoice,
  StripePrice,
  StripeSubscription,
  StripeSubscriptionItem,
  SubscriptionUpdateParams,
} from './stripe-api.js';

/*
 * A stand-in for Stripe in development and tests, so card payments can be tried
 * without an account. It keeps its objects in Redis and — like Stripe — tells the
 * API what happened through signed webhooks, which go through the real webhook
 * endpoint and signature check. The API refuses to use it in production.
 *
 * Simplifications: every payment succeeds unless `failNextRenewal` is set; changing
 * plans starts a new period straight away and charges it in full (Stripe prorates);
 * the credit for a removed child isn't kept for the next invoice (Stripe keeps it).
 */

const KEY = 'mockstripe:';
const KEEP_SECONDS = 60 * 24 * 60 * 60;

/** Sends a signed webhook to the API. */
export type WebhookDelivery = (payload: string, signature: string) => Promise<void>;

interface StoredSession extends StripeCheckoutSession {
  line_items: CheckoutSessionParams['line_items'];
  success_url: string;
  cancel_url: string;
  subscription_metadata: Metadata;
  status: 'open' | 'complete' | 'expired';
  amount_total: number;
  currency: string;
}

interface StoredCharge extends StripeCharge {
  invoice: string;
}

const now = () => Math.floor(Date.now() / 1000);
const newId = (prefix: string) => `${prefix}_mock_${randomBytes(9).toString('base64url')}`;

/** Adds calendar months to a Unix time (Stripe bills monthly on the same day). */
function addMonths(seconds: number, months: number): number {
  const date = new Date(seconds * 1000);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const last = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, last));
  return Math.floor(date.getTime() / 1000);
}

const periodEnd = (start: number, interval: StripePrice['recurring']) =>
  interval?.interval === 'year' ? addMonths(start, 12) : addMonths(start, 1);

/** What a subscription costs per period, in minor units. */
const totalOf = (subscription: StripeSubscription) =>
  subscription.items.data.reduce(
    (sum, item) => sum + (item.price.unit_amount ?? 0) * (item.quantity ?? 1),
    0,
  );

export class MockStripe implements StripeApi {
  constructor(
    private readonly redis: Redis,
    private readonly options: {
      /** Where browsers reach the API (the mock's checkout page lives there). */
      apiPublicUrl: string;
      webhookSecret: string;
      deliver: WebhookDelivery;
      onError?: (message: string) => void;
    },
  ) {}

  // ── Storage ────────────────────────────────────────────────────────────────

  private async load<T>(kind: string, id: string): Promise<T> {
    const raw = await this.redis.get(`${KEY}${kind}:${id}`);
    if (!raw) {
      const error = new Error(`No such ${kind}: '${id}'`) as Error & { statusCode: number };
      error.statusCode = 404;
      throw error;
    }
    return JSON.parse(raw) as T;
  }

  private async save(kind: string, id: string, value: unknown) {
    await this.redis.set(`${KEY}${kind}:${id}`, JSON.stringify(value), 'EX', KEEP_SECONDS);
  }

  /**
   * Development helper (`pnpm demo:data`): keeps a customer, subscription or invoice
   * made outside the mock, so it can renew, cancel or change it like one of its own.
   */
  async store(
    kind: 'customer' | 'subscription' | 'invoice',
    value: { id: string } & Record<string, unknown>,
  ) {
    await this.save(kind, value.id, value);
  }

  /** Development helper: a paid invoice's charge, so the payment can be refunded. */
  async storeCharge(invoiceId: string, paymentIntent: string, amount: number, currency: string) {
    const charge: StoredCharge = {
      id: newId('ch'),
      object: 'charge',
      amount,
      amount_refunded: 0,
      currency,
      refunded: false,
      payment_intent: paymentIntent,
      invoice: invoiceId,
    };
    await this.save('charge', charge.id, charge);
    await this.redis.set(`${KEY}invoice-pi:${invoiceId}`, paymentIntent, 'EX', KEEP_SECONDS);
    await this.redis.set(`${KEY}pi-charge:${paymentIntent}`, charge.id, 'EX', KEEP_SECONDS);
  }

  // ── Webhooks ───────────────────────────────────────────────────────────────

  /** Signs and sends events one after another, a moment later (like Stripe). */
  private emit(events: { type: string; object: unknown }[]) {
    const send = async () => {
      for (const { type, object } of events) {
        const payload = JSON.stringify({
          id: newId('evt'),
          object: 'event',
          type,
          created: now(),
          livemode: false,
          api_version: '2026-08-26.dahlia',
          data: { object },
        });
        const signature = Stripe.webhooks.generateTestHeaderString({
          payload,
          secret: this.options.webhookSecret,
        });
        let delivered = false;
        for (let attempt = 0; attempt < 3 && !delivered; attempt++) {
          try {
            await this.options.deliver(payload, signature);
            delivered = true;
          } catch (error) {
            if (attempt === 2) {
              this.options.onError?.(`Mock Stripe: ${type} not delivered: ${String(error)}`);
            }
            await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1)));
          }
        }
      }
    };
    setTimeout(() => void send(), 20);
  }

  // ── Customers and prices ───────────────────────────────────────────────────

  customers = {
    create: async (params: { email?: string; name?: string; metadata: Metadata }) => {
      const customer = { id: newId('cus'), object: 'customer', ...params };
      await this.save('customer', customer.id, customer);
      return { id: customer.id };
    },
  };

  prices = {
    list: async (params: { lookup_keys: string[] }) => {
      const data: StripePrice[] = [];
      for (const key of params.lookup_keys) {
        const id = await this.redis.get(`${KEY}price-lookup:${key}`);
        if (id) data.push(await this.load<StripePrice>('price', id));
      }
      return { data };
    },
    create: async (params: {
      currency: string;
      unit_amount: number;
      recurring: { interval: 'month' | 'year' };
      lookup_key: string;
    }) => {
      const price: StripePrice = {
        id: newId('price'),
        currency: params.currency,
        unit_amount: params.unit_amount,
        lookup_key: params.lookup_key,
        recurring: params.recurring,
      };
      await this.save('price', price.id, price);
      await this.redis.set(`${KEY}price-lookup:${params.lookup_key}`, price.id, 'EX', KEEP_SECONDS);
      return price;
    },
  };

  // ── Checkout ───────────────────────────────────────────────────────────────

  checkout = {
    sessions: {
      create: async (params: CheckoutSessionParams) => {
        const id = newId('cs');
        let amount = 0;
        let currency = 'usd';
        for (const item of params.line_items) {
          const price = await this.load<StripePrice>('price', item.price);
          amount += (price.unit_amount ?? 0) * item.quantity;
          currency = price.currency;
        }
        const session: StoredSession = {
          id,
          object: 'checkout.session',
          url: `${this.options.apiPublicUrl}/v1/payments/mock-stripe/checkout/${id}`,
          mode: 'subscription',
          customer: params.customer,
          subscription: null,
          client_reference_id: params.client_reference_id,
          metadata: params.metadata,
          line_items: params.line_items,
          success_url: params.success_url,
          cancel_url: params.cancel_url,
          subscription_metadata: params.subscription_data.metadata,
          status: 'open',
          amount_total: amount,
          currency,
        };
        await this.save('session', id, session);
        return session;
      },
      expire: async (id: string) => {
        const session = await this.load<StoredSession>('session', id);
        if (session.status !== 'open') {
          throw new Error(`Checkout session ${id} is ${session.status}, not open`);
        }
        return this.publicSession(await this.expireSession(id));
      },
    },
  };

  /** The mock checkout page's view of a session. */
  async session(id: string) {
    return this.load<StoredSession>('session', id);
  }

  /** "Pay" on the mock checkout page: starts the subscription and charges it. */
  async completeSession(id: string): Promise<StoredSession> {
    const session = await this.load<StoredSession>('session', id);
    if (session.status !== 'open') return session;
    const start = now();
    const items: StripeSubscriptionItem[] = [];
    for (const line of session.line_items) {
      const price = await this.load<StripePrice>('price', line.price);
      items.push({
        id: newId('si'),
        price,
        quantity: line.quantity,
        current_period_start: start,
        current_period_end: periodEnd(start, price.recurring),
      });
    }
    const subscription: StripeSubscription = {
      id: newId('sub'),
      object: 'subscription',
      customer: session.customer as string,
      status: 'active',
      cancel_at_period_end: false,
      canceled_at: null,
      ended_at: null,
      metadata: session.subscription_metadata,
      items: { data: items },
    };
    await this.save('subscription', subscription.id, subscription);
    session.status = 'complete';
    session.subscription = subscription.id;
    await this.save('session', id, session);
    const invoice = await this.charge(subscription);
    this.emit([
      { type: 'checkout.session.completed', object: this.publicSession(session) },
      { type: 'invoice.paid', object: invoice },
    ]);
    return session;
  }

  /** "Cancel" on the mock checkout page. */
  async expireSession(id: string): Promise<StoredSession> {
    const session = await this.load<StoredSession>('session', id);
    if (session.status === 'open') {
      session.status = 'expired';
      await this.save('session', id, session);
    }
    return session;
  }

  private publicSession(session: StoredSession): StripeCheckoutSession {
    const { id, object, url, mode, customer, subscription, client_reference_id, metadata } =
      session;
    return { id, object, url, mode, customer, subscription, client_reference_id, metadata };
  }

  /** Invoices the subscription's current period and pays it with a new charge. */
  private async charge(
    subscription: StripeSubscription,
    prorated?: number,
  ): Promise<StripeInvoice> {
    const first = subscription.items.data[0];
    const amount = prorated ?? totalOf(subscription);
    const invoice: StripeInvoice = {
      id: newId('in'),
      object: 'invoice',
      customer: subscription.customer,
      currency: first?.price.currency ?? 'usd',
      amount_paid: amount,
      amount_due: amount,
      parent: { subscription_details: { subscription: subscription.id } },
      lines: {
        data:
          prorated === undefined
            ? subscription.items.data.map((item) => ({
                amount: (item.price.unit_amount ?? 0) * (item.quantity ?? 1),
                quantity: item.quantity ?? 1,
                period: { start: item.current_period_start, end: item.current_period_end },
              }))
            : [
                {
                  amount: prorated,
                  quantity: 1,
                  period: {
                    start: now(),
                    end: first?.current_period_end ?? now(),
                  },
                },
              ],
      },
    };
    const paymentIntent = newId('pi');
    const charge: StoredCharge = {
      id: newId('ch'),
      object: 'charge',
      amount,
      amount_refunded: 0,
      currency: invoice.currency,
      refunded: false,
      payment_intent: paymentIntent,
      invoice: invoice.id,
    };
    await this.save('invoice', invoice.id, invoice);
    await this.save('charge', charge.id, charge);
    await this.redis.set(`${KEY}invoice-pi:${invoice.id}`, paymentIntent, 'EX', KEEP_SECONDS);
    await this.redis.set(`${KEY}pi-charge:${paymentIntent}`, charge.id, 'EX', KEEP_SECONDS);
    return invoice;
  }

  // ── Subscriptions ──────────────────────────────────────────────────────────

  subscriptions = {
    retrieve: (id: string) => this.load<StripeSubscription>('subscription', id),

    update: async (id: string, params: SubscriptionUpdateParams) => {
      const subscription = await this.load<StripeSubscription>('subscription', id);
      if (subscription.status === 'canceled') {
        throw Object.assign(new Error('This subscription is canceled.'), { statusCode: 400 });
      }
      let newPeriod = false;
      const totalBefore = totalOf(subscription);
      if (params.cancel_at_period_end !== undefined) {
        subscription.cancel_at_period_end = params.cancel_at_period_end;
        subscription.canceled_at = params.cancel_at_period_end ? now() : null;
      }
      if (params.metadata) subscription.metadata = { ...subscription.metadata, ...params.metadata };
      for (const change of params.items ?? []) {
        const existing = subscription.items.data.find((item) => item.id === change.id);
        if (change.deleted) {
          subscription.items.data = subscription.items.data.filter((i) => i.id !== change.id);
          continue;
        }
        const price = change.price ? await this.load<StripePrice>('price', change.price) : null;
        if (existing) {
          if (price) {
            if (price.recurring?.interval !== existing.price.recurring?.interval) newPeriod = true;
            existing.price = price;
          }
          if (change.quantity !== undefined) existing.quantity = change.quantity;
        } else if (price) {
          const current = subscription.items.data[0];
          subscription.items.data.push({
            id: newId('si'),
            price,
            quantity: change.quantity ?? 1,
            current_period_start: current?.current_period_start ?? now(),
            current_period_end: current?.current_period_end ?? periodEnd(now(), price.recurring),
          });
        }
      }
      const events: { type: string; object: unknown }[] = [];
      if (newPeriod) {
        // Monthly ↔ yearly: a new period starts now, charged in full (Stripe would
        // also credit the unused time; the mock keeps it simple).
        const start = now();
        for (const item of subscription.items.data) {
          item.current_period_start = start;
          item.current_period_end = periodEnd(start, item.price.recurring);
        }
        events.push({ type: 'invoice.paid', object: await this.charge(subscription) });
      } else if (params.proration_behavior === 'always_invoice') {
        // Same period, more to pay (another child): the difference for the days left.
        const item = subscription.items.data[0];
        const start = item?.current_period_start ?? now();
        const end = item?.current_period_end ?? now();
        const left = end > start ? Math.max(0, end - now()) / (end - start) : 0;
        const due = Math.round((totalOf(subscription) - totalBefore) * left);
        if (due > 0) {
          events.push({ type: 'invoice.paid', object: await this.charge(subscription, due) });
        }
      }
      await this.save('subscription', id, subscription);
      this.emit([{ type: 'customer.subscription.updated', object: subscription }, ...events]);
      return subscription;
    },

    cancel: async (id: string) => {
      const subscription = await this.load<StripeSubscription>('subscription', id);
      if (subscription.status !== 'canceled') {
        subscription.status = 'canceled';
        subscription.canceled_at ??= now();
        subscription.ended_at = now();
        await this.save('subscription', id, subscription);
        this.emit([{ type: 'customer.subscription.deleted', object: subscription }]);
      }
      return subscription;
    },
  };

  /**
   * Development helper: the next period starts now, as if a month (or year) had
   * passed. The renewal is paid, or fails when `fail` is set.
   */
  async renew(id: string, fail = false): Promise<StripeSubscription> {
    const subscription = await this.load<StripeSubscription>('subscription', id);
    if (subscription.cancel_at_period_end) return this.subscriptions.cancel(id);
    const start = now();
    for (const item of subscription.items.data) {
      item.current_period_start = start;
      item.current_period_end = periodEnd(start, item.price.recurring);
    }
    subscription.status = fail ? 'past_due' : 'active';
    await this.save('subscription', id, subscription);
    const invoice = await this.charge(subscription);
    this.emit(
      fail
        ? [
            { type: 'invoice.payment_failed', object: { ...invoice, amount_paid: 0 } },
            { type: 'customer.subscription.updated', object: subscription },
          ]
        : [
            { type: 'invoice.paid', object: invoice },
            { type: 'customer.subscription.updated', object: subscription },
          ],
    );
    return subscription;
  }

  // ── Payments and refunds ───────────────────────────────────────────────────

  invoicePayments = {
    list: async (params: { invoice: string }) => {
      const paymentIntent = await this.redis.get(`${KEY}invoice-pi:${params.invoice}`);
      return {
        data: paymentIntent
          ? [{ status: 'paid', payment: { type: 'payment_intent', payment_intent: paymentIntent } }]
          : [],
      };
    },
  };

  refunds = {
    create: async (params: { payment_intent: string; amount?: number }) => {
      const chargeId = await this.redis.get(`${KEY}pi-charge:${params.payment_intent}`);
      if (!chargeId) {
        throw Object.assign(new Error('No such payment_intent'), { statusCode: 404 });
      }
      const charge = await this.load<StoredCharge>('charge', chargeId);
      const amount = params.amount ?? charge.amount - charge.amount_refunded;
      if (amount <= 0 || charge.amount_refunded + amount > charge.amount) {
        throw Object.assign(new Error('Refund is more than what is left.'), { statusCode: 400 });
      }
      charge.amount_refunded += amount;
      charge.refunded = charge.amount_refunded === charge.amount;
      await this.save('charge', charge.id, charge);
      const refund = { id: newId('re'), status: 'succeeded' };
      const { invoice: _invoice, ...publicCharge } = charge;
      this.emit([{ type: 'charge.refunded', object: publicCharge }]);
      return refund;
    },
  };
}
