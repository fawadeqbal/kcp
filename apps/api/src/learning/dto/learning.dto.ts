import { MAX_CODE_FILE_LENGTH } from '@kcp/shared';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { QuizDto } from './quiz.dto.js';

export class LanguageQueryDto {
  /** Language for titles and texts, e.g. "ar". Falls back to English for anything untranslated. */
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @Matches(/^[a-z]{2}$/)
  lang?: string;
}

export type LessonStatusValue = 'NOT_STARTED' | 'STARTED' | 'COMPLETED';

/** The student's code: one entry per file. */
export class CodeFilesDto {
  @IsOptional()
  @IsString()
  @MaxLength(MAX_CODE_FILE_LENGTH)
  html?: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_CODE_FILE_LENGTH)
  css?: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_CODE_FILE_LENGTH)
  js?: string;

  /** Python lessons: the program (runs with Pyodide in the sandbox). */
  @IsOptional()
  @IsString()
  @MaxLength(MAX_CODE_FILE_LENGTH)
  py?: string;
}

export class SaveDraftDto {
  @ValidateNested()
  @Type(() => CodeFilesDto)
  code!: CodeFilesDto;
}

export class CheckResultDto {
  @IsString()
  @MaxLength(80)
  id!: string;

  @IsBoolean()
  passed!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  hint?: string;
}

export class SubmitDto {
  @ValidateNested()
  @Type(() => CodeFilesDto)
  code!: CodeFilesDto;

  /** What the checks in the browser sandbox found, one entry per check. */
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CheckResultDto)
  results!: CheckResultDto[];
}

export class LessonSummaryDto {
  id!: string;
  title!: string;
  summary!: string;
  xp!: number;
  isPremium!: boolean;
  /** Premium, and the student has no premium now (no trial, plan or grant). */
  locked!: boolean;
  challengeCount!: number;
  /** Quizzes the lesson has (short questions that work on a phone). */
  quizCount!: number;
  /** Always NOT_STARTED for accounts that aren't students. */
  status!: LessonStatusValue;
}

/** The project that ends a module. */
export class ModuleProjectDto {
  id!: string;
  title!: string;
  summary!: string;
  xp!: number;
  isPremium!: boolean;
  /** Premium, and the student has no premium now. */
  locked!: boolean;
  /** NOT_STARTED, DRAFT (saved but not shipped) or SHIPPED. Always NOT_STARTED for adults. */
  status!: 'NOT_STARTED' | 'DRAFT' | 'SHIPPED';
}

export class ModuleDto {
  id!: string;
  title!: string;
  description!: string;
  lessons!: LessonSummaryDto[];
  project!: ModuleProjectDto | null;
}

export class TrackDto {
  id!: string;
  title!: string;
  modules!: ModuleDto[];
}

export class PremiumInfoDto {
  active!: boolean;
  /** subscription (the family's plan), grant (given by our team) or trial. */
  source!: 'subscription' | 'grant' | 'trial' | null;
  until!: Date | null;
  trialEndsAt!: Date | null;
}

export class LearningOverviewDto {
  tracks!: TrackDto[];
  /** Where "Continue" goes: the first lesson the student hasn't completed. */
  nextLessonId!: string | null;
  lessonsCompleted!: number;
  /** The student's premium (null for parents and staff, who can open everything). */
  premium!: PremiumInfoDto | null;
}

export class VideoDto {
  /** "youtube" or "cloudflare". */
  provider!: string;
  id!: string;
}

export class ChallengeDto {
  id!: string;
  title!: string;
  /** Markdown. */
  instructions!: string;
  type!: 'HTML' | 'CSS' | 'JS' | 'PYTHON';
  xp!: number;
  /** The editor tabs, in order. */
  files!: ('html' | 'css' | 'js' | 'py')[];
  starter!: CodeFilesDto;
  /** Checks for the browser sandbox (see packages/checks). */
  checks!: Record<string, unknown>[];
  /** Hint texts by key, in the requested language with English filling gaps. */
  hints!: Record<string, string>;
  /**
   * What each check looks at, by check ID ("The heading has a colour"), in the
   * requested language with English filling gaps: the checklist beside the editor.
   */
  checkLabels!: Record<string, string>;
  /** The student's saved code, if any. */
  draft!: CodeFilesDto | null;
  /** Whether the student has passed this challenge before. */
  passed!: boolean;
}

export class LessonDto {
  id!: string;
  trackId!: string;
  moduleId!: string;
  moduleTitle!: string;
  /** Position in the module, starting at 1. */
  number!: number;
  lessonCount!: number;
  title!: string;
  summary!: string;
  /** The explainer, in Markdown. */
  body!: string;
  /** The language the texts are in (English when a translation is missing). */
  language!: string;
  video!: VideoDto | null;
  xp!: number;
  isPremium!: boolean;
  status!: LessonStatusValue;
  previousLessonId!: string | null;
  nextLessonId!: string | null;
  challenges!: ChallengeDto[];
  /** Short questions about the lesson (graded by the server). */
  quizzes!: QuizDto[];
}

export class LessonProgressDto {
  status!: LessonStatusValue;
}

export class SubmissionResultDto {
  passed!: boolean;
  /** The result stored for each of the challenge's checks. */
  results!: CheckResultDto[];
  /** True when this submission completed the lesson (every challenge passed). */
  lessonCompleted!: boolean;
  nextLessonId!: string | null;
  /** XP this submission earned (challenge and, when completed, the lesson). */
  xpAwarded!: number;
  /** True when the daily XP cap held some of it back. */
  dailyCapReached!: boolean;
  /** Badges this earned (keys; names are translated in the apps), to celebrate. */
  badgesEarned!: string[];
}
