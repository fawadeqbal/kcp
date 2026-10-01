import {
  AVATAR_KEYS,
  CHILD_PASSWORD_MIN_LENGTH,
  NICKNAME_PATTERN,
  PASSWORD_MAX_LENGTH,
  PICTURE_KEYS,
  PICTURE_PASSWORD_LENGTH,
} from '@kcp/shared';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class ChildConsentsDto {
  /** Show the child (nickname and avatar only) on city, country and global leaderboards. */
  @IsBoolean()
  publicLeaderboards!: boolean;

  /** Let anyone with the link see the child's finished projects. */
  @IsBoolean()
  publicPortfolio!: boolean;
}

export class CreateChildDto {
  /** Shown to other children. Letters, digits and _; never the child's real name. */
  @Transform(trim)
  @Matches(NICKNAME_PATTERN, { message: 'nickname must be 3–20 letters, digits or _' })
  nickname!: string;

  @IsIn([...AVATAR_KEYS])
  avatarKey!: (typeof AVATAR_KEYS)[number];

  /** Only the year is stored, never the full date of birth. */
  @Type(() => Number)
  @IsInt()
  birthYear!: number;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @Matches(/^[A-Z]{2}$/)
  countryCode!: string;

  @IsOptional()
  @IsUUID()
  regionId?: string;

  @IsOptional()
  @IsUUID()
  cityId?: string;

  /** Language the child learns in, e.g. "ur". */
  @Matches(/^[a-z]{2}$/)
  languageCode!: string;

  /** Chosen by the parent; the child logs in with it. */
  @IsString()
  @MinLength(CHILD_PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  password!: string;

  @ValidateNested()
  @Type(() => ChildConsentsDto)
  consents!: ChildConsentsDto;
}

export class UpdateChildDto {
  @IsOptional()
  @Transform(trim)
  @Matches(NICKNAME_PATTERN, { message: 'nickname must be 3–20 letters, digits or _' })
  nickname?: string;

  @IsOptional()
  @IsIn([...AVATAR_KEYS])
  avatarKey?: (typeof AVATAR_KEYS)[number];

  @IsOptional()
  @Matches(/^[a-z]{2}$/)
  languageCode?: string;

  @IsOptional()
  @IsUUID()
  regionId?: string;

  @IsOptional()
  @IsUUID()
  cityId?: string;

  /** Evening reminders on the child's phone when their streak is about to end. */
  @IsOptional()
  @IsBoolean()
  streakReminders?: boolean;
}

export class ResetChildPasswordDto {
  @IsString()
  @MinLength(CHILD_PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  password!: string;
}

export class DeleteChildDto {
  /** Type the child's nickname to confirm. */
  @IsString()
  @MaxLength(40)
  nickname!: string;
}

export class ChildDto {
  id!: string;
  /** The child's login name. */
  username!: string;
  nickname!: string;
  avatarKey!: string;
  birthYear!: number;
  languageCode!: string;
  countryCode!: string | null;
  regionId!: string | null;
  cityId!: string | null;
  /** PENDING_CONSENT: under 13 and waiting for the parent's verified consent. */
  status!: 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED' | 'DELETED' | 'PENDING_CONSENT';
  /** The child can sign in with a picture password (set by the parent). */
  hasPicturePassword!: boolean;
  consents!: ChildConsentsDto;
  createdAt!: Date;
  lastLoginAt!: Date | null;
  /** Lessons the child has completed. */
  lessonsCompleted!: number;
  /** When today's premium ends (a plan renews on its own); null without premium. */
  premiumUntil!: Date | null;
  /** Where premium comes from: the family's plan, our team, or the free trial. */
  premiumSource!: 'subscription' | 'grant' | 'trial' | null;
  /** The child's free trial (over or not). */
  trialEndsAt!: Date | null;
  /** All XP earned so far. */
  xpTotal!: number;
  level!: number;
  /** Days in a row with the daily goal met (0 once a day is missed). */
  streak!: number;
  /** Badges earned. */
  badges!: number;
  /** Evening reminders in the mobile app when the streak is about to end. */
  streakReminders!: boolean;
}

export class ChildRulesDto {
  /** Birth years a parent may choose right now. */
  birthYears!: number[];
  avatarKeys!: string[];
  /** Whether accounts for children under 13 are open. */
  under13Open!: boolean;
  /** How parents in the parent's country can give verified consent for under-13s. */
  under13Methods!: ('CARD_CHECK' | 'SIGNED_FORM' | 'EMAIL_PLUS')[];
}

export class PicturePasswordDto {
  /** Four picture keys in order (see PICTURE_KEYS), or null to remove the picture password. */
  @IsOptional()
  @IsArray()
  @ArrayMinSize(PICTURE_PASSWORD_LENGTH)
  @ArrayMaxSize(PICTURE_PASSWORD_LENGTH)
  @IsIn([...PICTURE_KEYS], { each: true })
  pictures!: (typeof PICTURE_KEYS)[number][] | null;
}

export class NicknameSuggestionsDto {
  suggestions!: string[];
}

export class ConsentRecordDto {
  id!: string;
  type!: 'ACCOUNT' | 'PUBLIC_LEADERBOARDS' | 'PUBLIC_PORTFOLIO' | 'HUB_WORK' | 'EARNINGS';
  policyVersion!: string;
  method!: string;
  grantedAt!: Date;
  revokedAt!: Date | null;
}
