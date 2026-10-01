import type { Payout, Prisma } from '@kcp/database';
import { PAYOUT_MIN_MINOR, withholdingOf } from '@kcp/shared';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  type OnModuleInit,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import type { Redis } from 'ioredis';
import { AuditService } from '../audit/audit.service.js';
import { formatMoney, minorDigits } from '../common/format.js';
import type { RequestContext } from '../common/request-context.js';
import { AppConfigService } from '../config/app-config.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service.js';
import { MailService } from '../mail/mail.service.js';
import { toMailLanguage } from '../mail/templates.js';
import type { AuthUser } from '../permissions/auth-user.js';
import { REDIS } from '../redis/redis.constants.js';
import { reference } from './clients.service.js';
import type {
  AdminPayoutDto,
  CreateBatchDto,
  LeadPayableDto,
  PayLeadDto,
  PayoutBatchDetailDto,
  PayoutBatchDto,
  PayoutDto,
  ReadyToPayDto,
} from './dto/payouts.dto.js';
import { HubEarningsService, payoutDto } from './earnings.service.js';
import { LedgerService } from './ledger/ledger.service.js';
import { accountState, PayoutAccountsService } from './payout-accounts.service.js';
import {
  FAILED_STATES,
  PAID_STATES,
  PayoutsApiError,
  type TransferStateEvent,
} from './payouts/payouts-api.js';
import { WiseGateway } from './payouts/wise.gateway.js';

const FLAG = 'hub_payouts';
const LOCK_SECONDS = 25 * 60;
const SUPER_ADMIN = 'super_admin';

type Tx = Prisma.TransactionClient;

const BATCH_INCLUDE = {
  createdBy: { select: { displayName: true, email: true } },
  firstApprovedBy: { select: { displayName: true, email: true } },
  secondApprovedBy: { select: { displayName: true, email: true } },
  payouts: {
    orderBy: { number: 'asc' },
    include: {
      account: { select: { kind: true, last4: true } },
      student: { select: { studentProfile: { select: { nickname: true } } } },
      parent: { select: { displayName: true, email: true } },
    },
  },
} satisfies Prisma.PayoutBatchInclude;
type LoadedBatch = Prisma.PayoutBatchGetPayload<{ include: typeof BATCH_INCLUDE }>;

const PARENT_PAYOUT_INCLUDE = {
  account: { select: { last4: true } },
  batch: { select: { status: true } },
  student: { select: { studentProfile: { select: { nickname: true } } } },
} satisfies Prisma.PayoutInclude;

const nameOf = (user: { displayName: string | null; email: string | null } | null) =>
  user?.displayName ?? user?.email ?? '';

const batchNotFound = () =>
  new NotFoundException({ error: 'BATCH_NOT_FOUND', message: 'No such payout batch.' });
const payoutsOff = () =>
  new ConflictException({
    error: 'PAYOUTS_OFF',
    message: 'Payouts are switched off (feature flag hub_payouts) until the legal sign-off.',
  });
const payoutChanged = () =>
  new ConflictException({
    error: 'PAYOUT_CHANGED',
    message: 'This payout changed meanwhile (Wise answered): reload.',
  });
const payoutNotFound = () =>
  new NotFoundException({ error: 'PAYOUT_NOT_FOUND', message: 'No such payout.' });

/** An amount in its currency's main unit, as Wise wants it ("12.50"). */
export function toDecimal(amountMinor: number, currency: string): string {
  const digits = minorDigits(currency);
  return (amountMinor / 10 ** digits).toFixed(digits);
}

/**
 * Payouts of students' payable earnings to their parents. Staff make a batch (one
 * currency); each parent confirms their payout; two different super admins approve the
 * batch; then it's sent — through Wise (or its mock), or paid by hand and recorded one by
 * one. Nothing moves while the `hub_payouts` flag is off (until the lawyer signs off).
 * Every step is in the ledger and the audit log.
 */
@Injectable()
export class PayoutsService implements OnModuleInit {
  private readonly logger = new Logger(PayoutsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly accounts: PayoutAccountsService,
    private readonly earnings: HubEarningsService,
    private readonly wise: WiseGateway,
    private readonly flags: FeatureFlagsService,
    private readonly audit: AuditService,
    private readonly mail: MailService,
    private readonly config: AppConfigService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  onModuleInit() {
    this.wise.useLocalWebhookHandler((rawBody, signature) => this.webhook(rawBody, signature));
  }

  // ── Who gets paid ────────────────────────────────────────────────────────

  /**
   * The parent who receives a student's earnings: who last agreed to the parent agreement
   * (and hasn't taken it back); after it was taken back, who agreed last, so money earned
   * before still reaches the family. The other parents are told when it changes.
   */
  async payee(studentId: string, db: PrismaService | Tx = this.prisma): Promise<string | null> {
    const where = { childId: studentId, type: 'EARNINGS' as const, parent: { deletedAt: null } };
    const consent =
      (await db.consentRecord.findFirst({
        where: { ...where, revokedAt: null },
        orderBy: { grantedAt: 'desc' },
        select: { parentId: true },
      })) ??
      (await db.consentRecord.findFirst({
        where,
        orderBy: { grantedAt: 'desc' },
        select: { parentId: true },
      }));
    return consent?.parentId ?? null;
  }

  /** Students with payable money (staff's "ready to pay" list). */
  async ready(currency?: string): Promise<ReadyToPayDto[]> {
    const payable = (await this.ledger.balances('STUDENT_PAYABLE', currency ?? null)).filter(
      (row) => row.balance > 0,
    );
    const held = await this.ledger.balances('STUDENT_HELD', currency ?? null);
    const ids = [...new Set(payable.map((row) => row.owner))];
    const [students, busy] = await Promise.all([
      this.prisma.user.findMany({
        where: { id: { in: ids } },
        select: { id: true, studentProfile: { select: { nickname: true } } },
      }),
      this.earnings.inProgress(ids),
    ]);
    const out: ReadyToPayDto[] = [];
    for (const row of payable) {
      const parentId = await this.payee(row.owner);
      const parent = parentId
        ? await this.prisma.user.findUnique({
            where: { id: parentId },
            select: { displayName: true, email: true },
          })
        : null;
      const account = parentId ? await this.accounts.live(parentId) : null;
      out.push({
        studentId: row.owner,
        nickname: students.find((s) => s.id === row.owner)?.studentProfile?.nickname ?? '',
        currency: row.currency,
        payableMinor: row.balance,
        heldMinor:
          held.find((h) => h.owner === row.owner && h.currency === row.currency)?.balance ?? 0,
        parentId,
        parentName: parent ? nameOf(parent) : null,
        accountId: account?.id ?? null,
        accountKind: account?.kind ?? null,
        accountState: account ? accountState(account) : null,
        inProgress: busy.has(row.owner),
      });
    }
    return out.toSorted((a, b) => b.payableMinor - a.payableMinor);
  }

  // ── Batches ──────────────────────────────────────────────────────────────

  private batchDto(batch: LoadedBatch): PayoutBatchDto {
    const count = (statuses: string[]) =>
      batch.payouts.filter((p) => statuses.includes(p.status)).length;
    return {
      id: batch.id,
      reference: reference('B', batch.number),
      currency: batch.currency,
      provider: batch.provider,
      status: batch.status,
      note: batch.note,
      createdByName: nameOf(batch.createdBy),
      createdAt: batch.createdAt,
      approvals: [
        ...(batch.firstApprovedAt
          ? [{ name: nameOf(batch.firstApprovedBy), at: batch.firstApprovedAt }]
          : []),
        ...(batch.secondApprovedAt
          ? [{ name: nameOf(batch.secondApprovedBy), at: batch.secondApprovedAt }]
          : []),
      ],
      sentAt: batch.sentAt,
      payoutCount: batch.payouts.length,
      confirmedCount: count(['CONFIRMED', 'SENDING', 'SENT', 'PAID']),
      paidCount: count(['PAID']),
      failedCount: count(['FAILED']),
      totalNetMinor: batch.payouts
        .filter((p) => p.status !== 'CANCELLED')
        .reduce((sum, p) => sum + p.netMinor, 0),
    };
  }

  private payoutAdminDto(payout: LoadedBatch['payouts'][number]): AdminPayoutDto {
    return {
      id: payout.id,
      reference: reference('PO', payout.number),
      studentId: payout.studentId,
      nickname: payout.student.studentProfile?.nickname ?? '',
      parentId: payout.parentId,
      parentName: nameOf(payout.parent),
      accountKind: payout.account.kind,
      accountLast4: payout.account.last4,
      currency: payout.currency,
      amountMinor: payout.amountMinor,
      withheldMinor: payout.withheldMinor,
      netMinor: payout.netMinor,
      status: payout.status,
      parentConfirmedAt: payout.parentConfirmedAt,
      providerTransferId: payout.providerTransferId,
      providerStatus: payout.providerStatus,
      failureReason: payout.failureReason,
      method: payout.method,
      paymentReference: payout.reference,
      sentAt: payout.sentAt,
      paidAt: payout.paidAt,
      failedAt: payout.failedAt,
    };
  }

  async batches(): Promise<PayoutBatchDto[]> {
    const rows = await this.prisma.payoutBatch.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: BATCH_INCLUDE,
    });
    return rows.map((row) => this.batchDto(row));
  }

  async batch(id: string): Promise<PayoutBatchDetailDto> {
    const batch = await this.prisma.payoutBatch.findUnique({
      where: { id },
      include: BATCH_INCLUDE,
    });
    if (!batch) throw batchNotFound();
    return { ...this.batchDto(batch), payouts: batch.payouts.map((p) => this.payoutAdminDto(p)) };
  }

  /**
   * A batch of everyone ready to be paid in this currency: payable money of at least the
   * minimum, no payout in progress, and a parent account that can be paid (an IBAN for
   * Wise). Parents are asked to confirm.
   */
  async createBatch(staff: AuthUser, dto: CreateBatchDto, ctx: RequestContext) {
    if (dto.provider === 'WISE') this.wise.requireProvider();
    const now = new Date();
    const candidates = (await this.ready(dto.currency)).filter(
      (row) =>
        row.payableMinor >= PAYOUT_MIN_MINOR &&
        !row.inProgress &&
        row.accountState === 'READY' &&
        (dto.provider === 'MANUAL' || row.accountKind === 'IBAN'),
    );
    if (!candidates.length) {
      throw new ConflictException({
        error: 'NOTHING_TO_PAY',
        message: 'No one is ready to be paid in this currency.',
      });
    }
    // Only students in countries where payouts are on (parents aren't asked to confirm
    // money that can't be sent).
    const countries = await this.prisma.user.findMany({
      where: { id: { in: candidates.map((row) => row.studentId) } },
      select: { id: true, countryCode: true },
    });
    const ready: ReadyToPayDto[] = [];
    for (const row of candidates) {
      const code = countries.find((c) => c.id === row.studentId)?.countryCode ?? null;
      if (await this.flags.isEnabled(FLAG, code)) ready.push(row);
    }
    if (!ready.length) throw payoutsOff();
    const id = await this.prisma.$transaction(async (tx) => {
      // One batch made at a time (a student's money goes into one payout).
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('payout-batches'))`;
      const batch = await tx.payoutBatch.create({
        data: {
          currency: dto.currency,
          provider: dto.provider,
          note: dto.note?.trim() || null,
          createdById: staff.id,
        },
      });
      for (const row of ready) {
        const open = await tx.payout.count({
          where: {
            studentId: row.studentId,
            status: { in: ['AWAITING_PARENT', 'CONFIRMED', 'SENDING', 'SENT'] },
          },
        });
        const balance = await this.ledger.balance(
          'STUDENT_PAYABLE',
          dto.currency,
          row.studentId,
          tx,
        );
        if (open || balance < PAYOUT_MIN_MINOR || !row.parentId || !row.accountId) continue;
        const country = await tx.user.findUnique({
          where: { id: row.studentId },
          select: { country: { select: { hubWithholdingBp: true } } },
        });
        const withheld = withholdingOf(balance, country?.country?.hubWithholdingBp ?? 0);
        await tx.payout.create({
          data: {
            batchId: batch.id,
            studentId: row.studentId,
            parentId: row.parentId,
            accountId: row.accountId,
            currency: dto.currency,
            amountMinor: balance,
            withheldMinor: withheld,
            netMinor: balance - withheld,
          },
        });
      }
      await this.audit.record(
        {
          actor: { id: staff.id, roleKey: staff.roleKey },
          action: 'payout.batch_create',
          entityType: 'PayoutBatch',
          entityId: batch.id,
          after: { currency: dto.currency, provider: dto.provider, payouts: ready.length },
          context: ctx,
        },
        tx,
      );
      return batch.id;
    });
    const made = await this.batch(id);
    for (const payout of made.payouts) await this.tellParent(payout.id, 'hubPayoutConfirm');
    this.logger.log(
      `Payout batch ${made.reference}: ${made.payoutCount} payouts (${now.toISOString()})`,
    );
    return made;
  }

  private assertSuperAdmin(user: AuthUser) {
    if (user.roleKey !== SUPER_ADMIN) {
      throw new ForbiddenException({
        error: 'SUPER_ADMIN_ONLY',
        message: 'Only a super admin can do this.',
      });
    }
  }

  /**
   * Students' payouts follow the `hub_payouts` flag in their country (the legal sign-off
   * is per country); lead developers' pay needs it on somewhere.
   */
  private async assertPayoutsOn(studentIds?: string[]) {
    if (!studentIds) {
      if (!(await this.flags.isOnSomewhere(FLAG))) throw payoutsOff();
      return;
    }
    const students = await this.prisma.user.findMany({
      where: { id: { in: [...new Set(studentIds)] } },
      select: { countryCode: true },
    });
    for (const code of new Set(students.map((s) => s.countryCode))) {
      if (!(await this.flags.isEnabled(FLAG, code))) throw payoutsOff();
    }
  }

  /** A super admin approves; the second approval (by someone else) approves the batch. */
  async approve(staff: AuthUser, id: string, ctx: RequestContext): Promise<PayoutBatchDetailDto> {
    this.assertSuperAdmin(staff);
    const batch = await this.prisma.payoutBatch.findUnique({ where: { id } });
    if (!batch) throw batchNotFound();
    if (batch.status !== 'DRAFT') {
      throw new ConflictException({
        error: 'BATCH_NOT_DRAFT',
        message: 'This batch isn’t waiting for approval.',
      });
    }
    const now = new Date();
    let done;
    if (!batch.firstApprovedById) {
      done = await this.prisma.payoutBatch.updateMany({
        where: { id, status: 'DRAFT', firstApprovedById: null },
        data: { firstApprovedById: staff.id, firstApprovedAt: now },
      });
    } else {
      if (batch.firstApprovedById === staff.id) {
        throw new ConflictException({
          error: 'SECOND_APPROVER_NEEDED',
          message: 'You approved already: a different super admin approves next.',
        });
      }
      done = await this.prisma.payoutBatch.updateMany({
        where: {
          id,
          status: 'DRAFT',
          firstApprovedById: batch.firstApprovedById,
          secondApprovedById: null,
        },
        data: { secondApprovedById: staff.id, secondApprovedAt: now, status: 'APPROVED' },
      });
    }
    if (!done.count) {
      throw new ConflictException({
        error: 'BATCH_CHANGED',
        message: 'Someone else changed this batch: reload.',
      });
    }
    await this.audit.record({
      actor: { id: staff.id, roleKey: staff.roleKey },
      action: 'payout.batch_approve',
      entityType: 'PayoutBatch',
      entityId: id,
      after: { second: Boolean(batch.firstApprovedById) },
      context: ctx,
    });
    return this.batch(id);
  }

  /**
   * Sends an approved batch: payouts their parents didn't confirm are left out; Wise
   * batches go to Wise now; manual ones wait for staff to record each payment.
   */
  async send(staff: AuthUser, id: string, ctx: RequestContext): Promise<PayoutBatchDetailDto> {
    this.assertSuperAdmin(staff);
    const batch = await this.prisma.payoutBatch.findUnique({
      where: { id },
      include: { payouts: { where: { status: 'CONFIRMED' }, select: { studentId: true } } },
    });
    if (!batch) throw batchNotFound();
    // The payouts that will go (unconfirmed ones are left out below).
    await this.assertPayoutsOn(batch.payouts.map((p) => p.studentId));
    if (batch.provider === 'WISE') this.wise.requireProvider();
    const claimed = await this.prisma.payoutBatch.updateMany({
      where: { id, status: 'APPROVED' },
      data: { status: 'SENT', sentAt: new Date() },
    });
    if (!claimed.count) {
      throw new ConflictException({
        error: 'BATCH_NOT_APPROVED',
        message: 'Two super admins approve a batch before it’s sent.',
      });
    }
    await this.prisma.payout.updateMany({
      where: { batchId: id, status: 'AWAITING_PARENT' },
      data: { status: 'CANCELLED', failureReason: 'NOT_CONFIRMED' },
    });
    await this.audit.record({
      actor: { id: staff.id, roleKey: staff.roleKey },
      action: 'payout.batch_send',
      entityType: 'PayoutBatch',
      entityId: id,
      context: ctx,
    });
    if (batch.provider === 'WISE') {
      const payouts = await this.prisma.payout.findMany({
        where: { batchId: id, status: 'CONFIRMED' },
        orderBy: { number: 'asc' },
      });
      for (const payout of payouts) await this.sendOne(payout);
    }
    return this.batch(id);
  }

  /** Hands one confirmed payout to Wise. A refusal leaves the money payable (FAILED). */
  private async sendOne(payout: Payout) {
    const claimed = await this.prisma.payout.updateMany({
      where: { id: payout.id, status: 'CONFIRMED' },
      data: { status: 'SENDING' },
    });
    if (!claimed.count) return;
    const account = await this.prisma.payoutAccount.findUniqueOrThrow({
      where: { id: payout.accountId },
    });
    if (account.removedAt || accountState(account) !== 'READY' || account.kind !== 'IBAN') {
      await this.notSent(payout, 'ACCOUNT_NOT_READY', 'CANCELLED');
      return;
    }
    const balance = await this.ledger.balance('STUDENT_PAYABLE', payout.currency, payout.studentId);
    if (balance < payout.amountMinor) {
      await this.notSent(payout, 'BALANCE_CHANGED', 'CANCELLED');
      return;
    }
    await this.transfer(payout);
  }

  /** A payout that never reached Wise: the money stays payable. */
  private async notSent(
    payout: Payout,
    reason: string,
    status: 'FAILED' | 'CANCELLED',
  ): Promise<boolean> {
    // Never once a transfer is known for it (it may still pay out).
    const done = await this.prisma.payout.updateMany({
      where: { id: payout.id, status: 'SENDING', providerTransferId: null },
      data: {
        status,
        failureReason: reason.slice(0, 300),
        failedAt: status === 'FAILED' ? new Date() : null,
      },
    });
    return done.count > 0;
  }

  /**
   * Makes (or, on a retry, finds) the payout's transfer at Wise. Once the transfer
   * exists the payout is SENT, even if funding it fails (Wise then cancels it, which
   * comes back as a failed state and the money is payable again): a payout is never
   * marked failed while a transfer for it may still pay out. With no clear answer when
   * making the transfer, it stays SENDING, and the status job asks again (the same
   * customerTransactionId is the same transfer at Wise).
   */
  private async transfer(payout: Payout, retry = false) {
    let transferId: string | null = null;
    try {
      const account = await this.prisma.payoutAccount.findUniqueOrThrow({
        where: { id: payout.accountId },
      });
      let recipientId = account.providerRecipientId;
      if (!recipientId) {
        const details = this.accounts.details(account);
        recipientId = await this.wise.client.createRecipient({
          holderName: details.holderName,
          iban: details.iban ?? '',
          currency: account.currency,
          countryCode: account.countryCode,
        });
        await this.prisma.payoutAccount.update({
          where: { id: account.id },
          data: { providerRecipientId: recipientId },
        });
      }
      const sent = await this.wise.client.send(
        {
          recipientId,
          sourceCurrency: payout.currency,
          targetCurrency: account.currency,
          sourceAmount: toDecimal(payout.netMinor, payout.currency),
          customerTransactionId: payout.id,
          reference: `KCP${payout.number}`,
        },
        async (id) => {
          // Only while it's still sending (not settled meanwhile): otherwise stop here,
          // before the transfer is funded.
          const saved = await this.prisma.payout.updateMany({
            where: {
              id: payout.id,
              status: 'SENDING',
              OR: [{ providerTransferId: null }, { providerTransferId: id }],
            },
            data: { providerTransferId: id },
          });
          if (!saved.count) throw new Error(`payout no longer sending: transfer ${id} not funded`);
          transferId = id;
        },
      );
      // A retry can find the transfer finished already: its state counts at once (and if
      // that fails, "unknown" makes the status job ask Wise again).
      const final = PAID_STATES.has(sent.status) || FAILED_STATES.has(sent.status);
      await this.markSent(payout, sent.transferId, final ? 'unknown' : sent.status);
      if (final) await this.apply(sent.transferId, sent.status);
    } catch (error) {
      const message =
        error instanceof PayoutsApiError ? error.message : `Not sent: ${(error as Error).message}`;
      const name = reference('PO', payout.number);
      if (transferId) {
        // The transfer exists: it's on its way, or Wise will say what became of it.
        this.logger.warn(`Payout ${name}: transfer ${transferId} made, then: ${message}`);
        await this.markSent(payout, transferId, 'unknown', message).catch((e: Error) =>
          this.logger.error(
            `Payout ${name} not saved as sent (the status job retries): ${e.message}`,
          ),
        );
      } else if (retry || (error instanceof PayoutsApiError && error.unclear)) {
        // After one unclear attempt a transfer may exist whatever Wise says now: the
        // payout stays sending (never failed, so it can't be paid twice) until Wise
        // shows the transfer, or staff settle it.
        const log = retry ? 'error' : 'warn';
        this.logger[log](
          `Payout ${name}: no clear answer from Wise (${message}), asking again later`,
        );
        await this.prisma.payout.updateMany({
          where: { id: payout.id, status: 'SENDING' },
          data: { failureReason: `UNCLEAR: ${message}`.slice(0, 300) },
        });
      } else {
        this.logger.warn(`Payout ${name} failed: ${message}`);
        await this.notSent(payout, message, 'FAILED');
      }
    }
  }

  /** SENDING → SENT with its transfer: the money leaves the student's payable balance. */
  private async markSent(payout: Payout, transferId: string, status: string, note?: string) {
    await this.prisma.$transaction(async (tx) => {
      const done = await tx.payout.updateMany({
        where: {
          id: payout.id,
          status: 'SENDING',
          OR: [{ providerTransferId: null }, { providerTransferId: transferId }],
        },
        data: {
          status: 'SENT',
          providerTransferId: transferId,
          providerStatus: status,
          sentAt: new Date(),
          failureReason: note ? note.slice(0, 300) : null,
        },
      });
      if (done.count) await this.postSent(tx, payout);
    });
  }

  /** The money leaves the student's payable balance (withholding set aside). */
  private async postSent(tx: Tx, payout: Payout) {
    await this.ledger.post(
      {
        kind: 'payout.sent',
        memo: `${reference('PO', payout.number)} sent`,
        currency: payout.currency,
        refType: 'Payout',
        refId: payout.id,
        idempotencyKey: `payout.sent:${payout.id}`,
        lines: [
          {
            type: 'STUDENT_PAYABLE',
            owner: payout.studentId,
            side: 'DEBIT',
            amountMinor: payout.amountMinor,
          },
          { type: 'PAYOUT_CLEARING', side: 'CREDIT', amountMinor: payout.netMinor },
          { type: 'TAX_WITHHELD', side: 'CREDIT', amountMinor: payout.withheldMinor },
        ],
      },
      tx,
    );
  }

  private async postPaid(tx: Tx, payout: Payout) {
    await this.ledger.post(
      {
        kind: 'payout.paid',
        memo: `${reference('PO', payout.number)} paid`,
        currency: payout.currency,
        refType: 'Payout',
        refId: payout.id,
        idempotencyKey: `payout.paid:${payout.id}`,
        lines: [
          { type: 'PAYOUT_CLEARING', side: 'DEBIT', amountMinor: payout.netMinor },
          { type: 'CASH', side: 'CREDIT', amountMinor: payout.netMinor },
        ],
      },
      tx,
    );
  }

  /** Manual batches: staff paid it outside the platform; it's recorded (sent and paid). */
  async record(
    staff: AuthUser,
    payoutId: string,
    dto: { method: string; reference: string },
    ctx: RequestContext,
  ): Promise<PayoutBatchDetailDto> {
    const payout = await this.prisma.payout.findUnique({
      where: { id: payoutId },
      include: { batch: true },
    });
    if (!payout) throw payoutNotFound();
    await this.assertPayoutsOn([payout.studentId]);
    if (payout.batch.provider !== 'MANUAL' || payout.batch.status !== 'SENT') {
      throw new ConflictException({
        error: 'NOT_MANUAL',
        message: 'Only payouts of a sent manual batch are recorded by hand.',
      });
    }
    await this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const done = await tx.payout.updateMany({
        where: { id: payoutId, status: 'CONFIRMED' },
        data: {
          status: 'PAID',
          method: dto.method.trim(),
          reference: dto.reference.trim(),
          recordedById: staff.id,
          sentAt: now,
          paidAt: now,
        },
      });
      if (!done.count) {
        throw new ConflictException({
          error: 'PAYOUT_NOT_CONFIRMED',
          message: 'This payout isn’t waiting to be paid.',
        });
      }
      const balance = await this.ledger.balance(
        'STUDENT_PAYABLE',
        payout.currency,
        payout.studentId,
        tx,
      );
      if (balance < payout.amountMinor) {
        throw new ConflictException({
          error: 'BALANCE_CHANGED',
          message: 'The student’s payable money changed: cancel this payout.',
        });
      }
      await this.postSent(tx, payout);
      await this.postPaid(tx, payout);
      await this.audit.record(
        {
          actor: { id: staff.id, roleKey: staff.roleKey },
          action: 'payout.record',
          entityType: 'Payout',
          entityId: payoutId,
          after: { method: dto.method.trim(), reference: dto.reference.trim() },
          context: ctx,
        },
        tx,
      );
    });
    await this.tellParent(payoutId, 'hubPayoutPaid');
    return this.batch(payout.batchId);
  }

  /**
   * A payout stuck in "sending" (no clear answer from Wise), settled by a super admin
   * after looking it up in Wise by its reference: Wise has a transfer for it (it's
   * sent, and Wise's state follows), or it has none (failed: the money is payable).
   */
  async settle(
    staff: AuthUser,
    payoutId: string,
    dto: { outcome: 'TRANSFER_FOUND' | 'NO_TRANSFER'; transferId?: string; reason: string },
    ctx: RequestContext,
  ): Promise<PayoutBatchDetailDto> {
    this.assertSuperAdmin(staff);
    const payout = await this.prisma.payout.findUnique({ where: { id: payoutId } });
    if (!payout) throw payoutNotFound();
    if (payout.status !== 'SENDING') {
      throw new ConflictException({
        error: 'PAYOUT_NOT_SENDING',
        message: 'Only a payout stuck in “sending” is settled by hand.',
      });
    }
    if (dto.outcome === 'TRANSFER_FOUND') {
      const transferId = payout.providerTransferId ?? dto.transferId;
      if (!transferId) {
        throw new BadRequestException({
          error: 'TRANSFER_ID_NEEDED',
          message: 'Give Wise’s transfer ID.',
        });
      }
      // The transfer must be this payout's: made with its ID as customerTransactionId.
      const found = await this.wise.client.lookup(transferId).catch(() => null);
      if (!found || found.customerTransactionId !== payout.id) {
        throw new ConflictException({
          error: 'TRANSFER_NOT_THIS_PAYOUT',
          message: `Wise has no transfer ${transferId} for ${reference('PO', payout.number)}.`,
        });
      }
      await this.markSent(payout, transferId, 'unknown', `Settled by staff: ${dto.reason.trim()}`);
      const now = await this.prisma.payout.findUniqueOrThrow({ where: { id: payoutId } });
      if (now.status !== 'SENT' && now.status !== 'PAID' && now.status !== 'FAILED') {
        throw payoutChanged();
      }
      await this.apply(transferId, found.status);
    } else {
      if (payout.providerTransferId) {
        throw new ConflictException({
          error: 'TRANSFER_KNOWN',
          message: 'Wise made a transfer for this payout: it can’t be marked as not sent.',
        });
      }
      if (!(await this.notSent(payout, `NO_TRANSFER: ${dto.reason.trim()}`, 'FAILED'))) {
        throw payoutChanged();
      }
    }
    await this.audit.record({
      actor: { id: staff.id, roleKey: staff.roleKey },
      action: 'payout.settle',
      entityType: 'Payout',
      entityId: payoutId,
      after: {
        outcome: dto.outcome,
        transferId: dto.transferId ?? null,
        reason: dto.reason.trim(),
      },
      context: ctx,
    });
    return this.batch(payout.batchId);
  }

  /** Staff take one payout out (not yet sent): the money stays payable. */
  async cancelPayout(staff: AuthUser, payoutId: string, reason: string, ctx: RequestContext) {
    const payout = await this.prisma.payout.findUnique({ where: { id: payoutId } });
    if (!payout) throw payoutNotFound();
    const done = await this.prisma.payout.updateMany({
      where: { id: payoutId, status: { in: ['AWAITING_PARENT', 'CONFIRMED'] } },
      data: { status: 'CANCELLED', failureReason: reason.trim() },
    });
    if (!done.count) {
      throw new ConflictException({
        error: 'PAYOUT_SENT',
        message: 'This payout was sent already.',
      });
    }
    await this.audit.record({
      actor: { id: staff.id, roleKey: staff.roleKey },
      action: 'payout.cancel',
      entityType: 'Payout',
      entityId: payoutId,
      after: { reason: reason.trim() },
      context: ctx,
    });
    return this.batch(payout.batchId);
  }

  async cancelBatch(
    staff: AuthUser,
    id: string,
    ctx: RequestContext,
  ): Promise<PayoutBatchDetailDto> {
    const done = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.payoutBatch.updateMany({
        where: { id, status: { in: ['DRAFT', 'APPROVED'] } },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
      });
      if (!claimed.count) return false;
      await tx.payout.updateMany({
        where: { batchId: id, status: { in: ['AWAITING_PARENT', 'CONFIRMED'] } },
        data: { status: 'CANCELLED', failureReason: 'BATCH_CANCELLED' },
      });
      return true;
    });
    if (!done) {
      if (!(await this.prisma.payoutBatch.count({ where: { id } }))) throw batchNotFound();
      throw new ConflictException({ error: 'BATCH_SENT', message: 'This batch was sent already.' });
    }
    await this.audit.record({
      actor: { id: staff.id, roleKey: staff.roleKey },
      action: 'payout.batch_cancel',
      entityType: 'PayoutBatch',
      entityId: id,
      context: ctx,
    });
    return this.batch(id);
  }

  // ── Parents ──────────────────────────────────────────────────────────────

  async forParent(user: AuthUser): Promise<PayoutDto[]> {
    const rows = await this.prisma.payout.findMany({
      where: { parentId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: PARENT_PAYOUT_INCLUDE,
    });
    return rows.map((row) => payoutDto(row, true));
  }

  private async parentPayout(user: AuthUser, payoutId: string) {
    const payout = await this.prisma.payout.findUnique({
      where: { id: payoutId },
      include: { batch: { select: { status: true } } },
    });
    if (!payout || payout.parentId !== user.id) throw payoutNotFound();
    return payout;
  }

  /** The parent confirms the account and amount: the payout can be sent. */
  async confirm(user: AuthUser, payoutId: string, ctx: RequestContext): Promise<PayoutDto[]> {
    const payout = await this.parentPayout(user, payoutId);
    const done = await this.prisma.payout.updateMany({
      where: {
        id: payoutId,
        status: 'AWAITING_PARENT',
        batch: { status: { in: ['DRAFT', 'APPROVED'] } },
        account: { removedAt: null },
      },
      data: { status: 'CONFIRMED', parentConfirmedAt: new Date() },
    });
    if (!done.count) {
      throw new ConflictException({
        error: 'PAYOUT_NOT_WAITING',
        message: 'This payout isn’t waiting for you.',
      });
    }
    await this.audit.record({
      actor: { id: user.id, roleKey: user.roleKey },
      action: 'payout.confirm',
      entityType: 'Payout',
      entityId: payout.id,
      context: ctx,
    });
    return this.forParent(user);
  }

  /** The parent says no (e.g. the account is wrong): the money waits for the next round. */
  async decline(user: AuthUser, payoutId: string, ctx: RequestContext): Promise<PayoutDto[]> {
    await this.parentPayout(user, payoutId);
    // Not once the batch is sent: staff may be paying it by hand right now.
    const done = await this.prisma.payout.updateMany({
      where: {
        id: payoutId,
        status: { in: ['AWAITING_PARENT', 'CONFIRMED'] },
        batch: { status: { in: ['DRAFT', 'APPROVED'] } },
      },
      data: { status: 'CANCELLED', failureReason: 'DECLINED_BY_PARENT' },
    });
    if (!done.count) {
      throw new ConflictException({
        error: 'PAYOUT_SENT',
        message: 'This payout was sent already.',
      });
    }
    await this.audit.record({
      actor: { id: user.id, roleKey: user.roleKey },
      action: 'payout.decline',
      entityType: 'Payout',
      entityId: payoutId,
      context: ctx,
    });
    return this.forParent(user);
  }

  // ── What Wise tells us ───────────────────────────────────────────────────

  /** A signed webhook from Wise (or the mock). */
  async webhook(rawBody: Buffer, signature: string): Promise<void> {
    if (!this.wise.verify(rawBody, signature)) {
      throw new BadRequestException({ error: 'BAD_SIGNATURE', message: 'Bad signature.' });
    }
    let event: TransferStateEvent;
    try {
      event = JSON.parse(rawBody.toString('utf8')) as TransferStateEvent;
    } catch {
      throw new BadRequestException({ error: 'BAD_EVENT', message: 'Not JSON.' });
    }
    if (event.event_type !== 'transfers#state-change') return;
    const transferId = event.data?.resource?.id;
    const state = event.data?.current_state;
    if (transferId === undefined || !state) return;
    const known = await this.apply(String(transferId), state);
    // A payout still being saved (the answer can come first): ask Wise to try again.
    // (Not for payouts left sending by an unclear answer: those the status job finds.)
    const fresh = new Date(Date.now() - 10 * 60_000);
    if (
      !known &&
      (await this.prisma.payout.count({ where: { status: 'SENDING', updatedAt: { gt: fresh } } }))
    ) {
      throw new ConflictException({ error: 'NOT_READY', message: 'Try again shortly.' });
    }
  }

  /**
   * A transfer's new state: paid, failed (the money is payable again), returned after
   * it was paid (the same, and staff are warned), or still on the way.
   */
  async apply(transferId: string, state: string): Promise<boolean> {
    let payout = await this.prisma.payout.findUnique({
      where: { providerTransferId: transferId },
    });
    if (!payout) return false;
    if (payout.status === 'SENDING') {
      // We heard from Wise before the payout was saved as sent (or a crash in between).
      await this.markSent(payout, transferId, state);
      payout = await this.prisma.payout.findUniqueOrThrow({ where: { id: payout.id } });
    }
    if (PAID_STATES.has(state)) {
      const paid = await this.prisma.$transaction(async (tx) => {
        const done = await tx.payout.updateMany({
          where: { id: payout.id, status: 'SENT' },
          data: { status: 'PAID', paidAt: new Date(), providerStatus: state },
        });
        if (done.count) await this.postPaid(tx, payout);
        return done.count > 0;
      });
      if (paid) await this.tellParent(payout.id, 'hubPayoutPaid');
    } else if (FAILED_STATES.has(state)) {
      let was: string | null = null;
      const failed = await this.prisma.$transaction(async (tx) => {
        // Read under a lock: a "paid" handled at the same moment decides which posting.
        const [row] = await tx.$queryRaw<{ status: string }[]>`
          SELECT status::text AS status FROM payouts WHERE id = ${payout.id}::uuid FOR UPDATE`;
        was = row?.status ?? null;
        if (was !== 'SENT' && was !== 'PAID') return false;
        const done = await tx.payout.updateMany({
          where: { id: payout.id, status: was },
          data: {
            status: 'FAILED',
            failedAt: new Date(),
            providerStatus: state,
            failureReason: was === 'PAID' ? `RETURNED_AFTER_PAID: ${state}` : state,
          },
        });
        if (!done.count) return false;
        // Sent: the money in transit comes back. Paid: the money that left comes back.
        await this.ledger.post(
          {
            kind: was === 'PAID' ? 'payout.returned' : 'payout.failed',
            memo: `${reference('PO', payout.number)} came back (${state})`,
            currency: payout.currency,
            refType: 'Payout',
            refId: payout.id,
            idempotencyKey: `${was === 'PAID' ? 'payout.returned' : 'payout.failed'}:${payout.id}`,
            lines: [
              was === 'PAID'
                ? { type: 'CASH', side: 'DEBIT', amountMinor: payout.netMinor }
                : { type: 'PAYOUT_CLEARING', side: 'DEBIT', amountMinor: payout.netMinor },
              { type: 'TAX_WITHHELD', side: 'DEBIT', amountMinor: payout.withheldMinor },
              {
                type: 'STUDENT_PAYABLE',
                owner: payout.studentId,
                side: 'CREDIT',
                amountMinor: payout.amountMinor,
              },
            ],
          },
          tx,
        );
        return true;
      });
      if (failed) {
        if (was === 'PAID') {
          this.logger.warn(
            `Payout ${reference('PO', payout.number)} came back after it was paid (${state}): the money is payable again`,
          );
        }
        await this.tellParent(payout.id, 'hubPayoutFailed');
      }
    } else {
      await this.prisma.payout.updateMany({
        where: { id: payout.id, status: 'SENT' },
        data: { providerStatus: state },
      });
    }
    return true;
  }

  /**
   * Payouts stuck in SENDING for 10 minutes (a crash, or no clear answer from Wise): one
   * with a transfer is saved as sent (its state then comes from Wise); one without is
   * tried again, which finds the transfer if Wise made it.
   */
  async reconcile(): Promise<number> {
    if (!this.wise.available) return 0;
    const stuck = await this.prisma.payout.findMany({
      where: { status: 'SENDING', updatedAt: { lt: new Date(Date.now() - 10 * 60_000) } },
      take: 50,
      orderBy: { updatedAt: 'asc' },
    });
    for (const payout of stuck) {
      try {
        if (payout.providerTransferId) {
          await this.markSent(payout, payout.providerTransferId, 'unknown');
          continue;
        }
        // Not while the account is gone or payouts are stopped: it waits (and staff
        // look it up in Wise by its reference).
        const account = await this.prisma.payoutAccount.findUnique({
          where: { id: payout.accountId },
        });
        const student = await this.prisma.user.findUnique({
          where: { id: payout.studentId },
          select: { countryCode: true },
        });
        if (
          !account ||
          account.removedAt ||
          accountState(account) !== 'READY' ||
          !(await this.flags.isEnabled(FLAG, student?.countryCode ?? null))
        ) {
          this.logger.error(
            `Payout ${reference('PO', payout.number)} is still sending, but its account or payouts are stopped: look it up in Wise`,
          );
          continue;
        }
        await this.transfer(payout, true);
      } catch (error) {
        this.logger.warn(`Payout ${payout.id} still sending: ${(error as Error).message}`);
      }
    }
    return stuck.length;
  }

  /** Asks Wise about payouts still on the way (in case a webhook was missed). */
  async poll(): Promise<number> {
    if (!this.wise.available) return 0;
    await this.reconcile();
    // On the way, and paid in the last 30 days (a bank can still send the money back).
    const [onTheWay, paid] = await Promise.all([
      this.prisma.payout.findMany({
        where: { status: 'SENT', providerTransferId: { not: null } },
        take: 200,
        orderBy: { sentAt: 'asc' },
      }),
      this.prisma.payout.findMany({
        where: {
          status: 'PAID',
          providerTransferId: { not: null },
          paidAt: { gt: new Date(Date.now() - 30 * 86_400_000) },
        },
        take: 200,
        orderBy: { paidAt: 'desc' },
      }),
    ]);
    const sent = [...onTheWay, ...paid];
    let changed = 0;
    for (const payout of sent) {
      try {
        const state = await this.wise.client.status(payout.providerTransferId!);
        if (state !== payout.providerStatus) {
          await this.apply(payout.providerTransferId!, state);
          changed += 1;
        }
      } catch (error) {
        this.logger.warn(`Payout ${payout.id} status: ${(error as Error).message}`);
      }
    }
    return changed;
  }

  @Cron('*/30 * * * *', { name: 'hub-payouts', timeZone: 'UTC' })
  async pollScheduled() {
    try {
      if (this.redis.status === 'wait') await this.redis.connect();
      if (!(await this.redis.set('hubjob:payouts', '1', 'EX', LOCK_SECONDS, 'NX'))) return;
      try {
        const changed = await this.poll();
        if (changed) this.logger.log(`${changed} payouts changed state`);
      } finally {
        await this.redis.del('hubjob:payouts');
      }
    } catch (error) {
      this.logger.error(`Payout status job failed: ${(error as Error).message}`);
    }
  }

  // ── Lead developers (paid by hand) ───────────────────────────────────────

  async leadsPayable(): Promise<LeadPayableDto[]> {
    const rows = (await this.ledger.balances('LEAD_PAYABLE')).filter((row) => row.balance > 0);
    const leads = await this.prisma.user.findMany({
      where: { id: { in: rows.map((row) => row.owner) } },
      select: { id: true, displayName: true, email: true },
    });
    return rows.map((row) => ({
      leadId: row.owner,
      name: nameOf(leads.find((lead) => lead.id === row.owner) ?? null),
      currency: row.currency,
      payableMinor: row.balance,
    }));
  }

  async payLead(staff: AuthUser, leadId: string, dto: PayLeadDto, ctx: RequestContext) {
    await this.assertPayoutsOn();
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`lead-pay:${leadId}`}))`;
      const balance = await this.ledger.balance('LEAD_PAYABLE', dto.currency, leadId, tx);
      if (dto.amountMinor > balance) {
        throw new ConflictException({
          error: 'MORE_THAN_OWED',
          message: `Only ${formatMoney('en', balance, dto.currency)} is owed.`,
        });
      }
      // One payment per bank reference: a double click or a retry records it once.
      const posted = await this.ledger.post(
        {
          kind: 'lead.paid',
          memo: `Paid by hand: ${dto.reference.trim()}`,
          currency: dto.currency,
          refType: 'User',
          refId: leadId,
          idempotencyKey: `lead.paid:${leadId}:${dto.currency}:${dto.reference.trim().toLowerCase().replaceAll(/\s+/g, ' ')}`,
          createdById: staff.id,
          lines: [
            { type: 'LEAD_PAYABLE', owner: leadId, side: 'DEBIT', amountMinor: dto.amountMinor },
            { type: 'CASH', side: 'CREDIT', amountMinor: dto.amountMinor },
          ],
        },
        tx,
      );
      if (!posted.created) {
        throw new ConflictException({
          error: 'ALREADY_RECORDED',
          message: 'A payment with this reference is recorded already.',
        });
      }
      await this.audit.record(
        {
          actor: { id: staff.id, roleKey: staff.roleKey },
          action: 'hub.lead_paid',
          entityType: 'User',
          entityId: leadId,
          after: {
            currency: dto.currency,
            amountMinor: dto.amountMinor,
            reference: dto.reference.trim(),
          },
          context: ctx,
        },
        tx,
      );
    });
    return this.leadsPayable();
  }

  // ── Emails to parents ────────────────────────────────────────────────────

  private async tellParent(
    payoutId: string,
    template: 'hubPayoutConfirm' | 'hubPayoutPaid' | 'hubPayoutFailed',
  ) {
    const payout = await this.prisma.payout.findUnique({
      where: { id: payoutId },
      include: {
        parent: { select: { email: true, displayName: true, languageCode: true } },
        account: { select: { last4: true } },
        student: { select: { studentProfile: { select: { nickname: true } } } },
      },
    });
    if (!payout?.parent.email) return;
    const language = toMailLanguage(payout.parent.languageCode);
    await this.mail
      .send({
        to: payout.parent.email,
        template,
        language,
        params: {
          name: payout.parent.displayName ?? '',
          actionUrl: `${this.config.get('WEB_APP_URL').replace(/\/+$/, '')}/${language}/payouts`,
          vars: {
            child: payout.student.studentProfile?.nickname ?? '',
            amount: formatMoney(language, payout.netMinor, payout.currency),
            last4: payout.account.last4,
          },
        },
      })
      .catch((error: Error) => this.logger.warn(`Payout email not sent: ${error.message}`));
  }
}
