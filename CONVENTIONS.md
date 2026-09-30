# Conventions

How code is organised in this repo. Written for humans and for AI coding tools — point your assistant at this file before it writes code here.

## Stack and versions

| Area             | Choice                                                                     |
| ---------------- | -------------------------------------------------------------------------- |
| Runtime          | Node.js 24 LTS (`.nvmrc`), ES modules everywhere (`"type": "module"`)      |
| Package manager  | pnpm (version pinned in `package.json` → `packageManager`) with workspaces |
| Task runner      | Nx — caches results and runs only what a change affects                    |
| Language         | TypeScript 6 (`strict`, `noUncheckedIndexedAccess`)                        |
| API              | NestJS 12 on Express 5                                                     |
| Web apps         | Next.js 16 (App Router, `proxy.ts`), next-intl 4, Tailwind CSS 4           |
| Code editor      | CodeMirror 6 (HTML, CSS and JavaScript), previewed in `apps/sandbox`       |
| Shared UI        | `packages/ui`: React components and design tokens (`theme.css`)            |
| Permissions      | CASL 7, rules stored in PostgreSQL                                         |
| Database         | PostgreSQL 17 through Prisma 7 (`pg` driver adapter)                       |
| Cache and queues | Redis 7 (ioredis; BullMQ from Phase 1 Sprint 5)                            |
| Tests            | Vitest (NestJS 12's default) + Supertest                                   |
| Lint and format  | oxlint (warnings fail the build) and Prettier                              |

Upgrade major versions deliberately, one at a time, on their own branch. Dependabot only opens minor and patch updates.

## Repository layout

- `apps/*` are things you deploy. `packages/*` are shared code. `tools/*` are scripts.
- Package names use the `@kcp/` scope (a placeholder until the platform has a name — renaming is a search-and-replace).
- Every project has the same scripts where they apply: `build`, `dev`, `typecheck`, `lint`, `test`, `test:e2e`.

## Imports

- ES modules with Node's resolution: relative imports end in `.js`, even in `.ts` files (`import { x } from './x.js'`).
- Import other projects only through their package name (`@kcp/database`), never with relative paths across projects.
- **Only `apps/api` (and `tools/content-import`, which writes lessons) may import `@kcp/database`.** Web and mobile apps talk to the API through the generated clients.
- Rules both sides must agree on (password lengths, the nickname pattern, avatar keys, age limits) live in `@kcp/shared`, which has no dependencies. Change a rule there, never in two places.
- Next.js apps use the bundler's resolution instead: no `.js` extensions, and `@/…` for `src/…`.

## API (`apps/api`)

- One NestJS module per feature: `src/<feature>/<feature>.module.ts`, `*.controller.ts`, `*.service.ts`, `dto/*.dto.ts`.
- Controllers stay thin: validate input, call a service, return a DTO.
- Request and response shapes are classes in files named `*.dto.ts` (usually in `dto/`). The Swagger plugin reads only these files (and their comments) to build the OpenAPI document, so a DTO class in a controller or service file won't be documented, and the generated client won't know its fields.
- Validate input with `class-validator` decorators on DTOs. The global `ValidationPipe` strips unknown fields and rejects extra ones.
- Throw Nest's HTTP exceptions (`NotFoundException`, `ForbiddenException`…). The global filter turns every error into the standard shape `{ statusCode, error, message, requestId, path, timestamp }` and hides details of unexpected errors.
- Read configuration only through `AppConfigService`. Add every new environment variable to `src/config/env.ts` (with validation) and to `.env.example`.
- Log with Nest's `Logger`. Never log passwords, tokens or children's personal data.
- Every route lives under `/v1`. A breaking change gets a new version, never a silent change.
- Error responses carry a machine-readable `error` code (`INVALID_CREDENTIALS`, `EMAIL_NOT_VERIFIED`…) so apps can show a translated message. Throw `new BadRequestException({ error: 'CODE', message: '…' })`.

### Who may call a route

Every route declares exactly one of these; a route without one is refused, and `route-access.spec.ts` fails the build:

| Decorator               | Meaning                                                                            |
| ----------------------- | ---------------------------------------------------------------------------------- |
| `@Public()`             | Anyone. Adding one means updating the public-route list in `route-access.spec.ts`. |
| `@Authenticated()`      | Any signed-in account; the handler only returns the caller's own data.             |
| `@Can(action, subject)` | The caller's role allows it. Add `{ onAll: true }` for list endpoints.             |

- `@Can` only checks the type ("may read some Users"). Services check the record too, with the ability from `@CurrentAbility()` and a tagged subject (`userSubject(user)`), and return **404, not 403**, for records the caller may not see — so nobody can probe for children's accounts.
- Permission rules live in `packages/database/src/permission-matrix.ts`. The seed writes them to the database; `ability.factory.spec.ts` tests each one. Change both together.
- Admin actions write to the audit log with `AuditService.record()`, inside the same transaction as the change.
- Sensitive public routes get `@RateLimit(...)` (by IP and, where it makes sense, by email). The client IP comes from `X-Forwarded-For`, trusting `TRUST_PROXY_HOPS` proxies.
- `route-permissions.e2e-spec.ts` calls **every route** without a token and as every role its rules refuse. A new route is covered automatically; if it fails, the route's decorator or the matrix is wrong, not the test.

### Accounts, sessions and security

- **New passwords go through `assertStrongPassword()`** (`auth/password-policy.ts`): 12+ characters for adults, 8+ for children, and no common or personal passwords. Only when a password is set, never at login.
- **Security changes send an email** to the account (password changed, two-factor set up, account deleted), so a stranger's change doesn't go unnoticed.
- Responses are `Cache-Control: no-store` unless the route sets its own; the API accepts only JSON bodies.
- Sessions have an absolute lifetime (`sessions.authenticated_at`); refreshing doesn't extend it. Revoke sessions (`SessionService.revokeAllForUser`) whenever a password is reset or an account is suspended; a password change keeps only the current session.
- The terms and privacy policy have one version, `TERMS_VERSION` in `@kcp/shared`. Bump it (and `TERMS_UPDATED`) only when their meaning changes: every parent is then asked to accept again.
- Stripe objects are never stored whole: `stripeSummary()` keeps IDs, amounts and statuses only.

### Files, XP and leaderboards

- **Files go through `StorageService`** (S3 API: Cloudflare R2 in production, the `infra/storage` container locally). Keys start with the owner, e.g. `projects/<userId>/<projectId>/v<n>/index.html`, so deleting an account can remove everything under `projects/<userId>/`. Files are private and served only through the API.
- **XP only through `ProgressService.award()`**, inside the transaction that earns it, with a source and source ID (`CHALLENGE`, `LESSON`, `PROJECT`, `ADMIN`). It locks the student's row, gives each source once, applies the daily cap and updates the streak. Call `publish()` with the awards after the transaction commits, to update the leaderboards.
- `xp_events` is the source of truth (append-only); `student_profiles.xp_total` and the Redis leaderboards are caches that can be rebuilt from it. Days are the student's local day (their country's time zone); leaderboard weeks are ISO weeks in UTC.
- Public boards show nickname, avatar and XP only, and only for students whose parent switched public leaderboards on.

## Database (`packages/database`)

- Models are PascalCase; tables and columns are snake_case via `@@map` / `@map`.
- IDs are UUID v7 (`@default(uuid(7)) @db.Uuid`) unless a natural key exists (country and language codes).
- Change the schema, then run `pnpm db:migrate` and give the migration a clear name. Commit `schema.prisma` and the new migration together.
- Never edit a migration that has run anywhere but your machine. Write a new one.
- Hand-written SQL (triggers, special indexes) goes into a migration created with `pnpm --filter @kcp/database migrate:create`, with a comment explaining why.
- Records that must never be rewritten are append-only: `audit_logs`, `consent_records`, `xp_events` and `payment_events`. `pnpm db:drill` checks a restored backup still has their triggers.
- Reference data goes in `prisma/seed-data/*` and must be safe to seed again (upserts only). The seed runs on every deploy (the `migrate` image), so reference data and permissions reach every environment.
- Minors' data: nickname and preset avatar in public; never real names, photos, school names or exact locations of children on anything public.

## Web apps (`apps/web`, `apps/admin`)

- Build screens from `@kcp/ui` (`Button`, `TextField`, `Switch`, `Dialog`, `Avatar`…). Its components take all their text as props, so they work in any language; `apps/web/src/components/ui.tsx` fills in translated labels where needed.
- Styles: `@import 'tailwindcss'` then `@import '@kcp/ui/theme.css'`. Change colours, fonts and radii in `theme.css` only.
- Hide buttons the caller's role doesn't allow (the admin panel reads the CASL rules from `/v1/auth/me`), but never rely on that: the API checks every request.
- **Content-Security-Policy.** The web app's is built in `src/lib/security-headers.ts`: a new site the page talks to or frames (a video host, an API) must be added there, with a test. The admin panel's has a nonce per request (`src/proxy.ts`): never add `'unsafe-inline'` scripts to it, and read the nonce from the `x-nonce` header for any inline script.

### Student and parent web app (`apps/web`)

- Every page lives under a language prefix (`/en`, `/ar`, `/ur`). Use `Link`, `useRouter` and `redirect` from `@/i18n/navigation`, never from `next/link` or `next/navigation`, so links keep the language.
- No text in components: add keys to `packages/i18n/messages/en.json` **and** `ar.json` and `ur.json`. Tests fail if a key or `{placeholder}` is missing in any language.
- Layout mirrors automatically for Arabic and Urdu only if you use logical utilities: `ms-/me-`, `ps-/pe-`, `start-/end-`, `text-start/text-end`. Never `ml-`, `mr-`, `pl-`, `pr-`, `left-`, `right-`, `text-left`.
- Wrap left-to-right values (emails, usernames, nicknames) shown inside sentences with `isolate()`, and on their own in `<bdi>`, so they display correctly in right-to-left text.
- The access token lives only in memory (`AuthProvider`); the refresh token is an httpOnly cookie. Never store tokens in `localStorage`.
- Children's data (nicknames, usernames, birth years) never goes into analytics, logs or URLs. Record IDs are fine.

### Lessons and students' code

- Lessons are files in `content/` ([content/README.md](content/README.md)), imported with `pnpm content:import`. Never edit lesson rows in the database by hand; the next import overwrites them. Lesson IDs never change once live.
- **Students' code runs only in `apps/sandbox`**, on its own domain, in an iframe with `sandbox="allow-scripts"` (never `allow-same-origin`). Don't `eval` it, render it with `dangerouslySetInnerHTML`, or preview it any other way in the web app.
- The web app and the sandbox talk only through `postMessage`, with the message types in `@kcp/checks`. The web app accepts messages only from its own sandbox iframe (`event.source`); the sandbox answers only its embedding page.
- Checks run in the browser, so a determined student can fool them. The API recomputes "passed" from the challenge's own check IDs, **re-runs the HTML and CSS checks itself** (`learning/server-checks.ts`: a headless DOM with scripts and network off) for challenges and project ships, except in JavaScript lessons; it keeps only the files the starter has (`cleanCode(code, starter)`), refuses unchanged starter code, and rate-limits submissions. JavaScript and Python checks stay as the browser reported them, so anything worth money or rewards later (mentor approval, school credit) must not rely on them alone.
- **Publishing:** a module is visible to students only once published (`modules.published_at`). Every student-facing query goes through `publishedModule` / `openLesson` from `learning/content.ts`. In production, new modules arrive unpublished (`content:import --hold-new`) and staff publish them in **Admin → Content**.
- Lesson texts are Markdown rendered without raw HTML. Code in lesson texts and the editor is always left-to-right, even in Arabic and Urdu.
- Shipped projects are previewed the same way: in the sandbox iframe (`ProjectPreview`), on the portfolio, the parent dashboard and the share page.

### Admin panel (`apps/admin`)

- English only, no next-intl. Staff-only: the API refuses non-staff logins to it, and it keeps its own refresh cookie (`kcp_admin_refresh`).
- List pages keep their filters in the URL (`useUrlFilters`), so a filtered view can be reloaded or shared — except free-text searches, which can hold an email or a child's username and must not end up in browser history or server logs.
- Every admin action that changes something goes through an API route that writes the audit log, with a reason where it affects a person (suspend, reactivate).

## Tests

| Kind       | Where                                                                   | Runs with                                                |
| ---------- | ----------------------------------------------------------------------- | -------------------------------------------------------- |
| Unit       | next to the code, `*.spec.ts`                                           | `pnpm test`                                              |
| End-to-end | `apps/api/test/*.e2e-spec.ts`, `packages/database/prisma/*.e2e-spec.ts` | `pnpm test:e2e` (needs `pnpm services:up`)               |
| Browser    | `apps/{web,admin,site}/e2e/*.spec.ts` (Playwright)                      | `pnpm build && pnpm content:import && pnpm test:browser` |

The web app's browser tests include accessibility checks (axe, in every language, and right to left on a phone) and performance budgets (JavaScript size, slow 3G): see [docs/accessibility.md](docs/accessibility.md) and [docs/performance.md](docs/performance.md). Import `test` and `expect` from `./fixtures` in web browser tests: it clears the local rate limits before each test.

Always test: permission rules, consent logic, anything involving money or XP, and database protections. Write those tests first.

## Definition of done

A change is done when:

- `pnpm check`, `pnpm test:e2e` and (for web changes) `pnpm test:browser` pass.
- It works in English, Arabic and Urdu, and mirrors correctly right-to-left.
- New routes have permission tests; admin actions are in the audit log.
- New pages pass the accessibility checks (add them to `accessibility.spec.ts`) and stay within the JavaScript budgets.
- API changes come with a regenerated client (`pnpm api:client`).
- Schema changes come with a migration.

## Git

- Branch from `main`: `feat/…`, `fix/…`, `chore/…`. Open a pull request even when working alone — CI runs on it.
- Commit messages in the imperative: "Add parent consent endpoint".
- Never commit `.env` files or secrets.
