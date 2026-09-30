import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class QuizLineDto {
  id!: string;
  text!: string;
}

export class QuizOptionDto {
  id!: string;
  /** Text in the student's language, or null when the option is code. */
  text!: string | null;
  /** Code, shown as it is in every language, or null for a text option. */
  code!: string | null;
}

export class QuizDto {
  id!: string;
  lessonId!: string;
  /**
   * ORDER: put `lines` in order and send their IDs back. BUG: tap the line with the
   * mistake (send its number). OUTPUT: pick what the code shows. CHOICE: pick the
   * right answer.
   */
  kind!: 'ORDER' | 'BUG' | 'OUTPUT' | 'CHOICE';
  xp!: number;
  /** html, css, js or python: how to colour the code. */
  codeLanguage!: string | null;
  prompt!: string;
  /**
   * ORDER: the lines, shuffled. BUG, OUTPUT and CHOICE: the code as it is (the ID
   * is the line number). Empty when the quiz has no code.
   */
  lines!: QuizLineDto[];
  options!: QuizOptionDto[];
  /** The student has answered it correctly before. */
  solved!: boolean;
}

export class PracticeQuizDto extends QuizDto {
  lessonTitle!: string;
}

export class QuizAnswerDto {
  /** ORDER: the line IDs in the student's order. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @Matches(/^[a-f0-9]{12}$/, { each: true })
  order?: string[];

  /** BUG: the number of the line with the mistake, from 1. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  line?: number;

  /** OUTPUT and CHOICE: the chosen option's ID. */
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]{1,8}$/)
  option?: string;
}

export class QuizRevealDto {
  order!: string[] | null;
  line!: number | null;
  option!: string | null;
}

export class PracticeProgressDto {
  /** The student's day, e.g. "2026-10-01". */
  day!: string;
  total!: number;
  answered!: number;
  done!: boolean;
}

export class QuizResultDto {
  correct!: boolean;
  /** Why the answer is right: shown once the quiz is answered correctly or revealed. */
  explanation!: string | null;
  /** After a few wrong tries, the right answer, so the student can learn from it. */
  reveal!: QuizRevealDto | null;
  /**
   * XP this answer earned: the quiz's on the first right answer (none once the
   * answer has been shown), and today's practice when this answer finished it.
   */
  xpAwarded!: number;
  dailyCapReached!: boolean;
  badgesEarned!: string[];
  /** When the quiz is part of today's practice: how far along it is. */
  practice!: PracticeProgressDto | null;
}

export class PracticeDto {
  day!: string;
  /** XP for finishing today's practice. */
  xp!: number;
  total!: number;
  done!: boolean;
  /** Quizzes of today's practice already answered correctly today. */
  answeredQuizIds!: string[];
  quizzes!: PracticeQuizDto[];
}
