import { checkPosting, LedgerError, normalBalance, type Posting } from './ledger.service.js';

const posting = (lines: Posting['lines'], currency = 'USD'): Posting => ({
  kind: 'test',
  memo: 'test',
  currency,
  idempotencyKey: 'k',
  lines,
});

describe('ledger postings', () => {
  it('accepts a posting whose debits equal its credits', () => {
    expect(() =>
      checkPosting(
        posting([
          { type: 'PROJECT_FUNDS', owner: 'p', side: 'DEBIT', amountMinor: 1000 },
          { type: 'PLATFORM_REVENUE', side: 'CREDIT', amountMinor: 250 },
          { type: 'LEAD_PAYABLE', owner: 'l', side: 'CREDIT', amountMinor: 250 },
          { type: 'STUDENT_HELD', owner: 's', side: 'CREDIT', amountMinor: 500 },
          // A part that rounds to nothing is left out.
          { type: 'STUDENT_HELD', owner: 't', side: 'CREDIT', amountMinor: 0 },
        ]),
      ),
    ).not.toThrow();
  });

  it('refuses postings that don’t balance, odd amounts, one-sided postings and bad currencies', () => {
    expect(() =>
      checkPosting(
        posting([
          { type: 'CASH', side: 'DEBIT', amountMinor: 100 },
          { type: 'CLIENT_RECEIVABLE', owner: 'o', side: 'CREDIT', amountMinor: 99 },
        ]),
      ),
    ).toThrow(LedgerError);
    expect(() =>
      checkPosting(
        posting([
          { type: 'CASH', side: 'DEBIT', amountMinor: 10.5 },
          { type: 'CLIENT_RECEIVABLE', owner: 'o', side: 'CREDIT', amountMinor: 10.5 },
        ]),
      ),
    ).toThrow(LedgerError);
    expect(() =>
      checkPosting(
        posting([
          { type: 'CASH', side: 'DEBIT', amountMinor: -5 },
          { type: 'CLIENT_RECEIVABLE', owner: 'o', side: 'CREDIT', amountMinor: -5 },
        ]),
      ),
    ).toThrow(LedgerError);
    expect(() => checkPosting(posting([{ type: 'CASH', side: 'DEBIT', amountMinor: 5 }]))).toThrow(
      LedgerError,
    );
    expect(() =>
      checkPosting(
        posting(
          [
            { type: 'CASH', side: 'DEBIT', amountMinor: 5 },
            { type: 'CLIENT_RECEIVABLE', owner: 'o', side: 'CREDIT', amountMinor: 5 },
          ],
          'usd',
        ),
      ),
    ).toThrow(LedgerError);
  });

  it('reads balances the way each account normally runs', () => {
    expect(normalBalance('CASH', 1000, 400)).toBe(600);
    expect(normalBalance('CLIENT_RECEIVABLE', 1000, 1000)).toBe(0);
    expect(normalBalance('STUDENT_PAYABLE', 100, 700)).toBe(600);
    expect(normalBalance('PLATFORM_REVENUE', 0, 250)).toBe(250);
  });
});
