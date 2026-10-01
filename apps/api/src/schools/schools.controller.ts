import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import { ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ReqContext, type RequestContext } from '../common/request-context.js';
import type { AuthUser } from '../permissions/auth-user.js';
import { Can, CurrentUser } from '../permissions/permission.decorators.js';
import { ClassesService } from './classes.service.js';
import {
  AddTeacherDto,
  AddTeacherResultDto,
  AdminSchoolDto,
  AdminSchoolSummaryDto,
  CatalogTrackDto,
  ClassDecisionDto,
  ClassDecisionResultDto,
  CreateAssignmentDto,
  CreateClassDto,
  CreateLicenseDto,
  JoinClassDto,
  JoinClassResultDto,
  LicenseCancelDto,
  LicensePaidDto,
  ParentClassRequestDto,
  SaveSchoolDto,
  StudentClassDto,
  TeacherClassDto,
  TeacherHomeDto,
  UpdateClassDto,
} from './schools.dto.js';
import { SchoolsAdminService } from './schools-admin.service.js';

/** Teachers: their classes, codes, assignments, progress and the class board. */
@ApiTags('schools')
@Controller('teacher')
export class TeacherController {
  constructor(private readonly classes: ClassesService) {}

  @Get('classes')
  @Can('create', 'SchoolClass')
  @ApiOkResponse({ type: TeacherHomeDto })
  home(@CurrentUser() user: AuthUser): Promise<TeacherHomeDto> {
    return this.classes.home(user);
  }

  @Post('classes')
  @Can('create', 'SchoolClass')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: TeacherClassDto })
  create(@Body() dto: CreateClassDto, @CurrentUser() user: AuthUser): Promise<TeacherClassDto> {
    return this.classes.create(user, dto);
  }

  /** The lessons a teacher can assign, by track and module. */
  @Get('lessons')
  @Can('create', 'SchoolClass')
  @ApiOkResponse({ type: [CatalogTrackDto] })
  catalog(@CurrentUser() user: AuthUser): Promise<CatalogTrackDto[]> {
    return this.classes.catalog(user);
  }

  @Get('classes/:id')
  @Can('read', 'SchoolClass')
  @ApiOkResponse({ type: TeacherClassDto })
  detail(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<TeacherClassDto> {
    return this.classes.detail(user, id);
  }

  @Put('classes/:id')
  @Can('update', 'SchoolClass')
  @ApiOkResponse({ type: TeacherClassDto })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateClassDto,
    @CurrentUser() user: AuthUser,
  ): Promise<TeacherClassDto> {
    return this.classes.update(user, id, dto);
  }

  @Post('classes/:id/code')
  @Can('update', 'SchoolClass')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: TeacherClassDto })
  newCode(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<TeacherClassDto> {
    return this.classes.newCode(user, id);
  }

  @Post('classes/:id/archive')
  @Can('update', 'SchoolClass')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: TeacherClassDto })
  archive(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<TeacherClassDto> {
    return this.classes.archive(user, id);
  }

  @Post('classes/:id/students/:userId/remove')
  @Can('update', 'SchoolClass')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  removeStudent(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    return this.classes.removeStudent(user, id, userId);
  }

  @Post('classes/:id/assignments')
  @Can('update', 'SchoolClass')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: TeacherClassDto })
  assign(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: CreateAssignmentDto,
    @CurrentUser() user: AuthUser,
  ): Promise<TeacherClassDto> {
    return this.classes.assign(user, id, dto);
  }

  @Delete('classes/:id/assignments/:assignmentId')
  @Can('update', 'SchoolClass')
  @ApiOkResponse({ type: TeacherClassDto })
  unassign(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('assignmentId', new ParseUUIDPipe()) assignmentId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<TeacherClassDto> {
    return this.classes.unassign(user, id, assignmentId);
  }
}

/** Students: join a class with its code, see their classes and assignments. */
@ApiTags('schools')
@Controller('classes')
export class StudentClassesController {
  constructor(private readonly classes: ClassesService) {}

  @Get()
  @Can('create', 'ClassMember')
  @ApiOkResponse({ type: [StudentClassDto] })
  mine(@CurrentUser() user: AuthUser): Promise<StudentClassDto[]> {
    return this.classes.mine(user);
  }

  @Post('join')
  @Can('create', 'ClassMember')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: JoinClassResultDto })
  join(@Body() dto: JoinClassDto, @CurrentUser() user: AuthUser): Promise<JoinClassResultDto> {
    return this.classes.join(user, dto.code);
  }

  @Post(':id/leave')
  @Can('delete', 'ClassMember')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  leave(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    return this.classes.leave(user, id);
  }
}

/** Parents: their children's requests to join a class. */
@ApiTags('schools')
@Controller('class-requests')
export class ParentClassesController {
  constructor(private readonly classes: ClassesService) {}

  @Get()
  @Can('update', 'ClassMember')
  @ApiOkResponse({ type: [ParentClassRequestDto] })
  requests(@CurrentUser() user: AuthUser): Promise<ParentClassRequestDto[]> {
    return this.classes.requests(user);
  }

  @Post(':classId/decision')
  @Can('update', 'ClassMember')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: ClassDecisionResultDto })
  decide(
    @Param('classId', new ParseUUIDPipe()) classId: string,
    @Body() dto: ClassDecisionDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ClassDecisionResultDto> {
    return this.classes.decide(user, classId, dto.childId, dto.approve);
  }
}

/** Admin → Schools: schools, teachers and licences. */
@ApiTags('admin')
@Controller('admin/schools')
export class SchoolsAdminController {
  constructor(private readonly schools: SchoolsAdminService) {}

  @Get()
  @Can('read', 'School', { onAll: true })
  @ApiOkResponse({ type: [AdminSchoolSummaryDto] })
  list(): Promise<AdminSchoolSummaryDto[]> {
    return this.schools.list();
  }

  @Post()
  @Can('create', 'School', { onAll: true })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AdminSchoolDto })
  create(
    @Body() dto: SaveSchoolDto,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<AdminSchoolDto> {
    return this.schools.create(user, dto, ctx);
  }

  @Get(':id')
  @Can('read', 'School', { onAll: true })
  @ApiOkResponse({ type: AdminSchoolDto })
  get(@Param('id', new ParseUUIDPipe()) id: string): Promise<AdminSchoolDto> {
    return this.schools.get(id);
  }

  @Put(':id')
  @Can('update', 'School', { onAll: true })
  @ApiOkResponse({ type: AdminSchoolDto })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: SaveSchoolDto,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<AdminSchoolDto> {
    return this.schools.update(user, id, dto, ctx);
  }

  @Post(':id/teachers')
  @Can('update', 'School', { onAll: true })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AddTeacherResultDto })
  addTeacher(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AddTeacherDto,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<AddTeacherResultDto> {
    return this.schools.addTeacher(user, id, dto, ctx);
  }

  @Delete(':id/teachers/:userId')
  @Can('update', 'School', { onAll: true })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  removeTeacher(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<void> {
    return this.schools.removeTeacher(user, id, userId, ctx);
  }

  @Post(':id/licenses')
  @Can('update', 'School', { onAll: true })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AdminSchoolDto })
  addLicense(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: CreateLicenseDto,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<AdminSchoolDto> {
    return this.schools.addLicense(user, id, dto, ctx);
  }

  @Post('licenses/:licenseId/paid')
  @Can('update', 'School', { onAll: true })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AdminSchoolDto })
  paid(
    @Param('licenseId', new ParseUUIDPipe()) licenseId: string,
    @Body() dto: LicensePaidDto,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<AdminSchoolDto> {
    return this.schools.markPaid(user, licenseId, dto.paymentReference, ctx);
  }

  @Post('licenses/:licenseId/cancel')
  @Can('update', 'School', { onAll: true })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AdminSchoolDto })
  cancel(
    @Param('licenseId', new ParseUUIDPipe()) licenseId: string,
    @Body() dto: LicenseCancelDto,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<AdminSchoolDto> {
    return this.schools.cancel(user, licenseId, dto.reason, ctx);
  }
}
