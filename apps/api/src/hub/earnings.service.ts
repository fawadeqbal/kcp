import type { LedgerAccountType, Prisma } from '@kcp/database';
import { shareOut, splitHubAmount } from '@kcp/shared';
import { Inject, Injectable, Logger, NotFoundException, type OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import type { Redis } from 'ioredis';
import { PrismaService } from '../database/prisma.service.js';
import type { AuthUser } from '../permissions/auth-user.js';
import { REDIS } from '../redis/redis.constants.js';
import { reference } from './clients.service.js';
import { DeliveriesService } from './deliveries.service.js';
import type {
  EarningsStatementDto,
  EarningsTotalDto,
  LeadEarningsDto,
  PayoutDto,
} from './dto/payouts.dto.js';
import { HubEligibilityService } from './eligibility.service.js';
import { HubInvoicesService } from './invoices.service.js';
import { type LedgerLine, LedgerService } from './ledger/ledger.service.js';
import { HubTeamService } from './team.service.js';

const DAY = 86_400_000;
const LOCK_SECONDS = 50 * 60;
const OPEN_PAYOUT = ['AWAITING_PARENT', 'CONFIRMED', 'SENDING', 'SENT'] as const;

type Tx = Prisma.TransactionClient;

/**
 * Hub earnings. When a client has paid an invoice AND accepted its quote's work, the
 * money is shared out in the ledger: the platform's part, the lead developer's, and the
 * students' pool over the quote's finished tasks by their shares (renormalised over the
 * tasks finished; with none finished by a student, the pool goes to the platform). A
 * student's part is held for their country's hold days, then becomes payable (paid out
 * to their parent).
 */
@Injectable()
export class HubEarningsService implements OnModuleInit {
  private readonly logger = new Logger(HubEarningsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly invoices: HubInvoicesService,
    private readonly deliveries: DeliveriesService,
    private readonly team: HubTeamService,
    private readonly eligibility: HubEligibilityService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  onModuleInit() {
    // A late failure here is caught up by the hourly job (it's all idempotent).
    this.invoices.onPaid(async (invoiceId) => {
      await this.distributeInvoice(invoiceId).catch((error: Error) =>
        this.logger.error(`Invoice ${invoiceId} not shared out yet: ${error.message}`),
      );
    });
    this.deliveries.onAccepted(async (quoteId) => {
      await this.distributeQuote(quoteId).catch((error: Error) =>
        this.logger.error(`Quote ${quoteId} not shared out yet: ${error.message}`),
      );
    });
  }

  // ── Sharing out ──────────────────────────────────────────────────────────

  /** Every paid invoice of an accepted quote, not yet shared out. */
  async distributeQuote(quoteId: string, now = new Date()) {
    const invoices = await this.prisma.hubInvoice.findMany({
      where: { quoteId, status: 'PAID', distributedAt: null, quote: { acceptedAt: { not: null } } },
      select: { id: true },
    });
    for (const invoice of invoices) await this.distributeInvoice(invoice.id, now);
  }

  /** Shares one invoice out (once; only paid, with its quote's work accepted). */
  async distributeInvoice(invoiceId: string, now = new Date()): Promise<boolean> {
    let projectId: string | null = null;
    let completed = false;
    const done = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM hub_invoices WHERE id = ${invoiceId}::uuid FOR UPDATE`;
      const invoice = await tx.hubInvoice.findUnique({
        where: { id: invoiceId },
        include: { quote: { include: { tasks: true } }, project: true },
      });
      if (
        !invoice ||
        invoice.status !== 'PAID' ||
        invoice.distributedAt ||
        !invoice.quote.acceptedAt
      ) {
        return false;
      }
      const { project } = invoice;
      projectId = project.id;
      const parts = splitHubAmount(invoice.amountMinor, {
        student: project.studentPercent,
        lead: project.leadPercent,
        platform: project.platformPercent,
      });
      const finished = invoice.quote.tasks.filter(
        (task) => task.status === 'DONE' && task.assigneeId && task.shareBp > 0,
      );
      const shares = shareOut(
        parts.student,
        finished.map((task) => ({ key: task.assigneeId!, weight: task.shareBp })),
      );
      const toStudents = [...shares.values()].reduce((sum, value) => sum + value, 0);
      const lead = project.leadId ? parts.lead : 0;
      const platform = invoice.amountMinor - toStudents - lead;
      const lines: LedgerLine[] = [
        {
          type: 'PROJECT_FUNDS',
          owner: project.id,
          side: 'DEBIT',
          amountMinor: invoice.amountMinor,
        },
        { type: 'PLATFORM_REVENUE', side: 'CREDIT', amountMinor: platform },
        { type: 'LEAD_PAYABLE', owner: project.leadId, side: 'CREDIT', amountMinor: lead },
        ...[...shares].map(([studentId, amount]) => ({
          type: 'STUDENT_HELD' as LedgerAccountType,
          owner: studentId,
          side: 'CREDIT' as const,
          amountMinor: amount,
        })),
      ];
      await this.ledger.post(
        {
          kind: 'earnings.shared',
          memo: `${reference('H', invoice.number)} shared out (${reference('P', project.number)})`,
          currency: invoice.currency,
          refType: 'HubInvoice',
          refId: invoice.id,
          idempotencyKey: `earnings.shared:${invoice.id}`,
          lines,
        },
        tx,
      );
      for (const [studentId, amount] of shares) {
        if (amount <= 0) continue;
        await tx.hubEarning.create({
          data: {
            studentId,
            projectId: project.id,
            invoiceId: invoice.id,
            currency: invoice.currency,
            amountMinor: amount,
            heldUntil: new Date(now.getTime() + (await this.holdDays(studentId, tx)) * DAY),
          },
        });
      }
      await tx.hubInvoice.update({ where: { id: invoice.id }, data: { distributedAt: now } });
      completed = (await this.invoices.refreshStatus(tx, project.id)) === 'COMPLETED';
      return true;
    });
    // Paid in full and shared out: the project is done (its room is archived).
    if (completed && projectId) await this.team.closeProject(projectId, 'Project completed');
    return done;
  }

  private async holdDays(studentId: string, tx: Tx) {
    const student = await tx.user.findUnique({
      where: { id: studentId },
      select: { country: { select: { hubHoldDays: true } } },
    });
    return student?.country?.hubHoldDays ?? 14;
  }

  /** Held earnings whose hold is over become payable. */
  async releaseDue(now = new Date()): Promise<number> {
    const due = await this.prisma.hubEarning.findMany({
      where: { releasedAt: null, heldUntil: { lte: now } },
      take: 500,
      include: { project: { select: { number: true } } },
    });
    let released = 0;
    for (const earning of due) {
      await this.prisma.$transaction(async (tx) => {
        const claimed = await tx.hubEarning.updateMany({
          where: { id: earning.id, releasedAt: null },
          data: { releasedAt: now },
        });
        if (!claimed.count) return;
        await this.ledger.post(
          {
            kind: 'earnings.released',
            memo: `Hold over (${reference('P', earning.project.number)})`,
            currency: earning.currency,
            refType: 'HubEarning',
            refId: earning.id,
            idempotencyKey: `earnings.released:${earning.id}`,
            lines: [
              {
                type: 'STUDENT_HELD',
                owner: earning.studentId,
                side: 'DEBIT',
                amountMinor: earning.amountMinor,
              },
              {
                type: 'STUDENT_PAYABLE',
                owner: earning.studentId,
                side: 'CREDIT',
                amountMinor: earning.amountMinor,
              },
            ],
          },
          tx,
        );
        released += 1;
      });
    }
    return released;
  }

  /** Invoices that should have been shared out (a handler that failed): caught up. */
  async distributeDue(now = new Date()): Promise<number> {
    const due = await this.prisma.hubInvoice.findMany({
      where: { status: 'PAID', distributedAt: null, quote: { acceptedAt: { not: null } } },
      select: { id: true },
      take: 200,
    });
    let count = 0;
    for (const invoice of due) if (await this.distributeInvoice(invoice.id, now)) count += 1;
    return count;
  }

  @Cron('17 * * * *', { name: 'hub-earnings', timeZone: 'UTC' })
  async scheduled() {
    try {
      if (this.redis.status === 'wait') await this.redis.connect();
      if (!(await this.redis.set('hubjob:earnings', '1', 'EX', LOCK_SECONDS, 'NX'))) return;
      try {
        const shared = await this.distributeDue();
        const released = await this.releaseDue();
        if (shared || released) {
          this.logger.log(`Hub earnings: ${shared} invoices shared out, ${released} holds over`);
        }
      } finally {
        await this.redis.del('hubjob:earnings');
      }
    } catch (error) {
      this.logger.error(`Hub earnings job failed: ${(error as Error).message}`);
    }
  }

  // ── Statements ───────────────────────────────────────────────────────────

  /** A student's statement (theirs, or their child's for a parent; parents see the account). */
  async statement(studentId: string, forParent: string | null): Promise<EarningsStatementDto> {
    const [earnings, payouts, held, payable] = await Promise.all([
      this.prisma.hubEarning.findMany({
        where: { studentId },
        orderBy: { createdAt: 'desc' },
        take: 500,
        include: { project: { select: { title: true, number: true } } },
      }),
      this.prisma.payout.findMany({
        where: { studentId, ...(forParent ? { parentId: forParent } : {}) },
        orderBy: { createdAt: 'desc' },
        take: 200,
        include: {
          account: { select: { last4: true } },
          batch: { select: { status: true } },
          student: { select: { studentProfile: { select: { nickname: true } } } },
        },
      }),
      this.ledger.balances('STUDENT_HELD', null, [studentId]),
      this.ledger.balances('STUDENT_PAYABLE', null, [studentId]),
    ]);
    const totals = new Map<string, EarningsTotalDto>();
    const total = (currency: string) => {
      let entry = totals.get(currency);
      if (!entry) {
        entry = {
          currency,
          earnedMinor: 0,
          heldMinor: 0,
          payableMinor: 0,
          paidMinor: 0,
          withheldMinor: 0,
        };
        totals.set(currency, entry);
      }
      return entry;
    };
    for (const earning of earnings) total(earning.currency).earnedMinor += earning.amountMinor;
    for (const row of held) total(row.currency).heldMinor = row.balance;
    for (const row of payable) total(row.currency).payableMinor = row.balance;
    // Every payout made, whoever it went to (a parent sees only theirs listed).
    const paid = await this.prisma.payout.groupBy({
      by: ['currency'],
      where: { studentId, status: 'PAID' },
      _sum: { netMinor: true, withheldMinor: true },
    });
    for (const row of paid) {
      total(row.currency).paidMinor = row._sum.netMinor ?? 0;
      total(row.currency).withheldMinor = row._sum.withheldMinor ?? 0;
    }
    return {
      totals: [...totals.values()],
      earnings: earnings.map((earning) => ({
        id: earning.id,
        projectTitle: earning.project.title,
        projectReference: reference('P', earning.project.number),
        currency: earning.currency,
        amountMinor: earning.amountMinor,
        earnedAt: earning.createdAt,
        heldUntil: earning.heldUntil,
        releasedAt: earning.releasedAt,
      })),
      payouts: payouts.map((payout) => payoutDto(payout, Boolean(forParent))),
    };
  }

  async forStudent(user: AuthUser): Promise<EarningsStatementDto> {
    return this.statement(user.id, null);
  }

  async forChild(user: AuthUser, childId: string): Promise<EarningsStatementDto> {
    const link = await this.prisma.parentChildLink.count({
      where: { parentId: user.id, childId, child: { deletedAt: null } },
    });
    if (!link) throw new NotFoundException({ error: 'CHILD_NOT_FOUND', message: 'No such child.' });
    return this.statement(childId, user.id);
  }

  /** A lead developer's money: what's owed now, and every line. */
  async forLead(user: AuthUser): Promise<LeadEarningsDto> {
    await this.eligibility.assertLead(user.id);
    const [payable, entries] = await Promise.all([
      this.ledger.balances('LEAD_PAYABLE', null, [user.id]),
      this.ledger.entriesOf('LEAD_PAYABLE', user.id),
    ]);
    return {
      payable: payable.map((row) => ({ currency: row.currency, amountMinor: row.balance })),
      lines: entries.map((entry) => ({
        transactionId: entry.transactionId,
        kind: entry.kind,
        memo: entry.memo,
        currency: entry.currency,
        amountMinor: entry.side === 'CREDIT' ? entry.amountMinor : -entry.amountMinor,
        createdAt: entry.createdAt,
      })),
    };
  }

  /** Students with payout in progress (for the "ready to pay" list). */
  async inProgress(studentIds: string[]): Promise<Set<string>> {
    const rows = await this.prisma.payout.findMany({
      where: { studentId: { in: studentIds }, status: { in: [...OPEN_PAYOUT] } },
      select: { studentId: true },
    });
    return new Set(rows.map((row) => row.studentId));
  }
}

/** A payout for its student's statement or the parent's list. */
export function payoutDto(
  payout: Prisma.PayoutGetPayload<{
    include: {
      account: { select: { last4: true } };
      batch: { select: { status: true } };
      student: { select: { studentProfile: { select: { nickname: true } } } };
    };
  }>,
  forParent: boolean,
): PayoutDto {
  return {
    id: payout.id,
    reference: reference('PO', payout.number),
    childId: payout.studentId,
    childNickname: payout.student.studentProfile?.nickname ?? '',
    currency: payout.currency,
    amountMinor: payout.amountMinor,
    withheldMinor: payout.withheldMinor,
    netMinor: payout.netMinor,
    status: payout.status,
    accountLast4: forParent ? payout.account.last4 : null,
    createdAt: payout.createdAt,
    paidAt: payout.paidAt,
    canConfirm:
      forParent &&
      payout.status === 'AWAITING_PARENT' &&
      (payout.batch.status === 'DRAFT' || payout.batch.status === 'APPROVED'),
  };
}
