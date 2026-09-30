import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import type { Redis } from 'ioredis';
import { PrismaService } from '../database/prisma.service.js';
import { REDIS } from '../redis/redis.constants.js';
import type { MetricsDto, MetricsRowDto } from './dto/metrics.dto.js';

const DAY_MS = 24 * 60 * 60 * 1000;

const dayString = (date: Date) => date.toISOString().slice(0, 10);
const startOfDay = (day: string) => new Date(`${day}T00:00:00Z`);

type Counts = Omit<MetricsRowDto, 'day' | 'countryCode'>;

/**
 * The five numbers from the scope, per day and country: sign-ups, first project
 * finished, weekly active students, paying parents (a plan running at the end of the
 * day) and cancellations (plans cancelled that day). A nightly job stores them in metrics_daily; the
 * admin dashboard reads that table and refreshes today's numbers on demand.
 */
@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  /** Works out one UTC day's numbers per country and stores them. */
  async compute(day: string): Promise<number> {
    const start = startOfDay(day);
    const end = new Date(start.getTime() + DAY_MS);
    const weekStart = new Date(end.getTime() - 7 * DAY_MS);
    const [signUps, firstProjects, weeklyActive, paying, cancellations] = await Promise.all([
      this.prisma.$queryRaw<{ country_code: string; n: bigint }[]>`
        SELECT p.country_code, COUNT(*) AS n
        FROM (
          SELECT l.parent_id, MIN(c.created_at) AS first_child
          FROM parent_child_links l JOIN users c ON c.id = l.child_id
          GROUP BY l.parent_id
        ) f
        JOIN users p ON p.id = f.parent_id
        WHERE f.first_child >= ${start} AND f.first_child < ${end} AND p.country_code IS NOT NULL
        GROUP BY p.country_code`,
      this.prisma.$queryRaw<{ country_code: string; n: bigint }[]>`
        SELECT u.country_code, COUNT(*) AS n
        FROM (SELECT user_id, MIN(created_at) AS first_ship FROM portfolio_items GROUP BY user_id) f
        JOIN users u ON u.id = f.user_id
        WHERE f.first_ship >= ${start} AND f.first_ship < ${end} AND u.country_code IS NOT NULL
        GROUP BY u.country_code`,
      this.prisma.$queryRaw<{ country_code: string; n: bigint }[]>`
        SELECT u.country_code, COUNT(DISTINCT x.user_id) AS n
        FROM xp_events x JOIN users u ON u.id = x.user_id
        WHERE x.created_at >= ${weekStart} AND x.created_at < ${end}
          AND x.amount > 0 AND u.country_code IS NOT NULL
        GROUP BY u.country_code`,
      // Families whose plan was running at the end of the day. (A plan's row holds its
      // current period, so recomputing a day long past is approximate.)
      this.prisma.$queryRaw<{ country_code: string; n: bigint }[]>`
        SELECT u.country_code, COUNT(DISTINCT s.parent_id) AS n
        FROM subscriptions s JOIN users u ON u.id = s.parent_id
        WHERE s.current_period_start < ${end} AND s.current_period_end >= ${end}
          AND (s.ended_at IS NULL OR s.ended_at >= ${end})
          AND u.country_code IS NOT NULL
        GROUP BY u.country_code`,
      // Families who cancelled that day (the plan runs on until its period ends).
      this.prisma.$queryRaw<{ country_code: string; n: bigint }[]>`
        SELECT u.country_code, COUNT(DISTINCT s.parent_id) AS n
        FROM subscriptions s JOIN users u ON u.id = s.parent_id
        WHERE s.canceled_at >= ${start} AND s.canceled_at < ${end} AND u.country_code IS NOT NULL
        GROUP BY u.country_code`,
    ]);
    const byCountry = new Map<string, Counts>();
    const row = (code: string) => {
      let counts = byCountry.get(code);
      if (!counts) {
        counts = {
          signUps: 0,
          firstProjects: 0,
          weeklyActive: 0,
          payingParents: 0,
          cancellations: 0,
        };
        byCountry.set(code, counts);
      }
      return counts;
    };
    for (const r of signUps) row(r.country_code).signUps = Number(r.n);
    for (const r of firstProjects) row(r.country_code).firstProjects = Number(r.n);
    for (const r of weeklyActive) row(r.country_code).weeklyActive = Number(r.n);
    for (const r of paying) row(r.country_code).payingParents = Number(r.n);
    for (const r of cancellations) row(r.country_code).cancellations = Number(r.n);

    await this.prisma.$transaction(async (tx) => {
      // One writer per day at a time (two admins opening the page, or the nightly job).
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`metrics:${day}`}))`;
      await tx.metricsDaily.deleteMany({ where: { day: start } });
      if (byCountry.size) {
        await tx.metricsDaily.createMany({
          data: [...byCountry].map(([countryCode, counts]) => ({
            day: start,
            countryCode,
            ...counts,
          })),
        });
      }
    });
    return byCountry.size;
  }

  /** Every night at 00:15 UTC: yesterday's final numbers (once, even with several servers). */
  @Cron('15 0 * * *', { name: 'metrics-daily', timeZone: 'UTC' })
  async nightly(): Promise<void> {
    const yesterday = dayString(new Date(Date.now() - DAY_MS));
    try {
      if (this.redis.status === 'wait') await this.redis.connect();
      const lock = await this.redis.set(`metrics:${yesterday}`, '1', 'EX', 6 * 60 * 60, 'NX');
      if (!lock) return;
      await this.compute(yesterday);
      this.logger.log(`Daily numbers stored for ${yesterday}`);
    } catch (error) {
      this.logger.error(`Daily numbers failed for ${yesterday}: ${(error as Error).message}`);
    }
  }

  /** The last `days` days, recomputing today (and, with `refresh`, every day shown). */
  async read(days: number, refresh = false): Promise<MetricsDto> {
    const today = dayString(new Date());
    const from = dayString(new Date(Date.now() - (days - 1) * DAY_MS));
    if (refresh) {
      for (let i = days - 1; i >= 0; i--)
        await this.compute(dayString(new Date(Date.now() - i * DAY_MS)));
    } else {
      await this.compute(today);
    }
    const rows = await this.prisma.metricsDaily.findMany({
      where: { day: { gte: startOfDay(from), lte: startOfDay(today) } },
      orderBy: [{ day: 'asc' }, { countryCode: 'asc' }],
    });
    const latest = rows.filter((r) => dayString(r.day) === today).map((r) => r.computedAt);
    return {
      from,
      to: today,
      countries: [...new Set(rows.map((r) => r.countryCode))].toSorted(),
      rows: rows.map((r) => ({
        day: dayString(r.day),
        countryCode: r.countryCode,
        signUps: r.signUps,
        firstProjects: r.firstProjects,
        weeklyActive: r.weeklyActive,
        payingParents: r.payingParents,
        cancellations: r.cancellations,
      })),
      computedAt: latest[0] ?? null,
    };
  }
}
