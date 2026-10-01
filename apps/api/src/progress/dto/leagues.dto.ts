import { LEAGUE_TIERS, type LeagueTier } from '@kcp/shared';
import { ApiProperty } from '@nestjs/swagger';

export type LeagueZone = 'up' | 'down';
export type LeagueOutcomeValue = 'PROMOTED' | 'STAYED' | 'RELEGATED';

export class LeagueStandingDto {
  rank!: number;
  /**
   * Null for a student whose parent keeps them off public boards (shown as "A player"),
   * unless it's the viewer or one of their friends.
   */
  nickname!: string | null;
  avatarKey!: string | null;
  /** XP this week. */
  xp!: number;
  isMe!: boolean;
  isFriend!: boolean;
  /** Where this place goes if the week ended now: up a league, down, or neither. */
  @ApiProperty({ enum: ['up', 'down'], nullable: true, type: String })
  zone!: LeagueZone | null;
}

export class LeagueResultDto {
  weekKey!: string;
  /** The league the student played that week in. */
  @ApiProperty({ enum: LEAGUE_TIERS })
  tier!: LeagueTier;
  rank!: number;
  @ApiProperty({ enum: ['PROMOTED', 'STAYED', 'RELEGATED'] })
  outcome!: LeagueOutcomeValue;
  /** The league they are in now. */
  @ApiProperty({ enum: LEAGUE_TIERS })
  newTier!: LeagueTier;
}

export class LeagueWeekDto {
  key!: string;
  startDay!: string;
  /** The day after the week (it ends at Monday 00:00, the student's time; results come by Monday 00:00 UTC). */
  endDay!: string;
}

export class LeagueDto {
  @ApiProperty({ enum: LEAGUE_TIERS })
  tier!: LeagueTier;
  /** 0 = Bronze … 6 = Diamond. */
  tierIndex!: number;
  week!: LeagueWeekDto;
  /** False until the student earns XP this week (that puts them in a group). */
  joined!: boolean;
  /** The group, best first. Empty until joined. */
  standings!: LeagueStandingDto[];
  /** How many move up and down when the week closes (in a group this size). */
  promoteCount!: number;
  relegateCount!: number;
  /** Last week's result, until the student has seen it. */
  lastResult!: LeagueResultDto | null;
}
