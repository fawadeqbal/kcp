import { BADGES } from '@kcp/shared';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import type { Redis } from 'ioredis';
import { PrismaService } from '../database/prisma.service.js';
import { REDIS } from '../redis/redis.constants.js';
import { BadgesService } from './badges.service.js';
import { LeaderboardService, type PeriodRef } from './leaderboard.service.js';
import { LeaderboardsAdminService } from './leaderboards-admin.service.js';
import { addDays, localDay, weekOfDay } from './xp-rules.js';

const CLOSED_KEEP_SECONDS = 60 * 24 * 60 * 60;
const JOB_LOCK_SECONDS = 10 * 60;
const WEEKLY_TOP = BADGES.filter((b) => b.criteria.type === 'weekly_top');

/**
 * Scheduled leaderboard work (each run takes a Redis lock, so with several API
 * servers only one does it):
 * - every 15 minutes: close weeks that ended at Monday 00:00 in each country's time
 *   zone (store the final top 10s, give "Top 10 of the week" badges), and end seasons
 *   whose planned end has passed;
 * - every night: rebuild every current board from PostgreSQL.
 * New weeks need no reset: boards are keyed by week, so a new week starts empty.
 */
@Injectable()
export class LeaderboardJobsService {
  private readonly logger = new Logger(LeaderboardJobsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly leaderboards: LeaderboardService,
    private readonly admin: LeaderboardsAdminService,
    private readonly badges: BadgesService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  private async locked(name: string, run: () => Promise<void>) {
    try {
      if (this.redis.status === 'wait') await this.redis.connect();
      if (!(await this.redis.set(`lbjob:${name}`, '1', 'EX', JOB_LOCK_SECONDS, 'NX'))) return;
      try {
        await run();
      } finally {
        await this.redis.del(`lbjob:${name}`);
      }
    } catch (error) {
      this.logger.error(`Leaderboard job "${name}" failed: ${(error as Error).message}`);
    }
  }

  @Cron('*/15 * * * *', { name: 'leaderboards-close', timeZone: 'UTC' })
  async closeScheduled() {
    await this.locked('close', () => this.closeFinished());
  }

  @Cron('30 2 * * *', { name: 'leaderboards-rebuild', timeZone: 'UTC' })
  async rebuildScheduled() {
    await this.locked('rebuild', async () => {
      const count = await this.rebuildAll();
      this.logger.log(`Rebuilt ${count} leaderboard periods from PostgreSQL`);
    });
  }

  /** Closes finished weeks (per country, then global) and seasons past their end. */
  async closeFinished(now = new Date()) {
    const countries = await this.prisma.country.findMany({
      where: { isActive: true },
      select: { code: true, timezone: true },
    });
    const lastWeeks: string[] = [];
    for (const country of countries) {
      const thisWeek = weekOfDay(localDay(now, country.timezone));
      const lastWeek = weekOfDay(addDays(thisWeek.startDay, -1));
      lastWeeks.push(lastWeek.key);
      const marker = `lbclosed:${lastWeek.key}:${country.code}`;
      if (await this.redis.exists(marker)) continue;
      const ref = this.leaderboards.weekRef(lastWeek);
      const results = await this.leaderboards.snapshot(ref, 'country', country.code);
      const areas = await this.leaderboards.areasWithBoards(country.code);
      for (const id of areas.regionIds) await this.leaderboards.snapshot(ref, 'region', id);
      for (const id of areas.cityIds) await this.leaderboards.snapshot(ref, 'city', id);
      for (const badge of WEEKLY_TOP) {
        if (badge.criteria.type !== 'weekly_top') continue;
        const { rank } = badge.criteria;
        for (const result of results.filter((r) => r.rank <= rank)) {
          await this.badges.give(result.userId, [badge.key]);
        }
      }
      await this.redis.set(marker, '1', 'EX', CLOSED_KEEP_SECONDS);
    }
    // The global week closes once every active country has finished it.
    if (lastWeeks.length) {
      const oldest = lastWeeks.toSorted()[0]!;
      const allClosed = await Promise.all(
        countries.map((c) => this.redis.exists(`lbclosed:${oldest}:${c.code}`)),
      );
      const marker = `lbclosed:${oldest}:global`;
      if (allClosed.every(Boolean) && !(await this.redis.exists(marker))) {
        const [year, week] = oldest.split('-W');
        const monday = this.mondayOf(Number(year), Number(week));
        await this.leaderboards.snapshot(
          this.leaderboards.weekRef(weekOfDay(monday)),
          'global',
          null,
        );
        await this.redis.set(marker, '1', 'EX', CLOSED_KEEP_SECONDS);
      }
    }
    // Seasons whose planned end has passed everywhere.
    const today = now.toISOString().slice(0, 10);
    // (endDay is the day after the last one; countries are all at or east of UTC.)
    const due = await this.prisma.leaderboardSeason.findMany({
      where: { status: 'ACTIVE', endDay: { lte: new Date(`${today}T00:00:00Z`) } },
    });
    for (const season of due) {
      await this.admin.endSeason(season.id, null);
      this.logger.log(`Season "${season.name}" ended as planned`);
    }
  }

  /** The Monday of an ISO week. */
  private mondayOf(year: number, week: number): string {
    // January 4th is always in week 1.
    const jan4 = `${year}-01-04`;
    return addDays(weekOfDay(jan4).startDay, (week - 1) * 7);
  }

  /** Rebuilds the current weeks (every active country's), the season and all time. */
  async rebuildAll(now = new Date()): Promise<number> {
    const countries = await this.prisma.country.findMany({
      where: { isActive: true },
      select: { timezone: true },
    });
    const weeks = new Map<string, PeriodRef>();
    for (const timezone of ['UTC', ...countries.map((c) => c.timezone)]) {
      const week = weekOfDay(localDay(now, timezone));
      weeks.set(week.key, this.leaderboards.weekRef(week));
    }
    const season = await this.leaderboards.activeSeason();
    const refs = [...weeks.values(), ...(season ? [season] : []), this.leaderboards.allRef];
    let count = 0;
    for (const ref of refs) if (await this.leaderboards.rebuild(ref)) count++;
    return count;
  }
}
