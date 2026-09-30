import type { AddressInfo } from 'node:net';
import { Inject, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import type { Redis } from 'ioredis';
import { Stripe } from 'stripe';
import { AppConfigService } from '../../config/app-config.service.js';
import { REDIS } from '../../redis/redis.constants.js';
import { MockStripe } from './mock-stripe.js';
import type { StripeApi, StripeEvent, StripePrice } from './stripe-api.js';

/** Where Stripe sends events (and the mock too). */
export const STRIPE_WEBHOOK_PATH = '/v1/payments/webhooks/stripe';

/**
 * Talks to Stripe: the real API when STRIPE_SECRET_KEY is set, the mock in
 * development, nothing when cards are off (production without a key).
 */
@Injectable()
export class StripeGateway {
  private readonly logger = new Logger(StripeGateway.name);
  readonly mode: 'stripe' | 'mock' | 'off';
  private readonly api: StripeApi | null;
  /** The mock, for its checkout page and development helpers. */
  readonly mock: MockStripe | null;

  constructor(
    config: AppConfigService,
    @Inject(REDIS) redis: Redis,
    private readonly http: HttpAdapterHost,
  ) {
    this.mode = config.get('STRIPE_MODE');
    this.webhookSecret = config.get('STRIPE_WEBHOOK_SECRET') ?? null;
    const key = config.get('STRIPE_SECRET_KEY');
    if (this.mode === 'stripe' && key) {
      this.mock = null;
      this.api = new Stripe(key, {
        maxNetworkRetries: 2,
        timeout: 20_000,
        appInfo: { name: 'Kids Coding Platform' },
      }) as unknown as StripeApi;
    } else if (this.mode === 'mock') {
      this.mock = new MockStripe(redis, {
        apiPublicUrl: config.get('API_PUBLIC_URL'),
        webhookSecret: this.webhookSecret ?? '',
        deliver: (payload, signature) => this.deliverMockWebhook(payload, signature),
        onError: (message) => this.logger.error(message),
      });
      this.api = this.mock;
    } else {
      this.mock = null;
      this.api = null;
    }
  }

  private readonly webhookSecret: string | null;

  /** The webhook handler, for the mock's deliveries when the server isn't listening. */
  private localHandler: ((rawBody: Buffer, signature: string) => Promise<void>) | null = null;

  useLocalWebhookHandler(handler: (rawBody: Buffer, signature: string) => Promise<void>) {
    this.localHandler = handler;
  }

  get cardsAvailable(): boolean {
    return this.api !== null;
  }

  /** The Stripe API, or 503 when card payments are off. */
  get client(): StripeApi {
    if (!this.api) {
      throw new ServiceUnavailableException({
        error: 'CARDS_UNAVAILABLE',
        message: 'Card payments are not available right now.',
      });
    }
    return this.api;
  }

  /** Checks a webhook's signature and reads it (throws on a bad signature). */
  verify(rawBody: Buffer, signature: string): StripeEvent {
    if (!this.webhookSecret) throw new Error('No webhook secret configured');
    return Stripe.webhooks.constructEvent(
      rawBody,
      signature,
      this.webhookSecret,
    ) as unknown as StripeEvent;
  }

  /**
   * A Stripe price for this amount, made once and found again by its lookup key
   * (prices can't change, so a new amount is a new price).
   */
  async priceFor(params: {
    currency: string;
    unitMinor: number;
    interval: 'month' | 'year';
    lookupKey: string;
    name: string;
  }): Promise<StripePrice> {
    const found = await this.client.prices.list({
      lookup_keys: [params.lookupKey],
      active: true,
      limit: 1,
    });
    if (found.data[0]) return found.data[0];
    return this.client.prices.create({
      currency: params.currency.toLowerCase(),
      unit_amount: params.unitMinor,
      recurring: { interval: params.interval },
      product_data: { name: params.name },
      lookup_key: params.lookupKey,
      metadata: { app: 'kcp' },
    });
  }

  /**
   * The mock's webhooks go to our own endpoint over HTTP when the server is
   * listening (the full path: raw body, signature, handler), otherwise (tests
   * without a port) straight to the handler, which still checks the signature.
   */
  private async deliverMockWebhook(payload: string, signature: string) {
    const server = this.http.httpAdapter?.getHttpServer() as
      { address?: () => AddressInfo | string | null } | undefined;
    const address = server?.address?.();
    if (address && typeof address === 'object') {
      const response = await fetch(`http://127.0.0.1:${address.port}${STRIPE_WEBHOOK_PATH}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'stripe-signature': signature },
        body: payload,
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) throw new Error(`webhook answered ${response.status}`);
      return;
    }
    if (!this.localHandler) throw new Error('No webhook handler registered');
    await this.localHandler(Buffer.from(payload), signature);
  }
}
