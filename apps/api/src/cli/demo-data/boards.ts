import type { LeaderboardJobsService } from '../../progress/leaderboard-jobs.service.js';
import type { LeaderboardService, PeriodRef } from '../../progress/leaderboard.service.js';
import type { LeaderboardsAdminService } from '../../progress/leaderboards-admin.service.js';
import { addDays, localDay, weekOfDay } from '../../progress/xp-rules.js';
import type { DemoContext, DemoStaff } from './context.js';
import { asDate, asDay, HISTORY_DAYS } from './timeline.js';

export interface BoardServices {
  leaderboards: LeaderboardService;
  jobs: LeaderboardJobsService;
  admin: LeaderboardsAdminService;
}

export interface DemoSeasons {
  past: { id: string; name: string; startDay: string; endDay: string; endedAt: Date };
  /** Null when a season of the team's own was running already (it is left as it is). */
  current: { id: string; name: string } | null;
  runningAlready: string | null;
}

export const SEASON_NAMES = ['Pilot season 1', 'Pilot season 2'] as const;

/**
 * Two seasons: one that ended three weeks ago (its final top 10s are stored once the
 * XP is in) and the one running now, both started by the super admin.
 */
export async function createSeasons(
  ctx: DemoContext,
  staff: DemoStaff[],
  services: BoardServices,
): Promise<DemoSeasons> {
  const creator = staff.find((s) => s.role === 'super_admin') ?? staff[0]!;
  const startDay = weekOfDay(ctx.clock.day(HISTORY_DAYS)).startDay;
  const endDay = weekOfDay(ctx.clock.day(21)).startDay;
  const createdAt = ctx.clock.at(addDays(startDay, -2), 9, 30);
  const endedAt = ctx.clock.at(endDay, 0, 20);
  const past = await ctx.prisma.leaderboardSeason.create({
    data: {
      name: SEASON_NAMES[0],
      startDay: asDate(startDay),
      endDay: asDate(endDay),
      status: 'ENDED',
      createdById: creator.id,
      endedAt,
      createdAt,
      updatedAt: endedAt,
    },
  });
  await ctx.prisma.auditLog.createMany({
    data: [
      {
        actorId: creator.id,
        actorRole: creator.role,
        action: 'season.start',
        entityType: 'LeaderboardSeason',
        entityId: past.id,
        after: { name: past.name, startDay, endDay },
        createdAt,
      },
      {
        action: 'season.end',
        entityType: 'LeaderboardSeason',
        entityId: past.id,
        after: { endDay, planned: true },
        createdAt: endedAt,
      },
    ],
  });

  const running = await ctx.prisma.leaderboardSeason.findFirst({ where: { status: 'ACTIVE' } });
  let current: DemoSeasons['current'] = null;
  if (!running) {
    const start = endDay;
    const end = addDays(start, 70);
    const startedAt = ctx.clock.at(addDays(start, -1), 10, 5);
    const season = await ctx.prisma.leaderboardSeason.create({
      data: {
        name: SEASON_NAMES[1],
        startDay: asDate(start),
        endDay: asDate(end),
        createdById: creator.id,
        createdAt: startedAt,
        updatedAt: startedAt,
      },
    });
    await ctx.prisma.auditLog.create({
      data: {
        actorId: creator.id,
        actorRole: creator.role,
        action: 'season.start',
        entityType: 'LeaderboardSeason',
        entityId: season.id,
        after: { name: season.name, startDay: start, endDay: end },
        createdAt: startedAt,
      },
    });
    current = { id: season.id, name: season.name };
  }
  services.leaderboards.seasonChanged();
  return {
    past: { id: past.id, name: past.name, startDay, endDay, endedAt },
    current,
    runningAlready: running?.name ?? null,
  };
}

/** Keys matching a pattern (SCAN, so Redis isn't blocked). */
async function scanKeys(ctx: DemoContext, pattern: string): Promise<string[]> {
  if (ctx.redis.status === 'wait') await ctx.redis.connect();
  const keys: string[] = [];
  let cursor = '0';
  do {
    const [next, batch] = await ctx.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 500);
    cursor = next;
    keys.push(...batch);
  } while (cursor !== '0');
  return keys;
}

/**
 * Once every XP gain is in: the ended season's final results, every finished week
 * closed as the Monday job does it ("Top 10 of the week" badges included, dated to that
 * Monday), and the live boards rebuilt in Redis.
 */
export async function finishBoards(
  ctx: DemoContext,
  services: BoardServices,
  seasons: DemoSeasons,
) {
  const { past } = seasons;
  const seasonRef: PeriodRef = {
    period: 'season',
    key: past.id,
    startDay: past.startDay,
    endDay: past.endDay,
    season: { id: past.id, name: past.name },
  };
  await services.admin.snapshotEverywhere(seasonRef);
  await ctx.prisma.leaderboardResult.updateMany({
    where: { seasonId: past.id },
    data: { createdAt: past.endedAt },
  });

  // Weeks: each Monday closes the week before it.
  const thisMonday = weekOfDay(ctx.clock.today).startDay;
  const mondays: string[] = [];
  for (
    let monday = addDays(weekOfDay(ctx.clock.day(HISTORY_DAYS)).startDay, 7);
    monday <= thisMonday;
    monday = addDays(monday, 7)
  ) {
    mondays.push(monday);
  }
  const weekKeys = mondays.map((monday) => weekOfDay(addDays(monday, -1)).key);
  // Closed before the demo data existed? Close them again with it.
  await ctx.prisma.leaderboardResult.deleteMany({
    where: { period: 'WEEK', periodKey: { in: weekKeys } },
  });
  const markers = (
    await Promise.all(weekKeys.map((key) => scanKeys(ctx, `lbclosed:${key}:*`)))
  ).flat();
  if (markers.length) await ctx.redis.del(...markers);

  let weeks = 0;
  for (const monday of mondays) {
    const at = ctx.clock.at(monday, 3);
    if (at.getTime() > ctx.clock.now.getTime()) continue;
    const since = new Date(Date.now() - 1000);
    await services.jobs.closeFinished(at);
    const key = weekOfDay(addDays(monday, -1)).key;
    await ctx.prisma.leaderboardResult.updateMany({
      where: { period: 'WEEK', periodKey: key },
      data: { createdAt: at },
    });
    await ctx.prisma.userBadge.updateMany({
      where: { badgeKey: 'weekly-top-10', awardedAt: { gte: since } },
      data: { awardedAt: at },
    });
    await ctx.prisma.notification.updateMany({
      where: {
        type: 'badge_earned',
        createdAt: { gte: since },
        data: { path: ['badgeKey'], equals: 'weekly-top-10' },
      },
      data: { createdAt: at },
    });
    weeks++;
  }

  // The boards students see now: this week, last week, the season and all time.
  await services.jobs.rebuildAll();
  const zones = await ctx.prisma.country.findMany({
    where: { isActive: true },
    select: { timezone: true },
  });
  const lastWeeks = new Set(
    ['UTC', ...zones.map((z) => z.timezone)].map(
      (zone) => weekOfDay(addDays(weekOfDay(localDay(ctx.clock.now, zone)).startDay, -1)).startDay,
    ),
  );
  for (const monday of lastWeeks) {
    await services.leaderboards.rebuild(services.leaderboards.weekRef(weekOfDay(monday)));
  }
  // Area sizes are cached for a few minutes: forget them, so city boards show at once.
  const areas = await scanKeys(ctx, 'lbarea:*');
  if (areas.length) await ctx.redis.del(...areas);
  return { weeks, seasonResultsDay: asDay(past.endedAt) };
}
