import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsString, MaxLength, MinLength } from 'class-validator';

export const GRANT_MONTHS = [1, 3, 6, 12] as const;

export class GrantPremiumDto {
  /** How long premium lasts from today. */
  @Type(() => Number)
  @IsInt()
  @IsIn(GRANT_MONTHS)
  months!: (typeof GRANT_MONTHS)[number];

  /** Why, e.g. "Pilot family from the Lahore school". Kept in the audit log. */
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(3)
  @MaxLength(300)
  reason!: string;
}

export class RevokePremiumDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(3)
  @MaxLength(300)
  reason!: string;
}

export class PremiumGrantDto {
  id!: string;
  /** The student who has (or had) premium. */
  studentId!: string;
  studentNickname!: string | null;
  reason!: string;
  startsAt!: Date;
  endsAt!: Date;
  revokedAt!: Date | null;
  grantedBy!: string | null;
  /** True while it gives premium: started, not ended, not revoked. */
  active!: boolean;
}

export class PremiumStatusDto {
  /** Grants for this student, or for every child of this parent. */
  grants!: PremiumGrantDto[];
}
