import { generateKeyPairSync, type KeyObject, randomUUID, sign } from 'node:crypto';
import type { Redis } from 'ioredis';
import { type PayoutsApi, PayoutsApiError } from './payouts-api.js';

/*
 * A stand-in for Wise in development and tests, so payouts can be tried without an
 * account (until the real keys come). It keeps its transfers in Redis and — like Wise —
 * tells the API what happened through signed webhooks (its own key pair), which go
 * through the real webhook endpoint and signature check. Never used in production.
 *
 * Every transfer is paid a moment later (a quarter of a second), unless `failNext()`
 * was called: then the next one bounces back. `loseNextAnswer()` makes the next transfer
 * but answers as if the connection dropped; `failNextFunding()` makes the next transfer
 * but doesn't fund it (it waits until `settle()` says what became of it).
 */

const KEY = 'mockwise:';
const KEEP_SECONDS = 60 * 24 * 60 * 60;

export type WiseWebhookDelivery = (payload: string, signature: string) => Promise<void>;

export class MockWise implements PayoutsApi {
  private readonly privateKey: KeyObject;
  readonly publicKey: KeyObject;

  constructor(
    private readonly redis: Redis,
    private readonly options: {
      deliver: WiseWebhookDelivery;
      onError?: (message: string) => void;
    },
  ) {
    const pair = generateKeyPairSync('rsa', { modulusLength: 2048 });
    this.privateKey = pair.privateKey;
    this.publicKey = pair.publicKey;
  }

  /** The next transfer bounces back (tests and trying out failures). */
  async failNext() {
    await this.redis.set(`${KEY}fail-next`, '1', 'EX', 3600);
  }

  /** The next transfer is made, but the answer is lost (a timeout). */
  async loseNextAnswer() {
    await this.redis.set(`${KEY}lose-next`, '1', 'EX', 3600);
  }

  /** The next transfer is made but not funded (e.g. Wise asks for approval in its app). */
  async failNextFunding() {
    await this.redis.set(`${KEY}unfunded-next`, '1', 'EX', 3600);
  }

  /** The next call to send fails before anything is made (Wise unavailable). */
  async refuseNext() {
    await this.redis.set(`${KEY}refuse-next`, '1', 'EX', 3600);
  }

  /** A transfer's final state, told through a signed webhook like Wise's. */
  async settle(transferId: string, state: string) {
    await this.finish(transferId, state);
  }

  async createRecipient(recipient: {
    holderName: string;
    iban: string;
    currency: string;
  }): Promise<string> {
    if (!recipient.holderName.trim()) throw new PayoutsApiError('Mock Wise: no holder name', 422);
    const id = String(await this.redis.incr(`${KEY}account-seq`));
    await this.redis.set(`${KEY}account:${id}`, JSON.stringify(recipient), 'EX', KEEP_SECONDS);
    return id;
  }

  async send(
    transfer: {
      recipientId: string;
      sourceCurrency: string;
      sourceAmount: string;
      customerTransactionId: string;
    },
    onCreated?: (transferId: string) => Promise<void>,
  ): Promise<{ transferId: string; status: string }> {
    if (await this.redis.getdel(`${KEY}refuse-next`)) {
      throw new PayoutsApiError('Mock Wise: 503 Service unavailable (quote)', 503);
    }
    if (!(await this.redis.exists(`${KEY}account:${transfer.recipientId}`))) {
      throw new PayoutsApiError(`Mock Wise: no recipient ${transfer.recipientId}`, 404);
    }
    if (!(Number(transfer.sourceAmount) > 0)) {
      throw new PayoutsApiError('Mock Wise: the amount must be more than zero', 422);
    }
    // Like Wise: the same customer transaction ID is the same transfer.
    const known = await this.redis.get(`${KEY}ctid:${transfer.customerTransactionId}`);
    if (known) {
      await onCreated?.(known);
      return { transferId: known, status: await this.status(known) };
    }
    const id = String(1_000_000 + (await this.redis.incr(`${KEY}transfer-seq`)));
    await this.redis.set(`${KEY}ctid:${transfer.customerTransactionId}`, id, 'EX', KEEP_SECONDS);
    await this.redis.set(
      `${KEY}transfer-ctid:${id}`,
      transfer.customerTransactionId,
      'EX',
      KEEP_SECONDS,
    );
    if (await this.redis.getdel(`${KEY}lose-next`)) {
      await this.redis.set(`${KEY}transfer:${id}`, 'processing', 'EX', KEEP_SECONDS);
      setTimeout(() => void this.finish(id, 'outgoing_payment_sent'), 250);
      throw new PayoutsApiError('Mock Wise: no answer (the connection dropped)', 0, true);
    }
    await onCreated?.(id);
    if (await this.redis.getdel(`${KEY}unfunded-next`)) {
      await this.redis.set(`${KEY}transfer:${id}`, 'incoming_payment_waiting', 'EX', KEEP_SECONDS);
      throw new PayoutsApiError(`Mock Wise: transfer ${id} not funded (needs approval)`, 409);
    }
    await this.redis.set(`${KEY}transfer:${id}`, 'processing', 'EX', KEEP_SECONDS);
    const fail = await this.redis.getdel(`${KEY}fail-next`);
    const final = fail ? 'bounced_back' : 'outgoing_payment_sent';
    setTimeout(() => void this.finish(id, final), 250);
    return { transferId: id, status: 'processing' };
  }

  async status(transferId: string): Promise<string> {
    const state = await this.redis.get(`${KEY}transfer:${transferId}`);
    if (!state) throw new PayoutsApiError(`Mock Wise: no transfer ${transferId}`, 404);
    return state;
  }

  async lookup(
    transferId: string,
  ): Promise<{ status: string; customerTransactionId: string | null }> {
    const status = await this.status(transferId);
    return {
      status,
      customerTransactionId: await this.redis.get(`${KEY}transfer-ctid:${transferId}`),
    };
  }

  private async finish(id: string, state: string) {
    await this.redis.set(`${KEY}transfer:${id}`, state, 'EX', KEEP_SECONDS);
    const payload = JSON.stringify({
      data: {
        resource: { type: 'transfer', id: Number(id), profile_id: 0, account_id: 0 },
        current_state: state,
        previous_state: 'processing',
        occurred_at: new Date().toISOString(),
      },
      subscription_id: randomUUID(),
      event_type: 'transfers#state-change',
      schema_version: '2.0.0',
      sent_at: new Date().toISOString(),
    });
    const signature = sign('sha256', Buffer.from(payload), this.privateKey).toString('base64');
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await this.options.deliver(payload, signature);
        return;
      } catch (error) {
        if (attempt === 2) {
          this.options.onError?.(`Mock Wise: webhook not delivered: ${String(error)}`);
        }
        await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1)));
      }
    }
  }
}
