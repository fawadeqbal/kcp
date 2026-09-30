# Deploy

How each part reaches staging and production, what to check before, and what to check after.

| Part                 | How it deploys                                                                                                                                                                                  |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API                  | `.github/workflows/deploy-api.yml` builds `ghcr.io/<owner>/kcp-migrate:<tag>` and `ghcr.io/<owner>/kcp-api:<tag>`, runs the migrate image, then calls the host's deploy hook with the API image |
| Web app, admin panel | Their host builds `apps/web` and `apps/admin` from the repository (Next.js)                                                                                                                     |
| Code sandbox         | A static host builds `apps/sandbox` (see [deployment.md](../deployment.md#the-code-sandbox-appssandbox))                                                                                        |
| Marketing site       | Its host builds `apps/site` (Next.js)                                                                                                                                                           |

Image tags: `sha-<7 characters>` for pushes to `main` (staging), the git tag such as `v0.2.0` for production.

## Before you deploy

1. **CI is green on the exact commit.** The deploy workflow does not wait for CI or check it. Open the commit on GitHub and confirm the CI run passed.
2. **Staging already runs it.** Production tags are cut from a commit on `main` that deployed to staging and passed the checks below.
3. **Migrations are reviewed.** List them: `git diff --stat <last tag>..HEAD -- packages/database/prisma/migrations`. In each `migration.sql` look for:
   - **Locks:** changing a column type, adding `NOT NULL`, or adding an index on a big table (`users`, `xp_events`, `submissions`, `lesson_progress`, `audit_logs`) holds a lock while it runs. Requests wait.
   - **Backfills:** an `UPDATE` over many rows inside the migration. Keep it small, or run it later in batches.
   - **The previous API image still works.** No dropped or renamed columns or tables that the running release reads. See "Expand and contract" in [rollback.md](rollback.md).
   - Hand-written SQL near the append-only triggers (`audit_logs`, `consent_records`, `xp_events`, `payment_events`).
4. **Content is checked.** CI runs `pnpm content:check`. New modules arrive unpublished, and changes to published ones go live on import: review them on staging first (see "Publishing new lessons").
5. **New environment variables are set first.** Add them on the host before deploying. The API refuses to start if a variable is missing or malformed (`Invalid environment configuration` in the logs).
6. **Pick the time.** Prefer school hours in the pilot countries, when fewer children are online. Avoid the job minutes (00:15, 00:45, 01:10, 02:30, 03:40, 07:05 UTC, and 06:20 on the 1st): a restart at that minute skips that run.
7. **Someone can watch for 30 minutes afterwards.**

## API to staging

1. Merge the pull request to `main`.
2. In GitHub → Actions → "Deploy API", watch "Build and push images", then "Deploy to staging".
3. The staging job runs the migrate image first: `prisma migrate deploy`, then `prisma db seed` (reference data, roles, permissions, flags, badges, plans), then the lesson import. All three are safe to repeat.
4. If the migrate step fails, the API is not deployed. Read the step's log and fix forward.
5. Then it posts `{"image": "ghcr.io/<owner>/kcp-api:sha-…"}` to the deploy hook. A green step only means the host accepted the request.
6. Confirm the new version: `curl -s <api>/v1/health/live` shows `"version":"sha-…"`.
7. Run the checks under "After you deploy".

The workflow only starts when API-related paths change (`apps/api`, `packages/database`, `packages/shared`, `packages/checks`, `tools/content-import`, `content`, the lockfile). To deploy anyway, use "Run workflow" on `main`.

## API to production

1. Finish "Before you deploy". Write down the tag that production runs now: you need it to roll back.
2. Tag the commit that staging runs and push the tag:

   ```bash
   git tag v0.2.0
   git push origin v0.2.0
   ```

3. The workflow builds `kcp-api:v0.2.0` and `kcp-migrate:v0.2.0`, then "Deploy to production" waits for approval.
4. A required reviewer approves it in the run ("Review deployments").
5. The migrate image runs against production first. Only if it succeeds is the new API image deployed.
6. Check `curl -s <api>/v1/health/live` shows `"version":"v0.2.0"`, then run "After you deploy".

## Web app, admin panel, sandbox and marketing site

1. Deploy the API first when a change spans both. The API keeps `/v1` compatible, so the old web app keeps working.
2. **Web app** (`apps/web`): needs `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SANDBOX_URL` and `NEXT_PUBLIC_BILLING_EMAIL`. **Admin panel** (`apps/admin`): needs `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WEB_APP_URL`. `NEXT_PUBLIC_*` values are baked in at build time: change one, rebuild.
3. **Sandbox** (`apps/sandbox`): build with `pnpm install --frozen-lockfile && pnpm nx run @kcp/sandbox:build`, publish `apps/sandbox/dist`. Set `SANDBOX_FRAME_ANCESTORS` (the web app's origin). The build also reads `SANDBOX_API_URL` and `SANDBOX_WEB_URL` for the shared-portfolio page; without them it points at localhost.
4. After a sandbox deploy, run `curl -sI https://<sandbox>/`. It must show `Content-Security-Policy` with `connect-src blob:` and your `frame-ancestors`. If not, roll back at once ([rollback.md](rollback.md)).
5. **Marketing site** (`apps/site`): needs `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WEB_APP_URL` and `NEXT_PUBLIC_SITE_URL`. Check the pricing page and the waitlist form after deploying.

## After you deploy

Keep a test family in each environment: a parent with a mailbox you control, one child, and premium granted by hand. Create it through the normal sign-up (`pnpm demo:accounts` refuses non-local databases). Keep its passwords in the password manager.

1. `curl -s <api>/v1/health/ready`: `"status":"ok"` with `database` and `redis` up.
2. `curl -s <api>/v1/health/storage`: `storage` up.
3. Sign in as the test parent at `<web>/en/login`. The dashboard shows the test child.
4. Sign in as the test student at `<web>/en/login/student`. Open a lesson, enter the step's solution and press "Check my code". It must pass. This proves the API, the sandbox and the checks work together.
5. Log in to `<admin>` with two-factor. Open Users and the Audit log.
6. When card payments are on: in the Stripe Dashboard, the webhook endpoint for `<api>/v1/payments/webhooks/stripe` shows only successful deliveries since the deploy.
7. Watch the API logs for 15 minutes for level 50 (error) and 60 (fatal) lines.
8. If anything fails and the cause isn't obvious in five minutes, roll back ([rollback.md](rollback.md)).

## Publishing new lessons

Lessons are files in `content/`. The migrate image imports them on every deploy with `--hold-new`: modules that are **new** arrive unpublished, and students don't see them until staff publish them. Modules already published stay published (and ones staff hid stay hidden). Anything removed from `content/` is switched off, never deleted, so progress stays.

1. Add the lessons in a pull request. CI runs `pnpm content:check`: every solution passes its checks and every starter still fails one.
2. Merge. On staging, open **Admin → Content**, preview the new module in English, Arabic and Urdu (the preview marks untranslated texts), publish it on staging, and try it as the test student on a laptop and a tablet.
3. Tag a release. In production the module arrives unpublished: preview it once more in **Admin → Content** and press **Publish**. The audit log records who published it.
4. To take a module off quickly (a mistake in a lesson), press **Hide from students** with a reason. Students' progress and projects stay, and publishing again brings it back.

Changes to lessons in a module that is already published go live with the deploy (they passed `content:check`). For a bigger rewrite, hide the module first.
