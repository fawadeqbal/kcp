import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import type { Redis } from 'ioredis';
import { PrismaService } from '../database/prisma.service.js';
import { addDays, localDay, visibleStreak } from '../progress/xp-rules.js';
import { REDIS } from '../redis/redis.constants.js';
import { PushService } from './push.service.js';

/** Students hear about their streak at this local hour (18:00), if they haven't practised. */
export const STREAK_REMINDER_HOUR = 18;
/** Phones the app hasn't registered for this long are forgotten. */
export const DEVICE_UNSEEN_DAYS = 60;
const DAY_MS = 24 * 60 * 60 * 1000;
const LOCK_SECONDS = 30 * 60;
const MARKER_SECONDS = 2 * 24 * 60 * 60;
const PAGE = 500;

const hourFormats = new Map<string, Intl.DateTimeFormat>();

/** The hour (0–23) in a time zone. */
export function localHour(at: Date, timeZone: string): number {
  try {
    let format = hourFormats.get(timeZone);
    if (!format) {
      format = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', hourCycle: 'h23' });
      hourFormats.set(timeZone, format);
    }
    return Number(format.format(at));
  } catch {
    return at.getUTCHours();
  }
}

export interface ReminderCandidate {
  current: number;
  longest: number;
  lastGoalDay: string | null;
  freezes: number;
}

/**
 * Whether a student gets today's streak reminder: they have a streak that is still
 * alive and haven't met today's goal yet.
 */
export function needsStreakReminder(streak: ReminderCandidate, today: string): boolean {
  if (!streak.lastGoalDay || streak.lastGoalDay === today) return false;
  return visibleStreak(streak, today) > 0;
}

/**
 * Push notifications on a schedule, each behind a Redis lock (several API servers):
 * - every hour: the streak reminder, for students where it is now 18:00, whose
 *   streak is alive and who haven't met today's goal (parents can switch it off);
 * - every night: forget phones the app hasn't registered for 60 days, and phones
 *   whose sign-in has ended.
 * Trial and monthly-summary notifications go out with their emails.
 */
@Injectable()
export class PushJobsService {
  private readonly logger = new Logger(PushJobsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  private async locked(name: string, run: () => Promise<void>) {
    try {
      if (this.redis.status === 'wait') await this.redis.connect();
      if (!(await this.redis.set(`pushjob:${name}`, '1', 'EX', LOCK_SECONDS, 'NX'))) return;
      try {
        await run();
      } finally {
        await this.redis.del(`pushjob:${name}`);
      }
    } catch (error) {
      this.logger.error(`Push job "${name}" failed: ${(error as Error).message}`);
    }
  }

  @Cron('5 * * * *', { name: 'streak-reminders', timeZone: 'UTC' })
  async streakRemindersScheduled() {
    await this.locked('streak-reminders', async () => {
      const sent = await this.sendStreakReminders();
      if (sent) this.logger.log(`Sent ${sent} streak reminders`);
    });
  }

  /** Streak reminders for students where it is STREAK_REMINDER_HOUR now. Returns how many. */
  async sendStreakReminders(now = new Date()): Promise<number> {
    // A live streak was last kept at most 3 days ago (2 freezes cover 2 missed days).
    const earliest = new Date(`${addDays(now.toISOString().slice(0, 10), -4)}T00:00:00Z`);
    let sent = 0;
    let cursor: string | undefined;
    for (;;) {
      const students = await this.prisma.streak.findMany({
        where: {
          current: { gt: 0 },
          lastGoalDay: { gte: earliest },
          user: {
            status: 'ACTIVE',
            deviceTokens: { some: {} },
            studentProfile: { streakReminders: true },
          },
        },
        select: {
          userId: true,
          current: true,
          longest: true,
          lastGoalDay: true,
          freezes: true,
          user: { select: { country: { select: { timezone: true } } } },
        },
        orderBy: { userId: 'asc' },
        take: PAGE,
        ...(cursor ? { cursor: { userId: cursor }, skip: 1 } : {}),
      });
      if (students.length === 0) break;
      cursor = students.at(-1)!.userId;
      for (const student of students) {
        const timeZone = student.user.country?.timezone ?? 'UTC';
        if (localHour(now, timeZone) !== STREAK_REMINDER_HOUR) continue;
        const today = localDay(now, timeZone);
        const streak = {
          ...student,
          lastGoalDay: student.lastGoalDay?.toISOString().slice(0, 10) ?? null,
        };
        if (!needsStreakReminder(streak, today)) continue;
        // Once a day, even if the job runs twice.
        const marker = `push:streak:${today}:${student.userId}`;
        if (!(await this.redis.set(marker, '1', 'EX', MARKER_SECONDS, 'NX'))) continue;
        sent += await this.push.sendToUsers(
          [student.userId],
          { kind: 'streakReminder', params: { days: visibleStreak(streak, today) } },
          now,
        );
      }
      if (students.length < PAGE) break;
    }
    return sent;
  }

  @Cron('40 3 * * *', { name: 'device-cleanup', timeZone: 'UTC' })
  async cleanupScheduled() {
    await this.locked('device-cleanup', async () => {
      const removed = await this.forgetUnseenDevices();
      if (removed)
        this.logger.log(`Forgot ${removed} phones not seen for ${DEVICE_UNSEEN_DAYS} days`);
    });
  }

  /** Forgets phones not seen for a while, and phones whose sign-in has ended. */
  async forgetUnseenDevices(now = new Date()): Promise<number> {
    const { count } = await this.prisma.deviceToken.deleteMany({
      where: {
        OR: [
          { lastSeenAt: { lt: new Date(now.getTime() - DEVICE_UNSEEN_DAYS * DAY_MS) } },
          { sessionId: null },
          { session: { OR: [{ revokedAt: { not: null } }, { expiresAt: { lte: now } }] } },
        ],
      },
    });
    return count;
  }
}
