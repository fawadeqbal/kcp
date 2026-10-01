import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export const DELIVERY_STATUSES = [
  'SUBMITTED',
  'ACCEPTED',
  'CHANGES_REQUESTED',
  'WITHDRAWN',
] as const;
export const CHANGE_STATUSES = ['OPEN', 'IN_SCOPE', 'QUOTED', 'DECLINED'] as const;

export class HubDeliveryDto {
  id!: string;
  number!: number;
  /** "M-2". */
  reference!: string;
  quoteId!: string;
  quoteVersion!: number;
  title!: string;
  notes!: string;
  /** The quote's final delivery: accepting it accepts the quote's work. */
  final!: boolean;
  commit!: string;
  @ApiProperty({ enum: DELIVERY_STATUSES })
  status!: (typeof DELIVERY_STATUSES)[number];
  submittedAt!: Date;
  decidedAt!: Date | null;
  /** What the client asked to change. */
  clientComment!: string | null;
  /** The preview's secret link part (after "#" on the sandbox domain); null once withdrawn. */
  previewToken!: string | null;
  /** Files in the preview. */
  fileCount!: number;
}

export class CreateDeliveryDto {
  @IsUUID()
  quoteId!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(120)
  title!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(3000)
  notes!: string;

  @IsBoolean()
  final!: boolean;
}

export class AcceptDeliveryDto {
  /** Final deliveries: students may show the finished project in their portfolios. */
  @IsOptional()
  @IsBoolean()
  allowPortfolio?: boolean;
}

export class RequestChangesDto {
  @IsString()
  @MinLength(5)
  @MaxLength(3000)
  comment!: string;
}

export class HubCommentDto {
  id!: string;
  body!: string;
  /** "client", "lead" or "staff". */
  @ApiProperty({ enum: ['client', 'lead', 'staff'] })
  from!: 'client' | 'lead' | 'staff';
  authorName!: string;
  isMine!: boolean;
  deliveryId!: string | null;
  createdAt!: Date;
}

export class CommentBodyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(3000)
  body!: string;

  @IsOptional()
  @IsUUID()
  deliveryId?: string;
}

export class HubChangeDto {
  id!: string;
  body!: string;
  @ApiProperty({ enum: CHANGE_STATUSES })
  status!: (typeof CHANGE_STATUSES)[number];
  deliveryId!: string | null;
  createdAt!: Date;
  decidedAt!: Date | null;
  note!: string | null;
  quoteId!: string | null;
}

export class ChangeBodyDto {
  @IsString()
  @MinLength(5)
  @MaxLength(3000)
  body!: string;
}

export class DecideChangeDto {
  @IsIn(['IN_SCOPE', 'QUOTED', 'DECLINED'])
  decision!: 'IN_SCOPE' | 'QUOTED' | 'DECLINED';

  /** For the client. */
  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  note!: string;

  /** The change quote made for it (QUOTED). */
  @IsOptional()
  @IsUUID()
  quoteId?: string;
}

export class PreviewFileDto {
  path!: string;
  /** Its media type. */
  type!: string;
  /** Text files. */
  text!: string | null;
  /** Other files, base64. */
  base64!: string | null;
}

/** A milestone's preview, for the page on the sandbox domain (the link is the key). */
export class PreviewDto {
  projectTitle!: string;
  title!: string;
  reference!: string;
  submittedAt!: Date;
  @ApiProperty({ type: [PreviewFileDto] })
  files!: PreviewFileDto[];
}
