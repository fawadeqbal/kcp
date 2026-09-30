# Kids Coding Platform

Monorepo for the Kids Coding Platform: the NestJS API, the Next.js apps (student and parent web app, admin panel, marketing site), the Flutter app and their shared packages.

Planning documents live one folder up: `kids-coding-platform-scope.md` and `implementation-plan.md`.

## What's here today

Phase 0 (infrastructure) and all of **Phase 1** (web) are done: sign-up, login and permissions (Sprint 1); child accounts, consent and the admin panel (2); lessons, the code editor, the sandbox and auto-checked challenges (3); projects, portfolios, XP, streaks, leaderboards and pilot tools (4, the **M1 pilot slice**); badges, every leaderboard level, seasons and Python (5); plans and payments (6); the marketing site, emails, public portfolios, certificates and notifications (7); and the security review, performance, accessibility, load test, runbooks and admin settings (8, **M2 paid launch**).

| Path                     | What it is                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `apps/api`               | NestJS 12 API: parent sign-up with email confirmation, login, password reset, staff two-factor login, child accounts with parental consent, student login, role permissions (CASL), rate limits, audit log, admin endpoints, reference data, health checks, OpenAPI docs; module projects shipped to file storage, portfolios and public portfolio links, XP, levels, daily goal, streaks and streak freezes, badges, leaderboards (world, country, region, city; weekly, season, all time) with seasons, plans and payments (Stripe, or a mock of it in development; manual payments; trials; refunds; invoices), certificates, notifications, emails in three languages (trial reminders, receipts, monthly summaries), the waitlist, account export and deletion, feedback, premium by hand, the five pilot numbers, and admin settings (countries, prices, languages, feature flags, content publishing) |
| `apps/web`               | Next.js 16 web app in English, Arabic and Urdu (right-to-left): parent sign-up and login, parent dashboard (add children, sharing switches, new password, delete, lessons done), printable login card, student login, the lesson map and the lesson player (video, explainer, CodeMirror editor with autosave, live preview, "Check my code"), Python lessons (Pyodide), module projects (`index.html`, `style.css`, `script.js`, "Ship it"), portfolio and share links, level, XP bar, daily goal and streak, badges, leaderboards, certificates, notifications, plans and payments with invoices, the parent's account (change password, download data, delete account, accept new terms), the feedback button, and the safety, terms and privacy pages (drafts)                                                                                                                                           |
| `apps/sandbox`           | Runs students' code on its own domain (HTML, CSS, JavaScript and Python): a static page the web app embeds in a sandboxed iframe, with loop guards, time limits, console capture and the checks; also the public portfolio page                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `apps/admin`             | Next.js 16 admin panel (English): staff login with two-factor authentication, overview, pilot numbers, users (suspend, reactivate, sign out everywhere, family, premium by hand, certificates), feedback inbox (safety reports first), payments (manual payments, refunds), waitlist, content preview and publishing, countries, prices and languages, feature flags, leaderboards and seasons, parental consent records, audit log                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `apps/site`              | Next.js 16 marketing site in English, Arabic and Urdu: home, how it works, tracks, pricing per country, safety, FAQ, about, blog and the waitlist                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `packages/database`      | Prisma 7 schema, migrations, reference data and the permission matrix                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `packages/api-client-ts` | Typed TypeScript client generated from the API's OpenAPI document                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `packages/i18n`          | Interface text in every language, with tests that keep the languages in step                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `packages/ui`            | Shared React components (buttons, fields, switches, dialogs, the 12 preset avatars) and the design tokens (`theme.css`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `packages/checks`        | The challenge checks (`exists`, `text`, `attribute`, `css`, `test`, `output`), page building and loop guards — shared by the sandbox, the web app, the API (which re-runs the HTML and CSS checks) and the content importer                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `packages/shared`        | Rules the API and the apps share: password lengths, nickname pattern, avatar list, age limits, XP limits, the daily goal, trial length and the terms version                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `content/`               | The lessons as files (YAML and Markdown in en/ar/ur): Builder track, Module 1 (a first website: lessons 1–5 and the project) and Module 2 (Python first steps) — see [content/README.md](content/README.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `tools/content-import`   | Checks the lessons (every solution passes, every starter still fails) and imports them into PostgreSQL                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `tools/load-test`        | The 1,000-student load test — see [docs/load-test.md](docs/load-test.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `infra/storage`          | S3-compatible file storage for local development (SeaweedFS in Docker); Cloudflare R2 in production                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `docs/`                  | Deployment, [runbooks](docs/runbooks/README.md), the [security review](docs/security-review.md), [performance](docs/performance.md), [accessibility](docs/accessibility.md) and the [load test](docs/load-test.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `docker-compose.yml`     | PostgreSQL 16, Redis 7, Mailpit and the file storage for local development                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `.github/workflows`      | CI (dependency audit, lint, typecheck, tests, build, browser tests, migration and API-contract checks) and API deploys                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

Coming next: Phase 1b, the Flutter app (see the implementation plan).

## First-time setup (Windows, macOS or Linux)

You need:

1. **Node.js 24 LTS** — from [nodejs.org](https://nodejs.org), or `nvm install 24`. Older Node versions ship a Corepack that can't run pnpm 12.
2. **pnpm 12** — `npm install --global pnpm@12` (the exact version is pinned in `package.json`).
3. **Docker Desktop** — runs PostgreSQL, Redis, Mailpit and the file storage. On Windows, use the WSL 2 backend.
4. **Git**.

Then, in this folder:

```bash
git init                      # first time only, if this isn't a Git repository yet
cp .env.example .env          # PowerShell: Copy-Item .env.example .env
pnpm install
pnpm bootstrap                # starts services, creates the database, seeds it, builds everything, imports the lessons
pnpm dev                      # API, web app, admin panel and code sandbox with hot reload
```

Open:

- Web app: <http://localhost:3001> — sign up as a parent (the confirmation email lands in Mailpit), add a child (aged 13 or over for now), then log in as the child at **Student log in** and start the first lesson
- Admin panel: <http://localhost:3002> — staff only (see below)
- Marketing site: <http://localhost:3003> — pricing and the waitlist
- Code sandbox: <http://localhost:3004> — a blank page on its own; the lessons embed it
- Email inbox (Mailpit): <http://localhost:8025>
- Card payments: without a Stripe key, a mock of Stripe Checkout opens instead; see [docs/deployment.md](docs/deployment.md#card-payments-stripe) to use Stripe
- File storage: S3 API on <http://localhost:8333>, file browser on <http://localhost:8888/buckets/kcp-files/> (shipped projects are under `projects/`)
- API docs: <http://localhost:3000/docs>
- API health: <http://localhost:3000/v1/health/ready>

To use the admin panel, create a staff account, then log in at <http://localhost:3002> with the printed temporary password. The first login asks you to scan a QR code with an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password…).

```bash
pnpm staff:create --email you@example.com --name "Your Name" --role super_admin
```

**Updating from an earlier version?** Compare your `.env` with `.env.example` and copy any lines you're missing (Sprint 1 added the auth secrets and email settings; Sprints 6–7 added `SITE_URL`, `API_PUBLIC_URL` and the optional Stripe keys). Compare each app's `.env.local` with its `.env.example` too. Then run `pnpm install`, `pnpm services:up`, `pnpm db:deploy`, `pnpm db:seed`, `pnpm build` and `pnpm content:import`. After Sprint 8, parents are asked to accept the new terms once, and adult passwords need 12 characters (existing passwords keep working until they're changed).

Want to try it without signing up? `pnpm demo:accounts` creates demo families on your local database and prints their logins.

If port 5432 or 6379 is already taken (for example by a local PostgreSQL), stop that service or change the port in `docker-compose.yml` and `.env`.

## Daily commands

| Command                              | What it does                                                                                 |
| ------------------------------------ | -------------------------------------------------------------------------------------------- |
| `pnpm dev`                           | Runs the API (:3000), web app (:3001), admin panel (:3002), site (:3003) and sandbox (:3004) |
| `pnpm check`                         | Lint + typecheck + unit tests for every project                                              |
| `pnpm test:e2e`                      | End-to-end tests against the real PostgreSQL and Redis                                       |
| `pnpm test:browser`                  | Browser tests of the web app, admin panel and site (needs Mailpit and a build)               |
| `pnpm staff:create`                  | Creates a staff account with a temporary password                                            |
| `pnpm demo:accounts`                 | Creates demo families on your local database, with some lesson progress                      |
| `pnpm build`                         | Builds every project (Nx caches unchanged ones)                                              |
| `pnpm affected`                      | Lint, typecheck, test and build only what your changes affect                                |
| `pnpm format`                        | Formats the code with Prettier                                                               |
| `pnpm services:up` / `services:down` | Starts / stops PostgreSQL, Redis, Mailpit and the file storage                               |
| `pnpm services:reset`                | Stops the services and **deletes their data**                                                |
| `pnpm db:migrate`                    | Creates and applies a migration after you change `schema.prisma`                             |
| `pnpm db:seed`                       | Loads reference data (languages, roles, countries, cities, flags) — safe to repeat           |
| `pnpm content:check`                 | Checks the lessons in `content/`: valid files, solvable challenges                           |
| `pnpm content:import`                | Checks, then writes the lessons into the database — run after editing `content/`             |
| `pnpm db:drill`                      | Backup-restore drill: dumps the database, restores a copy and compares them                  |
| `pnpm --filter @kcp/load-test …`     | The load test: `seed`, `start`, `cleanup` (see [docs/load-test.md](docs/load-test.md))       |
| `pnpm db:studio`                     | Opens Prisma Studio to browse the database                                                   |
| `pnpm db:reset`                      | Drops the local database and re-applies every migration and the seed                         |
| `pnpm api:client`                    | Regenerates the OpenAPI document and the TypeScript client after an API change               |

Run a command for one project with `pnpm --filter @kcp/api <script>` or `pnpm nx run @kcp/api:<target>`.

## How the pieces fit

```mermaid
flowchart LR
  subgraph Clients["Apps"]
    WEB["apps/web<br/>parents and students"]
  SBX["apps/sandbox<br/>own domain · runs students' code"]
    ADM["apps/admin<br/>staff"]
    SITE["apps/site<br/>marketing site"]
    MOB["apps/mobile<br/>(Phase 1b)"]
  end
  I18N["packages/i18n<br/>en · ar · ur"]
  UI["packages/ui<br/>components + theme"]
  CLIENT["packages/api-client-ts<br/>generated from OpenAPI"]
  API["apps/api<br/>NestJS · /v1"]
  DB["packages/database<br/>Prisma schema + client"]
  CHK["packages/checks<br/>challenge checks"]
  CNT["content/ → tools/content-import"]
  PG[("PostgreSQL")]
  RD[("Redis")]
  S3[("File storage<br/>R2 · SeaweedFS locally")]

  WEB --> CLIENT
  WEB -- "sandboxed iframe + postMessage" --> SBX
  SBX --> CHK
  CNT --> CHK
  CNT --> DB
  WEB --> I18N
  WEB --> UI
  ADM --> UI
  ADM --> CLIENT
  SITE --> CLIENT
  CLIENT -- HTTP --> API
  MOB -- "HTTP (Dart client, Phase 1b)" --> API
  API --> DB --> PG
  API --> RD
  API --> S3
  API -- "Checkout + webhooks" --> STRIPE[("Stripe")]
```

Rules that keep this healthy are in [CONVENTIONS.md](CONVENTIONS.md). The short version:

- **One door to the database.** Only `apps/api` (and the content importer in `tools/`) depend on `@kcp/database`.
- **Students' code never runs on the main site.** It runs in `apps/sandbox`, on its own domain, inside a sandboxed iframe that can't reach cookies, storage or the network.
- **API change = client change.** After changing a route or DTO, run `pnpm api:client` and commit the result; CI fails otherwise.
- **Every schema change has a migration.** CI fails if `schema.prisma` and the migrations disagree.
- **Every route declares who may call it** with `@Public()`, `@Authenticated()` or `@Can(action, subject)`. Routes without one are refused, and a test fails the build.
- **Some records can't be rewritten.** `audit_logs`, `xp_events` and `payment_events` are append-only and `consent_records` can only be revoked — all enforced by database triggers.

## CI and deploys

- **CI** (`.github/workflows/ci.yml`) runs on every pull request and on `main`: a dependency audit, formatting, migrations on a fresh PostgreSQL, schema-drift check, the lesson check (`content:check`), lint, typecheck, unit tests, build, end-to-end tests, the API-client check, and browser tests of the web app (in English, Arabic and Urdu; lessons on a laptop and a touch tablet; accessibility and performance budgets), the admin panel and the site.
- **Deploy** (`.github/workflows/deploy-api.yml`) builds two images and pushes them to GitHub Container Registry: `kcp-api` (the server) and `kcp-migrate` (applies migrations, syncs reference data and imports the lessons, then exits).
  - Push to `main` → deploys to **staging** once the staging secrets exist.
  - The web app, admin panel, site and code sandbox deploy separately (for example Vercel for the Next.js apps and a static host for the sandbox) — see the deployment notes.
  - Push a tag like `v0.1.0` → deploys to **production** after approval.

Setting up hosting is described in [docs/deployment.md](docs/deployment.md); running it day to day in the [runbooks](docs/runbooks/README.md).

## Running the API in Docker locally

```bash
docker compose --profile api up -d --build   # builds the images, runs migrations, seed and lesson import, starts the API on :3000
```

This is the same image that is deployed. Day to day, `pnpm dev` is faster.
# kcp
