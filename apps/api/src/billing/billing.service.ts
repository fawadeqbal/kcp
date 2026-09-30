import type { Subscription } from '@kcp/database';
import { PLAN_KEYS, type PlanKey, TRIAL_DAYS } from '@kcp/shared';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Redis } from 'ioredis';
import { AuditService } from '../audit/audit.service.js';
import type { RequestContext } from '../common/request-context.js';
import { AppConfigService } from '../config/app-config.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service.js';
import type { AuthUser } from '../permissions/auth-user.js';
import { REDIS } from '../redis/redis.constants.js';
import { BillingRecordsService, type InvoiceLine, LIVE } from './billing-records.service.js';
import type {
  BillingDto,
  ChildPremiumDto,
  InvoiceDto,
  InvoiceSummaryDto,
  PlanOptionDto,
  SubscriptionDto,
} from './dto/billing.dto.js';
import { EntitlementsService } from './entitlements.service.js';
import type { StripeSubscription } from './stripe/stripe-api.js';
import { StripeGateway } from './stripe/stripe.gateway.js';

export const invoiceNumber = (number: number) => `KCP-${String(number).padStart(6, '0')}`;

export function subscriptionDto(s: Subscription): SubscriptionDto {
  return {
    id: s.id,
    planKey: s.planKey,
    provider: s.provider,
    status: s.status,
    currency: s.currency,
    amountMinor: s.amountMinor,
    children: s.children,
    currentPeriodStart: s.currentPeriodStart,
    currentPeriodEnd: s.currentPeriodEnd,
    cancelAtPeriodEnd: s.cancelAtPeriodEnd,
    canceledAt: s.canceledAt,
    endedAt: s.endedAt,
  };
}

export function invoiceSummaryDto(i: {
  id: string;
  number: number;
  status: InvoiceSummaryDto['status'];
  currency: string;
  amountMinor: number;
  periodStart: Date;
  periodEnd: Date;
  issuedAt: Date;
  paidAt: Date | null;
}): InvoiceSummaryDto {
  return {
    id: i.id,
    number: invoiceNumber(i.number),
    status: i.status,
    currency: i.currency,
    amountMinor: i.amountMinor,
    periodStart: i.periodStart,
    periodEnd: i.periodEnd,
    issuedAt: i.issuedAt,
    paidAt: i.paidAt,
  };
}

/** A Stripe price's lookup key: what it costs, for which plan, country and line. */
/** The family's open checkout page (Redis), closed when they open another. */
const OPEN_CHECKOUT_PREFIX = 'billing:open-checkout:';

const lookupKey = (planKey: PlanKey, country: string, currency: string, line: InvoiceLine) =>
  `kcp:${planKey}:${country}:${currency}:${line.unitMinor}:${line.kind}`;

/**
 * A family's plan, from the parent's side: what premium costs in their country
 * (with the family discount), paying by card through Stripe Checkout, cancelling,
 * resuming, switching between monthly and yearly, and their invoices.
 */
@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly records: BillingRecordsService,
    private readonly entitlements: EntitlementsService,
    private readonly stripe: StripeGateway,
    private readonly flags: FeatureFlagsService,
    private readonly audit: AuditService,
    private readonly config: AppConfigService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  private async parent(user: AuthUser) {
    const parent = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, email: true, displayName: true, countryCode: true },
    });
    if (!parent) throw new NotFoundException('Account not found.');
    return parent;
  }

  /** The family's children and whether each has premium now. */
  async childrenPremium(parentId: string): Promise<ChildPremiumDto[]> {
    const links = await this.prisma.parentChildLink.findMany({
      where: { parentId, child: { status: { not: 'DELETED' } } },
      orderBy: { createdAt: 'asc' },
      select: {
        child: {
          select: { id: true, studentProfile: { select: { nickname: true, avatarKey: true } } },
        },
      },
    });
    const statuses = await this.entitlements.statusMany(links.map((l) => l.child.id));
    return links.map(({ child }) => {
      const status = statuses.get(child.id);
      return {
        id: child.id,
        nickname: child.studentProfile?.nickname ?? '',
        avatarKey: child.studentProfile?.avatarKey ?? 'rocket',
        premium: status?.active ?? false,
        source: status?.source ?? null,
        until: status?.until ?? null,
        trialEndsAt: status?.trialEndsAt ?? null,
      };
    });
  }

  /** What each plan costs this family now. */
  async planOptions(countryCode: string | null, children: number): Promise<PlanOptionDto[]> {
    const options: PlanOptionDto[] = [];
    for (const key of PLAN_KEYS) {
      try {
        const price = await this.records.priceFor(key, countryCode, children);
        options.push({
          key,
          interval: price.interval,
          unitMinor: price.unitMinor,
          extraUnitMinor: price.family.extraUnitMinor,
          extraChildren: price.family.extraChildren,
          totalMinor: price.family.totalMinor,
        });
      } catch {
        // No price for this plan in this country yet.
      }
    }
    return options;
  }

  private async checkoutAvailable(countryCode: string | null) {
    return this.stripe.cardsAvailable && (await this.flags.isEnabled('payments', countryCode));
  }

  async overview(user: AuthUser): Promise<BillingDto> {
    const parent = await this.parent(user);
    const [children, latest, invoices, country] = await Promise.all([
      this.childrenPremium(parent.id),
      this.prisma.subscription.findFirst({
        where: { parentId: parent.id },
        orderBy: [{ createdAt: 'desc' }],
      }),
      this.prisma.invoice.findMany({
        where: { parentId: parent.id },
        orderBy: { issuedAt: 'desc' },
        take: 24,
      }),
      parent.countryCode
        ? this.prisma.country.findUnique({
            where: { code: parent.countryCode },
            select: { currency: true, familyDiscountPercent: true },
          })
        : null,
    ]);
    const live = await this.records.live(parent.id);
    return {
      countryCode: parent.countryCode,
      currency: country?.currency ?? null,
      familyDiscountPercent: country?.familyDiscountPercent ?? null,
      trialDays: TRIAL_DAYS,
      checkoutAvailable: await this.checkoutAvailable(parent.countryCode),
      plans: await this.planOptions(parent.countryCode, Math.max(1, children.length)),
      children,
      subscription: live ? subscriptionDto(live) : latest ? subscriptionDto(latest) : null,
      invoices: invoices.map(invoiceSummaryDto),
    };
  }

  /** Starts Stripe Checkout for a plan covering every child. */
  async checkout(
    user: AuthUser,
    planKey: PlanKey,
    locale: string,
    ctx: RequestContext,
  ): Promise<{ url: string }> {
    const parent = await this.parent(user);
    if (!(await this.flags.isEnabled('payments', parent.countryCode))) {
      throw new ForbiddenException({
        error: 'PAYMENTS_OFF',
        message: 'Plans can’t be bought in your country yet.',
      });
    }
    if (await this.records.live(parent.id)) {
      throw new ConflictException({
        error: 'ALREADY_SUBSCRIBED',
        message: 'Your family has a plan already. You can change it on this page.',
      });
    }
    const children = await this.records.childrenCount(parent.id);
    if (children === 0) {
      throw new BadRequestException({
        error: 'NO_CHILDREN',
        message: 'Add a child first: plans are for your children’s accounts.',
      });
    }
    const price = await this.records.priceFor(planKey, parent.countryCode, children);
    const client = this.stripe.client;
    const customerId = await this.customerId(parent);
    const lineItems = [];
    for (const line of price.lines) {
      const stripePrice = await this.stripe.priceFor({
        currency: price.currency,
        unitMinor: line.unitMinor,
        interval: price.interval === 'YEAR' ? 'year' : 'month',
        lookupKey: lookupKey(planKey, parent.countryCode ?? '', price.currency, line),
        name: `Premium (${planKey}, ${line.kind === 'first' ? 'first child' : 'each other child'})`,
      });
      lineItems.push({ price: stripePrice.id, quantity: line.quantity });
    }
    // One checkout page at a time: a second tab (or going back and paying again)
    // closes the first, so a family can't end up with two plans billed.
    const openKey = `${OPEN_CHECKOUT_PREFIX}${parent.id}`;
    const previous = await this.redis.get(openKey);
    if (previous) {
      await client.checkout.sessions.expire(previous).catch(() => undefined);
    }
    const web = this.config.get('WEB_APP_URL');
    const metadata = { parentId: parent.id, planKey, countryCode: parent.countryCode ?? '' };
    const session = await client.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: lineItems,
      success_url: `${web}/${locale}/billing?checkout=success`,
      cancel_url: `${web}/${locale}/billing?checkout=canceled`,
      client_reference_id: parent.id,
      metadata,
      subscription_data: { metadata },
      locale: 'auto',
    });
    if (!session.url) throw new Error('Stripe returned no checkout URL');
    // Stripe closes checkout pages after 24 hours anyway.
    await this.redis.set(openKey, session.id, 'EX', 24 * 60 * 60);
    await this.audit.record({
      actor: { id: user.id, roleKey: user.roleKey },
      action: 'billing.checkout',
      entityType: 'User',
      entityId: parent.id,
      after: { planKey, children, currency: price.currency, totalMinor: price.family.totalMinor },
      context: ctx,
    });
    return { url: session.url };
  }

  /** The family's Stripe customer, made the first time they pay by card. */
  private async customerId(parent: {
    id: string;
    email: string | null;
    displayName: string | null;
  }) {
    const existing = await this.prisma.billingCustomer.findUnique({
      where: { parentId_provider: { parentId: parent.id, provider: 'STRIPE' } },
    });
    if (existing) return existing.customerId;
    const customer = await this.stripe.client.customers.create({
      email: parent.email ?? undefined,
      name: parent.displayName ?? undefined,
      metadata: { parentId: parent.id },
    });
    await this.prisma.billingCustomer.upsert({
      where: { parentId_provider: { parentId: parent.id, provider: 'STRIPE' } },
      create: { parentId: parent.id, provider: 'STRIPE', customerId: customer.id },
      update: {},
    });
    const saved = await this.prisma.billingCustomer.findUniqueOrThrow({
      where: { parentId_provider: { parentId: parent.id, provider: 'STRIPE' } },
    });
    return saved.customerId;
  }

  private async liveOrThrow(parentId: string) {
    const live = await this.records.live(parentId);
    if (!live) {
      throw new NotFoundException({
        error: 'NO_PLAN',
        message: 'Your family has no plan right now.',
      });
    }
    return live;
  }

  /** Cancels at the end of the period (premium stays until then), or undoes that. */
  async setCancelAtPeriodEnd(
    user: AuthUser,
    cancel: boolean,
    ctx: RequestContext,
  ): Promise<SubscriptionDto> {
    const live = await this.liveOrThrow(user.id);
    if (live.provider === 'STRIPE' && live.providerSubscriptionId) {
      await this.stripe.client.subscriptions.update(live.providerSubscriptionId, {
        cancel_at_period_end: cancel,
      });
    }
    const updated = await this.prisma.subscription.update({
      where: { id: live.id },
      data: { cancelAtPeriodEnd: cancel, canceledAt: cancel ? new Date() : null },
    });
    await this.records.logEvent({
      provider: live.provider,
      type: cancel ? 'subscription.cancel_requested' : 'subscription.resumed',
      parentId: user.id,
      subscriptionId: live.id,
      actorId: user.id,
      payload: { periodEnd: live.currentPeriodEnd.toISOString() },
    });
    await this.audit.record({
      actor: { id: user.id, roleKey: user.roleKey },
      action: cancel ? 'billing.cancel' : 'billing.resume',
      entityType: 'Subscription',
      entityId: live.id,
      context: ctx,
    });
    return subscriptionDto(updated);
  }

  /** Switches between monthly and yearly (card plans; the new period starts now). */
  async changePlan(
    user: AuthUser,
    planKey: PlanKey,
    ctx: RequestContext,
  ): Promise<SubscriptionDto> {
    const parent = await this.parent(user);
    const live = await this.liveOrThrow(parent.id);
    if (live.planKey === planKey) {
      throw new BadRequestException({ error: 'SAME_PLAN', message: 'This is your plan already.' });
    }
    if (live.provider !== 'STRIPE' || !live.providerSubscriptionId) {
      throw new ConflictException({
        error: 'MANUAL_PLAN',
        message: 'Your plan was paid another way. Contact us to change it.',
      });
    }
    const children = Math.max(1, await this.records.childrenCount(parent.id));
    const price = await this.records.priceFor(planKey, parent.countryCode, children);
    const current = await this.stripe.client.subscriptions.retrieve(live.providerSubscriptionId);
    const items = await this.itemChanges(current, planKey, parent.countryCode ?? '', price);
    await this.stripe.client.subscriptions.update(live.providerSubscriptionId, {
      items,
      proration_behavior: 'always_invoice',
      metadata: { planKey },
    });
    const updated = await this.prisma.subscription.update({
      where: { id: live.id },
      data: { planKey, amountMinor: price.family.totalMinor, children },
    });
    await this.audit.record({
      actor: { id: user.id, roleKey: user.roleKey },
      action: 'billing.change_plan',
      entityType: 'Subscription',
      entityId: live.id,
      before: { planKey: live.planKey },
      after: { planKey },
      context: ctx,
    });
    return subscriptionDto(updated);
  }

  /** Item changes that make a Stripe subscription charge these lines. */
  private async itemChanges(
    current: StripeSubscription,
    planKey: PlanKey,
    country: string,
    price: Awaited<ReturnType<BillingRecordsService['priceFor']>>,
  ) {
    const interval: 'month' | 'year' = price.interval === 'YEAR' ? 'year' : 'month';
    const firstItem =
      current.items.data.find((i) => !i.price.lookup_key?.endsWith(':extra')) ??
      current.items.data[0];
    const extraItem = current.items.data.find((i) => i.price.lookup_key?.endsWith(':extra'));
    const changes: { id?: string; price?: string; quantity?: number; deleted?: boolean }[] = [];
    for (const line of price.lines) {
      const stripePrice = await this.stripe.priceFor({
        currency: price.currency,
        unitMinor: line.unitMinor,
        interval,
        lookupKey: lookupKey(planKey, country, price.currency, line),
        name: `Premium (${planKey}, ${line.kind === 'first' ? 'first child' : 'each other child'})`,
      });
      const item = line.kind === 'first' ? firstItem : extraItem;
      changes.push({
        ...(item ? { id: item.id } : {}),
        price: stripePrice.id,
        quantity: line.quantity,
      });
    }
    if (extraItem && !price.lines.some((l) => l.kind === 'extra')) {
      changes.push({ id: extraItem.id, deleted: true });
    }
    return changes;
  }

  /**
   * The parent deleted their account: the plan stops now, at Stripe too (no more
   * charges). Invoices and payments stay, as the law requires for accounting.
   */
  async endForDeletedAccount(parentId: string): Promise<void> {
    const live = await this.records.live(parentId);
    if (!live) return;
    if (live.provider === 'STRIPE' && live.providerSubscriptionId) {
      try {
        await this.stripe.client.subscriptions.cancel(live.providerSubscriptionId);
      } catch (error) {
        this.logger.error(
          `Could not cancel Stripe subscription ${live.providerSubscriptionId} of a deleted account (the nightly job retries): ${String(error)}`,
        );
      }
    }
    await this.records.endNow(live.id, 'account_deleted', parentId);
  }

  /**
   * After a child is added or removed: every child stays covered. A card plan
   * charges the difference for the rest of the period when a child is added, and
   * credits it on the next invoice when one is removed; a manual plan's price follows
   * at renewal.
   */
  async childrenChanged(parentId: string): Promise<void> {
    try {
      const live = await this.records.live(parentId);
      if (!live) return;
      const parent = await this.prisma.user.findUnique({
        where: { id: parentId },
        select: { countryCode: true },
      });
      const children = Math.max(1, await this.records.childrenCount(parentId));
      if (children === live.children) return;
      const price = await this.records.priceFor(
        live.planKey as PlanKey,
        parent?.countryCode ?? null,
        children,
      );
      if (live.provider === 'STRIPE' && live.providerSubscriptionId) {
        const current = await this.stripe.client.subscriptions.retrieve(
          live.providerSubscriptionId,
        );
        const items = await this.itemChanges(
          current,
          live.planKey as PlanKey,
          parent?.countryCode ?? '',
          price,
        );
        await this.stripe.client.subscriptions.update(live.providerSubscriptionId, {
          items,
          // Another child: the difference for the rest of the period is charged now
          // (Stripe prorates). One child fewer: the unused part comes off the next
          // invoice, so removing and adding back a child isn't charged twice.
          proration_behavior: children > live.children ? 'always_invoice' : 'create_prorations',
        });
      }
      await this.prisma.subscription.update({
        where: { id: live.id },
        data: { children, amountMinor: price.family.totalMinor },
      });
    } catch (error) {
      this.logger.error(`Could not update the plan of family ${parentId}: ${String(error)}`);
    }
  }

  /** One invoice, for the family it belongs to (or staff when `parentId` is null). */
  async invoice(id: string, parentId: string | null): Promise<InvoiceDto> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        parent: { select: { displayName: true, email: true } },
        payment: { select: { provider: true, method: true, refundedMinor: true } },
        subscription: { select: { planKey: true } },
      },
    });
    if (!invoice || (parentId && invoice.parentId !== parentId)) {
      throw new NotFoundException('Invoice not found.');
    }
    return {
      ...invoiceSummaryDto(invoice),
      planKey: invoice.subscription?.planKey ?? null,
      lines: invoice.lines as unknown as InvoiceLine[],
      billedTo: { name: invoice.parent.displayName, email: invoice.parent.email },
      paidWith: invoice.payment
        ? invoice.payment.provider === 'STRIPE'
          ? 'CARD'
          : 'MANUAL'
        : null,
      manualMethod: invoice.payment?.method ?? null,
      refundedMinor: invoice.payment?.refundedMinor ?? 0,
    };
  }

  /** Families paying now, in a country (for the pilot numbers). */
  async payingParents(countryCode: string, at: Date): Promise<number> {
    return this.prisma.subscription.count({
      where: {
        status: { in: LIVE },
        currentPeriodStart: { lte: at },
        currentPeriodEnd: { gt: at },
        parent: { countryCode },
      },
    });
  }
}
