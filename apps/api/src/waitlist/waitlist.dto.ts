import { LAUNCH_LANGUAGES } from '@kcp/database';
import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export const AGE_BANDS = ['AGE_9_12', 'AGE_13_16'] as const;

export class JoinWaitlistDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @Matches(/^[A-Z]{2}$/)
  countryCode!: string;

  @IsIn(AGE_BANDS)
  ageBand!: (typeof AGE_BANDS)[number];

  @IsIn(LAUNCH_LANGUAGES)
  languageCode!: (typeof LAUNCH_LANGUAGES)[number];
}

export class ConfirmWaitlistDto {
  @IsString()
  @MinLength(20)
  @MaxLength(200)
  token!: string;
}

export class WaitlistCountryDto {
  countryCode!: string;
  confirmed!: number;
  pending!: number;
}

export class WaitlistEntryDto {
  email!: string;
  countryCode!: string;
  ageBand!: string;
  languageCode!: string;
  confirmedAt!: Date | null;
}

export class WaitlistSummaryDto {
  countries!: WaitlistCountryDto[];
  /** The latest confirmed entries (to write to when a country opens). */
  latest!: WaitlistEntryDto[];
}
