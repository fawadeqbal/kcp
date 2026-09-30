import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString, Length, MaxLength } from 'class-validator';
import { PageQueryDto } from '../../admin/dto/admin.dto.js';

const trimTo =
  (max: number) =>
  ({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().slice(0, max) : value;

/**
 * A crash report from the mobile app. Nothing in it names the account or the phone:
 * the app version, the system version, and what went wrong.
 */
export class ReportCrashDto {
  /** e.g. "1.0.0+12". */
  @IsString()
  @Length(1, 32)
  appVersion!: string;

  @IsIn(['android', 'ios'])
  platform!: 'android' | 'ios';

  /** e.g. "Android 15 (API 35)". */
  @Transform(trimTo(64))
  @IsString()
  @MaxLength(64)
  osVersion!: string;

  /** The app had to stop (not just an error it recovered from). */
  @IsBoolean()
  fatal!: boolean;

  @Transform(trimTo(1000))
  @IsString()
  @Length(1, 1000)
  message!: string;

  /** The stack trace; longer ones are cut. */
  @Transform(trimTo(16_000))
  @IsString()
  @MaxLength(16_000)
  stack!: string;
}

export class AppCrashQueryDto extends PageQueryDto {
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsIn(['android', 'ios'])
  platform?: 'android' | 'ios';
}

export class AppCrashDto {
  id!: string;
  appVersion!: string;
  platform!: string;
  osVersion!: string;
  fatal!: boolean;
  message!: string;
  stack!: string;
  createdAt!: Date;
}

export class AppCrashVersionDto {
  appVersion!: string;
  /** Reports in the last 7 days. */
  count!: number;
}

export class AppCrashListDto {
  items!: AppCrashDto[];
  total!: number;
  page!: number;
  pageSize!: number;
  /** Reports per app version over the last 7 days, most first. */
  lastWeek!: AppCrashVersionDto[];
}
