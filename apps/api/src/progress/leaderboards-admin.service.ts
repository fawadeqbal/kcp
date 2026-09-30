import {
  AREA_BOARD_MIN_STUDENTS,
  BADGES,
  type BoardPeriod,
  type BoardScope,
  LEADERBOARD_SIZE,
} from '@kcp/shared';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service.js';
import type { RequestContext } from '../common/request-context.js';
import { PrismaService } from '../database/prisma.service.js';
import type { AuthUser } from '../permissions/auth-user.js';
import { BadgesService } from './badges.service.js';
import type {
  AdminBoardDto,
  ResultListDto,
  SeasonAdminDto,
  StudentXpDto,
} from './dto/progress.dto.js';
import { LeaderboardService, type PeriodRef } from './leaderboard.service.js';
import { addDays, weekOfDay } from './xp-rules.js';

const asDate = (day: string) => new Date(`${day}T00:00:00Z`);
const asDay = (date: Date) => date.toISOString().slice(0, 10);
const utcToday = () => new Date().toISOString().slice(0, 10);

/** The admin panel's "Leaderboards and seasons": boards, seasons, results, XP and badges. */
@Injectable()
export class LeaderboardsAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leaderboards: LeaderboardService,
    private readonly badges: BadgesService,
    private readonly audit: AuditService,
  ) {}

  /** A board as staff see it (usernames included; small areas too, marked as such). */
  async board(
    scope: BoardScope,
    period: BoardPeriod,
    scopeId: string | null,
  ): Promise<AdminBoardDto> {
    const ref = await this.leaderboards.periodFor(period, utcToday());
    const areaSize =
      scope === 'region' || scope === 'city'
        ? scopeId
          ? await this.leaderboards.areaSize(scope, scopeId)
          : 0
        : null;
    const base = {
      scope,
      period,
      scopeId,
      periodKey: ref?.key ?? null,
      areaSize,
      minStudents: AREA_BOARD_MIN_STUDENTS,
    };
    if (!ref || (scope !== 'global' && !scopeId)) return { ...base, entries: [] };
    const entries = await this.leaderboards.top(ref, scope, scopeId, LEADERBOARD_SIZE * 2);
    const users = await this.prisma.user.findMany({
      where: { id: { in: entries.map((e) => e.userId) } },
      select: { id: true, username: true },
    });
    const usernames = new Map(users.map((u) => [u.id, u.username]));
    return {
      ...base,
      entries: entries.map((e) => ({
        rank: e.rank,
        userId: e.userId,
        nickname: e.nickname,
        username: usernames.get(e.userId) ?? null,
        xp: e.xp,
      })),
    };
  }

  private seasonDto(season: {
    id: string;
    name: string;
    startDay: Date;
    endDay: Date | null;
    status: 'ACTIVE' | 'ENDED';
    endedAt: Date | null;
    createdAt: Date;
  }): SeasonAdminDto {
    return {
      id: season.id,
      name: season.name,
      startDay: asDay(season.startDay),
      endDay: season.endDay ? asDay(season.endDay) : null,
      status: season.status,
      endedAt: season.endedAt,
      createdAt: season.createdAt,
    };
  }

  async seasons() {
    const rows = await this.prisma.leaderboardSeason.findMany({
      orderBy: { startDay: 'desc' },
      take: 20,
    });
    return { seasons: rows.map((s) => this.seasonDto(s)) };
  }

  async startSeason(
    name: string,
    startDay: string | undefined,
    endDay: string | undefined,
    staff: AuthUser,
    ctx: RequestContext,
  ): Promise<SeasonAdminDto> {
    const start = startDay ?? utcToday();
    if (endDay && endDay <= start) {
      throw new BadRequestException({
        error: 'INVALID_SEASON_DATES',
        message: 'The season must end after it starts.',
      });
    }
    const active = await this.prisma.leaderboardSeason.findFirst({ where: { status: 'ACTIVE' } });
    if (active) {
      throw new ConflictException({
        error: 'SEASON_ACTIVE',
        message: 'A season is running already. End it first.',
      });
    }
    const season = await this.prisma.$transaction(async (tx) => {
      const created = await tx.leaderboardSeason.create({
        data: {
          name: name.trim(),
          startDay: asDate(start),
          endDay: endDay ? asDate(endDay) : null,
          createdById: staff.id,
        },
      });
      await this.audit.record(
        {
          actor: { id: staff.id, roleKey: staff.roleKey },
          action: 'season.start',
          entityType: 'LeaderboardSeason',
          entityId: created.id,
          after: { name: created.name, startDay: start, endDay: endDay ?? null },
          context: ctx,
        },
        tx,
      );
      return created;
    });
    this.leaderboards.seasonChanged();
    return this.seasonDto(season);
  }

  /**
   * Ends a season: its final top 10s are stored (global, every active country, and
   * areas big enough for a board), and its boards leave Redis. `staff` is null when
   * the planned end date passed (the leaderboard job).
   */
  async endSeason(id: string, staff: AuthUser | null, ctx?: RequestContext) {
    const season = await this.prisma.leaderboardSeason.findUnique({ where: { id } });
    if (!season) throw new NotFoundException('Season not found.');
    if (season.status === 'ENDED') {
      throw new ConflictException({ error: 'SEASON_ENDED', message: 'This season has ended.' });
    }
    // Ending early counts today in full; a planned end stays as planned.
    const tomorrow = addDays(utcToday(), 1);
    const endDay =
      season.endDay && asDay(season.endDay) <= tomorrow ? asDay(season.endDay) : tomorrow;
    const ref: PeriodRef = {
      period: 'season',
      key: season.id,
      startDay: asDay(season.startDay),
      endDay,
      season: { id: season.id, name: season.name },
    };
    await this.snapshotEverywhere(ref);
    const ended = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.leaderboardSeason.update({
        where: { id },
        data: {
          status: 'ENDED',
          endDay: asDate(endDay),
          endedAt: new Date(),
          endedById: staff?.id ?? null,
        },
      });
      await this.audit.record(
        {
          actor: staff ? { id: staff.id, roleKey: staff.roleKey } : null,
          action: 'season.end',
          entityType: 'LeaderboardSeason',
          entityId: id,
          after: { endDay, planned: staff === null },
          context: ctx,
        },
        tx,
      );
      return updated;
    });
    this.leaderboards.seasonChanged();
    await this.leaderboards.drop(ref);
    return this.seasonDto(ended);
  }

  /** Stores a finished period's top 10: global, each active country, and big-enough areas. */
  async snapshotEverywhere(ref: PeriodRef) {
    await this.leaderboards.snapshot(ref, 'global', null);
    const countries = await this.prisma.country.findMany({
      where: { isActive: true },
      select: { code: true },
    });
    for (const { code } of countries) {
      await this.leaderboards.snapshot(ref, 'country', code);
      const areas = await this.leaderboards.areasWithBoards(code);
      for (const id of areas.regionIds) await this.leaderboards.snapshot(ref, 'region', id);
      for (const id of areas.cityIds) await this.leaderboards.snapshot(ref, 'city', id);
    }
  }

  /** Recent final results: the last weeks' (or seasons') global and country top 10s. */
  async results(period: 'WEEK' | 'SEASON'): Promise<ResultListDto> {
    const keys = await this.prisma.leaderboardResult.findMany({
      where: { period, scope: { in: ['GLOBAL', 'COUNTRY'] } },
      distinct: ['periodKey'],
      orderBy: { createdAt: 'desc' },
      select: { periodKey: true },
      take: 6,
    });
    const rows = await this.prisma.leaderboardResult.findMany({
      where: {
        period,
        periodKey: { in: keys.map((k) => k.periodKey) },
        scope: { in: ['GLOBAL', 'COUNTRY'] },
      },
      orderBy: [{ periodKey: 'desc' }, { scope: 'asc' }, { scopeId: 'asc' }, { rank: 'asc' }],
      include: {
        user: { select: { studentProfile: { select: { nickname: true } } } },
        season: { select: { name: true } },
      },
    });
    const boards = new Map<string, ResultListDto['boards'][number]>();
    for (const row of rows) {
      const id = `${row.periodKey}|${row.scope}|${row.scopeId}`;
      const board = boards.get(id) ?? {
        period: row.period,
        periodKey: row.periodKey,
        seasonName: row.season?.name ?? null,
        scope: row.scope,
        scopeId: row.scopeId,
        entries: [],
      };
      board.entries.push({
        rank: row.rank,
        userId: row.userId,
        nickname: row.user.studentProfile?.nickname ?? null,
        xp: row.xp,
      });
      boards.set(id, board);
    }
    return { boards: [...boards.values()] };
  }

  private async assertStudent(userId: string) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { userId },
      select: { xpTotal: true, user: { select: { country: { select: { timezone: true } } } } },
    });
    if (!student) throw new NotFoundException('Student not found.');
    return student;
  }

  /** A student's XP history (newest first), for looking into a cheating report. */
  async studentXp(userId: string): Promise<StudentXpDto> {
    const student = await this.assertStudent(userId);
    const week = weekOfDay(utcToday());
    const [events, weekSum, badges] = await Promise.all([
      this.prisma.xpEvent.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      this.prisma.xpEvent.aggregate({
        where: { userId, day: { gte: asDate(week.startDay), lt: asDate(week.endDay) } },
        _sum: { amount: true },
      }),
      this.prisma.userBadge.findMany({ where: { userId }, orderBy: { awardedAt: 'asc' } }),
    ]);
    const manual = new Set(BADGES.filter((b) => b.criteria.type === 'manual').map((b) => b.key));
    return {
      xpTotal: student.xpTotal,
      weekXp: weekSum._sum.amount ?? 0,
      badges: badges.map((b) => ({
        key: b.badgeKey,
        awardedAt: b.awardedAt,
        manual: manual.has(b.badgeKey),
        reason: b.reason,
      })),
      events: events.map((e) => ({
        id: e.id,
        amount: e.amount,
        source: e.source,
        sourceId: e.sourceId,
        day: asDay(e.day),
        reason: e.reason,
        createdAt: e.createdAt,
      })),
    };
  }

  /** Gives a staff-awarded badge (like "Helper") with a reason. */
  async giveBadge(
    userId: string,
    badgeKey: string,
    reason: string,
    staff: AuthUser,
    ctx: RequestContext,
  ) {
    await this.assertStudent(userId);
    const badge = BADGES.find((b) => b.key === badgeKey);
    if (!badge || badge.criteria.type !== 'manual') {
      throw new BadRequestException({
        error: 'BADGE_NOT_MANUAL',
        message: 'Only badges given by staff can be given here.',
      });
    }
    const given = await this.badges.give(userId, [badgeKey], { staffId: staff.id, reason });
    if (given.length === 0) {
      throw new ConflictException({
        error: 'BADGE_ALREADY_EARNED',
        message: 'The student has this badge already.',
      });
    }
    await this.audit.record({
      actor: { id: staff.id, roleKey: staff.roleKey },
      action: 'badge.give',
      entityType: 'User',
      entityId: userId,
      after: { badgeKey, reason },
      context: ctx,
    });
  }

  /** Takes back a staff-awarded badge, with a reason. */
  async takeBadge(
    userId: string,
    badgeKey: string,
    reason: string,
    staff: AuthUser,
    ctx: RequestContext,
  ) {
    const badge = BADGES.find((b) => b.key === badgeKey);
    if (!badge || badge.criteria.type !== 'manual') {
      throw new BadRequestException({
        error: 'BADGE_NOT_MANUAL',
        message: 'Only badges given by staff can be taken back.',
      });
    }
    const removed = await this.prisma.userBadge.deleteMany({ where: { userId, badgeKey } });
    if (removed.count === 0) throw new NotFoundException('The student does not have this badge.');
    await this.audit.record({
      actor: { id: staff.id, roleKey: staff.roleKey },
      action: 'badge.take',
      entityType: 'User',
      entityId: userId,
      after: { badgeKey, reason },
      context: ctx,
    });
  }
}
