import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  CONSENT_FORM_KEEP_DAYS,
  CONSENT_PENDING_DAYS,
  EMAIL_PLUS_FOLLOW_UP_HOURS,
} from '@kcp/shared';
import type { Redis } from 'ioredis';
import { ChildrenService } from '../children/children.service.js';
import { NO_REQUEST } from '../common/request-context.js';
import { PrismaService } from '../database/prisma.service.js';
import { REDIS } from '../redis/redis.constants.js';
import { StorageService } from '../storage/storage.service.js';
import { ParentalConsentService } from './parental-consent.service.js';

const LOCK_SECONDS = 10 * 60;
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/**
 * Every 15 minutes (behind a Redis lock): the second "email plus" email a day after
 * the parent confirmed; signed forms deleted 30 days after staff decided; and child
 * accounts still waiting for consent after 30 days deleted, with everything in them.
 */
@Injectable()
export class ParentalConsentJobs {
  private readonly logger = new Logger(ParentalConsentJobs.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly consent: ParentalConsentService,
    private readonly children: ChildrenService,
    private readonly storage: StorageService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  @Cron('*/15 * * * *', { name: 'parental-consent' })
  async run() {
    try {
      if (this.redis.status === 'wait') await this.redis.connect();
      if (!(await this.redis.set('consentjob:run', '1', 'EX', LOCK_SECONDS, 'NX'))) return;
      try {
        const now = new Date();
        const sent = await this.followUps(now);
        const forms = await this.deleteOldForms(now);
        const removed = await this.removeUnconsented(now);
        if (sent || forms || removed) {
          this.logger.log(
            `Parental consent: ${sent} follow-up emails, ${forms} forms deleted, ${removed} unconsented accounts deleted`,
          );
        }
      } finally {
        await this.redis.del('consentjob:run');
      }
    } catch (error) {
      this.logger.error(`Parental consent job failed: ${(error as Error).message}`);
    }
  }

  /** "Email plus": the second email, a day after the parent confirmed. */
  async followUps(now = new Date()): Promise<number> {
    const due = await this.prisma.parentalConsentRequest.findMany({
      where: {
        method: 'EMAIL_PLUS',
        status: 'VERIFIED',
        followUpSentAt: null,
        emailConfirmedAt: { lte: new Date(now.getTime() - EMAIL_PLUS_FOLLOW_UP_HOURS * HOUR) },
      },
      select: { id: true },
      take: 200,
    });
    for (const { id } of due) {
      // Marked first: a failed email is logged, not sent twice.
      await this.prisma.parentalConsentRequest.update({
        where: { id },
        data: { followUpSentAt: now },
      });
      await this.consent.sendAbout(id, 'parentalConsentFollowUp', 'dashboard', {});
    }
    return due.length;
  }

  /** Signed forms hold a parent's signature: kept only 30 days after the decision. */
  async deleteOldForms(now = new Date()): Promise<number> {
    const old = await this.prisma.parentalConsentRequest.findMany({
      where: {
        formKey: { not: null },
        decidedAt: { lte: new Date(now.getTime() - CONSENT_FORM_KEEP_DAYS * DAY) },
      },
      select: { id: true, formKey: true },
      take: 200,
    });
    let deleted = 0;
    for (const { id, formKey } of old) {
      try {
        await this.storage.deleteKey(formKey!);
        await this.prisma.parentalConsentRequest.update({
          where: { id },
          data: { formKey: null, formDeletedAt: now },
        });
        deleted++;
      } catch (error) {
        this.logger.warn(`Could not delete consent form ${id}: ${(error as Error).message}`);
      }
    }
    return deleted;
  }

  /**
   * A child still waiting for consent after 30 days: the account and everything about
   * the child is deleted (like the parent deleting it), and the requests expire. The
   * parent can add the child again.
   */
  async removeUnconsented(now = new Date()): Promise<number> {
    const stale = await this.prisma.user.findMany({
      where: {
        kind: 'STUDENT',
        status: 'PENDING_CONSENT',
        createdAt: { lte: new Date(now.getTime() - CONSENT_PENDING_DAYS * DAY) },
        // A form waiting for staff isn't the parent's delay.
        consentChecks: { none: { status: 'SUBMITTED' } },
      },
      select: { id: true, parentLinks: { select: { parentId: true }, take: 1 } },
      take: 100,
    });
    for (const child of stale) {
      const parentId = child.parentLinks[0]?.parentId;
      await this.prisma.parentalConsentRequest.updateMany({
        where: { childId: child.id, status: { in: ['PENDING', 'REJECTED'] } },
        data: { status: 'EXPIRED' },
      });
      await this.children.remove(
        child.id,
        { id: parentId ?? child.id, roleKey: 'system' },
        NO_REQUEST,
      );
    }
    return stale.length;
  }
}
