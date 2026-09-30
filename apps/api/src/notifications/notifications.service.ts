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
  | 'child_certificate';

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
