import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export const PAYOUT_STATUSES = [
  'AWAITING_PARENT',
  'CONFIRMED',
  'SENDING',
  'SENT',
  'PAID',
  'FAILED',
  'CANCELLED',
] as const;
export type PayoutStatusValue = (typeof PAYOUT_STATUSES)[number];
export const BATCH_STATUSES = ['DRAFT', 'APPROVED', 'SENT', 'CANCELLED'] as const;
export const PAYOUT_PROVIDERS = ['WISE', 'MANUAL'] as const;
export const ACCOUNT_KINDS = ['IBAN', 'OTHER'] as const;
/** COOLING: the 48 hours after a change; CHECKING: waiting for staff; READY: can be paid. */
export const ACCOUNT_STATES = ['COOLING', 'CHECKING', 'READY'] as const;

// ── Earnings ───────────────────────────────────────────────────────────────

export class EarningsTotalDto {
  currency!: string;
  /** Earned on accepted, paid work, all time. */
  earnedMinor!: number;
  /** In the hold period. */
  heldMinor!: number;
  /** Ready for the next payout. */
  payableMinor!: number;
  /** Paid out to the parent. */
  paidMinor!: number;
  /** Withheld for tax from payouts. */
  withheldMinor!: number;
}

export class EarningDto {
  id!: string;
  projectTitle!: string;
  /** "P-0007". */
  projectReference!: string;
  currency!: string;
  amountMinor!: number;
  earnedAt!: Date;
  heldUntil!: Date;
  releasedAt!: Date | null;
}

export class PayoutDto {
  id!: string;
  /** "PO-0012". */
  reference!: string;
  childId!: string;
  childNickname!: string;
  currency!: string;
  amountMinor!: number;
  withheldMinor!: number;
  netMinor!: number;
  @ApiProperty({ enum: PAYOUT_STATUSES })
  status!: PayoutStatusValue;
  /** The parent's account it goes to (parents only). */
  accountLast4!: string | null;
  createdAt!: Date;
  paidAt!: Date | null;
  /** The parent can confirm (or decline) it now. */
  canConfirm!: boolean;
}

/** A student's hub money: what they earned, what's held, payable and paid. */
export class EarningsStatementDto {
  @ApiProperty({ type: [EarningsTotalDto] })
  totals!: EarningsTotalDto[];
  @ApiProperty({ type: [EarningDto] })
  earnings!: EarningDto[];
  @ApiProperty({ type: [PayoutDto] })
  payouts!: PayoutDto[];
}

export class LeadEarningsLineDto {
  transactionId!: string;
  kind!: string;
  memo!: string;
  currency!: string;
  /** Plus: earned; minus: paid. */
  amountMinor!: number;
  createdAt!: Date;
}

export class LeadEarningsDto {
  @ApiProperty({ type: [Object] })
  payable!: { currency: string; amountMinor: number }[];
  @ApiProperty({ type: [LeadEarningsLineDto] })
  lines!: LeadEarningsLineDto[];
}

// ── Payout accounts ────────────────────────────────────────────────────────

export class PayoutAccountDto {
  id!: string;
  @ApiProperty({ enum: ACCOUNT_KINDS })
  kind!: (typeof ACCOUNT_KINDS)[number];
  holderName!: string;
  currency!: string;
  countryCode!: string;
  last4!: string;
  usableFrom!: Date;
  @ApiProperty({ enum: ACCOUNT_STATES })
  state!: (typeof ACCOUNT_STATES)[number];
  createdAt!: Date;
}

export class SetPayoutAccountDto {
  /** The parent's password again (changing where money goes needs it). */
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  password!: string;

  @IsIn(ACCOUNT_KINDS)
  kind!: (typeof ACCOUNT_KINDS)[number];

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  holderName!: string;

  /** IBAN accounts. */
  @IsOptional()
  @IsString()
  @MaxLength(42)
  iban?: string;

  /** Other accounts: how to pay (a wallet number, a local account), checked by staff. */
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(300)
  details?: string;

  @Matches(/^[A-Z]{3}$/)
  currency!: string;

  /** Other accounts (IBANs carry their country). */
  @IsOptional()
  @Matches(/^[A-Z]{2}$/)
  countryCode?: string;
}

export class PasswordDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  password!: string;
}

export class AdminPayoutAccountDto extends PayoutAccountDto {
  parentId!: string;
  parentName!: string;
  parentEmail!: string | null;
  verifiedAt!: Date | null;
  removedAt!: Date | null;
}

export class PayoutAccountDetailsDto {
  holderName!: string;
  iban!: string | null;
  details!: string | null;
}

export class PayoutAccountListQueryDto {
  /** waiting: live accounts staff haven't checked; all: everything (newest first). */
  @IsOptional()
  @IsIn(['waiting', 'all'])
  show?: 'waiting' | 'all';
}

// ── Batches (staff) ────────────────────────────────────────────────────────

export class ReadyToPayDto {
  studentId!: string;
  nickname!: string;
  currency!: string;
  payableMinor!: number;
  heldMinor!: number;
  parentId!: string | null;
  parentName!: string | null;
  accountId!: string | null;
  @ApiProperty({ enum: [...ACCOUNT_KINDS, null], nullable: true })
  accountKind!: (typeof ACCOUNT_KINDS)[number] | null;
  @ApiProperty({ enum: [...ACCOUNT_STATES, null], nullable: true })
  accountState!: (typeof ACCOUNT_STATES)[number] | null;
  /** A payout for them is in progress already. */
  inProgress!: boolean;
}

export class CurrencyQueryDto {
  @IsOptional()
  @Matches(/^[A-Z]{3}$/)
  currency?: string;
}

export class CreateBatchDto {
  @Matches(/^[A-Z]{3}$/)
  currency!: string;

  @IsIn(PAYOUT_PROVIDERS)
  provider!: (typeof PAYOUT_PROVIDERS)[number];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class BatchApprovalDto {
  name!: string;
  at!: Date;
}

export class PayoutBatchDto {
  id!: string;
  /** "B-0007". */
  reference!: string;
  currency!: string;
  @ApiProperty({ enum: PAYOUT_PROVIDERS })
  provider!: (typeof PAYOUT_PROVIDERS)[number];
  @ApiProperty({ enum: BATCH_STATUSES })
  status!: (typeof BATCH_STATUSES)[number];
  note!: string | null;
  createdByName!: string;
  createdAt!: Date;
  @ApiProperty({ type: [BatchApprovalDto] })
  approvals!: BatchApprovalDto[];
  sentAt!: Date | null;
  payoutCount!: number;
  confirmedCount!: number;
  paidCount!: number;
  failedCount!: number;
  totalNetMinor!: number;
}

export class AdminPayoutDto {
  id!: string;
  reference!: string;
  studentId!: string;
  nickname!: string;
  parentId!: string;
  parentName!: string;
  @ApiProperty({ enum: ACCOUNT_KINDS })
  accountKind!: (typeof ACCOUNT_KINDS)[number];
  accountLast4!: string;
  currency!: string;
  amountMinor!: number;
  withheldMinor!: number;
  netMinor!: number;
  @ApiProperty({ enum: PAYOUT_STATUSES })
  status!: PayoutStatusValue;
  parentConfirmedAt!: Date | null;
  providerTransferId!: string | null;
  providerStatus!: string | null;
  failureReason!: string | null;
  method!: string | null;
  paymentReference!: string | null;
  sentAt!: Date | null;
  paidAt!: Date | null;
  failedAt!: Date | null;
}

export class PayoutBatchDetailDto extends PayoutBatchDto {
  @ApiProperty({ type: [AdminPayoutDto] })
  payouts!: AdminPayoutDto[];
}

export class RecordPayoutDto {
  /** e.g. "Bank transfer", "JazzCash". */
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  method!: string;

  /** The bank's or wallet's reference. */
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  reference!: string;
}

/** A super admin settles a payout stuck in "sending", after looking it up in Wise. */
export class SettlePayoutDto {
  /** Whether Wise has a transfer for it (reference KCP<number>). */
  @IsIn(['TRANSFER_FOUND', 'NO_TRANSFER'])
  outcome!: 'TRANSFER_FOUND' | 'NO_TRANSFER';

  /** Wise's transfer ID, when there is one. */
  @IsOptional()
  @Matches(/^\d{1,20}$/)
  transferId?: string;

  @IsString()
  @MinLength(5)
  @MaxLength(300)
  reason!: string;
}

export class CancelPayoutDto {
  @IsString()
  @MinLength(3)
  @MaxLength(300)
  reason!: string;
}

// ── Lead developers and the ledger (staff) ─────────────────────────────────

export class LeadPayableDto {
  leadId!: string;
  name!: string;
  currency!: string;
  payableMinor!: number;
}

export class PayLeadDto {
  @Matches(/^[A-Z]{3}$/)
  currency!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100_000_000)
  amountMinor!: number;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  reference!: string;
}

export class LedgerEntryDto {
  accountType!: string;
  owner!: string;
  side!: 'DEBIT' | 'CREDIT';
  amountMinor!: number;
}

export class LedgerTransactionDto {
  id!: string;
  kind!: string;
  memo!: string;
  currency!: string;
  refType!: string | null;
  refId!: string | null;
  createdAt!: Date;
  @ApiProperty({ type: [LedgerEntryDto] })
  entries!: LedgerEntryDto[];
}

export class LedgerQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  kind?: string;

  @IsOptional()
  @IsUUID()
  refId?: string;

  /** Older than this (paging). */
  @IsOptional()
  @IsDateString({ strict: true })
  before?: string;
}

export class TrialBalanceDto {
  currency!: string;
  debits!: number;
  credits!: number;
  /** Each kind of account's balance. */
  @ApiProperty({ type: Object })
  accounts!: Record<string, number>;
}
