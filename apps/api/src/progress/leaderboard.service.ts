import { randomBytes } from 'node:crypto';
import { Prisma } from '@kcp/database';
import {
  AREA_BOARD_MIN_STUDENTS,
  BOARD_RESULTS_SIZE,
  type BoardPeriod,
  type BoardScope,
  LEADERBOARD_SIZE,
} from '@kcp/shared';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { PrismaService } from '../database/prisma.service.js';
import { REDIS } from '../redis/redis.constants.js';
import { addDays, localDay, type Week, weekOfDay } from './xp-rules.js';

export type { BoardPeriod, BoardScope } from '@kcp/shared';

/** One board period: a week, a season, or all time. Days are student-local dates. */
export interface PeriodRef {
  period: BoardPeriod;
  /** "2026-W40", a season ID, or "all". */
  key: string;
  /** First day counted (weeks and seasons). */
  startDay?: string;
  /** The day after the last day counted; null for a season without a planned end. */
  endDay?: string | null;
  /** Seasons only. */
  season?: { id: string; name: string };
}

export interface BoardEntry {
  rank: number;
  userId: string;
  nickname: string;
  avatarKey: string;
  xp: number;
}

/** A student's place on the boards: where they live, and whether they may be shown. */
interface Placement {
  countryCode: string | null;
  regionId: string | null;
  cityId: string | null;
  eligible: boolean;
  xpTotal: number;
  timezone: string;
}

interface TotalRow {
  user_id: string;
  country_code: string | null;
  region_id: string | null;
  city_id: string | null;
  xp: number;
}

/** Week boards are kept a few weeks after they end, then Redis forgets them. */
const WEEK_KEEP_SECONDS = 5 * 7 * 24 * 60 * 60;
/** Season and all-time boards are rebuilt every night, so this is only a safety net. */
const LONG_KEEP_SECONDS = 3 * 24 * 60 * 60;
const REBUILD_LOCK_SECONDS = 60;
const AREA_SIZE_TTL_SECONDS = 10 * 60;
const SEASON_CACHE_MS = 30 * 1000;
const PERIOD_CODES: Record<BoardPeriod, string> = { week: 'w', season: 's', all: 'a' };
const GLOBAL_ID = '-';

const asDate = (day: string) => new Date(`${day}T00:00:00Z`);
const asDay = (date: Date) => date.toISOString().slice(0, 10);

/**
 * Leaderboards in Redis sorted sets: for this week, the current season and all time;
 * global, per country, per region and per city. Only students whose parent switched on
 * public leaderboards are on them, shown by nickname and avatar only. Region and city
 * boards only appear once enough students live there (AREA_BOARD_MIN_STUDENTS).
 *
 * Weeks follow each student's own dates (xp_events.day), so every board resets at
 * Monday 00:00 in the student's time zone. Redis is a cache: every board can be rebuilt
 * from PostgreSQL, and is, every night.
 */
@Injectable()
export class LeaderboardService {
  private readonly logger = new Logger(LeaderboardService.name);
  private seasonCache: { at: number; season: PeriodRef | null } | null = null;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  // ── Periods ──────────────────────────────────────────────────────────────

  weekRef(week: Week): PeriodRef {
    return { period: 'week', key: week.key, startDay: week.startDay, endDay: week.endDay };
  }

  readonly allRef: PeriodRef = { period: 'all', key: 'all' };

  /** The active season, if staff started one (cached briefly). */
  async activeSeason(): Promise<PeriodRef | null> {
    if (this.seasonCache && Date.now() - this.seasonCache.at < SEASON_CACHE_MS) {
      return this.seasonCache.season;
    }
    const season = await this.prisma.leaderboardSeason.findFirst({ where: { status: 'ACTIVE' } });
    const ref: PeriodRef | null = season
      ? {
          period: 'season',
          key: season.id,
          startDay: asDay(season.startDay),
          endDay: season.endDay ? asDay(season.endDay) : null,
          season: { id: season.id, name: season.name },
        }
      : null;
    this.seasonCache = { at: Date.now(), season: ref };
    return ref;
  }

  /** Forget the cached season (after staff start or end one). */
  seasonChanged() {
    this.seasonCache = null;
  }

  /** The period a viewer sees today: their week, the active season, or all time. */
  async periodFor(period: BoardPeriod, today: string): Promise<PeriodRef | null> {
    if (period === 'week') return this.weekRef(weekOfDay(today));
    if (period === 'all') return this.allRef;
    return this.activeSeason();
  }

  private inRange(ref: PeriodRef, day: string) {
    if (ref.period === 'all') return true;
    return day >= (ref.startDay ?? '') && (!ref.endDay || day < ref.endDay);
  }

  // ── Keys ─────────────────────────────────────────────────────────────────

  private prefix(ref: PeriodRef) {
    return `lb:${PERIOD_CODES[ref.period]}:${ref.key}`;
  }

  private key(ref: PeriodRef, scope: BoardScope, scopeId: string | null) {
    return `${this.prefix(ref)}:${scope}:${scope === 'global' ? GLOBAL_ID : scopeId}`;
  }

  /** The boards a student with this placement belongs on. */
  private keysFor(ref: PeriodRef, place: Pick<Placement, 'countryCode' | 'regionId' | 'cityId'>) {
    return [
      this.key(ref, 'global', null),
      ...(place.countryCode ? [this.key(ref, 'country', place.countryCode)] : []),
      ...(place.regionId ? [this.key(ref, 'region', place.regionId)] : []),
      ...(place.cityId ? [this.key(ref, 'city', place.cityId)] : []),
    ];
  }

  private keepSeconds(ref: PeriodRef) {
    return ref.period === 'week' ? WEEK_KEEP_SECONDS : LONG_KEEP_SECONDS;
  }

  private async connect() {
    if (this.redis.status === 'wait') await this.redis.connect();
  }

  /** Keys matching a pattern, with SCAN (KEYS would block Redis). */
  private async scan(pattern: string): Promise<string[]> {
    const keys: string[] = [];
    let cursor = '0';
    do {
      const [next, batch] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 500);
      cursor = next;
      keys.push(...batch);
    } while (cursor !== '0');
    return keys;
  }

  /** Board keys of a period (not its markers). */
  private async boardKeys(ref: PeriodRef) {
    const markers = new Set([`${this.prefix(ref)}:built`, `${this.prefix(ref)}:rebuilding`]);
    return (await this.scan(`${this.prefix(ref)}:*`)).filter((key) => !markers.has(key));
  }

  // ── Totals from PostgreSQL ───────────────────────────────────────────────

  /**
   * Totals per student for a period, for students allowed on public boards. With a
   * scope, only that board (for results); with a user, only them.
   */
  private async totals(
    ref: PeriodRef,
    filter: { scope?: BoardScope; scopeId?: string | null; userId?: string; limit?: number } = {},
  ): Promise<TotalRow[]> {
    const where: Prisma.Sql[] = [
      Prisma.sql`u.status = 'ACTIVE'`,
      Prisma.sql`sp.show_on_public_boards`,
    ];
    if (filter.userId) where.push(Prisma.sql`u.id = ${filter.userId}::uuid`);
    if (filter.scope === 'country') where.push(Prisma.sql`u.country_code = ${filter.scopeId}`);
    if (filter.scope === 'region') where.push(Prisma.sql`u.region_id = ${filter.scopeId}::uuid`);
    if (filter.scope === 'city') where.push(Prisma.sql`u.city_id = ${filter.scopeId}::uuid`);
    const conditions = Prisma.join(where, ' AND ');
    const limit = filter.limit ? Prisma.sql`LIMIT ${filter.limit}` : Prisma.empty;
    if (ref.period === 'all') {
      return this.prisma.$queryRaw<TotalRow[]>`
        SELECT u.id AS user_id, u.country_code, u.region_id::text AS region_id,
               u.city_id::text AS city_id, sp.xp_total AS xp
        FROM student_profiles sp JOIN users u ON u.id = sp.user_id
        WHERE ${conditions} AND sp.xp_total > 0
        ORDER BY sp.xp_total DESC, u.id DESC ${limit}`;
    }
    const end = ref.endDay ? Prisma.sql`AND x.day < ${asDate(ref.endDay)}` : Prisma.empty;
    return this.prisma.$queryRaw<TotalRow[]>`
      SELECT u.id AS user_id, u.country_code, u.region_id::text AS region_id,
             u.city_id::text AS city_id, SUM(x.amount)::int AS xp
      FROM xp_events x
      JOIN users u ON u.id = x.user_id
      JOIN student_profiles sp ON sp.user_id = x.user_id
      WHERE ${conditions} AND x.day >= ${asDate(ref.startDay ?? '1970-01-01')} ${end}
      GROUP BY u.id, u.country_code, u.region_id, u.city_id
      HAVING SUM(x.amount) > 0
      ORDER BY SUM(x.amount) DESC, u.id DESC ${limit}`;
  }

  /** One student's total for a period, whether or not they're on public boards. */
  private async totalOf(userId: string, ref: PeriodRef, xpTotal: number): Promise<number> {
    if (ref.period === 'all') return xpTotal;
    const sum = await this.prisma.xpEvent.aggregate({
      where: {
        userId,
        day: {
          gte: asDate(ref.startDay ?? '1970-01-01'),
          ...(ref.endDay ? { lt: asDate(ref.endDay) } : {}),
        },
      },
      _sum: { amount: true },
    });
    return sum._sum.amount ?? 0;
  }

  private async placement(userId: string): Promise<Placement | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        status: true,
        countryCode: true,
        regionId: true,
        cityId: true,
        country: { select: { timezone: true } },
        studentProfile: { select: { showOnPublicBoards: true, xpTotal: true } },
      },
    });
    if (!user?.studentProfile) return null;
    return {
      countryCode: user.countryCode,
      regionId: user.regionId,
      cityId: user.cityId,
      eligible: user.status === 'ACTIVE' && user.studentProfile.showOnPublicBoards,
      xpTotal: user.studentProfile.xpTotal,
      timezone: user.country?.timezone ?? 'UTC',
    };
  }

  // ── Building ─────────────────────────────────────────────────────────────

  /** Builds a period's boards from PostgreSQL if Redis doesn't have them. True if it did. */
  async ensureBuilt(ref: PeriodRef): Promise<boolean> {
    await this.connect();
    if (await this.redis.exists(`${this.prefix(ref)}:built`)) return false;
    return this.rebuild(ref);
  }

  /**
   * Replaces a period's boards with totals from PostgreSQL. New boards are written
   * under temporary names and renamed into place, so readers never see a half-built
   * board. Returns false when another server is rebuilding it already.
   */
  async rebuild(ref: PeriodRef): Promise<boolean> {
    await this.connect();
    const lock = `${this.prefix(ref)}:rebuilding`;
    if (!(await this.redis.set(lock, '1', 'EX', REBUILD_LOCK_SECONDS, 'NX'))) return false;
    try {
      const rows = await this.totals(ref);
      const tmp = `lbtmp:${randomBytes(6).toString('hex')}:`;
      const boards = new Map<string, [number, string][]>();
      for (const row of rows) {
        for (const key of this.keysFor(ref, {
          countryCode: row.country_code,
          regionId: row.region_id,
          cityId: row.city_id,
        })) {
          const board = boards.get(key) ?? [];
          board.push([row.xp, row.user_id]);
          boards.set(key, board);
        }
      }
      const write = this.redis.multi();
      for (const [key, members] of boards) {
        for (let i = 0; i < members.length; i += 500) {
          write.zadd(`${tmp}${key}`, ...members.slice(i, i + 500).flat());
        }
      }
      await write.exec();
      const old = await this.boardKeys(ref);
      const swap = this.redis.multi();
      for (const key of old) if (!boards.has(key)) swap.del(key);
      for (const key of boards.keys()) {
        swap.rename(`${tmp}${key}`, key);
        swap.expire(key, this.keepSeconds(ref));
      }
      swap.set(`${this.prefix(ref)}:built`, '1', 'EX', this.keepSeconds(ref));
      await swap.exec();
      return true;
    } finally {
      await this.redis.del(lock);
    }
  }

  private async waitForRebuild(ref: PeriodRef) {
    const lock = `${this.prefix(ref)}:rebuilding`;
    for (let i = 0; i < 50 && (await this.redis.exists(lock)); i++) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  /**
   * Puts a student's totals on the boards after XP was recorded on `day` (once its
   * transaction committed). Totals come from PostgreSQL, so running it twice, or next
   * to a rebuild, never counts XP twice; `GT` keeps a slower, older total from
   * replacing a newer one.
   */
  async add(userId: string, day: string) {
    const place = await this.placement(userId);
    if (!place?.eligible) return;
    const season = await this.activeSeason();
    const refs = [
      this.weekRef(weekOfDay(day)),
      ...(season && this.inRange(season, day) ? [season] : []),
      this.allRef,
    ];
    for (const ref of refs) {
      // A rebuild done just now read the totals after this XP was committed.
      if (await this.ensureBuilt(ref)) continue;
      await this.waitForRebuild(ref);
      const xp = await this.totalOf(userId, ref, place.xpTotal);
      if (xp <= 0) continue;
      const multi = this.redis.multi();
      for (const key of this.keysFor(ref, place)) {
        multi.zadd(key, 'GT', xp, userId);
        multi.expire(key, this.keepSeconds(ref));
      }
      await multi.exec();
    }
  }

  /**
   * Puts one student in the right place on the current boards after something
   * changed: consent switched on or off, region or city changed, account suspended or
   * deleted, or XP removed by staff. Never fails: boards are a cache.
   */
  async refreshStudent(userId: string) {
    try {
      const place = await this.placement(userId);
      const today = localDay(new Date(), place?.timezone ?? 'UTC');
      const thisWeek = weekOfDay(today);
      const season = await this.activeSeason();
      const refs = [
        this.weekRef(thisWeek),
        // Viewers further west may still be looking at last week.
        this.weekRef(weekOfDay(addDays(thisWeek.startDay, -1))),
        ...(season ? [season] : []),
        this.allRef,
      ];
      for (const ref of refs) {
        if (await this.ensureBuilt(ref)) continue;
        const multi = this.redis.multi();
        for (const key of await this.boardKeys(ref)) multi.zrem(key, userId);
        if (place?.eligible) {
          const xp = await this.totalOf(userId, ref, place.xpTotal);
          if (xp > 0) {
            for (const key of this.keysFor(ref, place)) {
              multi.zadd(key, xp, userId);
              multi.expire(key, this.keepSeconds(ref));
            }
          }
        }
        await multi.exec();
      }
    } catch (error) {
      this.logger.warn(`Could not update the leaderboards: ${(error as Error).message}`);
    }
  }

  // ── Reading ──────────────────────────────────────────────────────────────

  /**
   * The top of a board, with nickname and avatar only. Anyone no longer allowed on
   * public boards is left out, even if Redis hasn't caught up yet.
   */
  async top(ref: PeriodRef, scope: BoardScope, scopeId: string | null, size = LEADERBOARD_SIZE) {
    if (scope !== 'global' && !scopeId) return [] as BoardEntry[];
    await this.ensureBuilt(ref);
    const raw = await this.redis.zrevrange(
      this.key(ref, scope, scopeId),
      0,
      size * 2 - 1,
      'WITHSCORES',
    );
    const scores: { userId: string; xp: number }[] = [];
    for (let i = 0; i < raw.length; i += 2) {
      scores.push({ userId: raw[i]!, xp: Number(raw[i + 1]) });
    }
    const profiles = await this.prisma.studentProfile.findMany({
      where: {
        userId: { in: scores.map((s) => s.userId) },
        showOnPublicBoards: true,
        user: { status: 'ACTIVE' },
      },
      select: { userId: true, nickname: true, avatarKey: true },
    });
    const byId = new Map(profiles.map((p) => [p.userId, p]));
    const entries: BoardEntry[] = [];
    for (const score of scores) {
      const profile = byId.get(score.userId);
      if (!profile || score.xp <= 0) continue;
      entries.push({
        rank: entries.length + 1,
        userId: score.userId,
        nickname: profile.nickname,
        avatarKey: profile.avatarKey,
        xp: score.xp,
      });
      if (entries.length === size) break;
    }
    return entries;
  }

  /** A student's place on a board (1 = first), or null when they're not on it. */
  async rankOf(userId: string, ref: PeriodRef, scope: BoardScope, scopeId: string | null) {
    if (scope !== 'global' && !scopeId) return null;
    await this.ensureBuilt(ref);
    const rank = await this.redis.zrevrank(this.key(ref, scope, scopeId), userId);
    return rank === null ? null : rank + 1;
  }

  /**
   * A student's place as the board shows it: their rank in the top list (which leaves
   * out anyone no longer allowed on it), or their place in Redis further down.
   */
  async placeOf(userId: string, ref: PeriodRef, scope: BoardScope, scopeId: string | null) {
    const entries = await this.top(ref, scope, scopeId);
    const listed = entries.find((entry) => entry.userId === userId);
    return listed ? listed.rank : this.rankOf(userId, ref, scope, scopeId);
  }

  /** Students on public boards who live in a region or city (cached for a few minutes). */
  async areaSize(scope: 'region' | 'city', id: string): Promise<number> {
    await this.connect();
    const cacheKey = `lbarea:${scope}:${id}`;
    const cached = await this.redis.get(cacheKey);
    if (cached !== null) return Number(cached);
    const count = await this.prisma.user.count({
      where: {
        status: 'ACTIVE',
        ...(scope === 'region' ? { regionId: id } : { cityId: id }),
        studentProfile: { showOnPublicBoards: true },
      },
    });
    await this.redis.set(cacheKey, String(count), 'EX', AREA_SIZE_TTL_SECONDS);
    return count;
  }

  /** Whether a board may be shown: region and city boards need enough students. */
  async available(scope: BoardScope, scopeId: string | null): Promise<boolean> {
    if (scope === 'global') return true;
    if (!scopeId) return false;
    if (scope === 'country') return true;
    return (await this.areaSize(scope, scopeId)) >= AREA_BOARD_MIN_STUDENTS;
  }

  // ── Results ──────────────────────────────────────────────────────────────

  /**
   * Stores the final top of a board once its week or season is over, from PostgreSQL
   * (not Redis). Safe to run twice. Returns the places stored.
   */
  async snapshot(ref: PeriodRef, scope: BoardScope, scopeId: string | null) {
    if (ref.period === 'all') return [];
    const rows = await this.totals(ref, { scope, scopeId, limit: BOARD_RESULTS_SIZE });
    const results = rows.map((row, index) => ({
      period: ref.period === 'week' ? ('WEEK' as const) : ('SEASON' as const),
      periodKey: ref.key,
      seasonId: ref.season?.id ?? null,
      scope: scope.toUpperCase() as 'GLOBAL' | 'COUNTRY' | 'REGION' | 'CITY',
      scopeId: scopeId ?? '',
      rank: index + 1,
      userId: row.user_id,
      xp: row.xp,
    }));
    if (results.length) {
      await this.prisma.leaderboardResult.createMany({ data: results, skipDuplicates: true });
    }
    return results;
  }

  /** Regions and cities of a country with enough students for their own board. */
  async areasWithBoards(countryCode: string) {
    const [regions, cities] = await Promise.all([
      this.prisma.user.groupBy({
        by: ['regionId'],
        where: {
          countryCode,
          status: 'ACTIVE',
          regionId: { not: null },
          studentProfile: { showOnPublicBoards: true },
        },
        _count: { _all: true },
      }),
      this.prisma.user.groupBy({
        by: ['cityId'],
        where: {
          countryCode,
          status: 'ACTIVE',
          cityId: { not: null },
          studentProfile: { showOnPublicBoards: true },
        },
        _count: { _all: true },
      }),
    ]);
    return {
      regionIds: regions
        .filter((r) => r._count._all >= AREA_BOARD_MIN_STUDENTS && r.regionId)
        .map((r) => r.regionId!),
      cityIds: cities
        .filter((c) => c._count._all >= AREA_BOARD_MIN_STUDENTS && c.cityId)
        .map((c) => c.cityId!),
    };
  }

  /** Drops a period's boards from Redis (a season that ended). */
  async drop(ref: PeriodRef) {
    await this.connect();
    const keys = await this.scan(`${this.prefix(ref)}:*`);
    if (keys.length) await this.redis.del(...keys);
  }
}
