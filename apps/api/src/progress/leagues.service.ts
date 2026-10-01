import type { Prisma } from '@kcp/database';
import {
  LEAGUE_GROUP_SIZE,
  LEAGUE_PROMOTE,
  LEAGUE_RELEGATE,
  LEAGUE_RELEGATE_MIN_GROUP,
  LEAGUE_TIERS,
  leagueLevelBand,
  leagueOutcome,
} from '@kcp/shared';
import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import type { AuthUser } from '../permissions/auth-user.js';
import type { LeagueDto, LeagueStandingDto } from './dto/leagues.dto.js';
import { localDay, weekOfDay } from './xp-rules.js';

const tierKey = (tier: number) =>
  LEAGUE_TIERS[Math.max(0, Math.min(tier, LEAGUE_TIERS.length - 1))]!;

/**
 * Leagues: each week, students compete on XP in groups of about 30 of the same league
 * (and similar levels). They join a group with the first XP they earn that week; when
 * the week is over everywhere (Monday 00:00 UTC), the top of each group moves up a
 * league and the bottom moves down (leagueOutcome in @kcp/shared).
 *
 * Other students show by nickname and avatar only when their parent allows public
 * boards (or they are friends); otherwise as "A player".
 */
@Injectable()
export class LeaguesService {
  private readonly logger = new Logger(LeaguesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Inside an XP transaction (the student's profile row is locked): adds the XP to the
   * student's league week, joining a group with the first XP of the week. Negative
   * amounts (XP taken away) lower the week's XP, never below zero.
   */
  async addXp(
    tx: Prisma.TransactionClient,
    student: { userId: string; tier: number; level: number },
    day: string,
    amount: number,
    now = new Date(),
  ): Promise<void> {
    if (amount === 0) return;
    const weekKey = weekOfDay(day).key;
    if (amount < 0) {
      await tx.$executeRaw`
        UPDATE league_memberships SET xp = GREATEST(0, xp + ${amount}), updated_at = now()
        WHERE user_id = ${student.userId}::uuid AND week_key = ${weekKey}`;
      return;
    }
    const updated = await tx.leagueMembership.updateMany({
      where: { userId: student.userId, weekKey },
      data: { xp: { increment: amount }, lastXpAt: now },
    });
    if (updated.count > 0) return;

    const tier = Math.max(0, Math.min(student.tier, LEAGUE_TIERS.length - 1));
    const levelBand = leagueLevelBand(student.level);
    // The oldest group with room; groups another join is filling are skipped, not waited for.
    const open = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM league_groups
      WHERE week_key = ${weekKey} AND tier = ${tier} AND level_band = ${levelBand}
        AND closed_at IS NULL AND member_count < ${LEAGUE_GROUP_SIZE}
      ORDER BY created_at
      LIMIT 1
      FOR UPDATE SKIP LOCKED`;
    const groupId =
      open[0]?.id ?? (await tx.leagueGroup.create({ data: { weekKey, tier, levelBand } })).id;
    await tx.leagueGroup.update({
      where: { id: groupId },
      data: { memberCount: { increment: 1 } },
    });
    await tx.leagueMembership.create({
      data: { groupId, userId: student.userId, weekKey, tier, xp: amount, lastXpAt: now },
    });
  }

  private assertStudent(user: AuthUser) {
    if (user.kind !== 'STUDENT') {
      throw new ForbiddenException({
        error: 'STUDENTS_ONLY',
        message: 'Only students play in leagues.',
      });
    }
  }

  /** The student's league this week: their group's standings, and last week's result. */
  async forStudent(user: AuthUser, now = new Date()): Promise<LeagueDto> {
    this.assertStudent(user);
    const student = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: {
        country: { select: { timezone: true } },
        studentProfile: { select: { leagueTier: true } },
      },
    });
    const tier = student.studentProfile?.leagueTier ?? 0;
    const week = weekOfDay(localDay(now, student.country?.timezone ?? 'UTC'));
    const [membership, last] = await Promise.all([
      this.prisma.leagueMembership.findUnique({
        where: { userId_weekKey: { userId: user.id, weekKey: week.key } },
        select: { groupId: true },
      }),
      this.prisma.leagueMembership.findFirst({
        where: { userId: user.id, outcome: { not: null }, seenAt: null },
        orderBy: { weekKey: 'desc' },
      }),
    ]);
    const standings = membership ? await this.standings(membership.groupId, user.id, tier) : [];
    const size = standings.length;
    const lastResult =
      last?.outcome && last.rank
        ? {
            weekKey: last.weekKey,
            tier: tierKey(last.tier),
            rank: last.rank,
            outcome: last.outcome,
            newTier: tierKey(
              last.tier + (last.outcome === 'PROMOTED' ? 1 : last.outcome === 'RELEGATED' ? -1 : 0),
            ),
          }
        : null;
    return {
      tier: tierKey(tier),
      tierIndex: tier,
      week: { key: week.key, startDay: week.startDay, endDay: week.endDay },
      joined: membership !== null,
      standings,
      promoteCount: tier < LEAGUE_TIERS.length - 1 ? Math.min(LEAGUE_PROMOTE, size) : 0,
      relegateCount:
        tier > 0 && size >= LEAGUE_RELEGATE_MIN_GROUP
          ? Math.min(LEAGUE_RELEGATE, size - LEAGUE_PROMOTE)
          : 0,
      lastResult,
    };
  }

  /** A group, best first: who is shown by name, and where each place would go. */
  private async standings(
    groupId: string,
    viewerId: string,
    tier: number,
  ): Promise<LeagueStandingDto[]> {
    const members = await this.prisma.leagueMembership.findMany({
      where: { groupId },
      orderBy: [{ xp: 'desc' }, { lastXpAt: 'asc' }, { createdAt: 'asc' }],
      select: {
        userId: true,
        xp: true,
        user: {
          select: {
            studentProfile: {
              select: { nickname: true, avatarKey: true, showOnPublicBoards: true },
            },
          },
        },
      },
    });
    const friends = await this.friendIds(
      viewerId,
      members.map((m) => m.userId),
    );
    return members.map((member, index) => {
      const rank = index + 1;
      const profile = member.user.studentProfile;
      const isMe = member.userId === viewerId;
      const isFriend = friends.has(member.userId);
      const shown = isMe || isFriend || !!profile?.showOnPublicBoards;
      const outcome = leagueOutcome(rank, members.length, tier, member.xp);
      return {
        rank,
        nickname: shown ? (profile?.nickname ?? null) : null,
        avatarKey: shown ? (profile?.avatarKey ?? null) : null,
        xp: member.xp,
        isMe,
        isFriend,
        zone: outcome === 'PROMOTED' ? 'up' : outcome === 'RELEGATED' ? 'down' : null,
      };
    });
  }

  private async friendIds(viewerId: string, among: string[]): Promise<Set<string>> {
    if (among.length === 0) return new Set();
    const rows = await this.prisma.friendship.findMany({
      where: {
        OR: [
          { userAId: viewerId, userBId: { in: among } },
          { userBId: viewerId, userAId: { in: among } },
        ],
      },
      select: { userAId: true, userBId: true },
    });
    return new Set(rows.map((r) => (r.userAId === viewerId ? r.userBId : r.userAId)));
  }

  /** The student saw last week's result. */
  async markSeen(user: AuthUser, now = new Date()) {
    this.assertStudent(user);
    await this.prisma.leagueMembership.updateMany({
      where: { userId: user.id, outcome: { not: null }, seenAt: null },
      data: { seenAt: now },
    });
  }

  /**
   * Closes the groups of weeks that are over everywhere (before this UTC week): final
   * ranks, who moves up or down, and each student's new league. Returns how many
   * groups closed.
   */
  async closeFinished(now = new Date()): Promise<number> {
    const current = weekOfDay(localDay(now, 'UTC')).key;
    const groups = await this.prisma.leagueGroup.findMany({
      where: { closedAt: null, weekKey: { lt: current } },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });
    let closed = 0;
    for (const group of groups) {
      try {
        const moved = await this.closeGroup(group.id, now);
        if (moved) closed++;
      } catch (error) {
        this.logger.error(`League group ${group.id} not closed: ${(error as Error).message}`);
      }
    }
    return closed;
  }

  private async closeGroup(groupId: string, now: Date): Promise<boolean> {
    const results = await this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ id: string; tier: number }[]>`
        SELECT id, tier FROM league_groups WHERE id = ${groupId}::uuid AND closed_at IS NULL
        FOR UPDATE`;
      const group = locked[0];
      if (!group) return null;
      const members = await tx.leagueMembership.findMany({
        where: { groupId },
        orderBy: [{ xp: 'desc' }, { lastXpAt: 'asc' }, { createdAt: 'asc' }],
        select: { id: true, userId: true, xp: true, tier: true },
      });
      const moves: { userId: string; outcome: 'PROMOTED' | 'RELEGATED'; tier: number }[] = [];
      for (const [index, member] of members.entries()) {
        const rank = index + 1;
        const outcome = leagueOutcome(rank, members.length, member.tier, member.xp);
        await tx.leagueMembership.update({
          where: { id: member.id },
          data: { rank, outcome },
        });
        if (outcome === 'STAYED') continue;
        const tier = member.tier + (outcome === 'PROMOTED' ? 1 : -1);
        await tx.studentProfile.update({
          where: { userId: member.userId },
          data: { leagueTier: tier },
        });
        moves.push({ userId: member.userId, outcome, tier });
      }
      await tx.leagueGroup.update({ where: { id: groupId }, data: { closedAt: now } });
      return moves;
    });
    if (!results) return false;
    for (const move of results) {
      await this.notifications.notify([move.userId], 'league_result', {
        outcome: move.outcome,
        tier: tierKey(move.tier),
      });
    }
    return true;
  }
}
