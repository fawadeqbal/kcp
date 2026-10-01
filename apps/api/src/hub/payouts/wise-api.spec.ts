import { generateKeyPairSync, sign, verify } from 'node:crypto';
import { toDecimal } from '../payouts.service.js';
import { PayoutsApiError } from './payouts-api.js';
import { stableUuid, WiseApi } from './wise-api.js';

describe('WiseApi', () => {
  const calls: {
    method: string;
    url: string;
    body: unknown;
    auth: string | null;
    key: string | null;
  }[] = [];
  const answers: [number, unknown][] = [];

  beforeEach(() => {
    calls.length = 0;
    answers.length = 0;
    vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
      const headers = new Headers(init.headers);
      calls.push({
        method: init.method ?? 'GET',
        url,
        body: init.body ? JSON.parse(String(init.body)) : undefined,
        auth: headers.get('authorization'),
        key: headers.get('x-idempotence-uuid'),
      });
      const [status, body] = answers.shift() ?? [500, {}];
      return new Response(JSON.stringify(body), { status });
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  const api = new WiseApi({ baseUrl: 'https://wise.test/', token: 'tok', profileId: '42' });

  it('makes an IBAN recipient on the profile', async () => {
    answers.push([200, { id: 777 }]);
    const id = await api.createRecipient({
      holderName: 'Ayesha Khan',
      iban: 'PK36SCBL0000001123456702',
      currency: 'PKR',
      countryCode: 'PK',
    });
    expect(id).toBe('777');
    expect(calls[0]).toMatchObject({
      method: 'POST',
      url: 'https://wise.test/v1/accounts',
      auth: 'Bearer tok',
      body: {
        currency: 'PKR',
        type: 'iban',
        profile: 42,
        accountHolderName: 'Ayesha Khan',
        details: { legalType: 'PRIVATE', IBAN: 'PK36SCBL0000001123456702' },
      },
    });
  });

  it('quotes, makes the transfer (idempotent by our ID) and funds it from the balance', async () => {
    answers.push(
      [200, { id: 'quote-uuid' }],
      [200, { id: 9001, status: 'incoming_payment_waiting' }],
      [201, { status: 'COMPLETED' }],
    );
    const sent = await api.send({
      recipientId: '777',
      sourceCurrency: 'USD',
      targetCurrency: 'PKR',
      sourceAmount: '375.00',
      customerTransactionId: '0190-payout',
      reference: 'KCP12345678',
    });
    expect(sent).toEqual({ transferId: '9001', status: 'incoming_payment_waiting' });
    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual([
      'POST https://wise.test/v3/profiles/42/quotes',
      'POST https://wise.test/v1/transfers',
      'POST https://wise.test/v3/profiles/42/transfers/9001/payments',
    ]);
    expect(calls[0]!.body).toMatchObject({
      sourceCurrency: 'USD',
      targetCurrency: 'PKR',
      sourceAmount: 375,
    });
    expect(calls[1]!.body).toMatchObject({
      targetAccount: 777,
      quoteUuid: 'quote-uuid',
      customerTransactionId: '0190-payout',
      details: { reference: 'KCP1234567' },
    });
    expect(calls[2]!.body).toEqual({ type: 'BALANCE' });
  });

  it('fails with Wise’s message when it refuses, or the funding is rejected', async () => {
    answers.push([422, { errors: [{ message: 'IBAN not supported' }] }]);
    await expect(
      api.createRecipient({ holderName: 'A', iban: 'X', currency: 'PKR', countryCode: 'PK' }),
    ).rejects.toThrow(/422 IBAN not supported/);
    answers.push(
      [200, { id: 'q' }],
      [200, { id: 1, status: 'x' }],
      [200, { status: 'REJECTED', errorCode: 'balance.payment-option-unavailable' }],
    );
    await expect(
      api.send({
        recipientId: '1',
        sourceCurrency: 'USD',
        targetCurrency: 'PKR',
        sourceAmount: '1.00',
        customerTransactionId: 'id',
        reference: 'r',
      }),
    ).rejects.toBeInstanceOf(PayoutsApiError);
  });

  const transfer = {
    recipientId: '1',
    sourceCurrency: 'USD',
    targetCurrency: 'PKR',
    sourceAmount: '1.00',
    customerTransactionId: '0190-payout',
    reference: 'r',
  };

  it('tells the caller the transfer exists before funding it; a retry funds with the same key', async () => {
    const created: string[] = [];
    answers.push(
      [200, { id: 'q' }],
      [200, { id: 55, status: 'x' }],
      [409, { errors: [{ message: 'needs approval' }] }],
    );
    await expect(
      api.send(transfer, async (id) => {
        created.push(id);
      }),
    ).rejects.toThrow(/needs approval/);
    expect(created).toEqual(['55']);
    expect(calls[1]!.body).toMatchObject({ customerTransactionId: '0190-payout' });
    expect(calls[2]!.key).toBe(stableUuid('0190-payout:funding'));
    expect(stableUuid('0190-payout:funding')).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-a[0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it('says when it can’t tell whether the transfer was made (a server error), but not when Wise refused', async () => {
    answers.push([200, { id: 'q' }], [502, { message: 'Bad gateway' }]);
    await expect(api.send(transfer)).rejects.toMatchObject({ unclear: true });
    answers.push([200, { id: 'q' }], [422, { errors: [{ message: 'Bad account' }] }]);
    await expect(api.send(transfer)).rejects.toMatchObject({ unclear: false, status: 422 });
  });

  it('reads a transfer’s state, and the payout it was made for', async () => {
    answers.push([200, { status: 'outgoing_payment_sent' }]);
    expect(await api.status('9001')).toBe('outgoing_payment_sent');
    expect(calls[0]!.url).toBe('https://wise.test/v1/transfers/9001');
    answers.push([200, { status: 'processing', customerTransactionId: '0190-payout' }]);
    expect(await api.lookup('9001')).toEqual({
      status: 'processing',
      customerTransactionId: '0190-payout',
    });
  });
});

describe('payout amounts and signatures', () => {
  it('turns minor units into Wise’s decimals', () => {
    expect(toDecimal(37_500, 'USD')).toBe('375.00');
    expect(toDecimal(5, 'PKR')).toBe('0.05');
    expect(toDecimal(1250, 'JPY')).toBe('1250');
    expect(toDecimal(1250, 'KWD')).toBe('1.250');
  });

  it('checks webhook bodies the way Wise signs them (RSA-SHA256, base64)', () => {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const body = Buffer.from('{"event_type":"transfers#state-change"}');
    const signature = sign('sha256', body, privateKey).toString('base64');
    expect(verify('sha256', body, publicKey, Buffer.from(signature, 'base64'))).toBe(true);
    expect(verify('sha256', Buffer.from('{}'), publicKey, Buffer.from(signature, 'base64'))).toBe(
      false,
    );
  });
});
