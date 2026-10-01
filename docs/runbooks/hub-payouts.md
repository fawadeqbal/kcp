# Hub money: earnings, payout accounts and payouts

How students' earnings are shared out, held and paid to their parents, how lead
developers are paid, and how to keep the books right. For the rest of the hub see
[hub.md](hub.md).

> **Payouts are off until the lawyer signs off (Gate 2).** The feature flag
> `hub_payouts` (Admin → Feature flags) stays **off** until then: no batch is made
> (no parent is asked to confirm), nothing is sent or recorded as paid. Switch it on
> only with the lawyer's written approval, **for the countries concerned** (the flag's
> countries: a student is paid only if the flag is on for their country; leads are paid
> once it's on anywhere).

## How the money moves

Everything is in a double-entry ledger (Admin → Hub → Ledger). Each line below is one
posting; debits always equal credits, and nothing is ever edited or deleted — a
mistake is put right by a new posting.

| When                                              | Posting                                                                               |
| ------------------------------------------------- | ------------------------------------------------------------------------------------- |
| An invoice is issued                              | Client receivable ↑, project funds ↑                                                  |
| It's paid (card or bank)                          | Cash ↑, client receivable ↓                                                           |
| Paid **and** the client accepted the quote's work | Project funds ↓ → platform revenue, lead payable, each student's held earnings        |
| The hold ends (14 days by default)                | Student held ↓, student payable ↑                                                     |
| A payout is sent                                  | Student payable ↓ → payouts on the way (and tax withheld, if the country has a rate)  |
| Wise pays it / it's recorded as paid by hand      | Payouts on the way ↓, cash ↓                                                          |
| Wise sends it back                                | Undone: the money is payable again for the next round                                 |
| The bank returns it after it was paid             | Cash ↑, student payable ↑ (`payout.returned`): payable again, staff warned in the log |
| A lead developer is paid by hand                  | Lead payable ↓, cash ↓                                                                |

The students' pool (50% by default) is split over the quote's finished tasks by their
shares (shares of tasks nobody finished go to the students who did finish theirs).
Each invoice is shared out once; the hourly `hub-earnings` job catches up any that
were missed.

**Check the books** once a week: Admin → Hub → Ledger → trial balance. Debits must
equal credits in every currency, and cash should match the bank and Stripe balances
for hub money. If they don't, stop payouts (flag off) and look at the latest
postings.

## Wise: set up and keys

Payouts go through Wise when `WISE_API_TOKEN` is set. Until the real keys arrive:

- **Development and tests** use a mock of Wise automatically (no keys needed). It
  pays every transfer a moment later and sends signed webhooks like Wise does.
- **Production without a token** pays by hand: make **manual** batches and record
  each payment (below). Nothing else changes for parents.

When the business account is ready:

1. In Wise (sandbox first: `https://sandbox.transferwise.tech`), create an API token
   with access to transfers, and note the business **profile ID**
   (`GET /v2/profiles`).
2. Add a webhook subscription for **transfer state changes** to
   `<api>/v1/payouts/webhooks/wise`.
3. Set in the API's environment (secrets):
   ```
   WISE_API_TOKEN=…
   WISE_PROFILE_ID=…
   WISE_API_URL=https://api.sandbox.transferwise.tech   # live: https://api.wise.com
   WISE_WEBHOOK_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n…\n-----END PUBLIC KEY-----"
   ```
   The public key is on Wise's webhook documentation page (sandbox and live differ).
4. Restart the API, make a small batch to a staff member's own account in the sandbox,
   and check it reaches "paid".
5. Keep the Wise balance topped up in each source currency before sending a batch.

Things to know: Wise may ask for more than an IBAN for some currencies (the payout then
fails with Wise's message — pay it by hand); some profiles need Strong Customer
Authentication to fund transfers (approve in the Wise app); the transfer reference is
`KCP<payout number>`. Before going live, check in the sandbox that a second
`POST /v1/transfers` with the same `customerTransactionId` returns the first transfer
(the API relies on it after a timeout, below). To rotate the token, create a new one, update the secret,
restart, then delete the old one.

## Payout accounts (parents)

- A parent adds an account on their dashboard (Payouts): an **IBAN** (paid through
  Wise or by hand) or **other** details such as a mobile wallet (by hand only). It
  needs their password, they get an email, and it can be paid only after **48 hours**
  and once staff have checked it.
- **Check new accounts:** Admin → Hub → Payout accounts (waiting). Confirm the
  holder's name and the last four characters with the parent through a channel you
  already trust (an email to their registered address, not a reply to anything new). "Show details" reveals the full IBAN — every look
  is in the audit log. Then **Mark checked**.
- A change cancels payouts waiting for the old account; the money stays payable.
- If a parent says they didn't make a change: suspend the parent account (Admin →
  Users), sign them out everywhere, and follow [safety-incident.md](safety-incident.md).

## A payout round

1. **Admin → Hub → Payouts → Ready to pay:** students with payable money of at least
   10.00 (in the currency), whose parent's account is checked and past its 48 hours.
2. **Make a batch** for one currency: **Wise** (IBAN accounts only) or **Manual**.
   Each parent is emailed to confirm their payout on their dashboard.
3. **Two super admins approve** the batch (two different people; the same person
   can't approve twice).
4. **Send** (a super admin, with the `hub_payouts` flag on). Payouts the parent
   didn't confirm are left out (their money waits for the next round).
   - **Wise:** each confirmed payout is sent now. It shows "sent", then "paid" when
     Wise confirms (webhook; the `hub-payouts` job also asks Wise every 30 minutes).
     A payout Wise refuses shows "failed" with Wise's reason and its money is payable
     again. **A payout is never failed once its transfer exists:** if funding it goes
     wrong (e.g. Wise wants approval in its app), it stays "sent" with the reason
     shown — approve or cancel the transfer in Wise; a cancelled one comes back as
     "failed" and its money is payable again. If Wise gave **no clear answer** (a
     timeout), the payout stays "sending" with `UNCLEAR: …`; after 10 minutes the
     job asks Wise again with the same transaction ID, which finds the transfer if it
     was made. After that first unclear answer the payout is never failed by itself
     (whatever Wise answers later), and the job doesn't retry while the parent's
     account is removed or payouts are switched off. A payout stuck in "sending" for
     more than an hour: look it up in Wise by its reference (`KCP<number>`), then
     **Settle** it (a super admin, on the batch): "there is a transfer" (with Wise's
     transfer ID; Wise's state then follows) or "there is no transfer" (it fails and
     the money is payable again). Never mark it as not sent without checking Wise.
   - **Manual:** pay each confirmed payout from the bank (or wallet), then **Record**
     it with the method and the bank's reference. Parents get the "on its way" email.
     Once the batch is sent, parents can't decline its payouts, and changing or
     removing their account doesn't cancel them: record each one you paid, and
     cancel (with a reason) only those you didn't.
5. Look at failed payouts the next day: check the account with the parent; the money
   goes into the next round automatically. For 30 days after a payout is paid the job
   still asks Wise about it: if the bank returns the money, the payout turns "failed"
   (`RETURNED_AFTER_PAID`), the parent is emailed and the money is payable again. The books assume the whole amount came back: if Wise or the bank kept a fee, the difference shows in cash against the Wise balance — put it right with an adjusting posting (below).

Cancel a batch before it's sent if something looks wrong (Admin → the batch →
Cancel); a single payout can be taken out with a reason.

## Lead developers

Leads are paid by hand (they're adults, often invoicing as contractors). Admin → Hub
→ Payouts → Lead developers shows what each is owed; after paying, **Record a
payment** with the amount and the bank's reference (only up to what's owed; needs the
flag on). Each bank reference is recorded once: a second payment with the same
reference is refused, so a double click can't pay twice. Leads see their own statement in the mentor console.

## Fixing mistakes

Never edit ledger rows (the database refuses). For a refund to a client after the
money was shared out, or a correction, an engineer adds an adjusting posting with a
clear memo and its own idempotency key (`LedgerService.post`, kind
`adjustment.<what>`), reviewed by a second person, and records why in the audit log.
If a student's held money must be taken back (a client's card payment reversed
during the hold), do it before the hold ends.

## Year end and tax

Tax withheld per country is set in Admin → Hub → Countries (0% until the lawyer or
accountant says otherwise). Statements: parents see each child's earnings and
payouts on their dashboard; the ledger's transactions list (filter by kind
`payout.paid`) gives staff the year's payouts for the accountant.
