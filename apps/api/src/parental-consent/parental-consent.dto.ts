import { UNDER13_CONSENT_METHODS } from '@kcp/shared';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, Length, Matches, MaxLength, MinLength } from 'class-validator';

export type Under13MethodValue = 'CARD_CHECK' | 'SIGNED_FORM' | 'EMAIL_PLUS';
export type ConsentRequestStatusValue =
  'PENDING' | 'SUBMITTED' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';

/** Where a child's verified parental consent stands (children under 13). */
export class ParentalConsentStatusDto {
  /** NOT_NEEDED: the child is 13 or older, or was set up before this was required. */
  status!: ConsentRequestStatusValue | 'NOT_NEEDED';
  /** The method of the latest attempt, if the parent picked one. */
  method!: Under13MethodValue | null;
  /** The methods the child's country accepts, in the order to offer them. */
  methods!: Under13MethodValue[];
  /** Staff's reason when a signed form was rejected. */
  rejectReason!: string | null;
  submittedAt!: Date | null;
  /** Card checks need card payments to be available. */
  cardsAvailable!: boolean;
  /** When the account is deleted if consent isn't finished (pending children). */
  deleteAfter!: Date | null;
}

export class StartConsentDto {
  @IsIn(UNDER13_CONSENT_METHODS)
  method!: Under13MethodValue;

  /** The web app's language, for the card check's return address. */
  @IsOptional()
  @IsString()
  @Matches(/^[a-z]{2}$/)
  locale?: string;
}

export class StartConsentResultDto {
  /** CARD_CHECK: the card check page to open. */
  url!: string | null;
  /** EMAIL_PLUS: the consent email was sent. */
  emailSent!: boolean;
}

export class ConfirmConsentEmailDto {
  @IsString()
  @MinLength(16)
  @MaxLength(200)
  token!: string;
}

export class ConfirmedConsentDto {
  /** The child's nickname, to say who is ready. */
  nickname!: string;
}

// ── Admin ────────────────────────────────────────────────────────────────────

export class ConsentQueueQueryDto {
  @IsOptional()
  @IsIn(['PENDING', 'SUBMITTED', 'VERIFIED', 'REJECTED', 'EXPIRED'])
  status?: ConsentRequestStatusValue;
}

export class ConsentRequestAdminDto {
  id!: string;
  childId!: string;
  nickname!: string;
  birthYear!: number;
  parentId!: string;
  /** The parent's name, to compare with the name on the form. */
  parentName!: string | null;
  parentEmail!: string | null;
  countryCode!: string | null;
  method!: Under13MethodValue | null;
  status!: ConsentRequestStatusValue;
  createdAt!: Date;
  submittedAt!: Date | null;
  decidedAt!: Date | null;
  decidedBy!: string | null;
  rejectReason!: string | null;
  /** A signed form is stored (not deleted yet). */
  hasForm!: boolean;
}

export class ConsentQueueDto {
  items!: ConsentRequestAdminDto[];
  /** Signed forms waiting for a check, however the list is filtered. */
  waiting!: number;
}

export class ConsentDecisionDto {
  @IsIn(['APPROVE', 'REJECT'])
  decision!: 'APPROVE' | 'REJECT';

  /** Why a form was rejected: the parent reads it in the email (required to reject). */
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(5, 300)
  reason?: string;
}
