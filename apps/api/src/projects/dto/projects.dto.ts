import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, ValidateNested } from 'class-validator';
import { CheckResultDto, CodeFilesDto } from '../../learning/dto/learning.dto.js';

export type ProjectStatusValue = 'NOT_STARTED' | 'DRAFT' | 'SHIPPED';

export class ProjectDto {
  /** The brief's ID, e.g. "builder-m01-project". */
  id!: string;
  moduleId!: string;
  moduleTitle!: string;
  title!: string;
  summary!: string;
  /** The brief, in Markdown. */
  body!: string;
  /** The language the texts are in (English when a translation is missing). */
  language!: string;
  xp!: number;
  /** The editor tabs, in order: index.html, style.css, script.js. */
  files!: ('html' | 'css' | 'js' | 'py')[];
  starter!: CodeFilesDto;
  /** What the project needs before it can ship (see packages/checks). */
  checks!: Record<string, unknown>[];
  /** Hint texts by key, in the requested language with English filling gaps. */
  hints!: Record<string, string>;
  /** The student's saved code, if any. */
  draft!: CodeFilesDto | null;
  status!: ProjectStatusValue;
  shippedAt!: Date | null;
  /** The portfolio version shipped last (1, 2, …), or null. */
  version!: number | null;
}

export class SaveProjectDraftDto {
  @ValidateNested()
  @Type(() => CodeFilesDto)
  code!: CodeFilesDto;
}

export class ShipProjectDto {
  @ValidateNested()
  @Type(() => CodeFilesDto)
  code!: CodeFilesDto;

  /** What the requirement checks in the browser sandbox found. */
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CheckResultDto)
  results!: CheckResultDto[];
}

export class ShipResultDto {
  /** False when a requirement isn't met yet: nothing was published. */
  shipped!: boolean;
  /** The result stored for each requirement. */
  results!: CheckResultDto[];
  /** XP for shipping the first time (0 afterwards). */
  xpAwarded!: number;
  dailyCapReached!: boolean;
  /** Badges this earned (keys; names are translated in the apps), to celebrate. */
  badgesEarned!: string[];
  portfolioItemId!: string | null;
  version!: number | null;
}

export class PortfolioItemDto {
  id!: string;
  /** The project's title, in the requested language. */
  title!: string;
  moduleTitle!: string;
  version!: number;
  publishedAt!: Date;
  /** The shipped files, to show in the sandbox. */
  files!: CodeFilesDto;
}

export class PortfolioDto {
  items!: PortfolioItemDto[];
}

export class PortfolioShareDto {
  /** True while "Public projects" is on: only then can the portfolio be shared. */
  allowed!: boolean;
  /** The secret part of the share link, or null when there is no link. */
  token!: string | null;
}

export class ChildPortfolioDto extends PortfolioDto {
  share!: PortfolioShareDto;
}

export class SharedPortfolioDto extends PortfolioDto {
  nickname!: string;
  avatarKey!: string;
}
