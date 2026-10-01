import { createHash, randomUUID } from 'node:crypto';
import { type PayoutsApi, PayoutsApiError } from './payouts-api.js';

/**
 * Wise's API (https://docs.wise.com/api-docs): recipients, quotes, transfers, funding
 * from the business balance. Sandbox: https://api.sandbox.transferwise.tech.
 *
 * Notes for going live (docs/runbooks/hub-payouts.md): Wise's account requirements per
 * currency can ask for more than an IBAN (GET /v1/quotes/{id}/account-requirements);
 * a payout Wise refuses fails here with Wise's message, and staff pay it by hand. Some
 * profiles need Strong Customer Authentication to fund transfers through the API.
 */
/** The same UUID for the same seed: a retried step is the same request to Wise. */
export function stableUuid(seed: string): string {
  const hex = createHash('sha256').update(seed).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export class WiseApi implements PayoutsApi {
  constructor(private readonly options: { baseUrl: string; token: string; profileId: string }) {}

  private async call<T>(
    method: string,
    path: string,
    body?: unknown,
    idempotencyKey: string = randomUUID(),
  ): Promise<T> {
    const response = await fetch(`${this.options.baseUrl.replace(/\/+$/, '')}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${this.options.token}`,
        'content-type': 'application/json',
        // Wise de-duplicates requests by this key: a retried step sends the same one.
        'X-idempotence-uuid': idempotencyKey,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });
    const text = await response.text();
    if (!response.ok) {
      let message = text.slice(0, 300);
      try {
        const parsed = JSON.parse(text) as {
          errors?: { message?: string }[];
          message?: string;
        };
        message = parsed.errors?.[0]?.message ?? parsed.message ?? message;
      } catch {
        // Not JSON: keep the text.
      }
      throw new PayoutsApiError(
        `Wise ${method} ${path}: ${response.status} ${message}`,
        response.status,
      );
    }
    return (text ? JSON.parse(text) : {}) as T;
  }

  async createRecipient(recipient: {
    holderName: string;
    iban: string;
    currency: string;
    countryCode: string;
  }): Promise<string> {
    const account = await this.call<{ id: number }>('POST', '/v1/accounts', {
      currency: recipient.currency,
      type: 'iban',
      profile: Number(this.options.profileId),
      accountHolderName: recipient.holderName,
      legalType: 'PRIVATE',
      details: { legalType: 'PRIVATE', IBAN: recipient.iban },
    });
    return String(account.id);
  }

  async send(
    transfer: {
      recipientId: string;
      sourceCurrency: string;
      targetCurrency: string;
      sourceAmount: string;
      customerTransactionId: string;
      reference: string;
    },
    onCreated?: (transferId: string) => Promise<void>,
  ): Promise<{ transferId: string; status: string }> {
    const profile = this.options.profileId;
    const quote = await this.call<{ id: string }>('POST', `/v3/profiles/${profile}/quotes`, {
      sourceCurrency: transfer.sourceCurrency,
      targetCurrency: transfer.targetCurrency,
      sourceAmount: Number(transfer.sourceAmount),
      targetAccount: Number(transfer.recipientId),
      payOut: 'BANK_TRANSFER',
      preferredPayIn: 'BALANCE',
    });
    // The same customerTransactionId returns the transfer made before (a retry).
    let made: { id: number; status: string };
    try {
      made = await this.call<{ id: number; status: string }>(
        'POST',
        '/v1/transfers',
        {
          targetAccount: Number(transfer.recipientId),
          quoteUuid: quote.id,
          customerTransactionId: transfer.customerTransactionId,
          details: { reference: transfer.reference.slice(0, 10) },
        },
        // Wise de-duplicates transfers by customerTransactionId (a retry has a new
        // quote, so the same request key with a different body would be refused).
      );
    } catch (error) {
      // Refused (4xx): there's no transfer. Anything else: there may be one.
      if (error instanceof PayoutsApiError && error.status >= 400 && error.status < 500) {
        throw error;
      }
      throw new PayoutsApiError(
        `Wise POST /v1/transfers: no clear answer (${(error as Error).message})`,
        0,
        true,
      );
    }
    await onCreated?.(String(made.id));
    const funded = await this.call<{ status: string; errorCode?: string | null }>(
      'POST',
      `/v3/profiles/${profile}/transfers/${made.id}/payments`,
      { type: 'BALANCE' },
      stableUuid(`${transfer.customerTransactionId}:funding`),
    );
    if (funded.status !== 'COMPLETED') {
      throw new PayoutsApiError(
        `Wise didn't fund transfer ${made.id}: ${funded.errorCode ?? funded.status}`,
        409,
      );
    }
    return { transferId: String(made.id), status: made.status };
  }

  async status(transferId: string): Promise<string> {
    return (await this.lookup(transferId)).status;
  }

  async lookup(
    transferId: string,
  ): Promise<{ status: string; customerTransactionId: string | null }> {
    const found = await this.call<{ status: string; customerTransactionId?: string | null }>(
      'GET',
      `/v1/transfers/${encodeURIComponent(transferId)}`,
    );
    return { status: found.status, customerTransactionId: found.customerTransactionId ?? null };
  }
}
