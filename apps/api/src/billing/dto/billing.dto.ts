import { LAUNCH_LANGUAGES } from '@kcp/database';
import { PLAN_KEYS, type PlanKey, REASON_MIN_LENGTH } from '@kcp/shared';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class PlanOptionDto {
  key!: PlanKey;
  interval!: 'MONTH' | 'YEAR';
  /** One child, in minor units (paisa, piastres, fils, halalas). */
  unitMinor!: number;
  /** Each child after the first, with the family discount. */
  extraUnitMinor!: number;
  extraChildren!: number;
  /** What the family pays per period. */
  totalMinor!: number;
}

export class ChildPremiumDto {
  id!: string;
  nickname!: string;
  avatarKey!: string;
  premium!: boolean;
  /** Where premium comes from now: the family plan, staff, or the free trial. */
  source!: 'subscription' | 'grant' | 'trial' | null;
  until!: Date | null;
  trialEndsAt!: Date | null;
}

export class SubscriptionDto {
  id!: string;
  planKey!: string;
  /** STRIPE = card; MANUAL = paid another way, recorded by our team. */
  provider!: 'MANUAL' | 'STRIPE';
  status!: 'ACTIVE' | 'PAST_DUE' | 'CANCELED';
  currency!: string;
  /** One period for the whole family. */
  amountMinor!: number;
  children!: number;
  currentPeriodStart!: Date;
  currentPeriodEnd!: Date;
  /** Cancelled: premium stays until the period ends and the plan doesn't renew. */
  cancelAtPeriodEnd!: boolean;
  canceledAt!: Date | null;
  endedAt!: Date | null;
}

export class InvoiceSummaryDto {
  id!: string;
  /** "KCP-000042" */
  number!: string;
  status!: 'OPEN' | 'PAID' | 'VOID' | 'REFUNDED';
  currency!: string;
  amountMinor!: number;
  periodStart!: Date;
  periodEnd!: Date;
  issuedAt!: Date;
  paidAt!: Date | null;
}

export class BillingDto {
  countryCode!: string | null;
  currency!: string | null;
  /** Each child after the first costs this much less. */
  familyDiscountPercent!: number | null;
  trialDays!: number;
  /** Families can buy a plan by card here (payments switched on, cards available). */
  checkoutAvailable!: boolean;
  plans!: PlanOptionDto[];
  children!: ChildPremiumDto[];
  /** The plan that gives premium now, or the latest one. */
  subscription!: SubscriptionDto | null;
  invoices!: InvoiceSummaryDto[];
}

export class CheckoutDto {
  @IsIn(PLAN_KEYS)
  planKey!: PlanKey;

  /** The web app's language, for the page Stripe sends the family back to. */
  @IsIn(LAUNCH_LANGUAGES)
  locale!: (typeof LAUNCH_LANGUAGES)[number];
}

export class CheckoutResultDto {
  /** Stripe's checkout page (or the development mock's). */
  url!: string;
}

export class ChangePlanDto {
  @IsIn(PLAN_KEYS)
  planKey!: PlanKey;
}

export class InvoiceLineDto {
  /** first = the first child; extra = each other child, with the family discount. */
  kind!: 'first' | 'extra';
  quantity!: number;
  unitMinor!: number;
}

export class InvoiceDto extends InvoiceSummaryDto {
  planKey!: string | null;
  lines!: InvoiceLineDto[];
  billedTo!: { name: string | null; email: string | null };
  /** CARD or MANUAL; null when not paid. */
  paidWith!: 'CARD' | 'MANUAL' | null;
  /** Manual payments: how it was paid, e.g. "Bank transfer". */
  manualMethod!: string | null;
  refundedMinor!: number;
}

// ── Public ──────────────────────────────────────────────────────────────────

export class PublicCountryPriceDto {
  code!: string;
  currency!: string;
  names!: Record<string, string>;
  monthlyMinor!: number;
  yearlyMinor!: number;
  familyDiscountPercent!: number;
}

export class PublicPricingDto {
  trialDays!: number;
  /** The smallest family discount across countries (each country has its own too). */
  familyDiscountPercent!: number;
  countries!: PublicCountryPriceDto[];
}

// ── Staff ───────────────────────────────────────────────────────────────────

export class ManualPaymentDto {
  @IsIn(PLAN_KEYS)
  planKey!: PlanKey;

  /** Months (monthly plan) or years (yearly plan) paid for. */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  periods!: number;

  /** What was received, in minor units. Defaults to the family's price × periods. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100_000_000)
  amountMinor?: number;

  /** How the family paid, e.g. "Bank transfer" or "JazzCash". */
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  method!: string;

  /** The bank's or wallet's reference, to find the payment again. */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  reference?: string;
}

export class RefundDto {
  /** Minor units; defaults to everything not refunded yet. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  amountMinor?: number;

  @Transform(trim)
  @IsString()
  @MinLength(REASON_MIN_LENGTH)
  @MaxLength(300)
  reason!: string;
}

export class StaffCancelDto {
  /** true = premium stops now; false = at the end of the period. */
  @IsBoolean()
  immediately!: boolean;

  @Transform(trim)
  @IsString()
  @MinLength(REASON_MIN_LENGTH)
  @MaxLength(300)
  reason!: string;
}

export class BillingListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsIn(['ACTIVE', 'PAST_DUE', 'CANCELED'])
  subscriptionStatus?: 'ACTIVE' | 'PAST_DUE' | 'CANCELED';

  @IsOptional()
  @IsIn(['PENDING', 'SUCCEEDED', 'FAILED', 'PARTIALLY_REFUNDED', 'REFUNDED'])
  paymentStatus?: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'PARTIALLY_REFUNDED' | 'REFUNDED';

  @IsOptional()
  @IsIn(['MANUAL', 'STRIPE'])
  provider?: 'MANUAL' | 'STRIPE';

  /** A parent's email (or part of it). */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  search?: string;
}

export class RefundRecordDto {
  id!: string;
  amountMinor!: number;
  reason!: string;
  createdBy!: string | null;
  createdAt!: Date;
}

export class PaymentAdminDto {
  id!: string;
  parentId!: string;
  parentEmail!: string | null;
  provider!: 'MANUAL' | 'STRIPE';
  providerPaymentId!: string | null;
  status!: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'PARTIALLY_REFUNDED' | 'REFUNDED';
  currency!: string;
  amountMinor!: number;
  refundedMinor!: number;
  method!: string | null;
  reference!: string | null;
  recordedBy!: string | null;
  invoiceId!: string | null;
  invoiceNumber!: string | null;
  paidAt!: Date | null;
  createdAt!: Date;
  refunds!: RefundRecordDto[];
}

export class SubscriptionAdminDto extends SubscriptionDto {
  parentId!: string;
  parentEmail!: string | null;
  providerSubscriptionId!: string | null;
  createdAt!: Date;
}

export class SubscriptionListDto {
  items!: SubscriptionAdminDto[];
  total!: number;
  page!: number;
  pageSize!: number;
}

export class PaymentListDto {
  items!: PaymentAdminDto[];
  total!: number;
  page!: number;
  pageSize!: number;
}

export class PaymentEventDto {
  id!: string;
  provider!: 'MANUAL' | 'STRIPE';
  type!: string;
  createdAt!: Date;
}

export class FamilyBillingDto {
  parentId!: string;
  countryCode!: string | null;
  children!: ChildPremiumDto[];
  subscriptions!: SubscriptionAdminDto[];
  payments!: PaymentAdminDto[];
  invoices!: InvoiceSummaryDto[];
  events!: PaymentEventDto[];
  /** Stripe customer ID, to look the family up in Stripe's dashboard. */
  stripeCustomerId!: string | null;
  /** What the family would pay now, per plan (for recording a manual payment). */
  plans!: PlanOptionDto[];
  currency!: string | null;
}

// ── Prices (staff) ──────────────────────────────────────────────────────────

export class CountryPricesDto {
  code!: string;
  names!: Record<string, string>;
  currency!: string;
  isActive!: boolean;
  familyDiscountPercent!: number;
  /** Per child, by plan key; null when not set yet. */
  prices!: Record<string, number | null>;
}

export class PriceListDto {
  countries!: CountryPricesDto[];
}

export class UpdateCountryPricesDto {
  /** Per child, by plan key, in minor units. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100_000_000)
  monthlyMinor?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1_000_000_000)
  yearlyMinor?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(90)
  familyDiscountPercent?: number;

  /** Why, e.g. "Launch prices for Egypt". Kept in the audit log. */
  @Transform(trim)
  @IsString()
  @MinLength(REASON_MIN_LENGTH)
  @MaxLength(300)
  reason!: string;
}

export const COUNTRY_CODE = /^[A-Z]{2}$/;
export class CountryCodeParam {
  @Matches(COUNTRY_CODE)
  code!: string;
}
