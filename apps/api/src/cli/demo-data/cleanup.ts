import type { StorageService } from '../../storage/storage.service.js';
import { SEASON_NAMES } from './boards.js';
import { DEMO_DOMAIN } from './cast.js';
import type { DemoContext } from './context.js';
import { hubDemoIds } from './hub.js';

/** Append-only tables: their protection is switched off only inside the removal below. */
const PROTECTED = [
  ['xp_events', 'xp_events_append_only'],
  ['audit_logs', 'audit_logs_append_only'],
  ['payment_events', 'payment_events_append_only'],
  ['ledger_entries', 'ledger_entries_append_only'],
  ['ledger_transactions', 'ledger_transactions_append_only'],
  ['ledger_accounts', 'ledger_accounts_append_only'],
] as const;

/** Whether demo data is loaded already. */
export async function demoLoaded(ctx: DemoContext): Promise<boolean> {
  const count = await ctx.prisma.user.count({ where: { email: { endsWith: `@${DEMO_DOMAIN}` } } });
  return count > 0;
}

/**
 * Removes everything an earlier demo load made (and anything done with the demo staff
 * accounts since), so it can be loaded again with today's dates. XP events, the audit
 * log and payment events can't normally be deleted; their triggers are switched off for
 * this one transaction on the local database, and back on before it commits.
 */
export async function removeDemoData(ctx: DemoContext, storage: StorageService) {
  const adults = (
    await ctx.prisma.user.findMany({
      where: { email: { endsWith: `@${DEMO_DOMAIN}` } },
      select: { id: true },
    })
  ).map((u) => u.id);
  const students = (
    await ctx.prisma.parentChildLink.findMany({
      where: { parentId: { in: adults } },
      select: { childId: true },
      distinct: ['childId'],
    })
  ).map((l) => l.childId);
  const seasons = (
    await ctx.prisma.leaderboardSeason.findMany({
      where: { name: { in: [...SEASON_NAMES] }, createdById: { in: adults } },
      select: { id: true },
    })
  ).map((s) => s.id);
  const people = [...students, ...adults];
  const texts = [...people, ...seasons];
  // Phase 2: hackathons staff made, their teams, and the demo school's classes.
  const events = await ctx.prisma.event.findMany({
    where: { createdById: { in: adults } },
    select: { id: true, teams: { select: { id: true } } },
  });
  const eventIds = events.map((e) => e.id);
  const teamIds = events.flatMap((e) => e.teams.map((t) => t.id));
  const schoolIds = (
    await ctx.prisma.school.findMany({
      where: { contactEmail: { endsWith: `@${DEMO_DOMAIN}` } },
      select: { id: true },
    })
  ).map((s) => s.id);
  const classIds = (
    await ctx.prisma.schoolClass.findMany({
      where: { OR: [{ schoolId: { in: schoolIds } }, { teacherId: { in: adults } }] },
      select: { id: true },
    })
  ).map((c) => c.id);

  // Phase 3: the hub's clients, requests, projects, money and payouts.
  const hub = await hubDemoIds(ctx, adults, students);
  const ledgerRefs = [...hub.invoices, ...hub.earnings, ...hub.payouts, ...adults];
  const ledgerOwners = [...hub.orgs, ...hub.projects, ...people];

  // Shipped projects' files first (the database still says where they are).
  let filesRemoved = true;
  for (const prefix of [
    ...hub.deliveries.map((id) => `hub/previews/${id}/`),
    ...hub.intakes.map((id) => `hub/intakes/${id}/`),
  ]) {
    try {
      await storage.deletePrefix(prefix);
    } catch {
      filesRemoved = false;
    }
  }
  for (const id of students) {
    try {
      await storage.deletePrefix(`projects/${id}/`);
    } catch {
      filesRemoved = false;
    }
  }

  await ctx.prisma.$transaction(
    async (tx) => {
      for (const [table, trigger] of PROTECTED) {
        await tx.$executeRawUnsafe(`ALTER TABLE "${table}" DISABLE TRIGGER "${trigger}"`);
      }
      await tx.$executeRaw`DELETE FROM leaderboard_results
        WHERE user_id = ANY(${students}::uuid[]) OR season_id = ANY(${seasons}::uuid[])`;
      await tx.$executeRaw`DELETE FROM leaderboard_seasons WHERE id = ANY(${seasons}::uuid[])`;
      await tx.$executeRaw`UPDATE leaderboard_seasons SET created_by_id = NULL
        WHERE created_by_id = ANY(${adults}::uuid[])`;
      await tx.$executeRaw`UPDATE leaderboard_seasons SET ended_by_id = NULL
        WHERE ended_by_id = ANY(${adults}::uuid[])`;
      await tx.$executeRaw`DELETE FROM xp_events WHERE user_id = ANY(${students}::uuid[])`;
      await tx.$executeRaw`DELETE FROM refunds
        WHERE payment_id IN (SELECT id FROM payments WHERE parent_id = ANY(${adults}::uuid[]))`;
      await tx.$executeRaw`UPDATE refunds SET created_by_id = NULL
        WHERE created_by_id = ANY(${adults}::uuid[])`;
      await tx.$executeRaw`DELETE FROM payment_events
        WHERE parent_id = ANY(${adults}::uuid[]) OR actor_id = ANY(${adults}::uuid[])`;
      await tx.$executeRaw`DELETE FROM invoices WHERE parent_id = ANY(${adults}::uuid[])`;
      await tx.$executeRaw`DELETE FROM payments WHERE parent_id = ANY(${adults}::uuid[])`;
      await tx.$executeRaw`UPDATE payments SET recorded_by_id = NULL
        WHERE recorded_by_id = ANY(${adults}::uuid[])`;
      await tx.$executeRaw`DELETE FROM subscriptions WHERE parent_id = ANY(${adults}::uuid[])`;
      await tx.$executeRaw`DELETE FROM billing_customers WHERE parent_id = ANY(${adults}::uuid[])`;
      await tx.$executeRaw`DELETE FROM premium_grants
        WHERE user_id = ANY(${students}::uuid[]) OR granted_by_id = ANY(${adults}::uuid[])`;
      await tx.$executeRaw`UPDATE premium_grants SET revoked_by_id = NULL
        WHERE revoked_by_id = ANY(${adults}::uuid[])`;
      await tx.$executeRaw`DELETE FROM feedback WHERE user_id = ANY(${people}::uuid[])`;
      // Phase 2: moderation (staff can't be removed while their actions exist), rooms,
      // hackathons, the school, drafts, words and leagues.
      await tx.$executeRaw`DELETE FROM moderation_actions
        WHERE staff_id = ANY(${adults}::uuid[]) OR subject_id = ANY(${people}::uuid[])`;
      await tx.$executeRaw`DELETE FROM chat_reports
        WHERE reporter_id = ANY(${people}::uuid[]) OR subject_id = ANY(${people}::uuid[])`;
      await tx.$executeRaw`DELETE FROM chat_rooms
        WHERE (kind = 'EVENT' AND ref_id = ANY(${eventIds}::text[]))
           OR (kind = 'TEAM' AND ref_id = ANY(${teamIds}::text[]))
           OR (kind = 'CLASS' AND ref_id = ANY(${classIds}::text[]))`;
      await tx.$executeRaw`DELETE FROM events WHERE id = ANY(${eventIds}::uuid[])`;
      await tx.$executeRaw`DELETE FROM schools WHERE id = ANY(${schoolIds}::uuid[])`;
      await tx.$executeRaw`DELETE FROM classes WHERE id = ANY(${classIds}::uuid[])`;
      await tx.$executeRaw`DELETE FROM blocked_terms WHERE created_by_id = ANY(${adults}::uuid[])`;
      await tx.$executeRaw`DELETE FROM content_drafts WHERE edited_by_id = ANY(${adults}::uuid[])`;
      // The demo students' league groups go too, once nobody else is in them.
      const groups = await tx.$queryRaw<{ group_id: string }[]>`
        SELECT DISTINCT group_id FROM league_memberships WHERE user_id = ANY(${students}::uuid[])`;
      await tx.$executeRaw`DELETE FROM league_memberships WHERE user_id = ANY(${students}::uuid[])`;
      await tx.$executeRaw`DELETE FROM league_groups g
        WHERE g.id = ANY(${groups.map((g) => g.group_id)}::uuid[])
          AND NOT EXISTS (SELECT 1 FROM league_memberships m WHERE m.group_id = g.id)`;
      // The hub: the ledger's postings about demo records, then the records.
      await tx.$executeRaw`DELETE FROM ledger_entries WHERE transaction_id IN (
        SELECT id FROM ledger_transactions WHERE ref_id = ANY(${ledgerRefs}::uuid[]))`;
      await tx.$executeRaw`DELETE FROM ledger_transactions WHERE ref_id = ANY(${ledgerRefs}::uuid[])`;
      await tx.$executeRaw`DELETE FROM ledger_accounts a
        WHERE a.owner_key = ANY(${ledgerOwners}::text[])
          AND NOT EXISTS (SELECT 1 FROM ledger_entries e WHERE e.account_id = a.id)`;
      await tx.$executeRaw`DELETE FROM payouts WHERE id = ANY(${hub.payouts}::uuid[])`;
      await tx.$executeRaw`DELETE FROM payout_batches b WHERE created_by_id = ANY(${adults}::uuid[])
        AND NOT EXISTS (SELECT 1 FROM payouts p WHERE p.batch_id = b.id)`;
      await tx.$executeRaw`DELETE FROM payout_accounts WHERE parent_id = ANY(${adults}::uuid[])`;
      await tx.$executeRaw`DELETE FROM hub_earnings WHERE id = ANY(${hub.earnings}::uuid[])`;
      await tx.$executeRaw`DELETE FROM hub_payments WHERE invoice_id = ANY(${hub.invoices}::uuid[])`;
      await tx.$executeRaw`DELETE FROM hub_invoices WHERE id = ANY(${hub.invoices}::uuid[])`;
      await tx.$executeRaw`DELETE FROM chat_rooms
        WHERE kind = 'HUB' AND ref_id = ANY(${hub.projects}::text[])`;
      await tx.$executeRaw`DELETE FROM hub_projects WHERE id = ANY(${hub.projects}::uuid[])`;
      await tx.$executeRaw`DELETE FROM hub_intakes WHERE id = ANY(${hub.intakes}::uuid[])`;
      await tx.$executeRaw`DELETE FROM client_orgs WHERE id = ANY(${hub.orgs}::uuid[])`;
      await tx.$executeRaw`DELETE FROM audit_logs
        WHERE actor_id = ANY(${people}::uuid[]) OR entity_id = ANY(${[...texts, ...hub.projects]}::text[])`;
      // Children first (their parents' links go with them), then the adults.
      await tx.$executeRaw`DELETE FROM users WHERE id = ANY(${students}::uuid[])`;
      await tx.$executeRaw`DELETE FROM users WHERE id = ANY(${adults}::uuid[])`;
      await tx.$executeRaw`DELETE FROM waitlist_entries WHERE email LIKE ${`%@${DEMO_DOMAIN}`}`;
      await tx.$executeRaw`DELETE FROM app_crashes WHERE app_version LIKE '%-demo%'`;
      for (const [table, trigger] of PROTECTED) {
        await tx.$executeRawUnsafe(`ALTER TABLE "${table}" ENABLE TRIGGER "${trigger}"`);
      }
    },
    { timeout: 120_000 },
  );
  return { students: students.length, adults: adults.length, filesRemoved };
}
