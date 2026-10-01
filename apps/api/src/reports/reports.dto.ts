import { SKILL_CATEGORIES, type SkillCategory } from '@kcp/shared';
import { ApiProperty } from '@nestjs/swagger';

export class SkillDto {
  key!: string;
  name!: string;
  /** Lessons that teach it, finished by the student. */
  lessonsDone!: number;
  lessonsTotal!: number;
  /** At least one lesson that teaches it is finished. */
  learned!: boolean;
}

export class SkillCategoryDto {
  @ApiProperty({ enum: SKILL_CATEGORIES })
  key!: SkillCategory;
  skills!: SkillDto[];
}

export class SkillMapDto {
  categories!: SkillCategoryDto[];
  learned!: number;
  total!: number;
}

/** One child's week in a parent's report. */
export class ReportChildDto {
  childId!: string;
  nickname!: string;
  avatarKey!: string;
  /** Minutes spent learning (from the apps, while the student works). */
  minutes!: number;
  xp!: number;
  lessons!: number;
  projects!: number;
  badges!: number;
  /** The streak at the end of the week. */
  streak!: number;
  /** The league they finished the week in (e.g. "silver"). */
  league!: string;
  /** Skills learned this week (keys; names come with the report in its language). */
  skills!: string[];
  /** Minutes on each day of the week, Monday first. */
  days!: number[];
}

export class ParentReportDto {
  weekKey!: string;
  startDay!: string;
  endDay!: string;
  createdAt!: Date;
  children!: ReportChildDto[];
  /** Skill names in the requested language, by key. */
  skillNames!: Record<string, string>;
}

export class ParentReportsDto {
  /** Newest first (the last eight weeks). */
  reports!: ParentReportDto[];
}
