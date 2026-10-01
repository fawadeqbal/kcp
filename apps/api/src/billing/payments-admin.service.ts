import type { Prisma } from '@kcp/database';
import { type PlanKey } from '@kcp/shared';
import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service.js';
import type { RequestContext } from '../common/request-context.js';
import { PrismaService } from '../database/prisma.service.js';
import type { AuthUser } from '../permissions/auth-user.js';
import { BillingNotifier } from './billing-notifier.service.js';
import { BillingRecordsService } from './billing-records.service.js';
import {
  BillingService,
  invoiceNumber,
  invoiceSummaryDto,
  subscriptionDto,
} from './billing.service.js';
import type {
  BillingListQueryDto,
  CountryPricesDto,
  FamilyBillingDto,
  ManualPaymentDto,
  PaymentAdminDto,
  PaymentListDto,
  SubscriptionAdminDto,
  SubscriptionListDto,
  UpdateCountryPricesDto,
} from './dto/billing.dto.js';
import { StripeGateway } from './stripe/stripe.gateway.js';
import { StripeWebhooksService } from './stripe/stripe-webhooks.service.js';

const PAGE_SIZE = 25;

const paymentInclude = {
  parent: { select: { email: true } },
  recordedBy: { select: { displayName: true, email: true } },
  invoice: { select: { id: true, number: true } },
  refunds: {
    orderBy: { createdAt: 'asc' },
    include: { createdBy: { select: { displayName: true, email: true } } },
  },
} as const satisfies Prisma.PaymentInclude;

type PaymentRow = Prisma.PaymentGetPayload<{ include: typeof paymentInclude }>;

function paymentDto(p: PaymentRow): PaymentAdminDto {
  return {
    id: p.id,
    parentId: p.parentId,
    parentEmail: p.parent.email,
    provider: p.provider,
    providerPaymentId: p.providerPaymentId,
    status: p.status,
    currency: p.currency,
    amountMinor: p.amountMinor,
    refundedMinor: p.refundedMinor,
    method: p.method,
    reference: p.reference,
    recordedBy: p.recordedBy?.displayName ?? p.recordedBy?.email ?? null,
    invoiceId: p.invoice?.id ?? null,
    invoiceNumber: p.invoice ? invoiceNumber(p.invoice.number) : null,
    paidAt: p.paidAt,
    createdAt: p.createdAt,
    refunds: p.refunds.map((r) => ({
      id: r.id,
      amountMinor: r.amountMinor,
      reason: r.reason,
      createdBy: r.createdBy?.displayName ?? r.createdBy?.email ?? null,
      createdAt: r.createdAt,
    })),
  };
}

function subscriptionAdminDto(
  s: Prisma.SubscriptionGetPayload<{ include: { parent: { select: { email: true } } } }>,
): SubscriptionAdminDto {
  return {
    ...subscriptionDto(s),
    parentId: s.parentId,
    parentEmail: s.parent.email,
    providerSubscriptionId: s.providerSubscriptionId,
    createdAt: s.createdAt,
  };
}

/** The admin panel's Payments: every family's subscriptions, payments and refunds. */
@Injectable()
export class PaymentsAdminService {
  private readonly logger = new Logger(PaymentsAdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly records: BillingRecordsService,
    private readonly billing: BillingService,
    private readonly stripe: StripeGateway,
    private readonly webhooks: StripeWebhooksService,
    private readonly notifier: BillingNotifier,
    private readonly audit: AuditService,
  ) {}

  private parentFilter(search: string | undefined) {
    return search ? { parent: { email: { contains: search.toLowerCase() } } } : {};
  }

  async subscriptions(query: BillingListQueryDto): Promise<SubscriptionListDto> {
    const page = query.page ?? 1;
    const where: Prisma.SubscriptionWhereInput = {
      ...(query.subscriptionStatus ? { status: query.subscriptionStatus } : {}),
      ...(query.provider ? { provider: query.provider } : {}),
      ...this.parentFilter(query.search),
    };
    const [rows, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        include: { parent: { select: { email: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      this.prisma.subscription.count({ where }),
    ]);
    return { items: rows.map(subscriptionAdminDto), total, page, pageSize: PAGE_SIZE };
  }

  async payments(query: BillingListQueryDto): Promise<PaymentListDto> {
    const page = query.page ?? 1;
    const where: Prisma.PaymentWhereInput = {
      ...(query.paymentStatus ? { status: query.paymentStatus } : {}),
      ...(query.provider ? { provider: query.provider } : {}),
      ...this.parentFilter(query.search),
    };
    const [rows, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        include: paymentInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      this.prisma.payment.count({ where }),
    ]);
    return { items: rows.map(paymentDto), total, page, pageSize: PAGE_SIZE };
  }

  /** Everything about one family's payments, for their page in the admin panel. */
  async family(parentId: string): Promise<FamilyBillingDto> {
    const parent = await this.prisma.user.findUnique({
      where: { id: parentId },
      select: { id: true, countryCode: true, role: { select: { key: true } } },
    });
    if (!parent || parent.role.key !== 'parent') throw new NotFoundException('Parent not found.');
    const [children, subscriptions, payments, invoices, events, customer] = await Promise.all([
      this.billing.childrenPremium(parent.id),
      this.prisma.subscription.findMany({
        where: { parentId },
        include: { parent: { select: { email: true } } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      this.prisma.payment.findMany({
        where: { parentId },
        include: paymentInclude,
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.invoice.findMany({
        where: { parentId },
        orderBy: { issuedAt: 'desc' },
        take: 50,
      }),
      this.prisma.paymentEvent.findMany({
        where: { parentId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: { id: true, provider: true, type: true, createdAt: true },
      }),
      this.prisma.billingCustomer.findUnique({
        where: { parentId_provider: { parentId, provider: 'STRIPE' } },
      }),
    ]);
    const country = parent.countryCode
      ? await this.prisma.country.findUnique({
          where: { code: parent.countryCode },
          select: { currency: true },
        })
      : null;
    return {
      parentId,
      countryCode: parent.countryCode,
      currency: country?.currency ?? null,
      children,
      subscriptions: subscriptions.map(subscriptionAdminDto),
      payments: payments.map(paymentDto),
      invoices: invoices.map(invoiceSummaryDto),
      events,
      stripeCustomerId: customer?.customerId ?? null,
      plans: await this.billing.planOptions(parent.countryCode, Math.max(1, children.length)),
    };
  }

  async recordManualPayment(
    parentId: string,
    dto: ManualPaymentDto,
    staff: AuthUser,
    ctx: RequestContext,
  ): Promise<FamilyBillingDto> {
    const { payment, invoice, subscription } = await this.records.recordManualPayment({
      parentId,
      planKey: dto.planKey as PlanKey,
      periods: dto.periods,
      amountMinor: dto.amountMinor,
      method: dto.method,
      reference: dto.reference,
      staffId: staff.id,
    });
    await this.audit.record({
      actor: { id: staff.id, roleKey: staff.roleKey },
      action: 'payment.manual',
      entityType: 'Payment',
      entityId: payment.id,
      after: {
        parentId,
        planKey: dto.planKey,
        periods: dto.periods,
        amountMinor: payment.amountMinor,
        currency: payment.currency,
        method: dto.method,
        periodEnd: subscription.currentPeriodEnd.toISOString(),
      },
      context: ctx,
    });
    await this.notifier.invoicePaid(invoice.id);
    return this.family(parentId);
  }

  /**
   * Gives money back. Card payments are refunded through Stripe; a full refund ends
   * the family's premium straight away (and stops a card plan from renewing).
   */
  async refund(
    paymentId: string,
    amountMinor: number | undefined,
    reason: string,
    staff: AuthUser,
    ctx: RequestContext,
  ): Promise<PaymentAdminDto> {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Payment not found.');
    const left = payment.amountMinor - payment.refundedMinor;
    const amount = amountMinor ?? left;
    if (payment.status !== 'SUCCEEDED' && payment.status !== 'PARTIALLY_REFUNDED') {
      throw new BadRequestException({
        error: 'NOT_REFUNDABLE',
        message: 'Only payments that went through can be refunded.',
      });
    }
    if (amount < 1 || amount > left) {
      throw new BadRequestException({
        error: 'REFUND_TOO_LARGE',
        message: `At most ${left} (minor units) is left to refund.`,
      });
    }
    // Recorded first, so Stripe's own webhook about it finds nothing new to add.
    const { refund, full } = await this.records.applyRefund({
      paymentId,
      refundedTotalMinor: payment.refundedMinor + amount,
      reason,
      createdById: staff.id,
      endOnFull: false,
    });
    if (payment.provider === 'STRIPE' && payment.providerPaymentId && refund) {
      try {
        const done = await this.stripe.client.refunds.create(
          {
            payment_intent: payment.providerPaymentId,
            amount,
            metadata: { paymentId, refundId: refund.id },
          },
          { idempotencyKey: `kcp-refund-${refund.id}` },
        );
        await this.prisma.refund.update({
          where: { id: refund.id },
          data: { providerRefundId: done.id },
        });
      } catch (error) {
        // Stripe said no: undo our record so the numbers stay true.
        await this.undoRefund(refund.id, paymentId, amount);
        this.logger.error(`Stripe refund failed for ${paymentId}: ${String(error)}`);
        throw new BadGatewayException({
          error: 'PROVIDER_ERROR',
          message: 'Stripe did not accept the refund. Nothing was refunded.',
        });
      }
      if (full && payment.subscriptionId)
        await this.webhooks.cancelAtStripe(payment.subscriptionId);
    }
    if (full && payment.subscriptionId) {
      const ended = await this.records.endNow(payment.subscriptionId, 'refund', staff.id);
      if (ended?.endedAt) await this.notifier.subscriptionEnded(payment.subscriptionId);
    }
    await this.audit.record({
      actor: { id: staff.id, roleKey: staff.roleKey },
      action: 'payment.refund',
      entityType: 'Payment',
      entityId: paymentId,
      after: { amountMinor: amount, currency: payment.currency, reason, full },
      context: ctx,
    });
    const updated = await this.prisma.payment.findUniqueOrThrow({
      where: { id: paymentId },
      include: paymentInclude,
    });
    return paymentDto(updated);
  }

  private async undoRefund(refundId: string, paymentId: string, amount: number) {
    await this.prisma.$transaction(async (tx) => {
      await tx.refund.delete({ where: { id: refundId } });
      const payment = await tx.payment.findUniqueOrThrow({ where: { id: paymentId } });
      const refunded = Math.max(0, payment.refundedMinor - amount);
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          refundedMinor: refunded,
          status: refunded === 0 ? 'SUCCEEDED' : 'PARTIALLY_REFUNDED',
        },
      });
      await tx.invoice.updateMany({ where: { paymentId }, data: { status: 'PAID' } });
    });
  }

  /** Staff end a plan: now (premium stops) or at the end of the period. */
  async cancel(
    subscriptionId: string,
    immediately: boolean,
    reason: string,
    staff: AuthUser,
    ctx: RequestContext,
  ): Promise<SubscriptionAdminDto> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });
    if (!subscription) throw new NotFoundException('Subscription not found.');
    if (subscription.status === 'CANCELED') {
      throw new BadRequestException({ error: 'ALREADY_ENDED', message: 'This plan has ended.' });
    }
    if (subscription.provider === 'STRIPE' && subscription.providerSubscriptionId) {
      if (immediately) {
        await this.stripe.client.subscriptions.cancel(subscription.providerSubscriptionId);
      } else {
        await this.stripe.client.subscriptions.update(subscription.providerSubscriptionId, {
          cancel_at_period_end: true,
        });
      }
    }
    if (immediately) {
      await this.records.endNow(subscriptionId, 'staff', staff.id);
      await this.notifier.subscriptionEnded(subscriptionId);
    } else {
      await this.prisma.subscription.update({
        where: { id: subscriptionId },
        data: { cancelAtPeriodEnd: true, canceledAt: new Date() },
      });
      await this.records.logEvent({
        provider: subscription.provider,
        type: 'subscription.cancel_requested',
        parentId: subscription.parentId,
        subscriptionId,
        actorId: staff.id,
        payload: { reason },
      });
    }
    await this.audit.record({
      actor: { id: staff.id, roleKey: staff.roleKey },
      action: 'subscription.cancel',
      entityType: 'Subscription',
      entityId: subscriptionId,
      after: { immediately, reason },
      context: ctx,
    });
    const updated = await this.prisma.subscription.findUniqueOrThrow({
      where: { id: subscriptionId },
      include: { parent: { select: { email: true } } },
    });
    return subscriptionAdminDto(updated);
  }

  // ── Prices ────────────────────────────────────────────────────────────────

  async prices(): Promise<{ countries: CountryPricesDto[] }> {
    const countries = await this.prisma.country.findMany({
      orderBy: [{ isActive: 'desc' }, { code: 'asc' }],
      include: { prices: true },
    });
    return {
      countries: countries.map((c) => ({
        code: c.code,
        names: c.names as Record<string, string>,
        currency: c.currency,
        isActive: c.isActive,
        familyDiscountPercent: c.familyDiscountPercent,
        under13ConsentMethods: c.under13ConsentMethods,
        prices: {
          monthly: c.prices.find((p) => p.planKey === 'monthly')?.amountMinor ?? null,
          yearly: c.prices.find((p) => p.planKey === 'yearly')?.amountMinor ?? null,
        },
      })),
    };
  }

  /**
   * New prices apply to new plans and to renewals of manual plans. Card plans keep
   * their price until the family changes plan (Stripe prices don't change).
   */
  async updatePrices(
    code: string,
    dto: UpdateCountryPricesDto,
    staff: AuthUser,
    ctx: RequestContext,
  ): Promise<CountryPricesDto> {
    const country = await this.prisma.country.findUnique({
      where: { code },
      include: { prices: true },
    });
    if (!country) throw new NotFoundException('Country not found.');
    const before = {
      familyDiscountPercent: country.familyDiscountPercent,
      monthlyMinor: country.prices.find((p) => p.planKey === 'monthly')?.amountMinor ?? null,
      yearlyMinor: country.prices.find((p) => p.planKey === 'yearly')?.amountMinor ?? null,
    };
    await this.prisma.$transaction(async (tx) => {
      if (dto.familyDiscountPercent !== undefined) {
        await tx.country.update({
          where: { code },
          data: { familyDiscountPercent: dto.familyDiscountPercent },
        });
      }
      for (const [planKey, amountMinor] of [
        ['monthly', dto.monthlyMinor],
        ['yearly', dto.yearlyMinor],
      ] as const) {
        if (amountMinor === undefined) continue;
        await tx.planPrice.upsert({
          where: { planKey_countryCode: { planKey, countryCode: code } },
          create: {
            planKey,
            countryCode: code,
            currency: country.currency,
            amountMinor,
            updatedById: staff.id,
          },
          update: { amountMinor, currency: country.currency, updatedById: staff.id },
        });
      }
      await this.audit.record(
        {
          actor: { id: staff.id, roleKey: staff.roleKey },
          action: 'prices.update',
          entityType: 'Country',
          entityId: code,
          before,
          after: {
            familyDiscountPercent: dto.familyDiscountPercent ?? before.familyDiscountPercent,
            monthlyMinor: dto.monthlyMinor ?? before.monthlyMinor,
            yearlyMinor: dto.yearlyMinor ?? before.yearlyMinor,
            reason: dto.reason,
          },
          context: ctx,
        },
        tx,
      );
    });
    const all = await this.prices();
    return all.countries.find((c) => c.code === code)!;
  }
}
