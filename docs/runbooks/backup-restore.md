# Backup and restore

What is backed up, how to restore PostgreSQL safely, and the drill.

## What lives where

| Data                                                                                                                            | Where                                       | Backed up by                                                                                   | If it is lost                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Accounts, consents, progress, XP, project drafts, check submissions, certificates, payments, invoices, audit log, feature flags | PostgreSQL                                  | The provider's daily backups and point-in-time restore (see [deployment.md](../deployment.md)) | Restore (below)                                                                              |
| Shipped project files                                                                                                           | R2, `projects/<user id>/<project id>/v<n>/` | **Nothing yet**                                                                                | Gone. The draft in `projects.files` usually still has the code; the student can ship again.  |
| Lessons                                                                                                                         | `content/` in git                           | Git                                                                                            | The migrate image imports them again on every deploy                                         |
| Reference data (languages, countries, roles, permissions, badges, levels, plans)                                                | Seed files in `packages/database/prisma`    | Git                                                                                            | `prisma db seed` (also run by the migrate image)                                             |
| Hackathon team repositories (code, commits, pull requests, reviews)                                                             | Forgejo's data volume (`/data`)             | **Your volume snapshots**: set a daily snapshot next to the database backup                    | Teams lose their history; hand-ins keep their title, description and commit ID in PostgreSQL |
| Certificate PDFs                                                                                                                | Made on request from PostgreSQL             | Not needed                                                                                     | Nothing to do                                                                                |
| Redis                                                                                                                           | Managed Redis                               | Not needed                                                                                     | Rebuilds itself (below)                                                                      |

**R2:** nothing in the repository copies the bucket. Set up a scheduled copy to a second bucket (any S3-compatible sync tool works with R2) before the paid launch.

## What is in Redis (checked in the code)

Redis is a cache. Everything in it is rebuilt or disposable:

- **Session checks** (`auth:session:*`, 60 seconds). Refilled from the `sessions` table.
- **Leaderboards** (sorted sets per week, season and all time). Rebuilt from `xp_events` in PostgreSQL on first read, every night at 02:30 UTC, or with Admin → Leaderboards → "Rebuild from database". Final weekly results are stored in PostgreSQL (`leaderboard_results`).
- **Rate-limit counters** and **two-factor replay guards**. Disposable: emptying them only resets the limits.
- **Locks**: scheduled jobs, Stripe events, project shipping. Disposable.
- **"Week closed" markers.** Closing a week again is harmless: results and badges skip duplicates.
- **Monthly-summary "sent" markers** (40 days). The one thing that matters: if they are lost and the job runs again that month, parents get the email twice.

Scheduled jobs use timers in the API with Redis locks (not a queue), so Redis holds no queued work. If a job queue is added later, update this page.

## Restore PostgreSQL

Always restore into a **new** database. Never restore over the live one: it still holds every write since the restore point.

1. If a bad release is still damaging data, roll it back first ([rollback.md](rollback.md)).
2. Pick the target time (UTC), just before the damage. Use the audit log and the API logs to find it.
3. Create the new database:
   - **Point in time (preferred):** in the provider's console, restore to a new database at the target time.
   - **From a dump:** use `pg_dump` and `pg_restore` from the same PostgreSQL major version as the server (17 in staging and production):

     ```bash
     pg_dump --format=custom --no-owner --no-acl --file=kcp-$(date -u +%Y%m%dT%H%M).dump "$SOURCE_URL"
     pg_restore --no-owner --no-acl --dbname="$NEW_URL" kcp-<timestamp>.dump
     ```

4. Verify it (next section).
5. Decide: **switch over** (loses every write after the target time), or **copy back** only the damaged rows into the live database (loses less when only a few tables were hit).

### Verify the restored database

1. Migrations: `SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 5;` The newest must match the running release. If it is older, run the current migrate image against it: `docker run --rm -e DATABASE_URL="$NEW_URL" ghcr.io/<owner>/kcp-migrate:<current tag>`.
2. Row counts of the key tables look right: `users`, `student_profiles`, `parent_child_links`, `consent_records`, `lesson_progress`, `submissions`, `xp_events`, `portfolio_items`, `subscriptions`, `payments`, `audit_logs`.
3. The newest rows are from just before the target time: `SELECT max(created_at) FROM audit_logs;`
4. The append-only triggers are there: `SELECT tgname FROM pg_trigger WHERE NOT tgisinternal;` must list `audit_logs_append_only`, `consent_records_revoke_only`, `xp_events_append_only` and `payment_events_append_only`.

### Switch the API to it

1. On the host, set the api service's `DATABASE_URL` to the new database (keep `sslmode=require`).
2. Update the `DATABASE_URL` secret in the GitHub environment (`staging` or `production`). The migrate step uses it on the next deploy.
3. Restart the API. Check `<api>/v1/health/ready`.
4. Admin → Leaderboards → "Rebuild from database". Cached session checks expire within a minute on their own.
5. Run the checks in [deploy.md](deploy.md#after-you-deploy).
6. Keep the old database, read-only, until the incident is closed. It holds the writes after the target time.

### Redo what happened after the target time

A point-in-time restore also undoes safety actions. Do these first:

1. **Safety and privacy.** Read the old database's `audit_logs` after the target time. Redo every suspension, sign-out, consent change and share-link removal. Delete again every child deleted after the target time: the restore brought their data back.
2. **Payments.** In the Stripe Dashboard, resend the events after the target time to `<api>/v1/payments/webhooks/stripe`. Each is handled once, and the restored database hasn't seen them. Redo manual payments and refunds recorded after the target time in the admin panel.
3. **Files.** Projects shipped after the target time are in R2 but no longer linked: harmless. A version replaced after the target time is gone: those children ship again.
4. **Families.** Sign-ups and progress after the target time are lost. Tell the affected families ([outage.md](outage.md#telling-families)).

## The drill

Run it every quarter, and before the pilot and the paid launch. Record how long each step took and how much data a real restore would lose.

1. **Local:** with `pnpm services:up` running, run `pnpm db:drill`. It dumps the database (`pg_dump -Fc`), restores it into a scratch database next to it, compares the row counts of the key tables, checks the append-only triggers and the migrations table came back, prints the timings, and drops the scratch database (`pnpm db:drill -- --keep` keeps it). It uses your installed PostgreSQL tools, or runs them in the compose container.
2. **Staging:** `DRILL_TARGET=staging DATABASE_URL=<staging copy> pnpm db:drill` proves a dump of staging restores completely. It needs the PostgreSQL tools installed (the compose container can only reach the local database), creates and drops `kcp_restore_drill` on that server, and refuses any non-local server without `DRILL_TARGET=staging`. Never run it against production from a laptop: the dump holds children's data. Then do the provider's own restore: restore the staging database to a new database at a time an hour ago, verify it as above, point the staging API at it, run the post-deploy checks, then switch back.

Last local drill: 30 September 2026, 17 tables and 4 triggers identical, backup 0.7 s and restore 0.6 s for 1.6 MB (development data). The local drill runs PostgreSQL 16 (`docker-compose.yml`) while staging and production run 17. It proves the script, not the provider's restore: only the staging drill does that.
