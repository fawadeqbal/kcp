import { CODE_FILE_KEYS } from '@kcp/shared';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { CodeFilesDto, StageDto } from '../learning/dto/learning.dto.js';

type ReviewStatusValue = 'WAITING' | 'IN_REVIEW' | 'APPROVED' | 'CHANGES_REQUESTED' | 'CANCELLED';
type ReviewKindValue = 'PROJECT' | 'READINESS';
type BackgroundCheckValue = 'NOT_STARTED' | 'PENDING' | 'PASSED' | 'FAILED';

// ── Mentors ─────────────────────────────────────────────────────────────────

export class MentorStatusDto {
  /** Background check passed, code of conduct signed, account active: may review. */
  ready!: boolean;
  backgroundCheck!: BackgroundCheckValue;
  /** Signed the current code of conduct. */
  codeOfConductSigned!: boolean;
  /** The version to sign. */
  codeOfConductVersion!: string;
  languages!: string[];
  capacity!: number;
  isActive!: boolean;
  /** Reviews this mentor has open now. */
  open!: number;
}

export class SignConductDto {
  /** The version the mentor read (must be the current one: codeOfConductVersion). */
  @IsString()
  @Length(4, 20)
  version!: string;
}

export class MentorQueueItemDto {
  id!: string;
  kind!: ReviewKindValue;
  status!: ReviewStatusValue;
  nickname!: string;
  avatarKey!: string;
  /** The project's title, in the mentor's language. */
  title!: string;
  moduleTitle!: string;
  /** The student's language. */
  languageCode!: string;
  version!: number;
  requestedAt!: Date;
  decidedAt!: Date | null;
  hoursWaiting!: number;
  /** Waiting longer than the 48-hour target. */
  overdue!: boolean;
}

export class MentorStatsDto {
  waiting!: number;
  overdue!: number;
  decidedLast30Days!: number;
  /** This mentor's average, in hours (null before the first review). */
  averageTurnaroundHours!: number | null;
}

export class MentorQueueDto {
  /** Waiting for a mentor, oldest first. */
  waiting!: MentorQueueItemDto[];
  /** Reviews this mentor is doing. */
  mine!: MentorQueueItemDto[];
  /** This mentor's latest decisions. */
  decided!: MentorQueueItemDto[];
  stats!: MentorStatsDto;
}

export class QueueQueryDto {
  /** "mine": only the mentor's languages (default); "all": every language. */
  @IsOptional()
  @IsIn(['mine', 'all'])
  languages?: 'mine' | 'all';
}

export class ReviewCommentDto {
  id!: string;
  file!: 'html' | 'css' | 'js' | 'py' | 'blocks';
  line!: number;
  body!: string;
  createdAt!: Date;
}

export class MentorReviewCommentDto extends ReviewCommentDto {
  /** Written by the signed-in mentor (they may delete it while reviewing). */
  mine!: boolean;
}

export class MentorNoteDto {
  id!: string;
  body!: string;
  createdAt!: Date;
  author!: string;
}

export class ReviewBriefDto {
  title!: string;
  summary!: string;
  body!: string;
  /** What each requirement checks, by check ID. */
  checkLabels!: Record<string, string>;
}

export class ReviewHistoryItemDto {
  id!: string;
  version!: number;
  status!: ReviewStatusValue;
  decidedAt!: Date | null;
}

export class MentorReviewDto {
  id!: string;
  kind!: ReviewKindValue;
  status!: ReviewStatusValue;
  studentId!: string;
  nickname!: string;
  avatarKey!: string;
  languageCode!: string;
  version!: number;
  requestedAt!: Date;
  claimedAt!: Date | null;
  decidedAt!: Date | null;
  /** The signed-in mentor is doing this review. */
  isMine!: boolean;
  brief!: ReviewBriefDto | null;
  files!: CodeFilesDto;
  /** Block projects: the level the program plays on. */
  stage!: StageDto | null;
  comments!: MentorReviewCommentDto[];
  /** The rubric's criteria, in order (names in the web messages: review.criteria.*). */
  criteria!: string[];
  scores!: Record<string, number>;
  summary!: string | null;
  notes!: MentorNoteDto[];
  /** Earlier reviews of the same project. */
  history!: ReviewHistoryItemDto[];
}

export class AddCommentDto {
  @IsIn(CODE_FILE_KEYS)
  file!: 'html' | 'css' | 'js' | 'py' | 'blocks';

  @IsInt()
  @Min(1)
  @Max(5000)
  line!: number;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 1000)
  body!: string;
}

export class DecisionDto {
  @IsIn(['APPROVED', 'CHANGES_REQUESTED'])
  decision!: 'APPROVED' | 'CHANGES_REQUESTED';

  /** Rubric scores by criterion, 1 to 4 (every criterion). */
  @IsObject()
  scores!: Record<string, number>;

  /** The message to the student, in their language. */
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(3, 4000)
  summary!: string;
}

export class AddNoteDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(3, 2000)
  body!: string;
}

export class ReviewIdParam {
  @IsUUID()
  id!: string;
}

export class CommentParams extends ReviewIdParam {
  @IsUUID()
  commentId!: string;
}

export class StudentIdParam {
  @IsUUID()
  id!: string;
}

// ── Students and parents ────────────────────────────────────────────────────

export class ReviewSummaryDto {
  id!: string;
  status!: ReviewStatusValue;
  version!: number;
  requestedAt!: Date;
  decidedAt!: Date | null;
  /** The student opened the result. */
  seen!: boolean;
}

export class StudentReviewDto extends ReviewSummaryDto {
  kind!: ReviewKindValue;
  /** The mentor's first name (mentors see only the student's nickname). */
  mentorName!: string | null;
  /** The code the mentor reviewed. */
  files!: CodeFilesDto;
  comments!: ReviewCommentDto[];
  criteria!: string[];
  scores!: Record<string, number>;
  summary!: string | null;
  /** The project's title, in the requested language. */
  title!: string;
  briefId!: string | null;
}

// ── Admin ────────────────────────────────────────────────────────────────────

export class AdminMentorDto {
  id!: string;
  name!: string;
  email!: string;
  /** Invited but hasn't chosen a password yet. */
  invited!: boolean;
  backgroundCheck!: BackgroundCheckValue;
  backgroundCheckedAt!: Date | null;
  backgroundCheckNote!: string | null;
  codeOfConductSignedAt!: Date | null;
  codeOfConductVersion!: string | null;
  languages!: string[];
  capacity!: number;
  isActive!: boolean;
  ready!: boolean;
  open!: number;
  decidedLast30Days!: number;
  averageTurnaroundHours!: number | null;
}

export class AdminTutorDto {
  id!: string;
  name!: string;
  email!: string;
  /** Drafts they are writing now. */
  drafts!: number;
  /** Translations of theirs published in the last 30 days. */
  publishedLast30Days!: number;
}

export class ReviewQueueStatsDto {
  waiting!: number;
  overdue!: number;
  inReview!: number;
  /** Hours the oldest waiting review has waited. */
  oldestHours!: number | null;
  averageTurnaroundHours!: number | null;
}

export class AdminMentorsDto {
  mentors!: AdminMentorDto[];
  tutors!: AdminTutorDto[];
  queue!: ReviewQueueStatsDto;
}

export class InviteMentorDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(2, 80)
  displayName!: string;

  /** The language of the invitation email and the account. */
  @Matches(/^[a-z]{2,3}$/)
  languageCode!: string;

  /** Languages they review in. */
  @IsArray()
  @ArrayMaxSize(10)
  @Matches(/^[a-z]{2,3}$/, { each: true })
  languages!: string[];

  @IsInt()
  @Min(1)
  @Max(50)
  capacity!: number;
}

export class UpdateMentorDto {
  @IsOptional()
  @IsIn(['NOT_STARTED', 'PENDING', 'PASSED', 'FAILED'])
  backgroundCheck?: BackgroundCheckValue;

  /** Provider and reference of the check (staff only). */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  backgroundCheckNote?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @Matches(/^[a-z]{2,3}$/, { each: true })
  languages?: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  capacity?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsString()
  @MinLength(3)
  @MaxLength(300)
  reason!: string;
}

export class MentorIdParam {
  @IsUUID()
  id!: string;
}
