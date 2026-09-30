import { formatMoney } from './money';

describe('formatMoney', () => {
  it('shows minor units as money, without .00 on whole amounts', () => {
    expect(formatMoney('en', 150_000, 'PKR')).toMatch(/1,500(?![.\d])/);
    expect(formatMoney('en', 2_450, 'AED')).toMatch(/24\.50/);
  });

  it('uses the reader’s digits', () => {
    expect(formatMoney('ar-EG', 25_000, 'EGP')).toContain('٢٥٠');
  });
});
