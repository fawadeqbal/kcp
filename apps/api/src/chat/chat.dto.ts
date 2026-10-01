import { CHAT_MESSAGE_MAX_LENGTH, CHAT_PHRASES, CHAT_REPORT_REASONS } from '@kcp/shared';
import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export type ChatRoomKindValue = 'TEAM' | 'CLASS' | 'EVENT' | 'HUB';

export class ChatRoomDto {
  id!: string;
  @ApiProperty({ enum: ['TEAM', 'CLASS', 'EVENT', 'HUB'] })
  kind!: ChatRoomKindValue;
  name!: string;
  /** Messages since the member last read the room. */
  unread!: number;
  lastMessageAt!: Date | null;
  /** The viewer may type text (13 and older, and adults); otherwise phrases only. */
  canType!: boolean;
  /** Muted by a moderator until then (no sending). */
  mutedUntil!: Date | null;
  /** The team, class or event ended: readable, no sending. */
  archived!: boolean;
}

export class ChatAuthorDto {
  id!: string;
  /** A student's nickname, or an adult's name. */
  name!: string;
  /** Students only. */
  avatarKey!: string | null;
  /** A teacher or mentor. */
  isAdult!: boolean;
}

export class ChatMessageDto {
  id!: string;
  roomId!: string;
  author!: ChatAuthorDto;
  @ApiProperty({ enum: ['PHRASE', 'TEXT'] })
  kind!: 'PHRASE' | 'TEXT';
  /** PHRASE: which one (the apps show it in the reader's language). */
  phraseKey!: string | null;
  /** TEXT: what was typed; null when a moderator removed the message. */
  text!: string | null;
  hidden!: boolean;
  createdAt!: Date;
}

export class ChatMessagesDto {
  room!: ChatRoomDto;
  /** Oldest first. */
  messages!: ChatMessageDto[];
  /** Pass the first message's createdAt as `before` for older ones. */
  hasMore!: boolean;
}

export class ChatMessagesQueryDto {
  /** Messages sent before this moment (for scrolling back). */
  @IsOptional()
  @Type(() => Date)
  before?: Date;
}

export class SendChatMessageDto {
  @IsOptional()
  @IsIn(CHAT_PHRASES)
  phrase?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MinLength(1)
  @MaxLength(CHAT_MESSAGE_MAX_LENGTH)
  text?: string;
}

export class ReportChatDto {
  /** The message (or, without one, the member) being reported. */
  @IsOptional()
  @IsUUID()
  messageId?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsIn(CHAT_REPORT_REASONS)
  reason!: (typeof CHAT_REPORT_REASONS)[number];
}

export class ChatReportCreatedDto {
  id!: string;
}
