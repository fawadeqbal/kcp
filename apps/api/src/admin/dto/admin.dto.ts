import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class PageQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 25, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 25;
}

export class ConsentQueryDto extends PageQueryDto {
  @IsOptional()
  @IsIn(['ACCOUNT', 'PUBLIC_LEADERBOARDS', 'PUBLIC_PORTFOLIO', 'HUB_WORK', 'EARNINGS'])
  type?: 'ACCOUNT' | 'PUBLIC_LEADERBOARDS' | 'PUBLIC_PORTFOLIO' | 'HUB_WORK' | 'EARNINGS';

  /** "active" = not revoked; "revoked" = withdrawn. */
  @IsOptional()
  @IsIn(['active', 'revoked'])
  state?: 'active' | 'revoked';

  /** Parent email or child username. */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  search?: string;
}

export class AuditQueryDto extends PageQueryDto {
  /** Exact action, e.g. "user.suspend", or a prefix ending in ".", e.g. "child.". */
  @IsOptional()
  @IsString()
  @MaxLength(60)
  action?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  entityType?: string;

  @IsOptional()
  @IsUUID()
  entityId?: string;

  @IsOptional()
  @IsUUID()
  actorId?: string;
}

export class PersonRefDto {
  id!: string;
  /** Adults. */
  email!: string | null;
  /** Students. */
  username!: string | null;
  /** Adults: name. Students: nickname. */
  displayName!: string | null;
}

export class AdminConsentDto {
  id!: string;
  type!: string;
  policyVersion!: string;
  method!: string;
  grantedAt!: Date;
  revokedAt!: Date | null;
  parent!: PersonRefDto;
  child!: PersonRefDto;
}

export class AdminConsentListDto {
  items!: AdminConsentDto[];
  total!: number;
  page!: number;
  pageSize!: number;
}

export class AuditActorDto {
  id!: string;
  role!: string | null;
  email!: string | null;
}

export class AuditEntryDto {
  id!: string;
  action!: string;
  entityType!: string;
  entityId!: string | null;
  actor!: AuditActorDto | null;
  before!: unknown;
  after!: unknown;
  ipAddress!: string | null;
  requestId!: string | null;
  createdAt!: Date;
}

export class AuditListDto {
  items!: AuditEntryDto[];
  total!: number;
  page!: number;
  pageSize!: number;
}

export class RoleDto {
  key!: string;
  name!: string;
  isStaff!: boolean;
  userCount!: number;
}

export class CountByStatusDto {
  pendingVerification!: number;
  active!: number;
  suspended!: number;
}

export class OverviewDto {
  parents!: CountByStatusDto;
  students!: CountByStatusDto;
  staff!: number;
  childrenCreatedLast7Days!: number;
  consentChangesLast7Days!: number;
  /** "Something isn't safe" messages from families that aren't done yet. */
  openSafetyReports!: number;
  /** The latest audit entries; empty for roles that can't read the audit log. */
  recentActivity!: AuditEntryDto[];
}

export class FamilyDto {
  parents!: PersonRefDto[];
  children!: PersonRefDto[];
}
