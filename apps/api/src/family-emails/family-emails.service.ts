import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import type { Redis } from 'ioredis';
import { EntitlementsService } from '../billing/entitlements.service.js';
import { formatDate, formatMonth } from '../common/format.js';
import { AppConfigService } from '../config/app-config.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { MailService } from '../mail/mail.service.js';
import { type ChildMonth, MAIL_COPY, toMailLanguage } from '../mail/templates.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PushService } from '../push/push.service.js';
import { REDIS } from '../redis/redis.constants.js';

/** Parents hear this many days before a trial ends. */
export const TRIAL_REMINDER_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;
const LOCK_SECONDS = 30 * 60;
const SUMMARY_MARKER_SECONDS = 40 * 24 * 60 * 60;

/**
 * Emails families get on a schedule, each behind a Redis lock (several API servers):
 * - every morning (07:05 UTC): "your child's free trial ends in 3 days" (once per
 *   trial, and only when nothing else gives the child premium);
 * - on the 1st of each month (06:20 UTC): last month's progress, per child (parents
 *   can switch it off on their dashboard).
 * Parents signed in to the mobile app also get a push notification for each.
 */
@Injectable()
export class FamilyEmailsService {
  private readonly logger = new Logger(FamilyEmailsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly notifications: NotificationsService,
    private readonly entitlements: EntitlementsService,
    private readonly push: PushService,
    private readonly config: AppConfigService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  private async locked(name: string, run: () => Promise<void>) {
    try {
      if (this.redis.status === 'wait') await this.redis.connect();
      if (!(await this.redis.set(`familyjob:${name}`, '1', 'EX', LOCK_SECONDS, 'NX'))) return;
      try {
        await run();
      } finally {
        await this.redis.del(`familyjob:${name}`);
      }
    } catch (error) {
      this.logger.error(`Family email job "${name}" failed: ${(error as Error).message}`);
    }
  }

  private url(language: string, path: string) {
    return `${this.config.get('WEB_APP_URL')}/${toMailLanguage(language)}${path}`;
  }

  @Cron('5 7 * * *', { name: 'trial-reminders', timeZone: 'UTC' })
  async trialRemindersScheduled() {
    await this.locked('trial-reminders', async () => {
      const sent = await this.sendTrialReminders();
      if (sent) this.logger.log(`Sent ${sent} trial reminders`);
    });
  }

  /** Reminds parents of trials ending within TRIAL_REMINDER_DAYS. Returns how many. */
  async sendTrialReminders(now = new Date()): Promise<number> {
    const ending = await this.prisma.studentProfile.findMany({
      where: {
        trialReminderSentAt: null,
        trialEndsAt: { gt: now, lte: new Date(now.getTime() + TRIAL_REMINDER_DAYS * DAY_MS) },
        user: { status: 'ACTIVE' },
      },
      select: {
        userId: true,
        nickname: true,
        trialEndsAt: true,
        user: {
          select: {
            parentLinks: {
              where: { parent: { status: 'ACTIVE' } },
              select: {
                parent: {
                  select: {
                    id: true,
                    email: true,
                    displayName: true,
                    languageCode: true,
                    country: { select: { timezone: true } },
                  },
                },
              },
            },
          },
        },
      },
      take: 500,
    });
    let sent = 0;
    for (const student of ending) {
      // Claim it first: a reminder goes once, even if two servers get here.
      const claimed = await this.prisma.studentProfile.updateMany({
        where: { userId: student.userId, trialReminderSentAt: null },
        data: { trialReminderSentAt: now },
      });
      if (!claimed.count) continue;
      // A plan or premium from our team keeps premium on: nothing to remind.
      const status = await this.entitlements.status(student.userId, now);
      if (status.source !== 'trial' || !student.trialEndsAt) continue;
      const endsAt = student.trialEndsAt;
      for (const { parent } of student.user.parentLinks) {
        await this.notifications.notify([parent.id], 'trial_ending', {
          childId: student.userId,
          nickname: student.nickname,
          endsAt: endsAt.toISOString(),
        });
        await this.push.sendToUsers(
          [parent.id],
          {
            kind: 'trialEnding',
            params: (language) => ({
              nickname: student.nickname,
              date: formatDate(language, endsAt, parent.country?.timezone ?? 'UTC'),
            }),
            data: { childId: student.userId },
          },
          now,
        );
        if (!parent.email) continue;
        const language = toMailLanguage(parent.languageCode);
        try {
          await this.mail.send({
            to: parent.email,
            template: 'trialEnding',
            language,
            params: {
              name: parent.displayName ?? '',
              actionUrl: this.url(language, '/billing'),
              vars: {
                nickname: student.nickname,
                date: formatDate(language, endsAt, parent.country?.timezone ?? 'UTC'),
              },
            },
          });
          sent++;
        } catch (error) {
          this.logger.warn(`Trial reminder not sent: ${(error as Error).message}`);
        }
      }
    }
    return sent;
  }

  @Cron('20 6 1 * *', { name: 'monthly-summaries', timeZone: 'UTC' })
  async monthlySummariesScheduled() {
    await this.locked('monthly-summaries', async () => {
      const sent = await this.sendMonthlySummaries();
      this.logger.log(`Sent ${sent} monthly summaries`);
    });
  }

  /**
   * Last month's progress for every parent who wants it (once per month and parent,
   * also when run again). `now` is any moment in the month after.
   */
  async sendMonthlySummaries(now = new Date()): Promise<number> {
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 1, 1));
    const monthKey = start.toISOString().slice(0, 7);
    const parents = await this.prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        monthlySummaryEmails: true,
        email: { not: null },
        role: { key: 'parent' },
        childLinks: { some: { child: { status: 'ACTIVE' } } },
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        languageCode: true,
        childLinks: {
          where: { child: { status: 'ACTIVE' } },
          select: {
            child: {
              select: {
                id: true,
                studentProfile: { select: { nickname: true } },
                streak: { select: { longest: true } },
              },
            },
          },
        },
      },
    });
    let sent = 0;
    for (const parent of parents) {
      const marker = `summary:${monthKey}:${parent.id}`;
      if (!(await this.redis.set(marker, '1', 'EX', SUMMARY_MARKER_SECONDS, 'NX'))) continue;
      const months: ChildMonth[] = [];
      for (const { child } of parent.childLinks) {
        const [lessons, xp, projects] = await Promise.all([
          this.prisma.lessonProgress.count({
            where: { userId: child.id, completedAt: { gte: start, lt: end } },
          }),
          this.prisma.xpEvent.aggregate({
            where: { userId: child.id, createdAt: { gte: start, lt: end } },
            _sum: { amount: true },
          }),
          this.prisma.portfolioItem.count({
            where: { userId: child.id, createdAt: { gte: start, lt: end } },
          }),
        ]);
        months.push({
          nickname: child.studentProfile?.nickname ?? '',
          lessons,
          xp: Math.max(0, xp._sum.amount ?? 0),
          projects,
          streak: child.streak?.longest ?? 0,
        });
      }
      const language = toMailLanguage(parent.languageCode);
      try {
        await this.mail.send({
          to: parent.email!,
          template: 'monthlySummary',
          language,
          params: {
            name: parent.displayName ?? '',
            actionUrl: this.url(language, '/dashboard'),
            vars: { month: formatMonth(language, start) },
            lines: months.map((m) => MAIL_COPY[language].childMonth(m)),
          },
        });
        sent++;
        await this.push.sendToUsers(
          [parent.id],
          {
            kind: 'monthlySummary',
            params: (pushLanguage) => ({ month: formatMonth(pushLanguage, start) }),
          },
          now,
        );
      } catch (error) {
        // Let the next run try again.
        await this.redis.del(marker);
        this.logger.warn(`Monthly summary not sent: ${(error as Error).message}`);
      }
    }
    return sent;
  }
}
