import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export const CLASS_MEMBER_STATUSES = ['PENDING', 'APPROVED'] as const;
export type ClassMemberStatusValue = (typeof CLASS_MEMBER_STATUSES)[number];
export const LESSON_STATES = ['DONE', 'STARTED', 'NOT_STARTED'] as const;
export type LessonState = (typeof LESSON_STATES)[number];
export const LICENSE_STATES = ['INVOICED', 'PAID', 'ENDED', 'CANCELLED'] as const;
export type LicenseState = (typeof LICENSE_STATES)[number];

// ── Shared pieces ──────────────────────────────────────────────────────────────

export class NamedDto {
  id!: string;
  name!: string;
}

export class ClassStudentDto {
  userId!: string;
  nickname!: string;
  avatarKey!: string;
  @ApiProperty({ enum: CLASS_MEMBER_STATUSES })
  status!: ClassMemberStatusValue;
  /** Premium paid by the school's licence. */
  schoolPremium!: boolean;
}

export class AssignmentDto {
  id!: string;
  lessonId!: string;
  title!: string;
  moduleTitle!: string;
  dueAt!: Date | null;
  /** Approved students who finished the lesson. */
  done!: number;
}

export class ProgressRowDto {
  userId!: string;
  nickname!: string;
  avatarKey!: string;
  /** Each assignment's lesson for this student, by assignment ID. */
  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'string', enum: [...LESSON_STATES] },
  })
  lessons!: Record<string, LessonState>;
}

export class BoardRowDto {
  rank!: number;
  nickname!: string;
  avatarKey!: string;
  /** XP in the last 7 days. */
  xp!: number;
}

export class SeatsDto {
  total!: number;
  used!: number;
  endsAt!: Date;
}

// ── Teachers ───────────────────────────────────────────────────────────────────

export class TeacherClassSummaryDto {
  id!: string;
  name!: string;
  school!: NamedDto;
  joinCode!: string;
  trackId!: string | null;
  approved!: number;
  pending!: number;
  assignments!: number;
  archived!: boolean;
}

export class TeacherHomeDto {
  @ApiProperty({ type: [NamedDto] })
  schools!: NamedDto[];
  @ApiProperty({ type: [TeacherClassSummaryDto] })
  classes!: TeacherClassSummaryDto[];
  /** Tracks a class can follow. */
  @ApiProperty({ type: [NamedDto] })
  tracks!: NamedDto[];
}

export class TeacherClassDto extends TeacherClassSummaryDto {
  /** The school's paid licence now, if any. */
  seats!: SeatsDto | null;
  @ApiProperty({ type: [ClassStudentDto] })
  students!: ClassStudentDto[];
  @ApiProperty({ type: [AssignmentDto] })
  assignmentList!: AssignmentDto[];
  @ApiProperty({ type: [ProgressRowDto] })
  progress!: ProgressRowDto[];
  @ApiProperty({ type: [BoardRowDto] })
  board!: BoardRowDto[];
  /** The class room (made when the class is). */
  roomId!: string | null;
}

export class CreateClassDto {
  @IsUUID()
  schoolId!: string;

  @IsString()
  @Transform(trim)
  @MinLength(2)
  @MaxLength(60)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  trackId?: string | null;
}

export class UpdateClassDto {
  @IsString()
  @Transform(trim)
  @MinLength(2)
  @MaxLength(60)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  trackId?: string | null;
}

export class CreateAssignmentDto {
  @IsString()
  @MaxLength(80)
  lessonId!: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dueAt?: Date | null;
}

export class CatalogLessonDto {
  id!: string;
  title!: string;
}

export class CatalogModuleDto {
  id!: string;
  title!: string;
  @ApiProperty({ type: [CatalogLessonDto] })
  lessons!: CatalogLessonDto[];
}

export class CatalogTrackDto {
  id!: string;
  title!: string;
  @ApiProperty({ type: [CatalogModuleDto] })
  modules!: CatalogModuleDto[];
}

// ── Students ───────────────────────────────────────────────────────────────────

export class StudentAssignmentDto {
  lessonId!: string;
  title!: string;
  moduleTitle!: string;
  dueAt!: Date | null;
  done!: boolean;
}

export class StudentClassDto {
  id!: string;
  name!: string;
  school!: string;
  /** The teacher's name, as the school gave it. */
  teacher!: string;
  @ApiProperty({ enum: CLASS_MEMBER_STATUSES })
  status!: ClassMemberStatusValue;
  @ApiProperty({ type: [StudentAssignmentDto] })
  assignments!: StudentAssignmentDto[];
  @ApiProperty({ type: [BoardRowDto] })
  board!: BoardRowDto[];
  roomId!: string | null;
}

export class JoinClassDto {
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @Length(6, 6)
  code!: string;
}

export class JoinClassResultDto {
  id!: string;
  name!: string;
  @ApiProperty({ enum: CLASS_MEMBER_STATUSES })
  status!: ClassMemberStatusValue;
}

// ── Parents ────────────────────────────────────────────────────────────────────

export class ParentClassRequestDto {
  classId!: string;
  child!: { id: string; nickname: string; avatarKey: string };
  className!: string;
  school!: string;
  teacher!: string;
  requestedAt!: Date;
}

export class ClassDecisionDto {
  @IsUUID()
  childId!: string;

  @IsBoolean()
  approve!: boolean;
}

export class ClassDecisionResultDto {
  @ApiProperty({ enum: ['APPROVED', 'DECLINED'] })
  status!: 'APPROVED' | 'DECLINED';
}

// ── Staff ──────────────────────────────────────────────────────────────────────

export class SaveSchoolDto {
  @IsString()
  @Transform(trim)
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsString()
  @Matches(/^[A-Z]{2}$/)
  countryCode!: string;

  @IsOptional()
  @IsString()
  @Transform(trim)
  @MaxLength(80)
  city?: string | null;

  @IsString()
  @Transform(trim)
  @MinLength(2)
  @MaxLength(120)
  contactName!: string;

  @IsEmail()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  contactEmail!: string;
}

export class AdminSchoolSummaryDto {
  id!: string;
  name!: string;
  countryCode!: string;
  city!: string | null;
  teachers!: number;
  classes!: number;
  /** Approved students in the school's classes. */
  students!: number;
  seats!: SeatsDto | null;
}

export class AdminTeacherDto {
  id!: string;
  name!: string;
  email!: string;
  /** Hasn't chosen a password from the invitation yet. */
  invited!: boolean;
  classes!: number;
}

export class AdminLicenseDto {
  id!: string;
  seats!: number;
  /** Students with premium from it now. */
  used!: number;
  startsAt!: Date;
  endsAt!: Date;
  invoiceNumber!: string;
  amountMinor!: number;
  currency!: string;
  paidAt!: Date | null;
  paymentReference!: string | null;
  cancelledAt!: Date | null;
  @ApiProperty({ enum: LICENSE_STATES })
  state!: LicenseState;
}

export class AdminClassDto {
  id!: string;
  name!: string;
  teacher!: string;
  approved!: number;
  pending!: number;
  assignments!: number;
  archived!: boolean;
}

export class AdminSchoolDto extends AdminSchoolSummaryDto {
  contactName!: string;
  contactEmail!: string;
  @ApiProperty({ type: [AdminTeacherDto] })
  teacherList!: AdminTeacherDto[];
  @ApiProperty({ type: [AdminLicenseDto] })
  licenses!: AdminLicenseDto[];
  @ApiProperty({ type: [AdminClassDto] })
  classList!: AdminClassDto[];
}

export class AddTeacherDto {
  @IsEmail()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email!: string;

  /** For a new account (the invitation): the name students see. */
  @IsOptional()
  @IsString()
  @Transform(trim)
  @MinLength(2)
  @MaxLength(80)
  displayName?: string;

  @IsOptional()
  @IsIn(['en', 'ar', 'ur'])
  languageCode?: string;
}

export class AddTeacherResultDto {
  userId!: string;
  /** A new account was made and the invitation sent. */
  invited!: boolean;
}

export class CreateLicenseDto {
  @IsInt()
  @Min(1)
  @Max(5000)
  seats!: number;

  @Type(() => Date)
  @IsDate()
  startsAt!: Date;

  @Type(() => Date)
  @IsDate()
  endsAt!: Date;

  @IsString()
  @Transform(trim)
  @MinLength(3)
  @MaxLength(40)
  invoiceNumber!: string;

  @IsInt()
  @Min(0)
  amountMinor!: number;

  @IsString()
  @Matches(/^[A-Z]{3}$/)
  currency!: string;
}

export class LicensePaidDto {
  /** The bank transfer's reference. */
  @IsString()
  @Transform(trim)
  @MinLength(3)
  @MaxLength(80)
  paymentReference!: string;
}

export class LicenseCancelDto {
  @IsString()
  @Transform(trim)
  @MinLength(5)
  @MaxLength(300)
  reason!: string;
}
