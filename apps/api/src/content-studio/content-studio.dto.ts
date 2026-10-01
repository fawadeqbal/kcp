import { IsIn, IsObject, IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator';

export const ENTITY_PATHS = ['lesson', 'challenge', 'project', 'quiz'] as const;
export type EntityPath = (typeof ENTITY_PATHS)[number];

export class StudioLanguageDto {
  code!: string;
  name!: string;
  nativeName!: string;
  direction!: 'LTR' | 'RTL';
  /** Switched on for students. Others can be translated before they're switched on. */
  isActive!: boolean;
}

export class StudioLanguagesDto {
  languages!: StudioLanguageDto[];
}

export class StudioPersonDto {
  id!: string;
  name!: string;
}

export class StudioItemDto {
  entityType!: 'LESSON' | 'CHALLENGE' | 'PROJECT' | 'QUIZ';
  entityId!: string;
  /** The lesson it belongs to (null for the module's project). */
  lessonId!: string | null;
  /** Its name in English. */
  title!: string;
  /** MISSING: no text in this language; LIVE: students read it; DRAFT / IN_REVIEW: a draft waits. */
  status!: 'MISSING' | 'LIVE' | 'DRAFT' | 'IN_REVIEW';
  /** The live text was published in the studio (not yet in content/). */
  fromStudio!: boolean;
  /** The English text changed after this language's text went live. */
  englishChanged!: boolean;
  draftUpdatedAt!: Date | null;
  editedBy!: StudioPersonDto | null;
  /** Why a reviewer asked for changes. */
  reviewNote!: string | null;
}

export class StudioCountsDto {
  total!: number;
  live!: number;
  missing!: number;
  draft!: number;
  inReview!: number;
  englishChanged!: number;
}

export class StudioModuleDto {
  id!: string;
  trackId!: string;
  title!: string;
  language!: string;
  items!: StudioItemDto[];
  counts!: StudioCountsDto;
}

export class StudioVersionDto {
  id!: string;
  /** IMPORT: from the content/ files; PUBLISH: published in the studio. */
  action!: 'IMPORT' | 'PUBLISH';
  createdAt!: Date;
  publishedBy!: StudioPersonDto | null;
  editedBy!: StudioPersonDto | null;
}

export class StudioVersionDetailDto {
  id!: string;
  action!: 'IMPORT' | 'PUBLISH';
  createdAt!: Date;
  data!: Record<string, unknown>;
}

export class StudioDraftDto {
  data!: Record<string, unknown>;
  status!: 'DRAFT' | 'IN_REVIEW';
  editedBy!: StudioPersonDto | null;
  updatedAt!: Date;
  submittedAt!: Date | null;
  reviewNote!: string | null;
}

export class StudioCheckDto {
  id!: string;
  /** What the check looks at, in words. */
  description!: string;
}

export class StudioTextDto {
  entityType!: 'LESSON' | 'CHALLENGE' | 'PROJECT' | 'QUIZ';
  entityId!: string;
  language!: string;
  trackId!: string;
  moduleId!: string;
  lessonId!: string | null;
  title!: string;
  isActive!: boolean;
  /** The live English text: what translators translate. */
  english!: Record<string, unknown> | null;
  /** What students read in this language now. */
  live!: Record<string, unknown> | null;
  draft!: StudioDraftDto | null;
  /** Hints the checks use (challenges, projects). */
  hintKeys!: string[];
  /** Checks whose labels need translating. */
  checks!: StudioCheckDto[];
  /** Text options of a quiz, by ID. */
  options!: string[];
  versions!: StudioVersionDto[];
  englishChanged!: boolean;
  /** The signed-in person may publish the draft (someone else wrote it). */
  canPublish!: boolean;
}

export class StudioReviewItemDto {
  entityType!: 'LESSON' | 'CHALLENGE' | 'PROJECT' | 'QUIZ';
  entityId!: string;
  language!: string;
  title!: string;
  moduleId!: string;
  editedBy!: StudioPersonDto | null;
  submittedAt!: Date | null;
}

export class StudioReviewsDto {
  items!: StudioReviewItemDto[];
}

export class StudioModuleParams {
  @Matches(/^[a-z0-9-]{1,100}$/)
  id!: string;

  @Matches(/^[a-z]{2,3}$/)
  lang!: string;
}

export class TextParams {
  @IsIn(ENTITY_PATHS)
  entity!: EntityPath;

  @Matches(/^[a-z0-9-]{1,100}$/)
  id!: string;

  /** Language code, e.g. "ur". */
  @Matches(/^[a-z]{2,3}$/)
  lang!: string;
}

export class VersionParams extends TextParams {
  @IsUUID()
  versionId!: string;
}

export class SaveTextDto {
  /** The translated fields, as in StudioTextDto.english. */
  @IsObject()
  data!: Record<string, unknown>;
}

export class ReturnTextDto {
  /** What to change, for the translator. */
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  note!: string;
}
