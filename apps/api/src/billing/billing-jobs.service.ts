import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import type { Redis } from 'ioredis';
import { PrismaService } from '../database/prisma.service.js';
import { REDIS } from '../redis/redis.constants.js';
import { BillingNotifier } from './billing-notifier.service.js';
import { BillingRecordsService, LIVE } from './billing-records.service.js';
import { StripeGateway } from './stripe/stripe.gateway.js';

const LOCK_SECONDS = 15 * 60;
/** How far back the nightly job checks that ended card plans stopped at Stripe. */
const ENDED_PLANS_DAYS = 45;

/**
 * Nightly (01:10 UTC, behind a Redis lock): manual plans whose period is over end;
 * card plans whose period passed without word from Stripe (a missed webhook) are
 * read again from Stripe; and card plans that ended here are cancelled at Stripe if
 * Stripe still runs them.
 */
@Injectable()
export class BillingJobsService {
  private readonly logger = new Logger(BillingJobsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly records: BillingRecordsService,
    private readonly stripe: StripeGateway,
    private readonly notifier: BillingNotifier,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  @Cron('10 1 * * *', { name: 'billing-nightly', timeZone: 'UTC' })
  async nightly() {
    try {
      if (this.redis.status === 'wait') await this.redis.connect();
      if (!(await this.redis.set('billingjob:nightly', '1', 'EX', LOCK_SECONDS, 'NX'))) return;
      try {
        const ended = await this.records.endExpiredManual();
        for (const id of ended) await this.notifier.subscriptionEnded(id);
        const synced = await this.resyncOverdueCardPlans();
        const stopped = await this.stopEndedPlansAtStripe();
        this.logger.log(
          `Billing: ${ended.length} manual plans ended, ${synced} card plans re-read, ${stopped} ended plans cancelled at Stripe`,
        );
      } finally {
        await this.redis.del('billingjob:nightly');
      }
    } catch (error) {
      this.logger.error(`Billing job failed: ${(error as Error).message}`);
    }
  }

  /**
   * Card plans ended here recently (a deleted account, a duplicate plan, a full
   * refund, staff) that Stripe still runs, because the cancellation didn't reach it:
   * cancel them there now, so the family is never charged again. Read from
   * PostgreSQL, so nothing is lost if Redis is emptied.
   */
  async stopEndedPlansAtStripe(now = new Date()): Promise<number> {
    if (!this.stripe.cardsAvailable) return 0;
    const ended = await this.prisma.subscription.findMany({
      where: {
        provider: 'STRIPE',
        status: 'CANCELED',
        endedAt: { gte: new Date(now.getTime() - ENDED_PLANS_DAYS * 24 * 60 * 60 * 1000) },
        providerSubscriptionId: { not: null },
      },
      orderBy: { endedAt: 'desc' },
      select: { providerSubscriptionId: true },
      take: 500,
    });
    let stopped = 0;
    for (const { providerSubscriptionId } of ended) {
      const id = providerSubscriptionId!;
      try {
        const subscription = await this.stripe.client.subscriptions.retrieve(id);
        if (!['canceled', 'incomplete_expired'].includes(subscription.status)) {
          await this.stripe.client.subscriptions.cancel(id);
          stopped++;
          this.logger.warn(`Cancelled ${id} at Stripe: it was still running after the plan ended`);
        }
      } catch (error) {
        this.logger.warn(`Could not check ${id} at Stripe: ${String(error)}`);
      }
    }
    return stopped;
  }

  /** Card plans still marked live a day after their period ended. */
  async resyncOverdueCardPlans(now = new Date()): Promise<number> {
    if (!this.stripe.cardsAvailable) return 0;
    const overdue = await this.prisma.subscription.findMany({
      where: {
        provider: 'STRIPE',
        status: { in: LIVE },
        currentPeriodEnd: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
        providerSubscriptionId: { not: null },
      },
      select: { providerSubscriptionId: true },
      take: 500,
    });
    for (const { providerSubscriptionId } of overdue) {
      try {
        const subscription = await this.stripe.client.subscriptions.retrieve(
          providerSubscriptionId!,
        );
        await this.records.syncStripeSubscription(subscription);
      } catch (error) {
        this.logger.warn(`Could not re-read ${providerSubscriptionId}: ${String(error)}`);
      }
    }
    return overdue.length;
  }
}
