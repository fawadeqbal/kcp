# Runbooks

Short steps for running the Kids Coding Platform in staging and production. Pick the runbook you need and follow its numbered steps from the top.

| Runbook                                  | Use it when                                                                                |
| ---------------------------------------- | ------------------------------------------------------------------------------------------ |
| [deploy.md](deploy.md)                   | Releasing the API, web app, admin panel, sandbox or marketing site; publishing new lessons |
| [rollback.md](rollback.md)               | A release made things worse, or a feature must be switched off now                         |
| [outage.md](outage.md)                   | Something is down or slow; telling families; writing the review                            |
| [safety-incident.md](safety-incident.md) | A child may be at risk, or children's data may be exposed                                  |
| [backup-restore.md](backup-restore.md)   | Data was lost or damaged; the restore drill                                                |
| [schools.md](schools.md)                 | A school signs up, pays or leaves; a teacher leaves; the hub readiness check               |
| [hub.md](hub.md)                         | Opening the hub in a country; leads, students, client requests, projects, stories          |
| [hub-payouts.md](hub-payouts.md)         | Earnings, payout accounts, payout rounds (Wise or by hand), paying leads, the ledger       |

One-time setup lives in [docs/deployment.md](../deployment.md). Placeholders used here: `<api>` is the API's public URL (for example `https://api.yourdomain.com`), `<web>` the web app, `<admin>` the admin panel, `<sandbox>` the code sandbox, `<owner>` the GitHub owner of the images.

## Who is on call

| Role    | Who                               | Handles                                                                             |
| ------- | --------------------------------- | ----------------------------------------------------------------------------------- |
| Primary | Fawad (engineering)               | Deploys, rollbacks, database, hosting, Stripe, safety containment                   |
| Backup  | Meray                             | Admin panel actions (suspend, sign out everywhere), messages to families            |
| Legal   | The lawyer for each pilot country | Every safety or data incident, before anything is sent to authorities or the public |

Phone numbers and the lawyer's contacts live in the shared password manager, not in this repository. Confirm this table before the pilot starts and whenever it changes.

What each staff role can do in the admin panel (from the permission matrix):

- **Moderator:** suspend, reactivate and sign out students and parents; read feedback; the room reports queue (warn, mute, remove a message, suspend, dismiss) and the blocked-words list (read only).
- **Admin:** all of that, plus the hub (countries' rules, requests, projects, invoices, payout accounts, batches, stories; not approving or sending payouts), schools (teachers, licences: invoiced, paid, cancelled), hackathons (plan, move step by step, judges, team mentors, taking a student out of a team), changing the blocked-words list, revoke certificates, premium by hand, refunds and manual payments, leaderboard rebuilds, and the audit log. Cannot change other admins.
- **Super admin:** everything, including staff accounts, and approving and sending hub payout batches (two different super admins per batch).

## Severity levels

| Level | Start work        | Examples for this product                                                                                                                                                                                                                                                                                                                                         |
| ----- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SEV1  | Now, day or night | Children's data exposed (another family's child visible, a leaked export or database). Sandbox escape: students' code reaches cookies, storage or the network of the main site. An adult contacting a child. Payments charging wrongly (double charges, wrong amounts, charging after cancel). Site down: the web app or `/v1/health/ready` failing for everyone. |
| SEV2  | Same day          | Sign-in or lessons broken for one country or one language (for example the Urdu lesson player, or parents in Egypt can't log in). Stripe webhooks failing, so paid families don't get premium. File storage down (can't ship or view projects). Email down (sign-up and password reset fail). A nightly job failing two nights in a row.                          |
| SEV3  | Next working day  | A minor feature broken: a stale leaderboard, a missing badge, a monthly summary not sent, a translation typo, an admin page glitch.                                                                                                                                                                                                                               |

Any safety report is at least SEV2. If a specific child may be at risk, it is SEV1: go to [safety-incident.md](safety-incident.md).

## Health checks

| Check                                | What it tells you                                                                                                            |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `GET <api>/v1/health/live`           | The process is up. Shows `version` (the image tag, for example `v0.2.0` or `sha-abc1234`) and `uptimeSeconds`.               |
| `GET <api>/v1/health/ready`          | PostgreSQL and Redis both answer within 2 seconds. On `503`, the API log says which one is down (the public answer doesn't). |
| `GET <api>/v1/health/storage`        | Cloudflare R2 answers. Not part of readiness: a storage outage only breaks projects.                                         |
| `curl -sI https://<sandbox>/`        | Must show `Content-Security-Policy` with `connect-src blob:` and your `frame-ancestors`.                                     |
| Forgejo (team repositories)          | From the API's network: `GET <forgejo>/api/healthz`. Not part of readiness: an outage only stops hackathon teams' git.       |
| Web app, admin panel, marketing site | Load the home page. They have no health endpoint of their own.                                                               |
| Stripe                               | Stripe Dashboard, the webhook endpoint for `<api>/v1/payments/webhooks/stripe`: recent deliveries should be 2xx.             |
| Wise (hub payouts)                   | Wise → Webhooks, the subscription for `<api>/v1/payouts/webhooks/wise`: recent deliveries should be 2xx.                     |

The container host uses `/v1/health/live` to restart a stuck API and `/v1/health/ready` for readiness. Point an uptime monitor at `ready` and `storage`.

## Logs

- The API writes one JSON line per event to standard output (pino). Read them in your container host's log view. Levels: 30 info, 40 warn, 50 error, 60 fatal.
- Health checks are not logged. Passwords, tokens, cookies and `Authorization` headers are redacted.
- Every API response carries an `x-request-id` header, and error bodies include `requestId`. Ask families for it and search the logs for it.
- Scheduled jobs log by name when they fail, for example `Daily numbers failed for …`, `Billing job failed: …`, `Leaderboard job "rebuild" failed: …`.
- The **audit log** (admin panel → Audit log) records who did what, with before and after values. It is append-only: a database trigger blocks changes and deletes.
- The Next.js apps and the sandbox keep build and request logs on their own hosts.
- Nothing ships logs elsewhere yet and there is no alerting. Someone must look.

## Scheduled jobs (API, times in UTC)

Every API instance runs these. A Redis lock makes sure only one instance does the work (except the waitlist cleanup, which is harmless to run twice). If Redis is down at that minute, the job is skipped and logs an error.

| Job                    | When             | What it does                                                                                              | Safe to re-run?                                                                                            |
| ---------------------- | ---------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `metrics-daily`        | 00:15 daily      | Stores yesterday's five pilot numbers per country                                                         | Yes. It replaces that day's rows. Admin → Pilot numbers recomputes on demand.                              |
| `deleted-files-sweep`  | 00:45 daily      | Removes R2 files of students deleted in the last 8 days                                                   | Yes.                                                                                                       |
| `billing-nightly`      | 01:10 daily      | Ends manual plans past their period; re-reads card plans a day overdue from Stripe                        | Yes. A plan is only ended once.                                                                            |
| `leaderboards-rebuild` | 02:30 daily      | Rebuilds the current boards in Redis from PostgreSQL                                                      | Yes. Admin → Leaderboards → "Rebuild from database" does the same now.                                     |
| `waitlist-cleanup`     | 03:40 daily      | Deletes waitlist emails never confirmed after 30 days                                                     | Yes.                                                                                                       |
| `monthly-summaries`    | 06:20 on the 1st | Last month's progress email to each parent who wants it                                                   | Only while Redis keeps its "sent" markers (40 days). If Redis was emptied, a re-run emails parents again.  |
| `trial-reminders`      | 07:05 daily      | "Your child's trial ends in 3 days" emails                                                                | Yes. Each trial is claimed in PostgreSQL first, so it is never sent twice (a failed email is not retried). |
| `leaderboards-close`   | Every 15 minutes | Closes finished weeks per country, stores the top 10s, gives "Top 10" badges, ends seasons past their end | Yes. Results and badges skip duplicates.                                                                   |
| `hub-timers`           | Every 5 minutes  | Stops hub timers past the allowed time or the weekly cap (counting only allowed minutes)                  | Yes.                                                                                                       |
| `hub-earnings`         | Hourly at :17    | Shares out paid, accepted invoices that were missed; ends holds (earnings become payable)                 | Yes. Each invoice and each hold posts once.                                                                |
| `hub-payouts`          | Every 30 minutes | Asks Wise about payouts still on the way (in case a webhook was missed)                                   | Yes.                                                                                                       |
| `hub-intake-cleanup`   | 03:45 daily      | Deletes "Hire our students" requests never confirmed by email after 7 days                                | Yes.                                                                                                       |

There is no button for the other jobs. A missed nightly job runs again the next night; missed monthly summaries wait for the next month.
