import { BOARD_PERIODS, BOARD_SCOPES, type BoardPeriod, type BoardScope } from '@kcp/shared';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { LanguageQueryDto } from '../../learning/dto/learning.dto.js';

export class LevelDto {
  number!: number;
  /** XP at which this level starts. */
  minXp!: number;
  /** XP at which the next level starts; null at the top level. */
  nextMinXp!: number | null;
}

export class TodayDto {
  /** XP earned today, in the student's time zone. */
  xp!: number;
  /** The daily goal behind the streak. */
  goalXp!: number;
  /** Most XP that counts in one day. */
  capXp!: number;
  capReached!: boolean;
}

export class StreakDto {
  /** Days in a row with the goal met (0 once a day is missed without a freeze). */
  current!: number;
  longest!: number;
  doneToday!: boolean;
  /** Streak freezes held (each covers one missed day). */
  freezes!: number;
  /** Freezes that meeting today's goal will use (days missed since the last goal). */
  freezesNeeded!: number;
}

export class WeekDto {
  /** ISO week, e.g. "2026-W40". Boards reset at Monday 00:00 in the student's time zone. */
  key!: string;
  /** Monday (the student's date). */
  startDay!: string;
  /** The next Monday, when the board resets. */
  endDay!: string;
  /** XP earned this week. */
  xp!: number;
  /** True when the family keeps the student off public leaderboards. */
  hidden!: boolean;
  globalRank!: number | null;
  countryRank!: number | null;
  /** Null until the region's board is open (enough students) or no region is set. */
  regionRank!: number | null;
  cityRank!: number | null;
  countryCode!: string | null;
}

export class SeasonDto {
  id!: string;
  name!: string;
  startDay!: string;
  /** The day after the last day; null while the end isn't planned. */
  endDay!: string | null;
}

export class BadgeCountsDto {
  earned!: number;
  total!: number;
  /** Earned but not celebrated yet. */
  unseen!: number;
}

export class ProgressDto {
  xpTotal!: number;
  level!: LevelDto;
  today!: TodayDto;
  streak!: StreakDto;
  week!: WeekDto;
  /** The season staff are running, if any. */
  season!: SeasonDto | null;
  badges!: BadgeCountsDto;
}

export class LeaderboardQueryDto extends LanguageQueryDto {
  /** "global" (default), or the student's own "country", "region" or "city". */
  @IsOptional()
  @IsIn(BOARD_SCOPES)
  scope?: BoardScope;

  /** "week" (default), the current "season", or "all" time. */
  @IsOptional()
  @IsIn(BOARD_PERIODS)
  period?: BoardPeriod;
}

export class LeaderboardEntryDto {
  rank!: number;
  nickname!: string;
  avatarKey!: string;
  /** XP in the period. */
  xp!: number;
  isMe!: boolean;
}

export class BoardWeekDto {
  key!: string;
  startDay!: string;
  /** When the board resets (Monday 00:00, the student's time). */
  endDay!: string;
}

export class LeaderboardDto {
  scope!: BoardScope;
  period!: BoardPeriod;
  countryCode!: string | null;
  /** The region's or city's name, for those boards. */
  areaName!: string | null;
  /**
   * False when there is nothing to show: no season running, no region or city set, or
   * fewer than `minStudents` students there on public boards.
   */
  available!: boolean;
  minStudents!: number;
  week!: BoardWeekDto | null;
  season!: SeasonDto | null;
  entries!: LeaderboardEntryDto[];
  /** The student's own place: null rank when they're hidden or not on the board. */
  me!: { rank: number | null; xp: number; hidden: boolean };
}

export class BadgeDto {
  key!: string;
  category!: string;
  icon!: string;
  earned!: boolean;
  awardedAt!: Date | null;
  /** False for badges earned but not celebrated yet. */
  seen!: boolean;
}

export class BadgesDto {
  badges!: BadgeDto[];
}

export class MarkBadgesSeenDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @Matches(/^[a-z0-9-]{1,40}$/, { each: true })
  keys!: string[];
}

// ── Staff ─────────────────────────────────────────────────────────────────

export class AdminBoardQueryDto {
  @IsOptional()
  @IsIn(BOARD_SCOPES)
  scope?: BoardScope;

  @IsOptional()
  @IsIn(BOARD_PERIODS)
  period?: BoardPeriod;

  /** Country code, region or city ID for those boards. */
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @Matches(/^([A-Z]{2}|[0-9a-f-]{36})$/)
  scopeId?: string;
}

export class AdminBoardEntryDto {
  rank!: number;
  userId!: string;
  nickname!: string;
  username!: string | null;
  xp!: number;
}

export class AdminBoardDto {
  scope!: BoardScope;
  period!: BoardPeriod;
  scopeId!: string | null;
  /** The period shown, e.g. "2026-W40" (UTC week), a season ID or "all". */
  periodKey!: string | null;
  /** Students on public boards there (region and city boards need `minStudents`). */
  areaSize!: number | null;
  minStudents!: number;
  entries!: AdminBoardEntryDto[];
}

export class RemoveXpDto {
  /** XP to take away (at most the student's total). */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  amount!: number;

  /** Why, e.g. "Submitted copied answers in bulk". Kept in the audit log and XP history. */
  @IsString()
  @MinLength(3)
  @MaxLength(300)
  reason!: string;
}

export class XpEventDto {
  id!: string;
  amount!: number;
  source!: string;
  sourceId!: string;
  day!: string;
  reason!: string | null;
  createdAt!: Date;
}

export class StudentBadgeDto {
  key!: string;
  awardedAt!: Date;
  /** True for badges staff give by hand (they can take these back). */
  manual!: boolean;
  /** Why staff gave it (manual badges). */
  reason!: string | null;
}

export class StudentXpDto {
  xpTotal!: number;
  weekXp!: number;
  events!: XpEventDto[];
  badges!: StudentBadgeDto[];
}

export class StartSeasonDto {
  @IsString()
  @MinLength(3)
  @MaxLength(60)
  name!: string;

  /** First day (defaults to today, UTC). */
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  startDay?: string;

  /** Planned end: the day after the last day. */
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  endDay?: string;
}

export class SeasonAdminDto {
  id!: string;
  name!: string;
  startDay!: string;
  endDay!: string | null;
  status!: 'ACTIVE' | 'ENDED';
  endedAt!: Date | null;
  createdAt!: Date;
}

export class SeasonListDto {
  seasons!: SeasonAdminDto[];
}

export class GiveBadgeDto {
  @Matches(/^[a-z0-9-]{1,40}$/)
  badgeKey!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(300)
  reason!: string;
}

export class RemoveBadgeBody {
  @IsString()
  @MinLength(3)
  @MaxLength(300)
  reason!: string;
}

export class ResultsQueryDto {
  @IsOptional()
  @IsIn(['WEEK', 'SEASON'])
  period?: 'WEEK' | 'SEASON';
}

export class ResultEntryDto {
  rank!: number;
  userId!: string;
  nickname!: string | null;
  xp!: number;
}

export class ResultBoardDto {
  period!: 'WEEK' | 'SEASON';
  periodKey!: string;
  seasonName!: string | null;
  scope!: 'GLOBAL' | 'COUNTRY' | 'REGION' | 'CITY';
  scopeId!: string;
  entries!: ResultEntryDto[];
}

export class ResultListDto {
  boards!: ResultBoardDto[];
}
