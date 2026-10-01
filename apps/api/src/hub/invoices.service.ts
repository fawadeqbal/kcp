import type { HubInvoiceKind, Prisma } from '@kcp/database';
import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  type OnModuleInit,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service.js';
import { idOf, type StripeCheckoutSession } from '../billing/stripe/stripe-api.js';
import { StripeGateway } from '../billing/stripe/stripe.gateway.js';
import { StripeWebhooksService } from '../billing/stripe/stripe-webhooks.service.js';
import type { RequestContext } from '../common/request-context.js';
import { AppConfigService } from '../config/app-config.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { MailService } from '../mail/mail.service.js';
import type { MailTemplate } from '../mail/templates.js';
import { toMailLanguage } from '../mail/templates.js';
import type { AuthUser } from '../permissions/auth-user.js';
import { ClientsService, reference } from './clients.service.js';
import type { HubInvoiceDto } from './dto/projects.dto.js';
import { LedgerService } from './ledger/ledger.service.js';
import { ProjectsService } from './projects.service.js';

type Tx = Prisma.TransactionClient;

/** Invoices are due this many days after they're issued. */
export const INVOICE_DUE_DAYS = 14;
const PAYMENT_PURPOSE = 'hub_invoice';
const DAY = 86_400_000;

const invoiceNotFound = () =>
  new NotFoundException({ error: 'INVOICE_NOT_FOUND', message: 'No such invoice.' });

const INVOICE_INCLUDE = {
  payments: true,
  quote: { select: { version: true } },
  project: {
    select: {
      title: true,
      org: { select: { name: true, billingName: true, billingAddress: true, taxId: true } },
    },
  },
} satisfies Prisma.HubInvoiceInclude;

/**
 * Client invoices: the deposit when a quote is approved, the rest when its work is
 * accepted. Paid by card (Stripe Checkout, a mock in development) or by bank transfer
 * that staff record. Every step is a ledger posting: issued (the client owes it, the
 * project holds it), paid (cash in), voided (reversed).
 */
@Injectable()
export class HubInvoicesService implements OnModuleInit {
  private readonly logger = new Logger(HubInvoicesService.name);
  /** Run after an invoice is paid (sharing the money out, in Sprint 7's earnings). */
  private readonly paidHandlers: ((invoiceId: string) => Promise<void>)[] = [];

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly audit: AuditService,
    private readonly mail: MailService,
    private readonly config: AppConfigService,
    private readonly stripe: StripeGateway,
    private readonly webhooks: StripeWebhooksService,
    private readonly projects: ProjectsService,
    private readonly clients: ClientsService,
  ) {}

  onModuleInit() {
    this.webhooks.onPaymentCompleted(PAYMENT_PURPOSE, (session) => this.paidByCard(session));
  }

  onPaid(handler: (invoiceId: string) => Promise<void>) {
    this.paidHandlers.push(handler);
  }

  // ── Issuing ──────────────────────────────────────────────────────────────

  /** Issues an invoice for a quote (once per kind), with its ledger posting. */
  async issue(
    tx: Tx,
    quote: { id: string; projectId: string },
    kind: HubInvoiceKind,
    amountMinor: number,
    now = new Date(),
  ) {
    const project = await tx.hubProject.findUniqueOrThrow({
      where: { id: quote.projectId },
      select: { id: true, orgId: true, currency: true, title: true },
    });
    const invoice = await tx.hubInvoice.create({
      data: {
        projectId: project.id,
        orgId: project.orgId,
        quoteId: quote.id,
        kind,
        currency: project.currency,
        amountMinor,
        issuedAt: now,
        dueAt: new Date(now.getTime() + INVOICE_DUE_DAYS * DAY),
      },
    });
    await this.ledger.post(
      {
        kind: 'invoice.issued',
        memo: `Invoice ${reference('H', invoice.number)} (${kind.toLowerCase()}) for ${project.title}`,
        currency: project.currency,
        refType: 'HubInvoice',
        refId: invoice.id,
        idempotencyKey: `hub-invoice:${invoice.id}:issued`,
        lines: [
          { type: 'CLIENT_RECEIVABLE', owner: project.orgId, side: 'DEBIT', amountMinor },
          { type: 'PROJECT_FUNDS', owner: project.id, side: 'CREDIT', amountMinor },
        ],
      },
      tx,
    );
    return invoice;
  }

  /** Emails the organisation's people about an invoice (after the transaction). */
  async tell(
    invoiceId: string,
    template: Extract<MailTemplate, 'hubInvoiceIssued' | 'hubInvoicePaid'>,
  ) {
    const invoice = await this.prisma.hubInvoice.findUnique({
      where: { id: invoiceId },
      include: {
        project: { select: { title: true } },
        org: {
          select: {
            members: {
              where: { user: { deletedAt: null, status: 'ACTIVE' } },
              select: { user: { select: { email: true, displayName: true, languageCode: true } } },
            },
          },
        },
      },
    });
    if (!invoice) return;
    const base = this.config.get('WEB_APP_URL').replace(/\/+$/, '');
    for (const { user } of invoice.org.members) {
      if (!user.email) continue;
      const language = toMailLanguage(user.languageCode);
      await this.mail
        .send({
          to: user.email,
          template,
          language,
          params: {
            name: user.displayName ?? '',
            actionUrl: `${base}/${language}/client/invoices/${invoice.id}`,
            vars: {
              invoice: reference('H', invoice.number),
              project: invoice.project.title,
              amount: `${(invoice.amountMinor / 100).toFixed(2)} ${invoice.currency}`,
            },
          },
        })
        .catch((error: Error) => this.logger.warn(`Invoice email not sent: ${error.message}`));
    }
  }

  // ── Paying ───────────────────────────────────────────────────────────────

  /**
   * Marks an invoice paid with its payment, and posts the cash. Locks the invoice, so
   * a card payment and a recorded transfer at once can't both count. Returns false
   * when it was paid (or voided) already.
   */
  private async markPaid(
    invoiceId: string,
    payment: Omit<Prisma.HubPaymentUncheckedCreateInput, 'invoiceId' | 'currency' | 'amountMinor'>,
    actor: AuthUser | null,
    ctx?: RequestContext,
  ): Promise<boolean> {
    const paid = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM hub_invoices WHERE id = ${invoiceId}::uuid FOR UPDATE`;
      const invoice = await tx.hubInvoice.findUniqueOrThrow({
        where: { id: invoiceId },
        include: { project: { select: { title: true } } },
      });
      if (invoice.status !== 'OPEN') return false;
      await tx.hubPayment.create({
        data: {
          ...payment,
          invoiceId,
          currency: invoice.currency,
          amountMinor: invoice.amountMinor,
        },
      });
      await tx.hubInvoice.update({
        where: { id: invoiceId },
        data: { status: 'PAID', paidAt: payment.paidAt, checkoutSessionId: null },
      });
      await this.ledger.post(
        {
          kind: 'invoice.paid',
          memo: `Payment of invoice ${reference('H', invoice.number)} for ${invoice.project.title}`,
          currency: invoice.currency,
          refType: 'HubInvoice',
          refId: invoice.id,
          idempotencyKey: `hub-invoice:${invoice.id}:paid`,
          createdById: actor?.id ?? null,
          lines: [
            { type: 'CASH', side: 'DEBIT', amountMinor: invoice.amountMinor },
            {
              type: 'CLIENT_RECEIVABLE',
              owner: invoice.orgId,
              side: 'CREDIT',
              amountMinor: invoice.amountMinor,
            },
          ],
        },
        tx,
      );
      await this.audit.record(
        {
          actor: actor ? { id: actor.id, roleKey: actor.roleKey } : null,
          action: 'hub.invoice_paid',
          entityType: 'HubInvoice',
          entityId: invoice.id,
          after: { provider: payment.provider, amountMinor: invoice.amountMinor },
          context: ctx,
        },
        tx,
      );
      await this.refreshStatus(tx, invoice.projectId);
      return true;
    });
    if (paid) {
      // The client hears first; then the money can be shared out (earnings).
      await this.tell(invoiceId, 'hubInvoicePaid');
      for (const handler of this.paidHandlers) await handler(invoiceId);
    }
    return paid;
  }

  /** Staff record a bank transfer for the whole invoice. */
  async recordPayment(
    invoiceId: string,
    dto: { method: string; reference: string; paidAt: string },
    staff: AuthUser,
    ctx: RequestContext,
  ) {
    const invoice = await this.prisma.hubInvoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw invoiceNotFound();
    // Paid another way: a card checkout page still open for it stops working.
    await this.closeCheckout(invoice.checkoutSessionId);
    const paid = await this.markPaid(
      invoiceId,
      {
        provider: 'MANUAL',
        method: dto.method.trim(),
        reference: dto.reference.trim(),
        recordedById: staff.id,
        paidAt: new Date(`${dto.paidAt}T12:00:00Z`),
      },
      staff,
      ctx,
    );
    if (!paid) {
      throw new ConflictException({
        error: 'INVOICE_NOT_OPEN',
        message: 'This invoice is paid or void already.',
      });
    }
  }

  /** Stripe's webhook for a completed card payment of an invoice. */
  async paidByCard(session: StripeCheckoutSession): Promise<{ parentId?: string }> {
    const invoiceId = session.metadata?.['hubInvoiceId'];
    const paymentIntent = idOf(session.payment_intent ?? null);
    if (!invoiceId || !paymentIntent || session.payment_status !== 'paid') return {};
    const invoice = await this.prisma.hubInvoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) {
      this.logger.error(`Card payment for an unknown hub invoice ${invoiceId}`);
      return {};
    }
    if (
      session.amount_total !== invoice.amountMinor ||
      (session.currency ?? '').toUpperCase() !== invoice.currency
    ) {
      this.logger.error(`Card payment for hub invoice ${invoiceId} doesn't match its amount`);
      return {};
    }
    const seen = await this.prisma.hubPayment.findUnique({
      where: {
        provider_providerPaymentId: { provider: 'STRIPE', providerPaymentId: paymentIntent },
      },
    });
    if (seen) return {};
    const paid = await this.markPaid(
      invoiceId,
      { provider: 'STRIPE', providerPaymentId: paymentIntent, paidAt: new Date() },
      null,
    );
    if (!paid) {
      // Paid twice (a transfer recorded while the card page was open): staff refund it.
      this.logger.error(
        `Hub invoice ${invoiceId} was paid already; card payment ${paymentIntent} needs a refund`,
      );
    }
    return {};
  }

  /** A card checkout page for an open invoice (the client pays on Stripe's page). */
  async checkout(user: AuthUser, invoiceId: string, locale: 'en' | 'ar' | 'ur' = 'en') {
    const member = await this.clients.membership(user);
    const invoice = await this.prisma.hubInvoice.findFirst({
      where: { id: invoiceId, orgId: member.orgId },
      include: { project: { select: { title: true } } },
    });
    if (!invoice) throw invoiceNotFound();
    if (invoice.status !== 'OPEN') {
      throw new ConflictException({
        error: 'INVOICE_NOT_OPEN',
        message: 'This invoice is paid or void already.',
      });
    }
    const api = this.stripe.client;
    // An older checkout page for it stops working: only the newest can be paid.
    if (invoice.checkoutSessionId) {
      await api.checkout.sessions.expire(invoice.checkoutSessionId).catch(() => undefined);
    }
    const account = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { email: true },
    });
    const back = `${this.config.get('WEB_APP_URL').replace(/\/+$/, '')}/${locale}/client/invoices/${invoice.id}`;
    const session = await api.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: invoice.currency.toLowerCase(),
            unit_amount: invoice.amountMinor,
            product_data: {
              name: `Invoice ${reference('H', invoice.number)} — ${invoice.project.title}`,
            },
          },
          quantity: 1,
        },
      ],
      ...(account.email ? { customer_email: account.email } : {}),
      success_url: `${back}?paid=1`,
      cancel_url: back,
      client_reference_id: invoice.id,
      metadata: { purpose: PAYMENT_PURPOSE, hubInvoiceId: invoice.id },
      payment_intent_data: { metadata: { purpose: PAYMENT_PURPOSE, hubInvoiceId: invoice.id } },
      locale: locale === 'en' ? 'en' : 'auto',
    });
    await this.prisma.hubInvoice.update({
      where: { id: invoice.id },
      data: { checkoutSessionId: session.id },
    });
    return { url: session.url! };
  }

  /** Staff void an unpaid invoice (with a reason): the posting is reversed. */
  /** A checkout page left open for an invoice that's paid or void now stops working. */
  private async closeCheckout(sessionId: string | null) {
    if (!sessionId || !this.stripe.cardsAvailable) return;
    await this.stripe.client.checkout.sessions.expire(sessionId).catch(() => undefined);
  }

  async void(invoiceId: string, reason: string, staff: AuthUser, ctx: RequestContext) {
    const before = await this.prisma.hubInvoice.findUnique({
      where: { id: invoiceId },
      select: { checkoutSessionId: true },
    });
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM hub_invoices WHERE id = ${invoiceId}::uuid FOR UPDATE`;
      const invoice = await tx.hubInvoice.findUnique({
        where: { id: invoiceId },
        include: { project: { select: { title: true } } },
      });
      if (!invoice) throw invoiceNotFound();
      if (invoice.status !== 'OPEN') {
        throw new ConflictException({
          error: 'INVOICE_NOT_OPEN',
          message: 'Only an unpaid invoice can be voided.',
        });
      }
      await tx.hubInvoice.update({
        where: { id: invoiceId },
        data: {
          status: 'VOID',
          voidedAt: new Date(),
          voidReason: reason.trim(),
          checkoutSessionId: null,
        },
      });
      await this.ledger.post(
        {
          kind: 'invoice.voided',
          memo: `Invoice ${reference('H', invoice.number)} voided: ${reason.trim()}`,
          currency: invoice.currency,
          refType: 'HubInvoice',
          refId: invoice.id,
          idempotencyKey: `hub-invoice:${invoice.id}:voided`,
          createdById: staff.id,
          lines: [
            {
              type: 'PROJECT_FUNDS',
              owner: invoice.projectId,
              side: 'DEBIT',
              amountMinor: invoice.amountMinor,
            },
            {
              type: 'CLIENT_RECEIVABLE',
              owner: invoice.orgId,
              side: 'CREDIT',
              amountMinor: invoice.amountMinor,
            },
          ],
        },
        tx,
      );
      await this.audit.record(
        {
          actor: { id: staff.id, roleKey: staff.roleKey },
          action: 'hub.invoice_void',
          entityType: 'HubInvoice',
          entityId: invoice.id,
          after: { reason: reason.trim() },
          context: ctx,
        },
        tx,
      );
    });
    await this.closeCheckout(before?.checkoutSessionId ?? null);
  }

  // ── The project's status follows its quotes and invoices ────────────────

  /**
   * Works out a project's status from its quotes and invoices: scoping until the main
   * quote is sent, waiting for the deposit, active while the team works, delivered
   * once the client accepted it, completed when everything is paid and shared out.
   */
  async refreshStatus(tx: Tx, projectId: string) {
    const project = await tx.hubProject.findUniqueOrThrow({
      where: { id: projectId },
      include: { quotes: { include: { invoices: true } } },
    });
    if (project.status === 'CANCELLED') return project.status;
    const main = project.quotes.find((q) => q.kind === 'MAIN' && q.status === 'APPROVED');
    let status: typeof project.status;
    if (!main) {
      status = project.quotes.some((q) => q.kind === 'MAIN' && q.status === 'SENT')
        ? 'QUOTED'
        : 'SCOPING';
    } else if (main.invoices.some((i) => i.kind === 'DEPOSIT' && i.status === 'OPEN')) {
      status = 'AWAITING_DEPOSIT';
    } else if (!main.acceptedAt) {
      status = 'ACTIVE';
    } else {
      const approved = project.quotes.filter((q) => q.status === 'APPROVED');
      const invoices = approved.flatMap((q) => q.invoices).filter((i) => i.status !== 'VOID');
      const done =
        approved.every((q) => q.acceptedAt) &&
        invoices.every((i) => i.status === 'PAID' && i.distributedAt) &&
        !project.quotes.some((q) => q.status === 'SENT');
      status = done ? 'COMPLETED' : 'DELIVERED';
    }
    if (status !== project.status) {
      await tx.hubProject.update({
        where: { id: projectId },
        data: { status, ...(status === 'COMPLETED' ? { completedAt: new Date() } : {}) },
      });
    }
    return status;
  }

  // ── Lists ────────────────────────────────────────────────────────────────

  private toDto(
    invoice: Prisma.HubInvoiceGetPayload<{ include: typeof INVOICE_INCLUDE }>,
  ): HubInvoiceDto {
    return this.projects.invoice(invoice.project, invoice);
  }

  async forClient(user: AuthUser): Promise<HubInvoiceDto[]> {
    const member = await this.clients.membership(user);
    const rows = await this.prisma.hubInvoice.findMany({
      where: { orgId: member.orgId },
      orderBy: { number: 'desc' },
      take: 200,
      include: INVOICE_INCLUDE,
    });
    return rows.map((row) => this.toDto(row));
  }

  async oneForClient(user: AuthUser, invoiceId: string): Promise<HubInvoiceDto> {
    const member = await this.clients.membership(user);
    const row = await this.prisma.hubInvoice.findFirst({
      where: { id: invoiceId, orgId: member.orgId },
      include: INVOICE_INCLUDE,
    });
    if (!row) throw invoiceNotFound();
    return this.toDto(row);
  }

  async forStaff(status?: 'OPEN' | 'PAID' | 'VOID'): Promise<HubInvoiceDto[]> {
    const rows = await this.prisma.hubInvoice.findMany({
      where: status ? { status } : {},
      orderBy: { number: 'desc' },
      take: 300,
      include: INVOICE_INCLUDE,
    });
    return rows.map((row) => this.toDto(row));
  }
}
