import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class ContentModuleSummaryDto {
  id!: string;
  slug!: string;
  titles!: Record<string, string>;
  sortOrder!: number;
  /** In content/ (the importer switches off what was removed). */
  isActive!: boolean;
  /** When staff published it; null = students don't see it yet. */
  publishedAt!: Date | null;
  lessons!: number;
  premiumLessons!: number;
  challenges!: number;
  hasProject!: boolean;
  /** Languages every lesson (and the project) is written in. */
  languages!: string[];
}

export class ContentTrackDto {
  id!: string;
  titles!: Record<string, string>;
  isActive!: boolean;
  modules!: ContentModuleSummaryDto[];
}

export class ContentTreeDto {
  tracks!: ContentTrackDto[];
}

export class PreviewChallengeDto {
  id!: string;
  type!: string;
  xp!: number;
  title!: string;
  instructions!: string;
  /** The code students start from (html, css, js or py). */
  starter!: Record<string, string>;
  /** What the checks look at, in words staff can read (e.g. "text of h1"). */
  checks!: string[];
  hints!: Record<string, string>;
  /** False when this language has no text yet (English is shown instead). */
  translated!: boolean;
}

export class PreviewVideoDto {
  provider!: string;
  id!: string;
}

export class PreviewLessonDto {
  id!: string;
  slug!: string;
  xp!: number;
  isPremium!: boolean;
  isActive!: boolean;
  title!: string;
  summary!: string;
  /** Markdown, as students see it. */
  body!: string;
  video!: PreviewVideoDto | null;
  translated!: boolean;
  challenges!: PreviewChallengeDto[];
}

export class PreviewProjectDto {
  id!: string;
  xp!: number;
  isPremium!: boolean;
  title!: string;
  summary!: string;
  body!: string;
  starter!: Record<string, string>;
  checks!: string[];
  translated!: boolean;
}

export class ModulePreviewDto {
  id!: string;
  trackId!: string;
  title!: string;
  description!: string;
  isActive!: boolean;
  publishedAt!: Date | null;
  language!: string;
  lessons!: PreviewLessonDto[];
  project!: PreviewProjectDto | null;
}

export class ModuleIdParam {
  @IsString()
  @Matches(/^[a-z0-9-]{1,100}$/)
  id!: string;
}

export class UnpublishDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(300)
  reason?: string;
}
