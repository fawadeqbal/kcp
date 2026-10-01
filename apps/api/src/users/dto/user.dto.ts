import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Length, Max, MaxLength, Min } from 'class-validator';

export class UserRoleDto {
  key!: string;
  name!: string;
}

export class UserSummaryDto {
  id!: string;
  kind!: 'STUDENT' | 'ADULT';
  status!: 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED' | 'DELETED' | 'PENDING_CONSENT';
  /** Adults only. */
  email!: string | null;
  /** Students only. */
  username!: string | null;
  /** Adults: their name. Students: their nickname. */
  displayName!: string | null;
  role!: UserRoleDto;
  countryCode!: string | null;
  createdAt!: Date;
  lastLoginAt!: Date | null;
}

export class UserListDto {
  items!: UserSummaryDto[];
  total!: number;
  page!: number;
  pageSize!: number;
}

export class ListUsersQueryDto {
  /** Matches email, username or name (case-insensitive). */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  /** Role key, e.g. "parent". */
  @IsOptional()
  @IsString()
  @MaxLength(40)
  role?: string;

  @IsOptional()
  @IsIn(['PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'DELETED', 'PENDING_CONSENT'])
  status?: 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED' | 'DELETED' | 'PENDING_CONSENT';

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

export class UpdateUserStatusDto {
  @IsIn(['ACTIVE', 'SUSPENDED'])
  status!: 'ACTIVE' | 'SUSPENDED';

  /** Why — kept in the audit log. */
  @IsString()
  @Length(3, 500)
  reason!: string;
}
