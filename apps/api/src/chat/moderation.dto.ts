import { CHAT_MUTE_HOURS, CHAT_REPORT_REASONS } from '@kcp/shared';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ChatMessageDto } from './chat.dto.js';

export const MODERATION_ACTIONS = ['WARN', 'MUTE', 'SUSPEND', 'HIDE', 'DISMISS'] as const;
export type ModerationActionKey = (typeof MODERATION_ACTIONS)[number];
export const BLOCKED_TERM_LANGUAGES = ['en', 'ar', 'ur', 'roman-ur', 'any'] as const;

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class ModerationPersonDto {
  id!: string;
  /** A student's nickname, or an adult's name. */
  name!: string;
  avatarKey!: string | null;
  isAdult!: boolean;
  /** Students: their username (staff look them up with it). */
  username!: string | null;
}

export class ModerationSubjectDto extends ModerationPersonDto {
  @ApiProperty({
    enum: ['PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'DELETED', 'PENDING_CONSENT'],
  })
  status!: string;
  mutedUntil!: Date | null;
  /** Open reports about them (this one included). */
  openReports!: number;
  /** What moderators did about them before. */
  pastActions!: number;
}

export class ModerationRoomDto {
  id!: string;
  name!: string;
  @ApiProperty({ enum: ['TEAM', 'CLASS', 'EVENT'] })
  kind!: 'TEAM' | 'CLASS' | 'EVENT';
}

export class ModerationActionDto {
  id!: string;
  @ApiProperty({ enum: MODERATION_ACTIONS })
  kind!: ModerationActionKey;
  reason!: string;
  /** MUTE: until when. */
  until!: Date | null;
  staffName!: string;
  createdAt!: Date;
}

export class ModerationReportDto {
  id!: string;
  @ApiProperty({ enum: CHAT_REPORT_REASONS })
  reason!: (typeof CHAT_REPORT_REASONS)[number];
  @ApiProperty({ enum: ['OPEN', 'RESOLVED'] })
  status!: 'OPEN' | 'RESOLVED';
  createdAt!: Date;
  room!: ModerationRoomDto | null;
  reporter!: ModerationPersonDto;
  subject!: ModerationSubjectDto;
  /** The reported message as it is now (null for a report about a member, or if deleted). */
  message!: ChatMessageDto | null;
  /** The message as it was when reported. */
  snapshot!: string | null;
  /** Messages around it (or, for a member, their latest in the room), oldest first. */
  @ApiProperty({ type: [ChatMessageDto] })
  context!: ChatMessageDto[];
  /** What was done (resolved reports). */
  @ApiProperty({ type: [ModerationActionDto] })
  actions!: ModerationActionDto[];
  resolvedAt!: Date | null;
}

export class ModerationQueueDto {
  @ApiProperty({ type: [ModerationReportDto] })
  reports!: ModerationReportDto[];
  /** Open reports in all. */
  open!: number;
}

export class ModerationQueueQueryDto {
  @IsOptional()
  @IsIn(['OPEN', 'RESOLVED'])
  status?: 'OPEN' | 'RESOLVED';
}

export class ModerationActDto {
  @IsIn(MODERATION_ACTIONS)
  kind!: ModerationActionKey;

  /** Why (kept in the audit log; never shown to the student). */
  @IsString()
  @Transform(trim)
  @MinLength(3)
  @MaxLength(500)
  reason!: string;

  /** MUTE: for how many hours. */
  @ValidateIf((o: ModerationActDto) => o.kind === 'MUTE')
  @IsInt()
  @IsIn(CHAT_MUTE_HOURS)
  hours?: number;

  /** WARN, MUTE or SUSPEND: also remove the reported message. */
  @IsOptional()
  @IsBoolean()
  hideMessage?: boolean;
}

export class StudentModerationDto {
  mutedUntil!: Date | null;
  openReports!: number;
  @ApiProperty({ type: [ModerationActionDto] })
  actions!: ModerationActionDto[];
}

export class BlockedTermDto {
  id!: string;
  term!: string;
  @ApiProperty({ enum: BLOCKED_TERM_LANGUAGES })
  language!: (typeof BLOCKED_TERM_LANGUAGES)[number];
  createdAt!: Date;
}

export class CreateBlockedTermDto {
  @IsString()
  @Transform(trim)
  @MinLength(2)
  @MaxLength(60)
  term!: string;

  @IsIn(BLOCKED_TERM_LANGUAGES)
  language!: (typeof BLOCKED_TERM_LANGUAGES)[number];
}

export class CheckTextDto {
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  text!: string;
}

export class CheckTextResultDto {
  @ApiProperty({ enum: ['LINK', 'EMAIL', 'PHONE', 'CONTACT', 'WORDS'], nullable: true })
  problem!: 'LINK' | 'EMAIL' | 'PHONE' | 'CONTACT' | 'WORDS' | null;
}
