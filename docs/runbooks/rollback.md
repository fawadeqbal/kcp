# Rollback

Use this when a release made things worse. Roll back the app first; fix the cause afterwards.

## Decide in two minutes

1. Did the trouble start with a deploy? Compare the deploy time (GitHub → Actions → "Deploy API", or the host's deploy list) with the first errors in the logs.
2. Did the release include a migration? If yes, the old API image must still work with the new schema. If you are not sure it does, read "Database: forward only" before rolling back.
3. Can a feature flag switch the broken part off? That is faster and safer than a rollback. See "Feature flags as a kill switch".

## Roll back the API

1. Find the previous good tag. Production: the tag you wrote down before deploying, or `git tag --sort=-creatordate | head`. Staging: the previous "Deploy API" run in GitHub Actions, or the versions of the `kcp-api` package in GitHub Container Registry.
2. In your container host, roll the api service back to the previous image tag, `ghcr.io/<owner>/kcp-api:<previous tag>`. Most hosts let you redeploy an earlier deployment from their dashboard.
3. **Do not** re-run the "Deploy API" workflow for the old tag, and never run an older `kcp-migrate` image. The migrate image re-imports the lessons in its own copy of `content/` and re-seeds reference data. An older one switches off lessons and badges added since, and replaces the levels table with the older one. The schema stays new either way.
4. Check `curl -s <api>/v1/health/live` shows the old `version`, and `/v1/health/ready` is ok.
5. Run the checks in [deploy.md](deploy.md#after-you-deploy).
6. Write in the incident notes which tag is running. `main` is now ahead of production: the next release must carry the fix.

## Database: forward only

Migrations only move forward. There are no down migrations, and `prisma migrate deploy` only applies new ones.

- Never edit or delete a migration that has run anywhere but your machine (CONVENTIONS.md), and never edit the `_prisma_migrations` table by hand.
- Fix a bad migration with a new one: change `schema.prisma`, run `pnpm db:migrate`, open a pull request, merge, tag.
- Restore from a backup only when data was destroyed. It loses every write since the restore point. See [backup-restore.md](backup-restore.md).

**A migration failed halfway in production.** Prisma records it as failed and refuses to apply anything after it, so every later deploy stops at the migrate step.

1. See which migration failed: `DATABASE_URL="<production URL>" pnpm --filter @kcp/database migrate:status`. A `DATABASE_URL` you set wins over the one in `.env`.
2. Compare that migration's SQL with the database to see which statements ran. Either finish the rest by hand, or undo what ran.
3. Tell Prisma which one you did: `DATABASE_URL="<production URL>" pnpm --filter @kcp/database exec prisma migrate resolve --applied <migration folder name>` (or `--rolled-back <migration folder name>`).
4. Deploy again.

### Expand and contract

The rule: **the previous API image must work with the new schema.** Then a rollback never needs a schema change.

1. **Expand (release N):** add new tables, nullable columns or columns with a default. Ship code that works with both the old and the new shape.
2. **Backfill:** fill the new columns in small batches, in a separate step or release.
3. **Contract (release N+1 or later):** drop the old column or table once no running image reads it.

What breaks the previous image:

- Dropping or renaming a column or table it uses. Prisma reads every column of a model by default, so the old image fails on the first query.
- Adding a `NOT NULL` column without a default. The old image's inserts fail.
- Removing an enum value the old code still writes.
- Adding an enum value the new code writes: the old image can't read those rows.

**Rolling back across the Sprint 8 release** (to an image from before `20261001100000_hardening`) breaks this rule twice. The older image doesn't know `modules.published_at`, so modules held for publishing become visible to students; and it can't read feedback sent as `SAFETY`, so the Feedback page fails while such a message exists. If you must roll back that far, first hide unpublished modules (`UPDATE modules SET is_active = false WHERE published_at IS NULL;`, and undo it after rolling forward) and expect the Feedback page to fail until you roll forward again.

## Feature flags as a kill switch

Flags live in the `feature_flags` table (`key`, `enabled`, `country_codes`). A flag is on when `enabled` is true and `country_codes` is empty (every country) or lists the user's country. Each API instance caches flags for 30 seconds.

Change them in **Admin → Feature flags**: on or off, for every country or only some, with a reason (kept in the audit log). Each API server sees the change within 30 seconds.

If the admin panel is down too, someone with database access can use SQL (then write what you changed in the incident notes: SQL doesn't reach the audit log):

```sql
-- Stop new card checkouts everywhere
UPDATE feature_flags SET enabled = false, updated_at = now() WHERE key = 'payments';

-- Keep them only in some countries (here: stop them in Pakistan)
UPDATE feature_flags SET enabled = true, country_codes = ARRAY['EG','AE','SA'], updated_at = now()
WHERE key = 'payments';
```

| Flag                | What switching it off does                                                                                                                                                  |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `payments`          | Families can't start a card checkout ("Plans can't be bought in your country yet"). Existing plans, renewals at Stripe, webhooks, manual payments and refunds keep working. |
| `under_13_accounts` | Off by default: no child accounts under 13. Keep it off until the lawyer-approved consent method ships.                                                                     |

- Deploys keep your setting: the seed only updates a flag's description.
- **Payments charging wrongly:** the flag only stops new checkouts. Also stop the problem at Stripe (in the Stripe Dashboard, for the affected subscriptions), then refund each family in the admin panel: Users → the parent → the payment → Refund, with a reason. The admin refund goes through Stripe; a full refund also ends premium and cancels the plan at Stripe.

## Roll back the web app, admin panel, sandbox or site

1. In the app's host, redeploy the previous deployment. `NEXT_PUBLIC_*` values are baked into each build, so pick a build made with the right ones.
2. **Sandbox:** after the rollback, check `curl -sI https://<sandbox>/` still shows the `Content-Security-Policy` with `connect-src blob:` and your `frame-ancestors`. A sandbox must never be served without its headers. If you can't get them back, take the sandbox offline: lessons can't check code, but children stay safe.
3. The web app and the sandbox talk through a shared message protocol (`packages/checks`). After rolling back either one, sign in as the test student and run "Check my code". If it fails, roll back the other one to a matching build.
4. Admin panel and marketing site roll back on their own.
