import type { Prisma } from '@kcp/database';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import type { NotificationListDto } from './notifications.dto.js';

/**
 * What a notification can say. The app shows it in the reader's language from the
 * type and its data, which only ever holds IDs, keys, nicknames and content titles
 * (never free text someone typed).
 */
export type NotificationType =
  | 'badge_earned'
  | 'certificate_issued'
  | 'payment_receipt'
  | 'payment_failed'
  | 'plan_ended'
  | 'trial_ending'
  | 'child_shipped'
  | 'child_certificate'
  /** A mentor finished reviewing the student's project: { reviewId, decision }. */
  | 'review_done'
  /** The same, for the parents: { reviewId, childId, nickname, decision }. */
  | 'child_reviewed'
  /** The student moved up or down a league: { outcome, tier }. */
  | 'league_result'
  /** A friend request for the parent to approve: { requestId, childId, nickname, friendNickname }. */
  | 'friend_request'
  /** Both parents approved: the students are friends: { nickname } (the new friend). */
  | 'friend_added'
  /** A family the parent invited made it: their children got premium days: { days }. */
  | 'referral_rewarded'
  /** The parent's weekly report is ready: { weekKey }. */
  | 'weekly_report'
  /** A moderator reminded the student of the room rules: {}. */
  | 'chat_warning'
  /** A moderator paused the student's messages: { until }. */
  | 'chat_muted'
  /** The same, for the parents: { childId, nickname, action: WARN|MUTE|SUSPEND, until? }. */
  | 'child_chat_action'
  /** A moderator looked at what the student (or adult) reported: {}. */
  | 'chat_report_done'
  /** A child asks to join a hackathon team: { teamId, childId, nickname, event, team }. */
  | 'event_join_request'
  /** A parent approved: the student is in the team: { slug, event, team }. */
  | 'event_joined'
  /** An event's results are out: { slug, event, rank }. */
  | 'event_results'
  /** A child asks to join a class: { classId, childId, nickname, className, school }. */
  | 'class_join_request'
  /** A parent approved: the student is in the class: { classId, className }. */
  | 'class_joined'
  /** The teacher set a lesson: { classId, className, lessonId, dueAt? }. */
  | 'assignment_new'
  /** The student's readiness check was graded: { reviewId, passed }. */
  | 'readiness_result'
  /** The same, for the parents: { reviewId, childId, nickname, passed }. */
  | 'child_readiness'
  /** A lead developer signed the student off for the hub: {}. */
  | 'hub_signed_off'
  /** The same, for the parents (their consent is next): { childId, nickname }. */
  | 'child_hub_signed_off'
  /** Every step is done: the student can be invited to hub projects: {}. */
  | 'hub_eligible'
  /** Staff paused the student's hub work: {}. */
  | 'hub_paused'
  /** The same, for the parents: { childId, nickname }. */
  | 'child_hub_paused'
  /** A lead developer invited the student to a project: { projectId, title }. */
  | 'hub_invite'
  /** The student said yes: the parent approves the project: { memberId, childId, nickname, title }. */
  | 'child_hub_invite'
  /** Another parent agreed to the hub agreement (earnings go to them): { childId, nickname, by }. */
  | 'child_hub_consent'
  /** A parent approved: the student is on the team: { projectId, title }. */
  | 'hub_joined';

/** Kept per account; older ones go (nightly). */
const KEEP_DAYS = 90;
const LIST_SIZE = 30;

/** The app's bell: short messages for students and parents. */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Adds a notification for each account. Never fails what triggered it. */
  async notify(userIds: string[], type: NotificationType, data: Prisma.InputJsonObject = {}) {
    if (userIds.length === 0) return;
    try {
      await this.prisma.notification.createMany({
        data: userIds.map((userId) => ({ userId, type, data })),
      });
    } catch (error) {
      this.logger.warn(`Notification ${type} not saved: ${(error as Error).message}`);
    }
  }

  /** A student's parents (their notifications go to them). */
  async parentsOf(studentId: string): Promise<string[]> {
    const links = await this.prisma.parentChildLink.findMany({
      where: { childId: studentId, parent: { status: 'ACTIVE' } },
      select: { parentId: true },
    });
    return links.map((l) => l.parentId);
  }

  async list(userId: string): Promise<NotificationListDto> {
    const [items, unread] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: LIST_SIZE,
      }),
      this.prisma.notification.count({ where: { userId, readAt: null } }),
    ]);
    return {
      unread,
      items: items.map((n) => ({
        id: n.id,
        type: n.type,
        data: n.data as Record<string, unknown>,
        read: n.readAt !== null,
        createdAt: n.createdAt,
      })),
    };
  }

  async markRead(userId: string, ids: string[] | 'all') {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null, ...(ids === 'all' ? {} : { id: { in: ids } }) },
      data: { readAt: new Date() },
    });
  }

  /** Removes notifications older than KEEP_DAYS. */
  async prune(now = new Date()): Promise<number> {
    const result = await this.prisma.notification.deleteMany({
      where: { createdAt: { lt: new Date(now.getTime() - KEEP_DAYS * 24 * 60 * 60 * 1000) } },
    });
    return result.count;
  }
}
