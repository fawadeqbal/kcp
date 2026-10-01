# The real-world hub

Day-to-day running of paid client projects for students aged 15 and up: opening a
country, signing students off, the request queue, projects, milestones and stories.
Money (earnings, payout accounts, payouts, the ledger) has its own runbook:
[hub-payouts.md](hub-payouts.md). Everything here is in the admin panel (`<admin>`)
unless it says otherwise.

> **Gate 2 is not met yet.** The hub agreements (parent, client, statement of work)
> and the privacy, terms and safety additions are drafts: the lawyer and native
> speakers review them first. Until the lawyer signs off, keep each country's hub
> closed and the `hub_payouts` flag off.

## Open a country

1. **Admin → Hub → Countries.** Each country has its own rules: open or closed, the
   youngest age (15), the weekly hours (6), the day's window (07:00–21:00), the
   school days and school hours when hub work isn't allowed (08:00–14:00), the split
   (students / lead developer / platform: 50 / 25 / 25, adding up to 100), the hold
   before earnings can be paid out (14 days) and tax withheld from payouts (0%).
   Check the school days: Pakistan Monday–Saturday, Egypt and Saudi Arabia
   Sunday–Thursday, the UAE Monday–Friday.
2. Open the country only after the lawyer approved the agreements for it. Closing it
   later stops new work there; running projects keep their team.
3. Every change is in the audit log (`country.hub_rules`).

## Lead developers and students

- **Make a mentor a lead:** Admin → Mentors → the mentor → "Lead developer". Leads
  sign students off, scope projects, review and merge the work. A paused mentor loses
  their projects at once; give them to another lead (Admin → Hub → Projects → the
  project → Lead).
- **Students become eligible** by themselves when every step is done: surely 15 or
  older (we only know birth years, so from 1 January of the year they turn 16), the
  Pro track finished, the readiness check passed, a lead's sign-off (Mentor console →
  Hub candidates), and the parent's agreement on their dashboard. Admin → Hub →
  Students shows each student's steps.
- **Pause a student** (Admin → Hub → Students → Pause, with a reason) when something
  worries you: their timer stops, they leave every project, the parent is told.
  Resume when it's resolved. A parent taking the agreement back does the same.

## Requests from clients

1. Requests arrive from the site's "Hire our students" page (once the client clicks
   the link in the email; unconfirmed ones are deleted after 7 days) and from
   existing clients' portal. They wait in **Admin → Hub → Requests**.
2. **Read the brief and files** (download only; they're the client's). Turn down what
   isn't suitable for students: anything adult, gambling, weapons, collecting
   personal data about children, scraping, crypto, work that needs a licence, or
   deadlines under two weeks. Decline with a short, kind reason (the client is
   emailed).
3. **Accept** with a lead developer and the currency. A new client gets an invitation
   (they choose a password and set up two-factor login) and must sign the client
   agreement before anything else.

## A project from start to finish

1. **Scoping (lead):** the lead writes the summary, breaks the work into tasks (each
   with a share of the students' pool; shares add up to 100%) and sends the quote.
   The client approves the statement of work.
2. **Deposit:** the deposit invoice (30% by default) is paid by card or by bank
   transfer (Admin → Hub → Invoices → Record a payment, with the bank's reference).
   The project becomes active.
3. **Team:** the lead invites students (suggestions rank skills, reputation,
   experience and free hours); each student says yes, then a parent approves. The
   client only ever sees "Developer A, B…".
4. **Work:** students start their timer to work (it stops by itself at the end of
   the allowed time or the weekly cap), push their branch, open pull requests named
   after their task; the lead reviews (with a score) and merges.
5. **Milestones:** the lead shares `main` as a preview (static files only, opened on
   the sandbox domain at `/preview/#<link>`); the client accepts it or asks
   for changes. Changes come to the lead as change requests: in scope (new tasks on
   the quote), a change quote, or declined.
6. **Acceptance:** the client accepts the final milestone; the final invoice goes out.
   Once it's paid, the money is shared out, the project is **completed** and its room
   archived.

## When something goes wrong

| Problem                                                 | What to do                                                                                                                                                                                                                        |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A client tries to reach a student, or asks who they are | Never answer. It's a breach of the client agreement: warn the client in the project's messages; on a second time cancel the project. If a student may be at risk, follow [safety-incident.md](safety-incident.md).                |
| Something unkind or unsafe in a team room               | The room's reports queue, like any room. The lead is the room's adult.                                                                                                                                                            |
| A client won't pay the deposit                          | The project waits in "awaiting deposit"; void the invoice and cancel the project after 30 days.                                                                                                                                   |
| A dispute about the work                                | Read the statement of work and the change requests. Staff can answer in the project's messages. Partial refunds go through Stripe (card) or the bank, with an adjusting posting in the ledger ([hub-payouts.md](hub-payouts.md)). |
| Cancel a project                                        | Admin → Hub → Projects → Cancel (only with no open or paid invoices: void open ones first; for paid ones, decide refunds first). Timers stop, the room is archived, previews stop working.                                        |
| A student's timer didn't stop                           | The `hub-timers` job closes timers past their limit every 5 minutes (counting only allowed minutes). If Redis was down, it runs at the next tick.                                                                                 |
| A preview shows something it shouldn't                  | Ask the lead to withdraw the milestone (the link stops at once) and share a new one.                                                                                                                                              |
| Forgejo down                                            | Students can't push or open pull requests; timers still count. See the Forgejo line in [README.md](README.md#health-checks).                                                                                                      |

## Stories on the site

1. **Admin → Hub → Stories → New:** a student who finished paid work, first name only
   (never a surname, photo, school or city), a headline and a few sentences, in one
   language.
2. The parent is emailed and says yes or no on their dashboard. Only a "yes" can be
   published. Editing a story asks the parent again.
3. A parent can take a story back at any time: it leaves the site within a minute.
   Never put it back up.
