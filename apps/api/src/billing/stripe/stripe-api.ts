/**
 * The part of Stripe's API the platform uses. The real `stripe` client and the
 * development mock (mock-stripe.ts) both provide it. Field names follow Stripe's
 * API (version 2026-08-26): billing periods live on subscription items, and an
 * invoice points at its subscription through `parent.subscription_details`.
 */

export type Metadata = Record<string, string>;

export interface StripePrice {
  id: string;
  currency: string;
  unit_amount: number | null;
  lookup_key?: string | null;
  recurring: { interval: 'month' | 'year' | 'week' | 'day' } | null;
}

export interface StripeSubscriptionItem {
  id: string;
  price: StripePrice;
  quantity?: number;
  current_period_start: number;
  current_period_end: number;
}

export interface StripeSubscription {
  id: string;
  object: 'subscription';
  customer: string | { id: string };
  status:
    | 'active'
    | 'trialing'
    | 'past_due'
    | 'unpaid'
    | 'canceled'
    | 'incomplete'
    | 'incomplete_expired'
    | 'paused';
  cancel_at_period_end: boolean;
  canceled_at: number | null;
  ended_at: number | null;
  metadata: Metadata;
  items: { data: StripeSubscriptionItem[] };
}

export interface StripeCheckoutSession {
  id: string;
  object: 'checkout.session';
  url: string | null;
  mode: 'subscription' | 'payment' | 'setup';
  customer: string | { id: string } | null;
  subscription: string | { id: string } | null;
  client_reference_id: string | null;
  metadata: Metadata | null;
}

export interface StripeInvoice {
  id: string;
  object: 'invoice';
  customer: string | { id: string } | null;
  currency: string;
  amount_paid: number;
  amount_due: number;
  parent: { subscription_details: { subscription: string | { id: string } } | null } | null;
  lines: {
    data: { amount: number; quantity: number | null; period: { start: number; end: number } }[];
  };
}

export interface StripeCharge {
  id: string;
  object: 'charge';
  amount: number;
  amount_refunded: number;
  currency: string;
  refunded: boolean;
  payment_intent: string | { id: string } | null;
}

export interface StripeEvent {
  id: string;
  type: string;
  created: number;
  data: { object: { object?: string } & Record<string, unknown> };
}

export interface CheckoutSessionParams {
  mode: 'subscription';
  customer: string;
  line_items: { price: string; quantity: number }[];
  success_url: string;
  cancel_url: string;
  client_reference_id: string;
  metadata: Metadata;
  subscription_data: { metadata: Metadata };
  locale?: 'auto' | 'en';
}

export interface SubscriptionUpdateParams {
  cancel_at_period_end?: boolean;
  /** Replace or change items: an `id` updates that item, `deleted` removes it. */
  items?: { id?: string; price?: string; quantity?: number; deleted?: boolean }[];
  proration_behavior?: 'none' | 'create_prorations' | 'always_invoice';
  metadata?: Metadata;
}

export interface StripeApi {
  customers: {
    create(params: { email?: string; name?: string; metadata: Metadata }): Promise<{ id: string }>;
  };
  prices: {
    list(params: { lookup_keys: string[]; active?: boolean; limit?: number }): Promise<{
      data: StripePrice[];
    }>;
    create(params: {
      currency: string;
      unit_amount: number;
      recurring: { interval: 'month' | 'year' };
      product_data: { name: string };
      lookup_key: string;
      metadata?: Metadata;
    }): Promise<StripePrice>;
  };
  checkout: {
    sessions: {
      create(
        params: CheckoutSessionParams,
        options?: { idempotencyKey?: string },
      ): Promise<StripeCheckoutSession>;
      /** Closes an open checkout page (fails if it was completed or expired already). */
      expire(id: string): Promise<StripeCheckoutSession>;
    };
  };
  subscriptions: {
    retrieve(id: string): Promise<StripeSubscription>;
    update(id: string, params: SubscriptionUpdateParams): Promise<StripeSubscription>;
    cancel(id: string): Promise<StripeSubscription>;
  };
  invoicePayments: {
    list(params: { invoice: string; limit?: number }): Promise<{
      data: {
        status?: string;
        payment: { type: string; payment_intent?: string | { id: string } | null };
      }[];
    }>;
  };
  refunds: {
    create(
      params: { payment_intent: string; amount?: number; metadata?: Metadata },
      options?: { idempotencyKey?: string },
    ): Promise<{ id: string; status: string | null }>;
  };
}

/** An ID from a field that may hold the ID or the expanded object. */
export const idOf = (value: string | { id: string } | null | undefined): string | null =>
  value ? (typeof value === 'string' ? value : value.id) : null;
