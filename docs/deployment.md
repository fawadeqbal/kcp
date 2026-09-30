# Deployment

The pipeline is ready; the hosting accounts are not chosen yet (see "Decisions needed" in the implementation plan). This page covers what to set up once they are.

## What gets deployed

| Image                               | Built from                              | Job                                                                                                                                            |
| ----------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `ghcr.io/<owner>/kcp-api:<tag>`     | `apps/api/Dockerfile`, target `api`     | The API server. Listens on `API_PORT` (3000), runs as a non-root user                                                                          |
| `ghcr.io/<owner>/kcp-migrate:<tag>` | `apps/api/Dockerfile`, target `migrate` | Applies Prisma migrations, syncs reference data (languages, roles, permissions, countries) and imports the lessons from `content/`, then exits |

Tags: `sha-<7 chars>` for pushes to `main`, the tag name (for example `v0.1.0`) for releases.

## Recommended setup (from the plan)

- **API:** a managed container host that can pull from GitHub Container Registry and offers a _deploy hook_ URL.
- **PostgreSQL 17:** managed, with daily backups and point-in-time restore.
- **Redis 7:** managed, or the host's own Redis.
- **File storage:** Cloudflare R2 (S3-compatible, no charge for downloads) for shipped projects. Locally, `docker compose` runs an S3-compatible container (`infra/storage`) instead.
- **Region:** Frankfurt (EU) as the default for Pakistan, Egypt, the Gulf and Europe.
- **Cloudflare** in front for DNS, TLS and caching.

## One-time setup for staging

1. **Push the repository to GitHub.** CI starts on the first pull request.
2. **Create the database and Redis** in the chosen region. Note both connection URLs (use TLS: `sslmode=require` for PostgreSQL, `rediss://` for Redis).
3. **Create the file storage bucket.** In Cloudflare → R2, create a bucket per environment (for example `kcp-files-staging`), with the location hint closest to the API (Europe). Leave public access **off**: files are only ever served through the API. Then create an R2 API token with **Object Read & Write** limited to that bucket, and note its access key ID, secret access key and the S3 endpoint (`https://<account id>.r2.cloudflarestorage.com`). The API doesn't create buckets in production: `/v1/health/storage` reports `down` until the bucket exists and the keys work — check it after setting up, and point your uptime monitor at it. (It isn't part of readiness, so a storage outage only affects projects, not logins and lessons.)
4. **Create the API service** on the host from the image `ghcr.io/<owner>/kcp-api` and give it:
   - a pull credential for GitHub Container Registry (a GitHub token with `read:packages`), because the images are private;
   - environment variables:

     | Variable                | Staging value                                                                                           |
     | ----------------------- | ------------------------------------------------------------------------------------------------------- |
     | `NODE_ENV`              | `production`                                                                                            |
     | `DATABASE_URL`          | the staging PostgreSQL URL                                                                              |
     | `REDIS_URL`             | the staging Redis URL                                                                                   |
     | `CORS_ORIGINS`          | the staging web app and admin panel URLs, comma-separated                                               |
     | `LOG_LEVEL`             | `info`                                                                                                  |
     | `SWAGGER_ENABLED`       | `true` (keep API docs on in staging only)                                                               |
     | `JWT_ACCESS_SECRET`     | a new random value: `openssl rand -base64 48`                                                           |
     | `ENCRYPTION_KEY`        | a new random value: `openssl rand -base64 32` (keep it safe: it decrypts staff two-factor secrets)      |
     | `SMTP_URL`              | your email provider's SMTP URL, e.g. `smtps://user:pass@smtp.provider.com:465`                          |
     | `MAIL_FROM`             | e.g. `Kids Coding Platform <no-reply@yourdomain>`                                                       |
     | `WEB_APP_URL`           | the web app's public URL (used in email links)                                                          |
     | `COOKIE_DOMAIN`         | leave empty unless the API and web app need a shared parent domain                                      |
     | `S3_ENDPOINT`           | the R2 S3 endpoint, `https://<account id>.r2.cloudflarestorage.com`                                     |
     | `S3_BUCKET`             | the bucket from step 3, e.g. `kcp-files-staging`                                                        |
     | `S3_ACCESS_KEY_ID`      | the R2 token's access key ID                                                                            |
     | `S3_SECRET_ACCESS_KEY`  | the R2 token's secret access key                                                                        |
     | `S3_REGION`             | `auto` (the default; R2 ignores regions)                                                                |
     | `API_PUBLIC_URL`        | the API's public URL, e.g. `https://api.yourdomain.com` (https switches on secure cookies)              |
     | `SITE_URL`              | the marketing site's public URL (waitlist emails link to it)                                            |
     | `TRUST_PROXY_HOPS`      | how many proxies add to `X-Forwarded-For`: `2` for Cloudflare plus the host's load balancer (see below) |
     | `STRIPE_SECRET_KEY`     | optional: turns on card payments (see "Card payments")                                                  |
     | `STRIPE_WEBHOOK_SECRET` | with `STRIPE_SECRET_KEY`: the webhook endpoint's signing secret                                         |

     Optional: `STAFF_SESSION_HOURS` (default 12) and `REFRESH_TOKEN_TTL_DAYS` (default 30) set how long staff and families stay signed in before typing their password again.

     Use different secrets in staging and production, and never reuse the development values from `.env.example`: the API refuses to start with them in production, and refuses an `https` URL unless `NODE_ENV` is `production`.

   - health check path `/v1/health/live`, readiness path `/v1/health/ready`.
5. **Create two GitHub environments** (Settings → Environments): `staging` and `production`. Give each two secrets:
   - `DATABASE_URL` — used by the migrate step;
   - `DEPLOY_HOOK_URL` — the host's deploy hook for the API service.

   On `production`, add yourself as a **required reviewer** so every production deploy waits for approval.

6. **Adjust the deploy request** in `.github/actions/deploy-api/action.yml` to the host's deploy-hook format if it differs from a plain JSON POST.

Merging to `main` now builds the images, applies migrations to staging, imports the lessons and rolls out the new API. Lesson changes in `content/` deploy the same way.

## The web app (`apps/web`)

The web app is a standard Next.js app. The simplest host is Vercel: import the repository, set the root directory to `apps/web`, and add three environment variables: `NEXT_PUBLIC_API_URL` (the API's public URL), `NEXT_PUBLIC_SANDBOX_URL` (the code sandbox's URL, below) and `NEXT_PUBLIC_BILLING_EMAIL` (where parents write about payments). It also builds as a self-contained Node server (`output: 'standalone'`) for any container host.

Its Content-Security-Policy is built from those URLs at build time (`src/lib/security-headers.ts`): the page may only call the API, frame the sandbox and the two video players, and load nothing from other sites. It also sends HSTS.

## The code sandbox (`apps/sandbox`)

Students' code runs in the sandbox, never on the main site. It is a few static files, and it must live on **its own domain** — a separate registrable domain, not a subdomain of the main site (for example `yourdomain-code.net`, not `code.yourdomain.com`). Browsers treat subdomains of one site as "same site", so a sandbox there would share the site's `SameSite` cookie protection; a different domain keeps students' code entirely outside it.

1. Register the sandbox domain and put it behind Cloudflare like the others.
2. Create a static site on a host that reads a `_headers` file (Cloudflare Pages or Netlify):
   - build command: `pnpm install --frozen-lockfile && pnpm nx run @kcp/sandbox:build`
   - output folder: `apps/sandbox/dist`
   - environment variable `SANDBOX_FRAME_ANCESTORS`: the web app's origin, e.g. `https://app.yourdomain.com` (several are space-separated). It is written into the `Content-Security-Policy` at build time, so only the web app can embed the sandbox.
   - environment variables `SANDBOX_API_URL` (the API) and `SANDBOX_WEB_URL` (the web app), for the public portfolio page (`/portfolio/#<link>`), which lives on the sandbox domain so shared projects never run on the main site.
3. Set the web app's `NEXT_PUBLIC_SANDBOX_URL` to the sandbox's URL (for example `https://yourdomain-code.net`) and redeploy the web app.
4. Check the headers: `curl -sI https://yourdomain-code.net/` must show `Content-Security-Policy` with `connect-src blob:` (only files the page made itself, for Python) and your `frame-ancestors`. A host that ignores `_headers` must be given the same headers in its own settings — copy them from `apps/sandbox/dist/_headers`.

The sandbox needs no secrets and no access to the API. Use one sandbox per environment (staging and production), each allowing only its own web app.

## The admin panel (`apps/admin`)

Deploy it the same way as the web app, with `apps/admin` as the root directory, the same `NEXT_PUBLIC_API_URL`, and `NEXT_PUBLIC_WEB_APP_URL` (links to a student's shared work). Give it its own subdomain on the same site, for example `admin.yourdomain.com`, and add that URL to the API's `CORS_ORIGINS`.

Every admin page gets a strict Content-Security-Policy with a new nonce per request (`src/proxy.ts`), so its pages are rendered per request and never cached by a CDN.

The admin panel keeps its own refresh cookie (`kcp_admin_refresh`), so staff can be signed in to both apps in one browser without one session replacing the other. Only staff accounts can log in, always with two-factor authentication. For extra protection, put the admin subdomain behind an access gateway such as Cloudflare Access, so the login page is only reachable for your team’s email addresses.

## The marketing site (`apps/site`)

Also a Next.js app (root directory `apps/site`), on the main domain, for example `yourdomain.com`. It needs `NEXT_PUBLIC_API_URL` (waitlist and prices), `NEXT_PUBLIC_WEB_APP_URL` (the "Sign up" links) and `NEXT_PUBLIC_SITE_URL` (its own address, for canonical links and the sitemap). Add its URL to the API's `CORS_ORIGINS`, and set the API's `SITE_URL` to it.

## Card payments (Stripe)

Without `STRIPE_SECRET_KEY`, development uses a mock of Stripe Checkout (with signed webhooks, so the whole flow can be tried), and staging and production have **no card payments**: the plans page asks parents to pay by bank transfer or wallet (writing to `NEXT_PUBLIC_BILLING_EMAIL`), and staff record those payments in **Admin → Payments**. To switch cards on:

1. In the Stripe Dashboard (test mode first, on staging), copy the secret key (`sk_test_…`), or create a restricted key with write access to Checkout Sessions, Customers, Products, Prices, Subscriptions, Invoices and Refunds (the API creates a Stripe price the first time a country's price is used).
2. Add a webhook endpoint `<api>/v1/payments/webhooks/stripe` with these events: `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `charge.refunded`. Copy its signing secret (`whsec_…`).
3. Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` on the API and redeploy. The API refuses to start with the secret key but no webhook secret.
4. Check that each pilot country has prices in its currency (**Admin → Countries and languages**) and that the `payments` feature flag is on there (**Admin → Feature flags**).
5. Pay for a plan as the test family with a Stripe test card, cancel it, and refund it from **Admin → Payments**. Then repeat with the live keys (`sk_live_…`) in production.

Prices come from the database, never from the browser. Stripe keeps the card details; the API stores only a short summary of each Stripe event (IDs, amounts, statuses).

## Publishing lessons

The migrate image imports `content/` with `--hold-new`: a **new** module arrives unpublished, and staff publish it in **Admin → Content** after previewing it in every language. Changes to modules already published go live with the deploy. Locally (`pnpm content:import`) and in `docker compose`, new modules are published straight away. On the **first deploy** of staging and production, every module is new: publish Module 1 and Module 2 in **Admin → Content** before families arrive. Details: [runbooks/deploy.md](runbooks/deploy.md#publishing-new-lessons).

## Scheduled jobs and several API instances

The API runs these jobs itself (UTC). If the host runs more than one API instance, a lock in Redis makes sure only one of them does each run (except the waitlist clean-up, which is harmless to repeat).

| When             | Job                                                                                     |
| ---------------- | --------------------------------------------------------------------------------------- |
| Every 15 minutes | Close finished weekly boards and seasons; award their badges                            |
| 00:15            | The five pilot numbers for yesterday (today's are worked out when the page opens)       |
| 00:45            | Delete the stored files of students deleted in the last week (again, in case it failed) |
| 01:10            | End manual plans whose period is over; re-read card plans Stripe went quiet about       |
| 02:30            | Rebuild the leaderboards in Redis from PostgreSQL                                       |
| 03:40            | Remove unconfirmed waitlist entries                                                     |
| 07:05            | "Your trial ends soon" emails                                                           |
| 06:20 on the 1st | Monthly progress summaries to parents                                                   |

Leaderboards live in Redis and are rebuilt from PostgreSQL when missing, so emptying Redis loses nothing.

**How many instances:** the [load test](load-test.md) had 1,000 students working at once on one small instance with every answer under 120 ms; a burst (a whole class pressing "Check" together) saturated it. Run at least two instances in production.

## The client's IP address

Rate limits, the audit log and consent records use the client's IP address, which the API reads from `X-Forwarded-For`, trusting `TRUST_PROXY_HOPS` proxies. It must match the real chain: with Cloudflare in front of the host's load balancer it is usually `2`. Too low, and every family behind one Cloudflare server shares one rate limit; too high, and a client can pretend to be any address. After setting up, log in from a known address and check that **Admin → Audit log** shows it.

## Before the pilot starts

- **Legal pages.** `/safety`, `/terms` and `/privacy` are drafts in `apps/web/src/content/legal/` (version `2026-10`). Have the lawyer review them (and native speakers the Arabic and Urdu), then update the texts. If the meaning of the terms or privacy policy changes, bump `TERMS_VERSION` and `TERMS_UPDATED` in `packages/shared/src/index.ts`: new sign-ups and consents record the new version, and parents who accepted an older one are asked to accept the new one when they next open the app.
- **Countries, prices and flags.** Placeholder prices are set for Pakistan, Egypt, the UAE and Saudi Arabia. Set the real ones in **Admin → Countries and languages**, switch on the pilot countries, and check **Admin → Feature flags**.
- **Premium for pilot families.** Staff grant it by hand on a parent's page in the admin panel (it covers every child), always with a reason.
- **Feedback.** Read new messages in the admin panel's **Feedback** page every day; safety reports come first.

## Cookies and domains

**Put the web app, the admin panel and the API on the same site.** The refresh cookie is `SameSite=Strict`, which blocks cross-site request forgery but also means the browser only sends it when the web app and API share a registrable domain — for example `app.yourdomain.com` and `api.yourdomain.com`. A web app on `*.vercel.app` talking to an API on another domain will log people out on every reload. Add a custom domain to each environment, and list the web app's URL in the API's `CORS_ORIGINS` and `WEB_APP_URL`.

## The first staff account

Staff can't sign up. Create the first super admin from your computer against the target database, then log in to the admin panel with the printed temporary password and set up two-factor authentication. Change the password straight away with the web app's "Forgot your password?" link (staff passwords need 12 characters or more). Keep the temporary password out of the repository and out of chat:

```bash
DATABASE_URL="<staging database URL>" pnpm staff:create --email you@yourdomain --name "Your Name" --role super_admin
```

## Releasing to production

```bash
git tag v0.1.0
git push origin v0.1.0
```

The deploy workflow builds the tagged images and waits for approval in the `production` environment. After approval it applies the migrations, then deploys.

## If the database can't be reached from GitHub

The migrate step runs on GitHub's servers, so the database must accept TLS connections from the internet (protected by a strong password). If your database is private, run the `kcp-migrate` image on the host instead — most hosts call this a _release command_ or _pre-deploy job_ — and remove the migrate step from the deploy action.

## Rolling back

- **Code:** redeploy the previous image tag from the host's dashboard.
- **Database:** migrations only move forward. Fix a bad migration with a new one; restore from a backup only as a last resort.

## Decisions and deviations from the plan

- **Scheduled jobs** use `@nestjs/schedule` with Redis locks, not BullMQ: the jobs are few and short, and this needs no extra worker process.
- **Email is sent through SMTP** (any provider, for example Resend or Amazon SES, both offer SMTP), so the provider can change without a code change.
- **Python (Pyodide) is downloaded by the web app**, not by the sandbox, because browsers don't cache what a sandboxed page downloads. The web app never runs it: it hands the files to the sandbox.
- **Public portfolios live on the sandbox domain** with the link in the URL fragment, so shared projects never run on the main site and links don't reach server logs.
- **The development mock of Stripe** starts a new period and charges it in full when a family switches between monthly and yearly; the real Stripe prorates. Adding children is prorated in both; the credit for a removed child only exists at the real Stripe.
- **Trials:** each new child gets 14 days of premium, at most 4 trials per family, so deleting and re-adding children can't renew them.
- **The web app's Content-Security-Policy allows inline scripts** (a nonce would make every page dynamic); the admin panel uses a strict nonce policy. See [security-review.md](security-review.md#decisions).
- **New modules are held for publishing in production** (see "Publishing lessons") instead of going live with the deploy.
