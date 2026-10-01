import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export const STORY_STATUSES = ['AWAITING_PARENT', 'APPROVED', 'PUBLISHED', 'WITHDRAWN'] as const;
export const STORY_LANGUAGES = ['en', 'ar', 'ur'] as const;

export class HubStoryDto {
  id!: string;
  studentId!: string;
  childNickname!: string;
  projectId!: string | null;
  @ApiProperty({ enum: STORY_LANGUAGES })
  languageCode!: string;
  firstName!: string;
  headline!: string;
  body!: string;
  @ApiProperty({ enum: STORY_STATUSES })
  status!: (typeof STORY_STATUSES)[number];
  parentAnsweredAt!: Date | null;
  publishedAt!: Date | null;
  createdAt!: Date;
}

export class CreateStoryDto {
  @IsUUID()
  studentId!: string;

  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsIn(STORY_LANGUAGES)
  languageCode!: (typeof STORY_LANGUAGES)[number];

  /** First name only. */
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  firstName!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(120)
  headline!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(1200)
  body!: string;
}

export class UpdateStoryDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  headline?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(1200)
  body?: string;
}

export class AnswerStoryDto {
  @IsBoolean()
  approve!: boolean;
}

export class StoryLanguageQueryDto {
  @IsOptional()
  @IsIn(STORY_LANGUAGES)
  lang?: (typeof STORY_LANGUAGES)[number];
}

/** A story on the marketing site: a first name, a country, what they built. */
export class PublicStoryDto {
  id!: string;
  firstName!: string;
  countryCode!: string | null;
  headline!: string;
  body!: string;
  publishedAt!: Date;
}

export class PublicHubAmountDto {
  currency!: string;
  amountMinor!: number;
}

/** The hub in numbers (the marketing site's counter). */
export class PublicHubStatsDto {
  projectsCompleted!: number;
  /** Students who earned money on accepted work. */
  studentsEarning!: number;
  /** What students earned, all time, per currency. */
  @ApiProperty({ type: [PublicHubAmountDto] })
  earned!: PublicHubAmountDto[];
}
