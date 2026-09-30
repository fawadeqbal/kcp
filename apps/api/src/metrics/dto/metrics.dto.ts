import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class MetricsQueryDto {
  /** How many days back, including today. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(90)
  days: number = 14;
}

export class MetricsRowDto {
  /** YYYY-MM-DD (UTC). */
  day!: string;
  countryCode!: string;
  /** Parents whose first child account was created that day. */
  signUps!: number;
  /** Students who shipped their first project that day. */
  firstProjects!: number;
  /** Students with XP in the 7 days up to that day. */
  weeklyActive!: number;
  /** From Sprint 6 (payments). */
  payingParents!: number;
  /** From Sprint 6 (payments). */
  cancellations!: number;
}

export class MetricsDto {
  from!: string;
  to!: string;
  /** Countries that have any numbers in the period. */
  countries!: string[];
  /** One row per day and country; days without activity are left out. */
  rows!: MetricsRowDto[];
  /** When today's numbers were last worked out. */
  computedAt!: Date | null;
}
