import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ReqContext, type RequestContext } from '../common/request-context.js';
import type { AuthUser } from '../permissions/auth-user.js';
import { Can, CurrentUser } from '../permissions/permission.decorators.js';
import { MentorsAdminService } from './mentors-admin.service.js';
import { AdminMentorsDto, InviteMentorDto, MentorIdParam, UpdateMentorDto } from './reviews.dto.js';

export class InvitedDto {
  id!: string;
}

/** Admin → Mentors and tutors. */
@ApiTags('admin')
@Controller('admin/mentors')
export class MentorsAdminController {
  constructor(private readonly mentors: MentorsAdminService) {}

  @Get()
  @Can('read', 'MentorProfile', { onAll: true })
  @ApiOkResponse({ type: AdminMentorsDto })
  list(): Promise<AdminMentorsDto> {
    return this.mentors.list();
  }

  /** Makes a mentor account and emails them a link to choose their password. */
  @Post()
  @Can('create', 'MentorProfile', { onAll: true })
  @ApiCreatedResponse({ type: InvitedDto })
  async invite(
    @Body() dto: InviteMentorDto,
    @CurrentUser() staff: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<InvitedDto> {
    return { id: await this.mentors.invite(dto, staff, ctx) };
  }

  @Post(':id/invite')
  @Can('update', 'MentorProfile', { onAll: true })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async resend(@Param() p: MentorIdParam): Promise<void> {
    await this.mentors.resendInvite(p.id);
  }

  /** Background check, languages, capacity, active (with a reason, in the audit log). */
  @Patch(':id')
  @Can('update', 'MentorProfile', { onAll: true })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async update(
    @Param() p: MentorIdParam,
    @Body() dto: UpdateMentorDto,
    @CurrentUser() staff: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<void> {
    await this.mentors.update(p.id, dto, staff, ctx);
  }
}
