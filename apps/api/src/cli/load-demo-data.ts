/**
 * Fills a LOCAL database with about nine weeks of made-up activity, so every page of
 * the platform has something to show and every table has rows: families and children
 * in Pakistan and Egypt, lessons, attempts, quizzes, daily practice, projects and
 * portfolios, XP, streaks, levels and badges, weekly and season leaderboards (with city
 * and region boards), certificates, plans, payments, refunds and invoices, premium
 * given by staff, feedback, notifications, the waitlist, app crash reports, the daily
 * numbers and the audit trail — and the real-world hub (Pakistan's hub opened in this
 * database: clients, requests, projects, milestones, earnings, payouts and stories).
 *
 *   pnpm demo:data           loads it (running it again only prints the logins)
 *   pnpm demo:data --fresh   removes the earlier demo data and loads it again, dated from today
 *
 * It needs the reference data (`pnpm db:seed`), the lessons (`pnpm content:import`) and
 * a build (`pnpm build`). XP, streaks, badges, boards and the daily numbers go through
 * the platform's own services, so they follow the same rules as real use. Every demo
 * email ends in @kcp-demo.test; nothing is ever sent outside (Mailpit catches email).
 */
import path from 'node:path';
import { parseArgs } from 'node:util';
import { NestFactory } from '@nestjs/core';
import { SchedulerRegistry } from '@nestjs/schedule';
import { config as loadEnv } from 'dotenv';
import type { Redis } from 'ioredis';
import { AppModule } from '../app.module.js';
import { BillingRecordsService } from '../billing/billing-records.service.js';
import { AppConfigService } from '../config/app-config.service.js';
import { HubEarningsService } from '../hub/earnings.service.js';
import { LedgerService } from '../hub/ledger/ledger.service.js';
import { StripeGateway } from '../billing/stripe/stripe.gateway.js';
import { PrismaService } from '../database/prisma.service.js';
import { MetricsService } from '../metrics/metrics.service.js';
import { BadgesService } from '../progress/badges.service.js';
import { LeaderboardJobsService } from '../progress/leaderboard-jobs.service.js';
import { LeaderboardService } from '../progress/leaderboard.service.js';
import { LeaderboardsAdminService } from '../progress/leaderboards-admin.service.js';
import { ProgressService } from '../progress/progress.service.js';
import { REDIS } from '../redis/redis.constants.js';
import { ReportsService } from '../reports/reports.service.js';
import { StorageService } from '../storage/storage.service.js';
import { loadCatalog, simulateLearning } from './demo-data/activity.js';
import { createBilling, createGrants } from './demo-data/billing.js';
import { type BoardServices, createSeasons, finishBoards } from './demo-data/boards.js';
import { DEMO_DOMAIN, PASSWORDS } from './demo-data/cast.js';
import { demoLoaded, removeDemoData } from './demo-data/cleanup.js';
import { type DemoContext, PremiumCalendar } from './demo-data/context.js';
import {
  appCrashes,
  createFeedback,
  dailyMetrics,
  readAndSeen,
  shareLinks,
  staffActions,
  trialReminders,
  waitlist,
} from './demo-data/extras.js';
import { createHub } from './demo-data/hub.js';
import { createPhase2, createWebAdults, WEB_ADULTS } from './demo-data/phase2.js';
import {
  createDevices,
  createFamilies,
  createPasswordResets,
  createSessions,
  createStaff,
} from './demo-data/people.js';
import { Clock, Rng } from './demo-data/timeline.js';

loadEnv({ path: path.resolve(process.cwd(), '../../.env'), quiet: true });

const CONTENT_DIR = path.resolve(process.cwd(), '../../content');
/** Only databases on this computer (or the Docker Compose service). */
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]', 'postgres']);

const { values } = parseArgs({
  // pnpm may pass a literal "--" through; ignore it.
  args: process.argv.slice(2).filter((arg) => arg !== '--'),
  options: { fresh: { type: 'boolean', default: false } },
});

function assertLocalDatabase() {
  let host = '';
  try {
    host = new URL(process.env.DATABASE_URL ?? '').hostname;
  } catch {
    host = '';
  }
  if (process.env.NODE_ENV === 'production' || !LOCAL_HOSTS.has(host)) {
    console.error(
      `Demo data is only for a local database (DATABASE_URL host is "${host || 'missing'}"). Nothing was changed.`,
    );
    process.exit(1);
  }
}

/** Rows in every table, to show that none is empty. */
async function tableCounts(prisma: PrismaService) {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
    ORDER BY tablename`;
  const counts: [string, number][] = [];
  for (const { tablename } of tables) {
    const [row] = await prisma.$queryRawUnsafe<{ n: bigint }[]>(
      `SELECT COUNT(*) AS n FROM "${tablename}"`,
    );
    counts.push([tablename, Number(row?.n ?? 0)]);
  }
  return counts;
}

async function printLogins(ctx: DemoContext, progress: ProgressService) {
  const domain = `@${DEMO_DOMAIN}`;
  const staff = await ctx.prisma.user.findMany({
    where: { email: { endsWith: domain }, role: { isStaff: true } },
    select: { email: true, role: { select: { key: true } } },
    orderBy: { createdAt: 'asc' },
  });
  const parents = await ctx.prisma.user.findMany({
    where: { email: { endsWith: domain }, role: { key: 'parent' } },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      email: true,
      status: true,
      countryCode: true,
      languageCode: true,
      subscriptions: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { provider: true, planKey: true, status: true, cancelAtPeriodEnd: true },
      },
      childLinks: {
        where: { isPrimary: true },
        orderBy: { createdAt: 'asc' },
        select: {
          child: {
            select: {
              username: true,
              status: true,
              country: { select: { timezone: true } },
              city: { select: { slug: true } },
              streak: true,
              studentProfile: { select: { nickname: true, xpTotal: true } },
            },
          },
        },
      },
    },
  });

  console.info(
    '\nStaff: admin panel at http://localhost:3002 (two-factor login is set up the first time)',
  );
  for (const member of staff) {
    console.info(`  ${member.email!.padEnd(34)} ${member.role.key}`);
  }
  console.info(`  password for all: ${PASSWORDS.staff}`);

  console.info(
    '\nMentors and teachers: http://localhost:3001/en/login (two-factor login is set up the first time)',
  );
  for (const adult of WEB_ADULTS) {
    const note =
      adult.role === 'mentor'
        ? adult.checked
          ? 'mentor (background check passed)'
          : 'mentor (background check in progress)'
        : 'teacher at Crescent Model School';
    console.info(`  ${`${adult.email}@${DEMO_DOMAIN}`.padEnd(34)} ${note}`);
  }
  console.info(`  password for all: ${PASSWORDS.staff}`);

  const clients = await ctx.prisma.user.findMany({
    where: { email: { endsWith: domain }, role: { key: 'client' } },
    orderBy: { createdAt: 'asc' },
    select: {
      email: true,
      clientMembership: { select: { role: true, org: { select: { name: true } } } },
    },
  });
  if (clients.length) {
    console.info(
      '\nHub clients: http://localhost:3001/en/login, then /en/client (two-factor login is set up the first time)',
    );
    for (const client of clients) {
      const member = client.clientMembership;
      console.info(
        `  ${client.email!.padEnd(34)} ${member ? `${member.org.name} (${member.role.toLowerCase()})` : ''}`,
      );
    }
    console.info(`  password for all: ${PASSWORDS.staff}`);
  }

  console.info(
    `\nParents: http://localhost:3001/en/login (password "${PASSWORDS.parent}")` +
      `\nChildren: http://localhost:3001/en/login/student (password "${PASSWORDS.child}")`,
  );
  for (const parent of parents) {
    const plan = parent.subscriptions[0];
    const planText = plan
      ? `${plan.provider === 'STRIPE' ? 'card' : 'manual'} ${plan.planKey}, ${plan.status.toLowerCase().replace('_', ' ')}${plan.cancelAtPeriodEnd && plan.status !== 'CANCELED' ? ' (cancelling)' : ''}`
      : parent.status === 'ACTIVE'
        ? 'no plan'
        : 'email not confirmed yet';
    console.info(
      `\n  ${parent.email!.padEnd(34)} ${parent.countryCode ?? '--'} ${parent.languageCode}  ${planText}`,
    );
    for (const { child } of parent.childLinks) {
      const profile = child.studentProfile;
      if (!profile || !child.username) continue;
      const level = await progress.levelFor(profile.xpTotal);
      const streak = progress.streakToday(child.streak, child.country?.timezone ?? 'UTC');
      const where = child.city?.slug ?? 'no city';
      const status = child.status === 'ACTIVE' ? '' : `  [${child.status.toLowerCase()}]`;
      console.info(
        `    ${child.username.padEnd(26)} ${profile.nickname.padEnd(20)} level ${String(level.number).padStart(2)}, ${String(profile.xpTotal).padStart(4)} XP, streak ${String(streak.current).padStart(2)}  ${where}${status}`,
      );
    }
  }
}

async function main() {
  assertLocalDatabase();
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  // This process only loads data: the scheduled jobs run in the API server.
  for (const job of app.get(SchedulerRegistry).getCronJobs().values()) void job.stop();

  const started = Date.now();
  const log = (message: string) =>
    console.info(`[${((Date.now() - started) / 1000).toFixed(0).padStart(3)}s] ${message}`);
  const ctx: DemoContext = {
    prisma: app.get(PrismaService),
    redis: app.get<Redis>(REDIS),
    clock: new Clock(),
    rng: new Rng('kids-coding-platform-demo'),
    log,
  };
  const progress = app.get(ProgressService);
  const badges = app.get(BadgesService);
  const storage = app.get(StorageService);
  const boards: BoardServices = {
    leaderboards: app.get(LeaderboardService),
    jobs: app.get(LeaderboardJobsService),
    admin: app.get(LeaderboardsAdminService),
  };

  try {
    if (await demoLoaded(ctx)) {
      if (!values.fresh) {
        await printLogins(ctx, progress);
        console.info(
          '\nDemo data is loaded already. `pnpm demo:data --fresh` removes it and loads it again, dated from today.',
        );
        return;
      }
      log('Removing the earlier demo data…');
      const removed = await removeDemoData(ctx, storage);
      log(`Removed ${removed.adults} adults and ${removed.students} children with their data.`);
      if (!removed.filesRemoved) log('(Some project files could not be removed from storage.)');
    }

    const catalog = await loadCatalog(ctx, CONTENT_DIR);
    if (catalog.lessons.length === 0) {
      console.error('No published lessons in the database yet: run `pnpm content:import` first.');
      process.exitCode = 1;
      return;
    }

    log('Staff and families…');
    const staff = await createStaff(ctx);
    const adults = await createWebAdults(ctx);
    const families = await createFamilies(ctx);
    const children = families.flatMap((f) => f.children);
    log(`${families.length} families, ${children.length} children, ${staff.length} staff.`);

    log('Plans, payments and premium…');
    const calendar = new PremiumCalendar();
    const billing = await createBilling(
      ctx,
      { records: app.get(BillingRecordsService), stripe: app.get(StripeGateway) },
      families,
      staff,
      calendar,
    );
    const grants = await createGrants(ctx, families, staff, calendar);
    log(
      `${billing.subscriptions} plans, ${billing.payments} payments, ${grants} premium grants` +
        (billing.cards ? '' : ' (card plans need the Stripe mock: they are manual here)'),
    );
    const seasons = await createSeasons(ctx, staff, boards);

    log('Nine weeks of learning…');
    const learned = await simulateLearning(
      ctx,
      { progress, badges, storage },
      catalog,
      families,
      calendar,
    );
    if (learned.storageWarning) {
      log(
        `Project files were not stored (${learned.storageWarning}); is \`pnpm services:up\` running?`,
      );
    }

    log('Feedback, staff actions, sign-ins and more…');
    await createFeedback(ctx, families, staff, badges);
    const actions = await staffActions(
      ctx,
      families,
      staff,
      { progress, badges },
      learned.certificates,
    );
    await shareLinks(ctx, families, calendar);
    await trialReminders(ctx, families, calendar);
    await createSessions(ctx, families);
    await createDevices(ctx, families);
    await createPasswordResets(ctx, families);
    await waitlist(ctx);
    await appCrashes(ctx);

    log('Mentors, rooms, hackathons, a school and readiness checks…');
    const phase2 = await createPhase2(
      ctx,
      { reports: app.get(ReportsService) },
      families,
      staff,
      adults,
    );
    log(
      `${phase2.reports} weekly reports; a younger child (${phase2.young.username}) with verified consent.`,
    );

    log('The real-world hub: clients, projects, earnings and payouts…');
    const hub = await createHub(
      ctx,
      {
        ledger: app.get(LedgerService),
        earnings: app.get(HubEarningsService),
        storage,
        encryptionKey: app.get(AppConfigService).get('ENCRYPTION_KEY'),
      },
      families,
      staff,
      adults,
    );
    log(
      `Hub open in Pakistan (this database only); students ${hub.students.join(', ')}; projects: ${hub.projects.join('; ')}.`,
    );
    if (hub.storageWarning) log(`Hub files were not stored (${hub.storageWarning}).`);

    log('Leaderboards: weeks, seasons and the live boards…');
    const closed = await finishBoards(ctx, boards, seasons);
    log('Daily numbers…');
    await dailyMetrics(ctx, app.get(MetricsService));
    await readAndSeen(ctx, families);

    await printLogins(ctx, progress);
    console.info(`\nStaff actions to look at: ${actions.join('; ')}.`);
    console.info(
      `Seasons: "${seasons.past.name}" (ended, final top 10s stored)` +
        (seasons.current
          ? ` and "${seasons.current.name}" (running).`
          : `; "${seasons.runningAlready}" was running already and was left as it is.`),
    );
    console.info(`Weeks closed with their top 10s: ${closed.weeks}.`);
    const counts = await tableCounts(ctx.prisma);
    const empty = counts.filter(([, n]) => n === 0).map(([table]) => table);
    console.info(
      empty.length
        ? `\nTables still without rows: ${empty.join(', ')}.`
        : `\nAll ${counts.length} tables have rows.`,
    );
    if (empty.length) process.exitCode = 1;
    log('Done.');
  } finally {
    await app.close();
  }
}

await main();
