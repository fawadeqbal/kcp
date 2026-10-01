/** What the hub needs from a payouts provider (Wise, or its mock). */
export interface PayoutsApi {
  /** Makes the recipient (a bank account by IBAN); returns the provider's ID for it. */
  createRecipient(recipient: {
    holderName: string;
    iban: string;
    currency: string;
    countryCode: string;
  }): Promise<string>;
  /**
   * Sends money from the platform's balance: a quote, a transfer and its funding.
   * `customerTransactionId` (our payout's ID) makes a retry return the same transfer.
   * `onCreated` hears the transfer's ID as soon as it exists, before it's funded: from
   * then on the payout counts as sent, whatever happens next.
   */
  send(
    transfer: {
      recipientId: string;
      sourceCurrency: string;
      targetCurrency: string;
      /** In the source currency's main unit, e.g. "12.50". */
      sourceAmount: string;
      customerTransactionId: string;
      reference: string;
    },
    onCreated?: (transferId: string) => Promise<void>,
  ): Promise<{ transferId: string; status: string }>;
  /** A transfer's state now. */
  status(transferId: string): Promise<string>;
  /** A transfer's state and the customerTransactionId it was made with (our payout's ID). */
  lookup(transferId: string): Promise<{ status: string; customerTransactionId: string | null }>;
}

/**
 * A provider answer that isn't a success. `unclear`: no clear answer when making the
 * transfer (a timeout, a server error), so the transfer may exist anyway.
 */
export class PayoutsApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly unclear = false,
  ) {
    super(message);
  }
}

/** Wise transfer states: paid, failed (the money comes back), or still on the way. */
export const PAID_STATES = new Set(['outgoing_payment_sent']);
export const FAILED_STATES = new Set([
  'cancelled',
  'funds_refunded',
  'charged_back',
  'bounced_back',
]);

/** The webhook event Wise sends when a transfer's state changes. */
export interface TransferStateEvent {
  event_type: string;
  data?: {
    resource?: { id?: number | string; type?: string };
    current_state?: string;
    occurred_at?: string;
  };
}
