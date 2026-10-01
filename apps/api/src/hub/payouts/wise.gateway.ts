import { createPublicKey, type KeyObject, verify } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { HttpException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import type { Redis } from 'ioredis';
import { AppConfigService } from '../../config/app-config.service.js';
import { REDIS } from '../../redis/redis.constants.js';
import { MockWise } from './mock-wise.js';
import type { PayoutsApi } from './payouts-api.js';
import { WiseApi } from './wise-api.js';

/** Where Wise sends transfer events (and the mock too). */
export const WISE_WEBHOOK_PATH = '/v1/payouts/webhooks/wise';

/**
 * Talks to Wise: the real API with WISE_API_TOKEN, the mock in development, nothing
 * otherwise (payouts are then paid by hand and recorded by staff).
 */
@Injectable()
export class WiseGateway {
  private readonly logger = new Logger(WiseGateway.name);
  readonly mode: 'wise' | 'mock' | 'off';
  private readonly api: PayoutsApi | null;
  readonly mock: MockWise | null;
  private readonly publicKey: KeyObject | null;
  private localHandler: ((rawBody: Buffer, signature: string) => Promise<void>) | null = null;

  constructor(
    config: AppConfigService,
    @Inject(REDIS) redis: Redis,
    private readonly http: HttpAdapterHost,
  ) {
    this.mode = config.get('WISE_MODE');
    const token = config.get('WISE_API_TOKEN');
    const profileId = config.get('WISE_PROFILE_ID');
    if (this.mode === 'wise' && token && profileId) {
      this.mock = null;
      this.api = new WiseApi({ baseUrl: config.get('WISE_API_URL'), token, profileId });
      const pem = config.get('WISE_WEBHOOK_PUBLIC_KEY');
      this.publicKey = pem ? createPublicKey(pem) : null;
    } else if (this.mode === 'mock') {
      this.mock = new MockWise(redis, {
        deliver: (payload, signature) => this.deliverMockWebhook(payload, signature),
        onError: (message) => this.logger.error(message),
      });
      this.api = this.mock;
      this.publicKey = this.mock.publicKey;
    } else {
      this.mock = null;
      this.api = null;
      this.publicKey = null;
    }
  }

  get available(): boolean {
    return this.api !== null;
  }

  /** The provider, or 503 when payouts through it are off (pay by hand instead). */
  get client(): PayoutsApi {
    if (!this.api) {
      throw new HttpException(
        {
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          error: 'PROVIDER_OFF',
          message: 'Payouts through Wise aren’t set up: pay by hand and record each payout.',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    return this.api;
  }

  /** Throws 503 when payouts through Wise are off. */
  requireProvider(): void {
    void this.client;
  }

  /** Whether a webhook's body was signed by Wise (or the mock). */
  verify(rawBody: Buffer, signature: string): boolean {
    if (!this.publicKey || !signature) return false;
    try {
      return verify('sha256', rawBody, this.publicKey, Buffer.from(signature, 'base64'));
    } catch {
      return false;
    }
  }

  useLocalWebhookHandler(handler: (rawBody: Buffer, signature: string) => Promise<void>) {
    this.localHandler = handler;
  }

  /**
   * The mock's webhooks go to our own endpoint over HTTP when the server is listening
   * (raw body, signature, handler), otherwise straight to the handler (which still
   * checks the signature).
   */
  private async deliverMockWebhook(payload: string, signature: string) {
    const server = this.http.httpAdapter?.getHttpServer() as
      { address?: () => AddressInfo | string | null } | undefined;
    const address = server?.address?.();
    if (address && typeof address === 'object') {
      const response = await fetch(`http://127.0.0.1:${address.port}${WISE_WEBHOOK_PATH}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-signature-sha256': signature },
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
