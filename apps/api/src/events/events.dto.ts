import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDate,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export const EVENT_STATUSES = ['DRAFT', 'OPEN', 'RUNNING', 'JUDGING', 'FINISHED'] as const;
export type EventStatusValue = (typeof EVENT_STATUSES)[number];

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

// ── What students, parents and mentors see ───────────────────────────────────

export class RubricItemDto {
  @IsString()
  @Matches(/^[a-z][a-z0-9-]{0,19}$/)
  key!: string;

  @IsString()
  @Transform(trim)
  @MinLength(2)
  @MaxLength(60)
  label!: string;

  @IsInt()
  @Min(1)
  @Max(10)
  max!: number;
}

export class EventPersonDto {
  nickname!: string;
  avatarKey!: string;
}

export class EventMemberDto extends EventPersonDto {
  isCaptain!: boolean;
  @ApiProperty({ enum: ['PENDING', 'APPROVED'] })
  status!: 'PENDING' | 'APPROVED';
  isMe!: boolean;
}

export class EventSubmissionDto {
  title!: string;
  description!: string;
  /** The commit on main that was handed in. */
  commit!: string | null;
  submittedAt!: Date;
}

export class EventTeamDto {
  id!: string;
  name!: string;
  /** Given to friends to join (approved members only). */
  joinCode!: string | null;
  members!: EventMemberDto[];
  /** The mentor's name, once staff assign one. */
  mentorName!: string | null;
  /** The team's room (approved members). */
  roomId!: string | null;
  submission!: EventSubmissionDto | null;
  rank!: number | null;
  /** The viewer's own membership is approved (their parent said yes). */
  approved!: boolean;
}

export class EventResultDto {
  rank!: number;
  team!: string;
  score!: number;
  members!: EventPersonDto[];
}

export class EventSummaryDto {
  slug!: string;
  title!: string;
  description!: string;
  @ApiProperty({ enum: EVENT_STATUSES })
  status!: EventStatusValue;
  startsAt!: Date;
  endsAt!: Date;
  teamSize!: number;
  minAge!: number;
  teams!: number;
  /** The viewer's team in it, if any. */
  myTeam!: { id: string; name: string; approved: boolean } | null;
  /** The viewer can make or join a team now (open, old enough, not in one). */
  canJoin!: boolean;
}

export class EventDetailDto extends EventSummaryDto {
  @ApiProperty({ type: [RubricItemDto] })
  rubric!: RubricItemDto[];
  team!: EventTeamDto | null;
  /** Finished events: the teams, best first. */
  @ApiProperty({ type: [EventResultDto] })
  results!: EventResultDto[];
  /** Team repositories are set up on this server. */
  gitEnabled!: boolean;
}

export class CreateTeamDto {
  @IsString()
  @Transform(trim)
  @MinLength(3)
  @MaxLength(30)
  name!: string;
}

export class JoinTeamDto {
  @IsString()
  @MinLength(4)
  @MaxLength(12)
  code!: string;
}

export class ParentEventRequestDto {
  teamId!: string;
  child!: { id: string; nickname: string; avatarKey: string };
  event!: { slug: string; title: string; startsAt: Date; endsAt: Date };
  team!: { name: string; members: string[] };
  requestedAt!: Date;
}

export class EventDecisionDto {
  @IsUUID()
  childId!: string;

  @IsBoolean()
  approve!: boolean;
}

export class EventDecisionResultDto {
  @ApiProperty({ enum: ['APPROVED', 'DECLINED'] })
  status!: 'APPROVED' | 'DECLINED';
}

// ── The team's repository ─────────────────────────────────────────────────────

export class WorkspaceDto {
  teamId!: string;
  /** Git's URL for the repository (through this API; send the access token with it). */
  gitUrl!: string;
  /** The viewer's own branch (made from main the first time). */
  branch!: string;
  /** Pushing is allowed while the event runs. */
  canPush!: boolean;
  /** For commits: the viewer's nickname and git address. */
  author!: { name: string; email: string };
}

export class PullAuthorDto {
  name!: string;
  isAdult!: boolean;
  isMe!: boolean;
}

export class PullSummaryDto {
  number!: number;
  title!: string;
  author!: PullAuthorDto;
  @ApiProperty({ enum: ['open', 'closed', 'merged'] })
  state!: 'open' | 'closed' | 'merged';
  branch!: string;
  updatedAt!: Date;
}

export class PullCommentDto {
  id!: number;
  body!: string;
  author!: PullAuthorDto;
  createdAt!: Date;
}

export class PullReviewDto {
  id!: number;
  @ApiProperty({ enum: ['APPROVED', 'REQUEST_CHANGES', 'COMMENT'] })
  state!: 'APPROVED' | 'REQUEST_CHANGES' | 'COMMENT';
  body!: string;
  author!: PullAuthorDto;
  submittedAt!: Date;
}

export class PullDetailDto extends PullSummaryDto {
  body!: string;
  /** The changes, as a unified diff (long diffs are cut). */
  diff!: string;
  diffTruncated!: boolean;
  @ApiProperty({ type: [PullCommentDto] })
  comments!: PullCommentDto[];
  @ApiProperty({ type: [PullReviewDto] })
  reviews!: PullReviewDto[];
  canReview!: boolean;
  canMerge!: boolean;
  /** Why it can't be merged yet (e.g. APPROVAL_NEEDED). */
  mergeBlocked!: string | null;
}

export class OpenPullDto {
  @IsString()
  @Matches(/^[\w.-]{1,40}$/)
  branch!: string;

  @IsString()
  @Transform(trim)
  @MinLength(3)
  @MaxLength(100)
  title!: string;

  @IsOptional()
  @IsString()
  @Transform(trim)
  @MaxLength(1000)
  body?: string;
}

export class PullCommentBodyDto {
  @IsString()
  @Transform(trim)
  @MinLength(1)
  @MaxLength(1000)
  body!: string;
}

export class PullReviewBodyDto {
  @IsIn(['APPROVED', 'REQUEST_CHANGES', 'COMMENT'])
  event!: 'APPROVED' | 'REQUEST_CHANGES' | 'COMMENT';

  @IsOptional()
  @IsString()
  @Transform(trim)
  @MaxLength(1000)
  body?: string;
}

export class SubmitWorkDto {
  @IsString()
  @Transform(trim)
  @MinLength(3)
  @MaxLength(80)
  title!: string;

  @IsString()
  @Transform(trim)
  @MinLength(10)
  @MaxLength(1000)
  description!: string;
}

export class TeamFilesDto {
  /** The commit the files come from. */
  ref!: string;
  /** index.html, style.css and script.js (those that exist). */
  files!: Record<string, string>;
}

export class TeamFilesQueryDto {
  /** "submission" (the handed-in commit, the default when there is one) or "main". */
  @IsOptional()
  @IsIn(['submission', 'main'])
  ref?: 'submission' | 'main';
}

// ── Mentors and judges ────────────────────────────────────────────────────────

export class MentorTeamDto {
  id!: string;
  name!: string;
  event!: { slug: string; title: string; status: EventStatusValue };
  members!: EventPersonDto[];
  hasRepo!: boolean;
  roomId!: string | null;
}

export class JudgingTeamDto {
  id!: string;
  name!: string;
  members!: EventPersonDto[];
  submission!: EventSubmissionDto | null;
  /** The viewer's scores, once given. */
  myScores!: Record<string, number> | null;
  myComment!: string | null;
}

export class JudgingDto {
  slug!: string;
  title!: string;
  @ApiProperty({ enum: EVENT_STATUSES })
  status!: EventStatusValue;
  @ApiProperty({ type: [RubricItemDto] })
  rubric!: RubricItemDto[];
  @ApiProperty({ type: [JudgingTeamDto] })
  teams!: JudgingTeamDto[];
}

export class MentorEventsDto {
  @ApiProperty({ type: [MentorTeamDto] })
  teams!: MentorTeamDto[];
  /** Events the viewer judges. */
  judging!: { slug: string; title: string; status: EventStatusValue }[];
}

export class ScoreTeamDto {
  @IsObject()
  scores!: Record<string, number>;

  @IsOptional()
  @IsString()
  @Transform(trim)
  @MaxLength(1000)
  comment?: string;
}

// ── Staff ─────────────────────────────────────────────────────────────────────

export class SaveEventDto {
  @IsString()
  @Transform(trim)
  @MinLength(3)
  @MaxLength(80)
  title!: string;

  /** In addresses and the git server: lowercase letters, digits and dashes. */
  @IsString()
  @Matches(/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/)
  slug!: string;

  @IsString()
  @Transform(trim)
  @MinLength(10)
  @MaxLength(2000)
  description!: string;

  @Type(() => Date)
  @IsDate()
  startsAt!: Date;

  @Type(() => Date)
  @IsDate()
  endsAt!: Date;

  @IsInt()
  @Min(1)
  @Max(5)
  teamSize!: number;

  @IsInt()
  @Min(9)
  @Max(16)
  minAge!: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => RubricItemDto)
  rubric?: RubricItemDto[];

  /** The files each team's repository starts with. */
  @IsOptional()
  @IsObject()
  starter?: Record<string, string>;
}

export class EventStatusDto {
  @IsIn(EVENT_STATUSES)
  status!: EventStatusValue;
}

export class EventJudgesDto {
  @IsArray()
  @ArrayMaxSize(20)
  @IsUUID('all', { each: true })
  judgeIds!: string[];
}

export class TeamMentorDto {
  @IsOptional()
  @IsUUID()
  mentorId!: string | null;
}

export class StaffPersonDto {
  id!: string;
  name!: string;
}

export class AdminTeamMemberDto {
  userId!: string;
  nickname!: string;
  username!: string | null;
  @ApiProperty({ enum: ['PENDING', 'APPROVED'] })
  status!: 'PENDING' | 'APPROVED';
  isCaptain!: boolean;
}

export class AdminTeamDto {
  id!: string;
  name!: string;
  joinCode!: string;
  mentor!: StaffPersonDto | null;
  repo!: string | null;
  members!: AdminTeamMemberDto[];
  submission!: EventSubmissionDto | null;
  /** Each judge's total. */
  scores!: { judge: string; total: number }[];
  rank!: number | null;
  score!: number | null;
}

export class AdminEventSummaryDto {
  id!: string;
  slug!: string;
  title!: string;
  @ApiProperty({ enum: EVENT_STATUSES })
  status!: EventStatusValue;
  startsAt!: Date;
  endsAt!: Date;
  teams!: number;
}

export class AdminEventDto extends AdminEventSummaryDto {
  description!: string;
  teamSize!: number;
  minAge!: number;
  @ApiProperty({ type: [RubricItemDto] })
  rubric!: RubricItemDto[];
  starter!: Record<string, string>;
  @ApiProperty({ type: [StaffPersonDto] })
  judges!: StaffPersonDto[];
  @ApiProperty({ type: [AdminTeamDto] })
  teamList!: AdminTeamDto[];
  /** Mentors who can review or judge (background check passed). */
  @ApiProperty({ type: [StaffPersonDto] })
  mentors!: StaffPersonDto[];
}

export class RemoveMemberDto {
  /** Why (kept in the audit log). */
  @IsString()
  @Transform(trim)
  @MinLength(5)
  @MaxLength(500)
  reason!: string;
}
