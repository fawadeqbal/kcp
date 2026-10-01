import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayUnique,
  Equals,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/** The steps to paid hub work, in order. */
export const HUB_STEPS = [
  'PRO_TRACK',
  'READINESS',
  'SIGN_OFF',
  'PARENT_CONSENT',
  'AGE',
  'PREMIUM',
  'COUNTRY',
] as const;
export type HubStep = (typeof HUB_STEPS)[number];

export class HubStepDto {
  @ApiProperty({ enum: HUB_STEPS })
  key!: HubStep;
  done!: boolean;
}

/** The country's rules for hub work. Times are minutes after local midnight. */
export class HubRulesDto {
  countryCode!: string;
  timeZone!: string;
  /** The hub is open in this country (after the lawyer's review). */
  enabled!: boolean;
  minAge!: number;
  weeklyMinutes!: number;
  dayStartMinute!: number;
  dayEndMinute!: number;
  /** 0 = Sunday … 6 = Saturday. */
  schoolDays!: number[];
  schoolStartMinute!: number;
  schoolEndMinute!: number;
  studentPercent!: number;
  leadPercent!: number;
  platformPercent!: number;
  holdDays!: number;
  /** Basis points (100 = 1%). */
  withholdingBp!: number;
}

export class HubEligibilityDto {
  /** Every step done, and not paused by staff: the student may be invited to projects. */
  eligible!: boolean;
  /** The first time every step was done. */
  eligibleAt!: Date | null;
  /** Staff paused the student's hub work. */
  paused!: boolean;
  pausedAt!: Date | null;
  @ApiProperty({ type: [HubStepDto] })
  steps!: HubStepDto[];
  /** Null when the student has no country set. */
  rules!: HubRulesDto | null;
  /** The parent agreement's version a consent must be for. */
  agreementVersion!: string;
}

export class HubConsentDto {
  grantedAt!: Date;
  /** The parent agreement's version. */
  version!: string;
}

/** A child's way into the hub, as their parent sees it. */
export class HubFamilyChildDto {
  childId!: string;
  nickname!: string;
  avatarKey!: string;
  /** Passed the readiness check: the parent may consent now. */
  readinessPassed!: boolean;
  /** A lead developer signed the child off for paid work. */
  signedOff!: boolean;
  /** Null when not given (or taken back). */
  consent!: HubConsentDto | null;
  eligibility!: HubEligibilityDto;
}

export class HubConsentRequestDto {
  /** The parent agreement's version, as shown to the parent. */
  @IsString()
  @MaxLength(20)
  version!: string;

  /** Ticked "I agree" (for my child to do paid work, and to receive the earnings). */
  @IsBoolean()
  @Equals(true)
  agree!: boolean;
}

export const CONTRACT_KINDS = ['parent', 'client'] as const;

export class ContractDto {
  @ApiProperty({ enum: CONTRACT_KINDS })
  kind!: (typeof CONTRACT_KINDS)[number];
  version!: string;
  @ApiProperty({ enum: ['en', 'ar', 'ur'] })
  language!: 'en' | 'ar' | 'ur';
  title!: string;
  /** Markdown. */
  body!: string;
}

export class ContractQueryDto {
  @IsOptional()
  @IsIn(['en', 'ar', 'ur'])
  language?: 'en' | 'ar' | 'ur';
}

/** A student who passed the readiness check, for a lead developer to sign off. */
export class HubCandidateDto {
  studentId!: string;
  nickname!: string;
  avatarKey!: string;
  countryCode!: string | null;
  passedAt!: Date;
  score!: number | null;
  maxScore!: number;
  /** The graded readiness review (open it in the mentor console). */
  reviewId!: string | null;
  signedOffAt!: Date | null;
  /** The lead who signed off. */
  signedOffBy!: string | null;
  eligible!: boolean;
}

export class SignOffDto {
  /** For staff and other leads: what the student is good at, what to watch. */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

/** A student's hub status, for staff. */
export class HubStudentAdminDto {
  studentId!: string;
  username!: string;
  nickname!: string;
  countryCode!: string | null;
  eligibility!: HubEligibilityDto;
  signedOffBy!: string | null;
  signedOffAt!: Date | null;
  signOffNote!: string | null;
  pausedReason!: string | null;
}

export class HubStudentListQueryDto {
  @IsOptional()
  @IsIn(['eligible', 'waiting', 'paused'])
  status?: 'eligible' | 'waiting' | 'paused';
}

export class PauseHubDto {
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason!: string;
}

/** Changes to a country's hub rules (staff). Splits must add up to 100. */
export class UpdateHubRulesDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(13)
  @Max(18)
  minAge?: number;

  @IsOptional()
  @IsInt()
  @Min(60)
  @Max(1200)
  weeklyMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1440)
  dayStartMinute?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1440)
  dayEndMinute?: number;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(7)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  schoolDays?: number[];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1440)
  schoolStartMinute?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1440)
  schoolEndMinute?: number;

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
  @Max(90)
  holdDays?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(5000)
  withholdingBp?: number;
}
