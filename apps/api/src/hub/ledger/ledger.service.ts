import type { LedgerAccountType, LedgerSide, Prisma } from '@kcp/database';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';

type Db = PrismaService | Prisma.TransactionClient;

/** Accounts whose balance is debits minus credits (what the platform has or is owed). */
const DEBIT_NORMAL = new Set<LedgerAccountType>(['CASH', 'CLIENT_RECEIVABLE']);

/** The largest amount one entry may carry (the column is a 32-bit integer). */
const MAX_AMOUNT = 2_000_000_000;

export interface LedgerLine {
  type: LedgerAccountType;
  /** The account's owner (organisation, project, lead developer or student); none for the platform's. */
  owner?: string | null;
  side: LedgerSide;
  amountMinor: number;
}

export interface Posting {
  /** e.g. "invoice.issued". */
  kind: string;
  memo: string;
  currency: string;
  refType?: string;
  refId?: string;
  /** The same key never posts twice. */
  idempotencyKey: string;
  createdById?: string | null;
  lines: LedgerLine[];
}

export class LedgerError extends Error {}

/** Checks a posting before it is written: positive whole amounts that balance. */
export function checkPosting(posting: Posting): void {
  const lines = posting.lines.filter((line) => line.amountMinor !== 0);
  if (lines.length < 2) throw new LedgerError('A posting needs at least two entries.');
  if (!/^[A-Z]{3}$/.test(posting.currency)) throw new LedgerError('Bad currency.');
  let balance = 0;
  for (const line of lines) {
    if (
      !Number.isInteger(line.amountMinor) ||
      line.amountMinor < 0 ||
      line.amountMinor > MAX_AMOUNT
    ) {
      throw new LedgerError(`Bad amount ${line.amountMinor}.`);
    }
    balance += line.side === 'DEBIT' ? line.amountMinor : -line.amountMinor;
  }
  if (balance !== 0) throw new LedgerError(`The posting doesn't balance (${balance}).`);
}

/** An account's balance from its debits and credits, the way the account normally runs. */
export function normalBalance(type: LedgerAccountType, debits: number, credits: number): number {
  return DEBIT_NORMAL.has(type) ? debits - credits : credits - debits;
}

/**
 * The hub's double-entry ledger. Every posting balances (checked here, and again by
 * the database when the transaction commits); nothing is edited or deleted (database
 * triggers). Accounts are made the first time they're used.
 */
@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Writes a posting, once: a second post with the same key does nothing and returns
   * the first. Inside a caller's transaction, lock the row the posting is about
   * first, so two requests can't race to post it.
   */
  async post(
    posting: Posting,
    db: Db = this.prisma,
  ): Promise<{ transactionId: string; created: boolean }> {
    checkPosting(posting);
    const existing = await db.ledgerTransaction.findUnique({
      where: { idempotencyKey: posting.idempotencyKey },
      select: { id: true },
    });
    if (existing) return { transactionId: existing.id, created: false };
    const lines = posting.lines.filter((line) => line.amountMinor !== 0);
    const keys = lines.map((line) => ({
      type: line.type,
      currency: posting.currency,
      ownerKey: line.owner ?? '',
    }));
    await db.ledgerAccount.createMany({ data: keys, skipDuplicates: true });
    const accounts = await db.ledgerAccount.findMany({
      where: { OR: keys },
      select: { id: true, type: true, ownerKey: true },
    });
    const accountId = (line: LedgerLine) =>
      accounts.find((a) => a.type === line.type && a.ownerKey === (line.owner ?? ''))!.id;
    const transaction = await db.ledgerTransaction.create({
      data: {
        kind: posting.kind,
        memo: posting.memo.slice(0, 300),
        refType: posting.refType ?? null,
        refId: posting.refId ?? null,
        idempotencyKey: posting.idempotencyKey,
        createdById: posting.createdById ?? null,
        entries: {
          create: lines.map((line) => ({
            accountId: accountId(line),
            side: line.side,
            amountMinor: line.amountMinor,
            currency: posting.currency,
          })),
        },
      },
      select: { id: true },
    });
    return { transactionId: transaction.id, created: true };
  }

  /** An account's balance (0 when it has never been used). */
  async balance(
    type: LedgerAccountType,
    currency: string,
    owner: string | null = null,
    db: Db = this.prisma,
  ): Promise<number> {
    const account = await db.ledgerAccount.findUnique({
      where: { type_currency_ownerKey: { type, currency, ownerKey: owner ?? '' } },
      select: { id: true },
    });
    if (!account) return 0;
    const sums = await db.ledgerEntry.groupBy({
      by: ['side'],
      where: { accountId: account.id },
      _sum: { amountMinor: true },
    });
    const of = (side: LedgerSide) => sums.find((s) => s.side === side)?._sum.amountMinor ?? 0;
    return normalBalance(type, of('DEBIT'), of('CREDIT'));
  }

  /** Balances of one kind of account for many owners, e.g. every student's payable money. */
  async balances(
    type: LedgerAccountType,
    currency: string | null = null,
    owners: string[] | null = null,
  ): Promise<{ owner: string; currency: string; balance: number }[]> {
    const rows = await this.prisma.$queryRaw<
      { owner_key: string; currency: string; debits: bigint; credits: bigint }[]
    >`
      SELECT a.owner_key, a.currency,
             COALESCE(SUM(e.amount_minor) FILTER (WHERE e.side = 'DEBIT'), 0) AS debits,
             COALESCE(SUM(e.amount_minor) FILTER (WHERE e.side = 'CREDIT'), 0) AS credits
      FROM ledger_accounts a JOIN ledger_entries e ON e.account_id = a.id
      WHERE a.type = ${type}::"LedgerAccountType"
        AND (${currency}::text IS NULL OR a.currency = ${currency})
        AND (${owners}::text[] IS NULL OR a.owner_key = ANY(${owners}::text[]))
      GROUP BY a.owner_key, a.currency`;
    return rows.map((row) => ({
      owner: row.owner_key,
      currency: row.currency,
      balance: normalBalance(type, Number(row.debits), Number(row.credits)),
    }));
  }

  /** One owner's entries in one kind of account (newest first), e.g. a lead developer's. */
  async entriesOf(
    type: LedgerAccountType,
    owner: string,
    take = 200,
  ): Promise<
    {
      transactionId: string;
      kind: string;
      memo: string;
      currency: string;
      side: LedgerSide;
      amountMinor: number;
      createdAt: Date;
    }[]
  > {
    const rows = await this.prisma.ledgerEntry.findMany({
      where: { account: { type, ownerKey: owner } },
      orderBy: { createdAt: 'desc' },
      take,
      include: { transaction: { select: { kind: true, memo: true } } },
    });
    return rows.map((row) => ({
      transactionId: row.transactionId,
      kind: row.transaction.kind,
      memo: row.transaction.memo,
      currency: row.currency,
      side: row.side,
      amountMinor: row.amountMinor,
      createdAt: row.createdAt,
    }));
  }

  /** Postings, newest first (the admin ledger page), with their entries. */
  async transactions(query: { kind?: string; refId?: string; before?: Date; take?: number }) {
    return this.prisma.ledgerTransaction.findMany({
      where: {
        ...(query.kind ? { kind: query.kind } : {}),
        ...(query.refId ? { refId: query.refId } : {}),
        ...(query.before ? { createdAt: { lt: query.before } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(query.take ?? 50, 200),
      include: {
        entries: {
          orderBy: { side: 'asc' },
          include: { account: { select: { type: true, ownerKey: true } } },
        },
      },
    });
  }

  /**
   * The trial balance: per currency, all debits and all credits (always equal), and
   * each kind of account's total.
   */
  async trialBalance(): Promise<
    { currency: string; debits: number; credits: number; accounts: Record<string, number> }[]
  > {
    const rows = await this.prisma.$queryRaw<
      { currency: string; type: LedgerAccountType; debits: bigint; credits: bigint }[]
    >`
      SELECT a.currency, a.type,
             COALESCE(SUM(e.amount_minor) FILTER (WHERE e.side = 'DEBIT'), 0) AS debits,
             COALESCE(SUM(e.amount_minor) FILTER (WHERE e.side = 'CREDIT'), 0) AS credits
      FROM ledger_accounts a JOIN ledger_entries e ON e.account_id = a.id
      GROUP BY a.currency, a.type
      ORDER BY a.currency, a.type`;
    const byCurrency = new Map<
      string,
      { currency: string; debits: number; credits: number; accounts: Record<string, number> }
    >();
    for (const row of rows) {
      const entry = byCurrency.get(row.currency) ?? {
        currency: row.currency,
        debits: 0,
        credits: 0,
        accounts: {},
      };
      entry.debits += Number(row.debits);
      entry.credits += Number(row.credits);
      entry.accounts[row.type] = normalBalance(row.type, Number(row.debits), Number(row.credits));
      byCurrency.set(row.currency, entry);
    }
    return [...byCurrency.values()];
  }
}
