import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { CodeFilesDto } from '../learning/dto/learning.dto.js';

export const READINESS_STATUSES = [
  'STARTED',
  'SUBMITTED',
  'PASSED',
  'NOT_PASSED',
  'EXPIRED',
] as const;
export type ReadinessStatusValue = (typeof READINESS_STATUSES)[number];

/** Why a student can't start the check now. */
export const READINESS_BLOCKERS = [
  'AGE',
  'PRO_TRACK',
  'PREMIUM',
  'WAIT',
  'PASSED',
  'OPEN',
] as const;
export type ReadinessBlocker = (typeof READINESS_BLOCKERS)[number];

export class ReadinessBriefDto {
  title!: string;
  summary!: string;
  /** Markdown. */
  body!: string;
  /** What the mentor looks for, by key. */
  requirements!: Record<string, string>;
}

export class ReadinessCheckDto {
  id!: string;
  @ApiProperty({ enum: READINESS_STATUSES })
  status!: ReadinessStatusValue;
  startedAt!: Date;
  dueAt!: Date;
  submittedAt!: Date | null;
  /** The work so far (only while it is the student's own open attempt). */
  files!: CodeFilesDto;
  /** The mentor's review, once handed in. */
  reviewId!: string | null;
  /** The rubric total once graded, out of `maxScore`. */
  score!: number | null;
  maxScore!: number;
  decidedAt!: Date | null;
  passedAt!: Date | null;
}

export class ReadinessDto {
  /** The student may start a check now. */
  canStart!: boolean;
  @ApiProperty({ enum: READINESS_BLOCKERS, isArray: true })
  blockers!: ReadinessBlocker[];
  /** After "not yet": when they may try again. */
  retryAt!: Date | null;
  minutes!: number;
  brief!: ReadinessBriefDto;
  /** The attempt going on or waiting for a mentor, if any. */
  current!: ReadinessCheckDto | null;
  /** Finished attempts, newest first. */
  @ApiProperty({ type: [ReadinessCheckDto] })
  history!: ReadinessCheckDto[];
  /** The Pro track's lessons: done and in all. */
  proLessonsDone!: number;
  proLessons!: number;
}

export class SaveReadinessDto {
  @ValidateNested()
  @Type(() => CodeFilesDto)
  files!: CodeFilesDto;
}

export class ReadinessSavedDto {
  savedAt!: Date;
}
