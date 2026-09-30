import { FEEDBACK_KINDS, FEEDBACK_MAX_LENGTH, type FeedbackKind } from '@kcp/shared';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { PageQueryDto } from '../../admin/dto/admin.dto.js';

export class CreateFeedbackDto {
  @IsIn(FEEDBACK_KINDS)
  kind!: FeedbackKind;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2)
  @MaxLength(FEEDBACK_MAX_LENGTH)
  message!: string;

  /** The page it was sent from, e.g. "/ar/learn/builder-m01-l03" (query and fragment are dropped). */
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.split(/[?#]/)[0] : value))
  @IsString()
  @MaxLength(200)
  @Matches(/^\/[\w\-/[\].]*$/)
  pagePath?: string;

  /** The interface language when it was sent. */
  @IsOptional()
  @Matches(/^[a-z]{2}$/)
  languageCode?: string;
}

export class FeedbackCreatedDto {
  id!: string;
}

export type FeedbackStatusValue = 'NEW' | 'READ' | 'DONE';

export class FeedbackQueryDto extends PageQueryDto {
  @IsOptional()
  @IsIn(['NEW', 'READ', 'DONE'])
  status?: FeedbackStatusValue;
}

export class UpdateFeedbackDto {
  @IsIn(['NEW', 'READ', 'DONE'])
  status!: FeedbackStatusValue;
}

export class FeedbackSenderDto {
  id!: string;
  roleKey!: string;
  /** Adults: their name. Students: their nickname. */
  name!: string | null;
}

export class FeedbackItemDto {
  id!: string;
  kind!: FeedbackKind;
  message!: string;
  pagePath!: string | null;
  languageCode!: string;
  status!: FeedbackStatusValue;
  createdAt!: Date;
  /** Null when the account was deleted. */
  sender!: FeedbackSenderDto | null;
}

export class FeedbackListDto {
  items!: FeedbackItemDto[];
  total!: number;
  page!: number;
  pageSize!: number;
  /** Messages nobody has read yet (for the menu badge). */
  unread!: number;
}
