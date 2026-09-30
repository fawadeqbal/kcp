import { stripeSummary } from './stripe-webhooks.service.js';

describe('stripeSummary', () => {
  it('keeps IDs, amounts, statuses and our references, never personal data', () => {
    const summary = stripeSummary({
      id: 'cs_123',
      object: 'checkout.session',
      mode: 'subscription',
      status: 'complete',
      amount_total: 150_000,
      currency: 'pkr',
      customer: { id: 'cus_1', email: 'parent@example.com', name: 'A Parent' },
      subscription: 'sub_1',
      customer_details: { email: 'parent@example.com', address: { city: 'Lahore' } },
      payment_method_details: { card: { last4: '4242', brand: 'visa' } },
      metadata: { parentId: 'p-1', planKey: 'monthly', note: 'free text' },
    });
    expect(summary).toEqual({
      id: 'cs_123',
      object: 'checkout.session',
      mode: 'subscription',
      status: 'complete',
      amount_total: 150_000,
      currency: 'pkr',
      customer: 'cus_1',
      subscription: 'sub_1',
      metadata: { parentId: 'p-1', planKey: 'monthly' },
    });
    expect(JSON.stringify(summary)).not.toMatch(/example\.com|Lahore|4242|free text/);
  });
});
