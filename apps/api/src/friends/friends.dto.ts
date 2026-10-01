import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsString, MaxLength, MinLength } from 'class-validator';

export class FriendDto {
  userId!: string;
  nickname!: string;
  avatarKey!: string;
  /** When both parents approved. */
  since!: Date;
}

export type FriendRequestState = 'PENDING' | 'APPROVED' | 'DECLINED' | 'CANCELLED' | 'EXPIRED';

/** A friend request as a student sees it: who, and whether it's still waiting. */
export class StudentFriendRequestDto {
  id!: string;
  nickname!: string;
  avatarKey!: string;
  @ApiProperty({ enum: ['PENDING', 'APPROVED', 'DECLINED', 'CANCELLED', 'EXPIRED'] })
  status!: FriendRequestState;
  createdAt!: Date;
}

export class FriendsDto {
  /** The student's friend code, to give to friends. */
  code!: string;
  friends!: FriendDto[];
  /** Requests the student sent (waiting for the parents, or recently declined). */
  sent!: StudentFriendRequestDto[];
  /** Requests other students sent them, waiting for the parents. */
  received!: StudentFriendRequestDto[];
}

export class SendFriendRequestDto {
  /** A friend's code, as typed (spaces and dashes are fine). */
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MinLength(4)
  @MaxLength(16)
  code!: string;
}

export class FriendBoardEntryDto {
  rank!: number;
  userId!: string;
  nickname!: string;
  avatarKey!: string;
  /** XP this week. */
  xp!: number;
  isMe!: boolean;
}

export class FriendBoardDto {
  week!: { key: string; startDay: string; endDay: string };
  entries!: FriendBoardEntryDto[];
}

export class FriendChildDto {
  id!: string;
  nickname!: string;
  avatarKey!: string;
}

export class FriendOtherDto {
  nickname!: string;
  avatarKey!: string;
}

/** A friend request as a parent sees it. */
export class ParentFriendRequestDto {
  id!: string;
  /** The parent's own child. */
  child!: FriendChildDto;
  /** The other child (nickname and avatar only). */
  other!: FriendOtherDto;
  /** "sent": the parent's child asked; "received": the other child asked. */
  @ApiProperty({ enum: ['sent', 'received'] })
  direction!: 'sent' | 'received';
  /** This parent still has to approve or decline. */
  waitingForYou!: boolean;
  /** The other family still has to approve. */
  waitingForOtherFamily!: boolean;
  createdAt!: Date;
}

export class FriendDecisionDto {
  @IsBoolean()
  approve!: boolean;
}

export class ParentFriendDecisionResultDto {
  @ApiProperty({ enum: ['PENDING', 'APPROVED', 'DECLINED', 'CANCELLED', 'EXPIRED'] })
  status!: FriendRequestState;
}

export class EndFriendshipDto {
  /** Why staff ended it (kept in the audit log). */
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MinLength(5)
  @MaxLength(500)
  reason!: string;
}

export class StaffFriendDto extends FriendDto {
  friendshipId!: string;
}
