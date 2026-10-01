import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  Equals,
  IsArray,
  IsBoolean,
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
  ValidateNested,
} from 'class-validator';

export const PROJECT_STATUSES = [
  'SCOPING',
  'QUOTED',
  'AWAITING_DEPOSIT',
  'ACTIVE',
  'DELIVERED',
  'COMPLETED',
  'CANCELLED',
] as const;
export type ProjectStatusValue = (typeof PROJECT_STATUSES)[number];
export const QUOTE_STATUSES = ['DRAFT', 'SENT', 'APPROVED', 'DECLINED', 'WITHDRAWN'] as const;
export const QUOTE_KINDS = ['MAIN', 'CHANGE'] as const;
export const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED'] as const;
export type TaskStatusValue = (typeof TASK_STATUSES)[number];
export const INVOICE_STATUSES = ['OPEN', 'PAID', 'VOID'] as const;
export const INVOICE_KINDS = ['DEPOSIT', 'FINAL'] as const;

/** The largest price a quote may have, in minor units. */
export const MAX_PRICE_MINOR = 1_000_000_000;

export class HubSplitDto {
  student!: number;
  lead!: number;
  platform!: number;
}

/** Someone on the team, as the lead and staff see them (students by nickname and pseudonym). */
export class HubPersonDto {
  id!: string;
  /** "Developer A": what the client sees. */
  pseudonym!: string;
  nickname!: string;
  avatarKey!: string;
}

export class HubTaskDto {
  id!: string;
  number!: number;
  /** "T-3". */
  reference!: string;
  quoteId!: string;
  title!: string;
  spec!: string;
  skillTags!: string[];
  estimateMinutes!: number;
  /** Share of the quote's students' pool, in basis points. */
  shareBp!: number;
  @ApiProperty({ enum: TASK_STATUSES })
  status!: TaskStatusValue;
  assignee!: HubPersonDto | null;
  doneAt!: Date | null;
}

export class HubQuoteDto {
  id!: string;
  version!: number;
  @ApiProperty({ enum: QUOTE_KINDS })
  kind!: (typeof QUOTE_KINDS)[number];
  @ApiProperty({ enum: QUOTE_STATUSES })
  status!: (typeof QUOTE_STATUSES)[number];
  priceMinor!: number;
  depositMinor!: number;
  note!: string | null;
  /** The statement of work, once sent (Markdown). */
  sowText!: string | null;
  sowVersion!: string | null;
  sentAt!: Date | null;
  approvedAt!: Date | null;
  approvedBy!: string | null;
  declinedAt!: Date | null;
  declineReason!: string | null;
  acceptedAt!: Date | null;
  @ApiProperty({ type: [HubTaskDto] })
  tasks!: HubTaskDto[];
}

export class HubPaymentDto {
  @ApiProperty({ enum: ['MANUAL', 'STRIPE'] })
  provider!: 'MANUAL' | 'STRIPE';
  amountMinor!: number;
  method!: string | null;
  reference!: string | null;
  paidAt!: Date;
}

export class HubInvoiceDto {
  id!: string;
  /** "H-0042". */
  reference!: string;
  @ApiProperty({ enum: INVOICE_KINDS })
  kind!: (typeof INVOICE_KINDS)[number];
  @ApiProperty({ enum: INVOICE_STATUSES })
  status!: (typeof INVOICE_STATUSES)[number];
  currency!: string;
  amountMinor!: number;
  issuedAt!: Date;
  dueAt!: Date;
  paidAt!: Date | null;
  voidedAt!: Date | null;
  voidReason!: string | null;
  projectId!: string;
  projectTitle!: string;
  quoteVersion!: number;
  clientName!: string;
  billingName!: string | null;
  billingAddress!: string | null;
  taxId!: string | null;
  @ApiProperty({ type: [HubPaymentDto] })
  payments!: HubPaymentDto[];
}

export class ProjectSummaryDto {
  id!: string;
  /** "P-0007". */
  reference!: string;
  title!: string;
  @ApiProperty({ enum: PROJECT_STATUSES })
  status!: ProjectStatusValue;
  currency!: string;
  leadName!: string | null;
  clientName!: string;
  deadline!: string | null;
  createdAt!: Date;
  updatedAt!: Date;
}

/** A project as its lead developer (and staff) see it. */
export class LeadProjectDto extends ProjectSummaryDto {
  summary!: string;
  split!: HubSplitDto;
  depositPercent!: number;
  @ApiProperty({ type: [HubQuoteDto] })
  quotes!: HubQuoteDto[];
  @ApiProperty({ type: [HubInvoiceDto] })
  invoices!: HubInvoiceDto[];
  portfolioAllowed!: boolean;
}

/** What the client sees of a deliverable: no spec, share or who builds it. */
export class ClientTaskDto {
  number!: number;
  title!: string;
  estimateMinutes!: number;
  @ApiProperty({ enum: TASK_STATUSES })
  status!: TaskStatusValue;
}

export class ClientQuoteDto {
  id!: string;
  version!: number;
  @ApiProperty({ enum: QUOTE_KINDS })
  kind!: (typeof QUOTE_KINDS)[number];
  @ApiProperty({ enum: ['SENT', 'APPROVED', 'DECLINED', 'WITHDRAWN'] })
  status!: 'SENT' | 'APPROVED' | 'DECLINED' | 'WITHDRAWN';
  priceMinor!: number;
  depositMinor!: number;
  note!: string | null;
  sowText!: string;
  sowVersion!: string;
  sentAt!: Date;
  approvedAt!: Date | null;
  declinedAt!: Date | null;
  acceptedAt!: Date | null;
  @ApiProperty({ type: [ClientTaskDto] })
  deliverables!: ClientTaskDto[];
}

/** A project as the client sees it. */
export class ClientProjectDto extends ProjectSummaryDto {
  summary!: string;
  @ApiProperty({ type: [ClientQuoteDto] })
  quotes!: ClientQuoteDto[];
  @ApiProperty({ type: [HubInvoiceDto] })
  invoices!: HubInvoiceDto[];
  portfolioAllowed!: boolean;
}

/** A project for staff: everything, with the client's organisation and the ledger. */
export class AdminProjectDto extends LeadProjectDto {
  orgId!: string;
  intakeId!: string | null;
  leadId!: string | null;
  /** The project's money held in the ledger (invoiced, not yet shared out). */
  fundsMinor!: number;
  cancelReason!: string | null;
}

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  summary?: string;

  @IsOptional()
  @IsDateString({ strict: true })
  deadline?: string;
}

export class CreateQuoteDto {
  @IsIn(QUOTE_KINDS)
  kind!: (typeof QUOTE_KINDS)[number];

  /** In the project's currency, minor units. */
  @IsInt()
  @Min(100)
  @Max(MAX_PRICE_MINOR)
  priceMinor!: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

export class UpdateQuoteDto {
  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(MAX_PRICE_MINOR)
  priceMinor?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

export class TaskInputDto {
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  title!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  spec!: string;

  @IsArray()
  @ArrayMaxSize(8)
  @ArrayUnique()
  @Matches(/^[a-z0-9-]{2,30}$/, { each: true })
  skillTags!: string[];

  /** 15 minutes to 40 hours. */
  @IsInt()
  @Min(15)
  @Max(2400)
  estimateMinutes!: number;

  @IsInt()
  @Min(0)
  @Max(10_000)
  shareBp!: number;
}

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  spec?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @ArrayUnique()
  @Matches(/^[a-z0-9-]{2,30}$/, { each: true })
  skillTags?: string[];

  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(2400)
  estimateMinutes?: number;
}

export class ShareInputDto {
  @IsUUID()
  taskId!: string;

  @IsInt()
  @Min(0)
  @Max(10_000)
  shareBp!: number;
}

/** New shares for a quote's tasks (they must add up to 10,000 basis points). */
export class SharesDto {
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ShareInputDto)
  shares!: ShareInputDto[];
}

export class ApproveQuoteDto {
  /** The statement of work's version, as shown. */
  @IsString()
  @MaxLength(20)
  sowVersion!: string;

  @IsBoolean()
  @Equals(true)
  agree!: boolean;
}

export class ReasonDto {
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  reason!: string;
}

export class RecordHubPaymentDto {
  /** e.g. "Bank transfer". */
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  method!: string;

  /** The bank's reference. */
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  reference!: string;

  @IsDateString({ strict: true })
  paidAt!: string;
}

export class CheckoutUrlDto {
  url!: string;
}

export class CheckoutQueryDto {
  @IsOptional()
  @IsIn(['en', 'ar', 'ur'])
  locale?: 'en' | 'ar' | 'ur';
}

export class AdminUpdateProjectDto {
  @IsOptional()
  @IsUUID()
  leadId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  studentPercent?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  leadPercent?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  platformPercent?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  depositPercent?: number;

  @IsString()
  @MinLength(3)
  @MaxLength(300)
  reason!: string;
}

export class ProjectListQueryDto {
  @IsOptional()
  @IsIn(PROJECT_STATUSES)
  status?: ProjectStatusValue;
}

export class InvoiceListQueryDto {
  @IsOptional()
  @IsIn(INVOICE_STATUSES)
  status?: (typeof INVOICE_STATUSES)[number];
}
