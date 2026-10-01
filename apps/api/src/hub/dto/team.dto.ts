import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import {
  HubPersonDto,
  HubTaskDto,
  PROJECT_STATUSES,
  type ProjectStatusValue,
} from './projects.dto.js';

export const MEMBER_STATUSES = ['INVITED', 'ACCEPTED', 'APPROVED', 'DECLINED', 'REMOVED'] as const;
export type MemberStatusValue = (typeof MEMBER_STATUSES)[number];

/** How well a student fits a task (0–100), and why. */
export class MatchScoreDto {
  total!: number;
  /** Task skills the student has (0–40). */
  skills!: number;
  /** Review scores so far (0–25). */
  reputation!: number;
  /** Level and certificates (0–15). */
  experience!: number;
  /** Hours left under this week's cap, against the estimate (0–20). */
  availability!: number;
}

/** A hub-eligible student suggested for a task (the lead sees nicknames, never accounts). */
export class MatchDto {
  studentId!: string;
  nickname!: string;
  avatarKey!: string;
  countryCode!: string | null;
  score!: MatchScoreDto;
  /** The task's skills they have. */
  matchedSkills!: string[];
  /** Minutes left under this week's cap. */
  minutesLeft!: number;
  /** Other hub projects they're on now. */
  activeProjects!: number;
}

export class InviteDto {
  @IsUUID()
  studentId!: string;

  /** The task they're invited for. */
  @IsOptional()
  @IsUUID()
  taskId?: string;

  /** For the student and their parent: why them, what it involves. */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

/** A student on (or invited to) the team, as the lead and staff see them. */
export class HubMemberDto extends HubPersonDto {
  memberId!: string;
  @ApiProperty({ enum: MEMBER_STATUSES })
  status!: MemberStatusValue;
  invitedAt!: Date;
  answeredAt!: Date | null;
  decidedAt!: Date | null;
  declinedBy!: 'STUDENT' | 'PARENT' | null;
  removedAt!: Date | null;
  /** The task they were invited for. */
  taskId!: string | null;
  /** Minutes logged on this project. */
  minutes!: number;
}

/** A team member as the client sees them: a pseudonym, skills and finished work only. */
export class AnonymousMemberDto {
  pseudonym!: string;
  /** Skill keys (the skill map). */
  skills!: string[];
  /** Modules finished with a certificate (titles in English). */
  certificates!: string[];
  /** Projects shipped to their portfolio. */
  shippedProjects!: number;
  /** Tasks on this project finished. */
  tasksDone!: number;
}

export class AssigneeDto {
  /** A student on the team, or null to take the task back. */
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  studentId!: string | null;
}

export class AnswerInviteDto {
  @IsBoolean()
  accept!: boolean;
}

export class ParentDecisionDto {
  @IsBoolean()
  approve!: boolean;
}

export class RemoveMemberDto {
  @IsString()
  @MinLength(3)
  @MaxLength(300)
  reason!: string;
}

/** A project invitation as the student sees it. */
export class StudentInviteDto {
  memberId!: string;
  projectId!: string;
  title!: string;
  summary!: string;
  leadName!: string | null;
  note!: string | null;
  @ApiProperty({ enum: MEMBER_STATUSES })
  status!: MemberStatusValue;
  taskTitle!: string | null;
  estimateMinutes!: number | null;
  /** About what the student earns for the task (minor units), if they finish it. */
  estimatedEarningsMinor!: number | null;
  currency!: string;
  invitedAt!: Date;
}

/** A project waiting for the parent's approval. */
export class ParentApprovalDto extends StudentInviteDto {
  childId!: string;
  nickname!: string;
  /** The share of the students' pool the task carries (basis points). */
  shareBp!: number | null;
  studentPercent!: number;
}

/** The team as students see each other: nickname, avatar and pseudonym. */
export class TeamMateDto extends HubPersonDto {
  isMe!: boolean;
  isLead!: false;
}

/** A hub project as a team student sees it: the brief, the board, the team. */
export class StudentProjectDto {
  id!: string;
  reference!: string;
  title!: string;
  summary!: string;
  @ApiProperty({ enum: PROJECT_STATUSES })
  status!: ProjectStatusValue;
  leadName!: string | null;
  currency!: string;
  deadline!: string | null;
  @ApiProperty({ enum: MEMBER_STATUSES })
  memberStatus!: MemberStatusValue;
  @ApiProperty({ type: [TeamMateDto] })
  team!: TeamMateDto[];
  /** The board: tasks of approved quotes. */
  @ApiProperty({ type: [HubTaskDto] })
  tasks!: HubTaskDto[];
  /** The team's room. */
  roomId!: string | null;
  /** The team has a repository on the platform's git server. */
  hasRepo!: boolean;
}

export class StudentProjectSummaryDto {
  id!: string;
  reference!: string;
  title!: string;
  @ApiProperty({ enum: PROJECT_STATUSES })
  status!: ProjectStatusValue;
  @ApiProperty({ enum: MEMBER_STATUSES })
  memberStatus!: MemberStatusValue;
  /** Their tasks not done yet. */
  openTasks!: number;
}

export class ChildHubTaskDto {
  title!: string;
  @ApiProperty({ enum: ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED'] })
  status!: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'CANCELLED';
  estimateMinutes!: number;
}

/** A child's hub project, as their parent sees it. */
export class ChildHubProjectDto {
  projectId!: string;
  title!: string;
  @ApiProperty({ enum: PROJECT_STATUSES })
  status!: ProjectStatusValue;
  @ApiProperty({ enum: MEMBER_STATUSES })
  memberStatus!: MemberStatusValue;
  leadName!: string | null;
  /** The child's tasks: what, and how far. */
  @ApiProperty({ type: [ChildHubTaskDto] })
  tasks!: ChildHubTaskDto[];
  /** Minutes the child logged on it. */
  minutes!: number;
}

export class RunningTimerDto {
  projectId!: string;
  taskId!: string;
  startedAt!: Date;
  /** When it stops by itself: the allowed time ends, or the week's minutes run out. */
  stopsAt!: Date;
}

/** The student's hub time this week, under their country's rules. */
export class TimeUsageDto {
  weekKey!: string;
  capMinutes!: number;
  usedMinutes!: number;
  leftMinutes!: number;
  allowedNow!: boolean;
  windowEnd!: Date | null;
  nextWindow!: Date | null;
  running!: RunningTimerDto | null;
}

export class MoveTaskDto {
  @IsIn(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'])
  status!: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
}

export class OpenHubPullDto {
  @IsString()
  @Matches(/^[\w.-]{1,40}$/)
  branch!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(100)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  body?: string;

  /** The task it's for: its reference goes in the title ("T-3: …"). */
  @IsOptional()
  @IsUUID()
  taskId?: string;
}

/** The lead's review: approve or ask for changes, with a score for the student. */
export class HubReviewDto {
  @IsIn(['APPROVED', 'CHANGES_REQUESTED'])
  decision!: 'APPROVED' | 'CHANGES_REQUESTED';

  /** 1 (needs a lot of work) … 5 (excellent). */
  @IsInt()
  @Min(1)
  @Max(5)
  score!: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  body?: string;
}
