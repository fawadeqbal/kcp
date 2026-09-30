import type { Prisma } from '@kcp/database';
import { BADGES, type BadgeCriteria } from '@kcp/shared';
import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import type { AuthUser } from '../permissions/auth-user.js';
import type { BadgesDto } from './dto/progress.dto.js';
import { levelFor } from './xp-rules.js';

type Db = PrismaService | Prisma.TransactionClient;

/** What a student has done so far: the numbers badges are earned with. */
export interface BadgeStats {
  challengesPassed: number;
  lessonsCompleted: number;
  projectsShipped: number;
  pythonPassed: number;
  longestStreak: number;
  level: number;
  feedbackDone: number;
  completedModules: Set<string>;
}

/** Whether stats meet a badge's criteria (manual and weekly badges are given elsewhere). */
export function meetsCriteria(criteria: BadgeCriteria, stats: BadgeStats): boolean {
  switch (criteria.type) {
    case 'challenges_passed':
      return stats.challengesPassed >= criteria.min;
    case 'lessons_completed':
      return stats.lessonsCompleted >= criteria.min;
    case 'projects_shipped':
      return stats.projectsShipped >= criteria.min;
    case 'python_passed':
      return stats.pythonPassed >= criteria.min;
    case 'streak_days':
      return stats.longestStreak >= criteria.min;
    case 'level':
      return stats.level >= criteria.min;
    case 'feedback_done':
      return stats.feedbackDone >= criteria.min;
    case 'module_completed':
      return stats.completedModules.has(criteria.moduleId);
    case 'weekly_top':
    case 'manual':
      return false;
  }
}

/**
 * Gives students the badges they have earned. Badges come from what is recorded
 * (passed challenges, completed lessons, shipped projects, streaks, levels), so
 * checking again is always safe and catches up students who earned them earlier.
 */
@Injectable()
export class BadgesService {
  private readonly logger = new Logger(BadgesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async stats(userId: string, db: Db = this.prisma): Promise<BadgeStats> {
    const [challenges, lessons, projects, python, streak, profile, feedback, modules, levels] =
      await Promise.all([
        db.submission.findMany({
          where: { userId, passed: true },
          select: { challengeId: true },
          distinct: ['challengeId'],
        }),
        db.lessonProgress.count({ where: { userId, status: 'COMPLETED' } }),
        db.portfolioItem.count({ where: { userId } }),
        db.submission.findMany({
          where: { userId, passed: true, challenge: { type: 'PYTHON' } },
          select: { challengeId: true },
          distinct: ['challengeId'],
        }),
        db.streak.findUnique({ where: { userId }, select: { longest: true } }),
        db.studentProfile.findUnique({ where: { userId }, select: { xpTotal: true } }),
        db.feedback.count({ where: { userId, status: 'DONE' } }),
        db.$queryRaw<{ module_id: string }[]>`
          SELECT l.module_id
          FROM lessons l
          LEFT JOIN lesson_progress p
            ON p.lesson_id = l.id AND p.user_id = ${userId}::uuid AND p.status = 'COMPLETED'
          WHERE l.is_active
          GROUP BY l.module_id
          HAVING COUNT(*) = COUNT(p.lesson_id)`,
        db.level.findMany({ orderBy: { minXp: 'asc' } }),
      ]);
    return {
      challengesPassed: challenges.length,
      lessonsCompleted: lessons,
      projectsShipped: projects,
      pythonPassed: python.length,
      longestStreak: streak?.longest ?? 0,
      level: levelFor(profile?.xpTotal ?? 0, levels).number,
      feedbackDone: feedback,
      completedModules: new Set(modules.map((m) => m.module_id)),
    };
  }

  /** Awards every badge the student has newly earned. Returns their keys. */
  async check(userId: string): Promise<string[]> {
    try {
      const student = await this.prisma.studentProfile.findUnique({
        where: { userId },
        select: { userId: true, user: { select: { status: true } } },
      });
      if (!student || student.user.status === 'DELETED') return [];
      const [stats, owned, active] = await Promise.all([
        this.stats(userId),
        this.prisma.userBadge.findMany({ where: { userId }, select: { badgeKey: true } }),
        this.prisma.badge.findMany({ where: { isActive: true }, select: { key: true } }),
      ]);
      const have = new Set(owned.map((b) => b.badgeKey));
      const activeKeys = new Set(active.map((b) => b.key));
      const earned = BADGES.filter(
        (badge) =>
          activeKeys.has(badge.key) && !have.has(badge.key) && meetsCriteria(badge.criteria, stats),
      ).map((badge) => badge.key);
      return this.give(userId, earned);
    } catch (error) {
      // Badges never fail the request that earned them; the next check catches up.
      this.logger.warn(`Could not check badges: ${(error as Error).message}`);
      return [];
    }
  }

  /** Records badges (ones the student already has are skipped). Returns the new ones. */
  async give(
    userId: string,
    keys: string[],
    by?: { staffId: string; reason: string },
  ): Promise<string[]> {
    if (keys.length === 0) return [];
    const created: string[] = [];
    for (const badgeKey of keys) {
      const result = await this.prisma.userBadge.createMany({
        data: [{ userId, badgeKey, awardedById: by?.staffId, reason: by?.reason }],
        skipDuplicates: true,
      });
      if (result.count) created.push(badgeKey);
    }
    for (const badgeKey of created) {
      await this.notifications.notify([userId], 'badge_earned', { badgeKey });
    }
    return created;
  }

  private assertStudent(user: AuthUser) {
    if (user.kind !== 'STUDENT') {
      throw new ForbiddenException({
        error: 'STUDENTS_ONLY',
        message: 'Only student accounts earn badges.',
      });
    }
  }

  /** Every active badge, with the student's own. */
  async forStudent(user: AuthUser): Promise<BadgesDto> {
    this.assertStudent(user);
    await this.check(user.id);
    const [catalog, owned] = await Promise.all([
      this.prisma.badge.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }),
      this.prisma.userBadge.findMany({ where: { userId: user.id } }),
    ]);
    const byKey = new Map(owned.map((b) => [b.badgeKey, b]));
    return {
      badges: catalog.map((badge) => {
        const mine = byKey.get(badge.key);
        return {
          key: badge.key,
          category: badge.category,
          icon: badge.icon,
          earned: Boolean(mine),
          awardedAt: mine?.awardedAt ?? null,
          seen: mine ? mine.seenAt !== null : true,
        };
      }),
    };
  }

  async markSeen(user: AuthUser, keys: string[]) {
    this.assertStudent(user);
    await this.prisma.userBadge.updateMany({
      where: { userId: user.id, badgeKey: { in: keys }, seenAt: null },
      data: { seenAt: new Date() },
    });
  }
}
