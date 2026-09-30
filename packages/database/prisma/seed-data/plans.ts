/**
 * Plans, and placeholder prices per country (per child; the family discount applies
 * from the second child). Prices are only set when missing, so what staff change in
 * the admin panel stays. Yearly = 10 × monthly: two months free.
 */
export const plans = [
  { key: 'monthly', interval: 'MONTH', sortOrder: 1 },
  { key: 'yearly', interval: 'YEAR', sortOrder: 2 },
] as const;

/** Monthly prices in whole units of the currency (placeholders until staff set them). */
const MONTHLY: Record<string, { currency: string; monthly: number }> = {
  PK: { currency: 'PKR', monthly: 1_500 },
  EG: { currency: 'EGP', monthly: 250 },
  AE: { currency: 'AED', monthly: 35 },
  SA: { currency: 'SAR', monthly: 35 },
};

export const planPrices = Object.entries(MONTHLY).flatMap(
  ([countryCode, { currency, monthly }]) => [
    { planKey: 'monthly', countryCode, currency, amountMinor: monthly * 100 },
    { planKey: 'yearly', countryCode, currency, amountMinor: monthly * 10 * 100 },
  ],
);
