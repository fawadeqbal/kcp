# Outage

Something is down or slow. Find what, contain it, tell families, then write it up.

## First ten minutes

1. Start a timeline in the incident notes. Write every step with its time in UTC.
2. From outside, check `<api>/v1/health/ready`, `<api>/v1/health/storage` and `<api>/v1/health/live` (see [README.md](README.md#health-checks)).
3. Load the web app, the admin panel, the marketing site and a lesson (the sandbox).
4. Look at the dashboards: the container host (is the api service restarting or failing its health check?), managed PostgreSQL, managed Redis, Cloudflare, R2, the email provider, Stripe.
5. Read the API logs from just before the start: level 50 (error) and 60 (fatal). An API that won't start prints `Invalid environment configuration` and the variable at fault.
6. Was there a deploy or a settings change in the last few hours? If so, roll it back first ([rollback.md](rollback.md)).
7. Set the severity ([README.md](README.md#severity-levels)). If families are affected for more than 15 minutes, send the status message below.

## What is down, and what families see

| Down                        | What families see                                                                                                                                                          | What to do                                                                                                                                                                  |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API (all instances)         | Nothing works: no login, no lessons. The admin panel can't log in. The marketing site's prices and waitlist fail.                                                          | Host logs and events. A bad image: roll back. A bad variable: fix it on the host. Database or Redis down: see below.                                                        |
| PostgreSQL                  | Same as the API being down. `/ready` returns 503 with `database` down. Nightly jobs fail and log it.                                                                       | Provider dashboard: connections, storage, maintenance. Data damaged: [backup-restore.md](backup-restore.md).                                                                |
| Redis                       | Same as the API being down. Every signed-in request checks its session through Redis, and rate limits and two-factor codes use it. `/ready` returns 503 with `redis` down. | Bring Redis back. An empty Redis is fine (next section).                                                                                                                    |
| R2 file storage             | Logins and lessons work. "Ship it" fails; portfolios and shared links show no files. `/storage` is down, `/ready` stays ok.                                                | Check R2 and the keys (`S3_*` variables). Files of children deleted meanwhile are removed by the nightly sweep within 8 days.                                               |
| Email (SMTP)                | Parent sign-up and "Forgot your password?" show an error, because that email is sent during the request. The account is still created: they can ask for a new link later.  | Check the provider and `SMTP_URL`. Other emails (welcome, receipts, trial reminders, monthly summaries) are skipped and logged as "not sent". They are not sent again.      |
| Stripe, or webhooks failing | Checkout doesn't start. A family may pay but not get premium until the webhook is handled.                                                                                 | Stripe Dashboard → the webhook endpoint → failed deliveries. `BAD_SIGNATURE` means `STRIPE_WEBHOOK_SECRET` is wrong. If families wait, grant premium by hand with a reason. |
| Sandbox host                | Lessons open but "Check my code" and the preview do nothing. Python lessons don't load. Shared portfolio pages on the sandbox domain fail.                                 | Check the static host; redeploy or roll back; check its headers with `curl -sI`.                                                                                            |
| Web app host                | Families can't reach the site. The API is fine.                                                                                                                            | Check the host; roll back the last web deploy.                                                                                                                              |
| Admin panel host            | Staff only.                                                                                                                                                                | Check the host. Urgent safety action meanwhile: the database fallback in [safety-incident.md](safety-incident.md).                                                          |
| Marketing site              | New families can't see prices or join the waitlist. The product works.                                                                                                     | Check the host; roll back.                                                                                                                                                  |
| Cloudflare or DNS           | Everything behind it is unreachable.                                                                                                                                       | Cloudflare status and DNS records.                                                                                                                                          |

## What degrades gracefully

- **Redis losing its data loses nothing.** Session checks refill from PostgreSQL. Leaderboards are rebuilt from PostgreSQL on first read, every night at 02:30 UTC, or now with Admin → Leaderboards → "Rebuild from database". Rate-limit counters and job locks are disposable. Only the monthly-summary "sent" markers are gone (see the jobs table in [README.md](README.md#scheduled-jobs-api-times-in-utc)).
- **Most emails don't block actions.** The action completes and the failure is logged. The exceptions are sign-up confirmation and password reset (above).
- **Stripe webhooks are retried by Stripe and handled once.** Each event is recorded by its Stripe ID only after it was handled, so a failure makes Stripe send it again, and a repeat changes nothing. Events can arrive in any order. As a safety net, the 01:10 UTC billing job re-reads card plans a day past their period end.
- **A storage outage only affects projects**, not logins and lessons.
- **Several API instances are safe.** Scheduled jobs take a Redis lock, so only one instance runs each.

## Telling families

Send a message when families are affected for more than 15 minutes, and again when it is fixed. There is no status banner in the apps and no bulk-email tool yet: use the channels you already have with pilot families (the team mailbox, schools' contacts).

1. Families read English, Arabic and Urdu. Translate the template below with a native speaker. Keep approved translations of both messages ready in the shared drive, so nobody translates during an incident.
2. Write times in each country's local time.
3. Say what doesn't work and that progress is safe. No internal details.
4. If children's data may be exposed, don't use this template: follow [safety-incident.md](safety-incident.md). The lawyer approves that wording.

```text
Subject: Kids Coding Platform: [what] isn't working right now

Since [time], [what doesn't work, e.g. "children can't log in"]. Your child's
progress and projects are safe. [What to do, e.g. "Please try again later.
There's no need to change passwords."] We're working on it and will write
again by [time]. Sorry for the interruption.
— The Kids Coding Platform team

Fixed: Since [time], everything works again. [Anything families need to do.]
Thank you for your patience.
```

## Post-incident review

Write it within five working days for every SEV1 and SEV2. Blame systems, not people. Use user IDs, never children's names or nicknames.

```text
# [Date] [Short title]
Severity: SEV1 / SEV2 / SEV3      Duration: [start]–[end] UTC      Written by: [name]

Summary: two or three sentences a parent could understand.
Impact: who (countries, languages, how many families and children), what they
  couldn't do, for how long. Data exposed? Money affected?
Timeline (UTC): detected, first action, cause found, fixed, families told.
Cause: what happened and why the checks didn't catch it.
What went well / what didn't:
Families told: when, how, in which languages.
Actions: [action] — [owner] — [due date]   (fixes, tests, monitoring, runbook changes)
```
