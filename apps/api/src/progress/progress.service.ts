import { randomUUID } from 'node:crypto';
import type { Prisma, XpSource } from '@kcp/database';
import {
  AREA_BOARD_MIN_STUDENTS,
  type BoardPeriod,
  type BoardScope,
  DAILY_GOAL_XP,
  DAILY_XP_CAP,
  MAX_STREAK_FREEZES,
  STREAK_FREEZE_EVERY,
} from '@kcp/shared';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service.js';
import type { RequestContext } from '../common/request-context.js';
import { PrismaService } from '../database/prisma.service.js';
import type { AuthUser } from '../permissions/auth-user.js';
import { BadgesService } from './badges.service.js';
import type { LeaderboardDto, ProgressDto } from './dto/progress.dto.js';
import { LeaderboardService, type PeriodRef } from './leaderboard.service.js';
import {
  freezesNeeded,
  levelFor,
  localDay,
  meetGoal,
  type StreakState,
  visibleStreak,
  weekOfDay,
  xpWithinCap,
} from './xp-rules.js';

/** An XP gain recorded inside a transaction, to settle once it has committed. */
export interface XpAward {
  userId: string;
  /** XP actually given (0 when the daily cap was already reached). */
  amount: number;
  /** True when the cap cut the gain short. */
  capped: boolean;
  /** The student's date it counts for. */
  day: string;
}

const LEVELS_TTL_MS = 10 * 60 * 1000;
const STREAK_RULES = { freezeEvery: STREAK_FREEZE_EVERY, maxFreezes: MAX_STREAK_FREEZES };

const asDate = (day: string) => new Date(`${day}T00:00:00Z`);
const asDay = (date: Date | null) => (date ? date.toISOString().slice(0, 10) : null);

/**
 * XP, levels, streaks and badges. Every gain is an xp_events row, given once per
 * challenge, lesson or project and never more than DAILY_XP_CAP a day (in the student's
 * time zone). Meeting the daily goal keeps the streak going; freezes cover missed days.
 */
@Injectable()
export class ProgressService {
  private readonly logger = new Logger(ProgressService.name);
  private levelsCache: { at: number; levels: { number: number; minXp: number }[] } | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly leaderboards: LeaderboardService,
    private readonly badges: BadgesService,
    private readonly audit: AuditService,
  ) {}

  async levels() {
    if (!this.levelsCache || Date.now() - this.levelsCache.at > LEVELS_TTL_MS) {
      const levels = await this.prisma.level.findMany({ orderBy: { minXp: 'asc' } });
      this.levelsCache = { at: Date.now(), levels };
    }
    return this.levelsCache.levels;
  }

  async levelFor(xp: number) {
    return levelFor(xp, await this.levels());
  }

  /**
   * Records XP inside the caller's transaction. Returns null when there is nothing to
   * give (no XP, or already given for this). Call settle() after the transaction.
   */
  async award(
    tx: Prisma.TransactionClient,
    userId: string,
    source: XpSource,
    sourceId: string,
    amount: number,
    now = new Date(),
  ): Promise<XpAward | null> {
    if (amount <= 0) return null;
    // One award at a time per student, so the daily cap can't be overshot.
    const locked = await tx.$queryRaw<{ user_id: string }[]>`
      SELECT user_id FROM student_profiles WHERE user_id = ${userId}::uuid FOR UPDATE`;
    if (locked.length === 0) return null;
    const already = await tx.xpEvent.findUnique({
      where: { userId_source_sourceId: { userId, source, sourceId } },
      select: { id: true },
    });
    if (already) return null;

    const user = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: { country: { select: { timezone: true } } },
    });
    const today = localDay(now, user.country?.timezone ?? 'UTC');
    const earned = await tx.xpEvent.aggregate({
      where: { userId, day: asDate(today), amount: { gt: 0 } },
      _sum: { amount: true },
    });
    const earnedToday = earned._sum.amount ?? 0;
    const give = xpWithinCap(amount, earnedToday, DAILY_XP_CAP);
    const award = { userId, amount: give, capped: give < amount, day: today };
    if (give === 0) return award;

    await tx.xpEvent.create({
      data: { userId, amount: give, source, sourceId, day: asDate(today), createdAt: now },
    });
    await tx.studentProfile.update({
      where: { userId },
      data: { xpTotal: { increment: give } },
    });

    const streak = await tx.streak.findUnique({ where: { userId } });
    const goal = streak?.dailyGoalXp ?? DAILY_GOAL_XP;
    if (earnedToday + give >= goal && asDay(streak?.lastGoalDay ?? null) !== today) {
      const next = meetGoal(this.streakState(streak), today, STREAK_RULES);
      const data = {
        current: next.current,
        longest: next.longest,
        lastGoalDay: asDate(today),
        freezes: next.freezes,
      };
      await tx.streak.upsert({ where: { userId }, create: { userId, ...data }, update: data });
    }
    return award;
  }

  /**
   * After the XP transaction committed: updates the leaderboards and gives any badges
   * the student has now earned. Never fails the request: boards are a cache, and
   * badges are checked again later. Returns the new badges, to celebrate them.
   */
  async settle(userId: string, awards: (XpAward | null)[]): Promise<string[]> {
    for (const award of awards) {
      if (!award || award.amount <= 0) continue;
      try {
        await this.leaderboards.add(award.userId, award.day);
      } catch (error) {
        this.logger.warn(`Could not update the leaderboards: ${(error as Error).message}`);
      }
    }
    return this.badges.check(userId);
  }

  /**
   * Takes XP away (a cheater's, for example), always with a written reason. Recorded
   * as a negative XP event, so the history shows what happened; totals never go below
   * zero, and streaks are left alone.
   */
  async removeXp(
    userId: string,
    amount: number,
    reason: string,
    staff: AuthUser,
    ctx: RequestContext,
  ) {
    const result = await this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ xp_total: number }[]>`
        SELECT xp_total FROM student_profiles WHERE user_id = ${userId}::uuid FOR UPDATE`;
      const current = locked[0]?.xp_total;
      if (current === undefined) throw new NotFoundException('Student not found.');
      if (amount > current) {
        throw new BadRequestException({
          error: 'XP_REMOVAL_TOO_LARGE',
          message: `The student only has ${current} XP.`,
        });
      }
      const user = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: { country: { select: { timezone: true } } },
      });
      const today = localDay(new Date(), user.country?.timezone ?? 'UTC');
      const event = await tx.xpEvent.create({
        data: {
          userId,
          amount: -amount,
          source: 'ADMIN',
          sourceId: `removal:${randomUUID()}`,
          day: asDate(today),
          reason,
        },
      });
      await tx.studentProfile.update({
        where: { userId },
        data: { xpTotal: { decrement: amount } },
      });
      await this.audit.record(
        {
          actor: { id: staff.id, roleKey: staff.roleKey },
          action: 'xp.remove',
          entityType: 'User',
          entityId: userId,
          before: { xpTotal: current },
          after: { xpTotal: current - amount, removed: amount, reason, eventId: event.id },
          context: ctx,
        },
        tx,
      );
      return { xpTotal: current - amount };
    });
    await this.leaderboards.refreshStudent(userId);
    return result;
  }

  private streakState(
    streak: { current: number; longest: number; lastGoalDay: Date | null; freezes: number } | null,
  ): StreakState {
    return {
      current: streak?.current ?? 0,
      longest: streak?.longest ?? 0,
      lastGoalDay: asDay(streak?.lastGoalDay ?? null),
      freezes: streak?.freezes ?? 0,
    };
  }

  /** The streak as a parent or student sees it today. */
  streakToday(
    streak: { current: number; longest: number; lastGoalDay: Date | null; freezes: number } | null,
    timeZone: string,
    now = new Date(),
  ) {
    const state = this.streakState(streak);
    const today = localDay(now, timeZone);
    return {
      current: visibleStreak(state, today),
      longest: state.longest,
      doneToday: state.lastGoalDay === today,
      freezes: state.freezes,
      freezesNeeded: freezesNeeded(state, today),
    };
  }

  private assertStudent(user: AuthUser) {
    if (user.kind !== 'STUDENT') {
      throw new ForbiddenException({
        error: 'STUDENTS_ONLY',
        message: 'Only student accounts have XP and streaks.',
      });
    }
  }

  private async viewer(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        countryCode: true,
        regionId: true,
        cityId: true,
        country: { select: { timezone: true } },
        region: { select: { names: true } },
        city: { select: { names: true } },
        studentProfile: { select: { xpTotal: true, showOnPublicBoards: true } },
        streak: true,
      },
    });
  }

  /** XP, level, today's goal, streak, badges and this week's ranks, for the student's home. */
  async summary(user: AuthUser, now = new Date()): Promise<ProgressDto> {
    this.assertStudent(user);
    // Catches up badges earned before they existed (and ones a failed check missed).
    await this.badges.check(user.id);
    const student = await this.viewer(user.id);
    const timeZone = student.country?.timezone ?? 'UTC';
    const today = localDay(now, timeZone);
    const week = weekOfDay(today);
    const weekRef = this.leaderboards.weekRef(week);
    const [todaySum, weekSum, badgeCounts, season] = await Promise.all([
      this.prisma.xpEvent.aggregate({
        where: { userId: user.id, day: asDate(today), amount: { gt: 0 } },
        _sum: { amount: true },
      }),
      this.prisma.xpEvent.aggregate({
        where: { userId: user.id, day: { gte: asDate(week.startDay), lt: asDate(week.endDay) } },
        _sum: { amount: true },
      }),
      Promise.all([
        this.prisma.userBadge.count({ where: { userId: user.id } }),
        this.prisma.badge.count({ where: { isActive: true } }),
        this.prisma.userBadge.count({ where: { userId: user.id, seenAt: null } }),
      ]),
      this.leaderboards.activeSeason(),
    ]);
    const xpTotal = student.studentProfile?.xpTotal ?? 0;
    const todayXp = todaySum._sum.amount ?? 0;
    const hidden = !student.studentProfile?.showOnPublicBoards;
    const ranks = { global: null, country: null, region: null, city: null } as Record<
      BoardScope,
      number | null
    >;
    if (!hidden) {
      try {
        const scopes: [BoardScope, string | null][] = [
          ['global', null],
          ['country', student.countryCode],
          ['region', student.regionId],
          ['city', student.cityId],
        ];
        await Promise.all(
          scopes.map(async ([scope, scopeId]) => {
            if (!(await this.leaderboards.available(scope, scopeId))) return;
            ranks[scope] = await this.leaderboards.placeOf(user.id, weekRef, scope, scopeId);
          }),
        );
      } catch (error) {
        this.logger.warn(`Could not read the leaderboards: ${(error as Error).message}`);
      }
    }
    const [earned, total, unseen] = badgeCounts;
    return {
      xpTotal,
      level: await this.levelFor(xpTotal),
      today: {
        xp: todayXp,
        goalXp: student.streak?.dailyGoalXp ?? DAILY_GOAL_XP,
        capXp: DAILY_XP_CAP,
        capReached: todayXp >= DAILY_XP_CAP,
      },
      streak: this.streakToday(student.streak, timeZone, now),
      week: {
        key: week.key,
        startDay: week.startDay,
        endDay: week.endDay,
        xp: weekSum._sum.amount ?? 0,
        hidden,
        globalRank: ranks.global,
        countryRank: ranks.country,
        regionRank: ranks.region,
        cityRank: ranks.city,
        countryCode: student.countryCode,
      },
      season: season?.season
        ? {
            id: season.season.id,
            name: season.season.name,
            startDay: season.startDay ?? '',
            endDay: season.endDay ?? null,
          }
        : null,
      badges: { earned, total, unseen },
    };
  }

  /** A board as a student sees it: the top 50, and their own place. */
  async board(
    scope: BoardScope,
    period: BoardPeriod,
    user: AuthUser,
    language: string,
    now = new Date(),
  ): Promise<LeaderboardDto> {
    this.assertStudent(user);
    const student = await this.viewer(user.id);
    const today = localDay(now, student.country?.timezone ?? 'UTC');
    const ref = await this.leaderboards.periodFor(period, today);
    const scopeId =
      scope === 'country'
        ? student.countryCode
        : scope === 'region'
          ? student.regionId
          : scope === 'city'
            ? student.cityId
            : null;
    const names = (
      scope === 'region' ? student.region?.names : scope === 'city' ? student.city?.names : null
    ) as Record<string, string> | null | undefined;
    const hidden = !student.studentProfile?.showOnPublicBoards;
    const base = {
      scope,
      period,
      countryCode: student.countryCode,
      areaName: names ? (names[language] ?? names['en'] ?? null) : null,
      minStudents: AREA_BOARD_MIN_STUDENTS,
      week:
        period === 'week' && ref
          ? { key: ref.key, startDay: ref.startDay!, endDay: ref.endDay! }
          : null,
      season: ref?.season
        ? {
            id: ref.season.id,
            name: ref.season.name,
            startDay: ref.startDay ?? '',
            endDay: ref.endDay ?? null,
          }
        : null,
    };
    // No season running, or no region/city set: nothing to show.
    if (!ref || (scope !== 'global' && !scopeId)) {
      return { ...base, available: false, entries: [], me: { rank: null, xp: 0, hidden } };
    }
    const [available, myXp] = await Promise.all([
      this.leaderboards.available(scope, scopeId),
      this.myTotal(user.id, ref, student.studentProfile?.xpTotal ?? 0),
    ]);
    if (!available) {
      return { ...base, available, entries: [], me: { rank: null, xp: myXp, hidden } };
    }
    const entries = await this.leaderboards.top(ref, scope, scopeId);
    const listed = entries.find((entry) => entry.userId === user.id);
    const rank = hidden
      ? null
      : (listed?.rank ?? (await this.leaderboards.rankOf(user.id, ref, scope, scopeId)));
    return {
      ...base,
      available,
      entries: entries.map(({ userId, ...entry }) => ({ ...entry, isMe: userId === user.id })),
      me: { rank, xp: myXp, hidden },
    };
  }

  private async myTotal(userId: string, ref: PeriodRef, xpTotal: number) {
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
}
