import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ReqContext, type RequestContext } from '../common/request-context.js';
import { LanguageQueryDto } from '../learning/dto/learning.dto.js';
import type { AuthUser } from '../permissions/auth-user.js';
import { Can, CurrentUser } from '../permissions/permission.decorators.js';
import {
  ContentTreeDto,
  ModuleIdParam,
  ModulePreviewDto,
  UnpublishDto,
} from './content-admin.dto.js';
import { ContentAdminService } from './content-admin.service.js';

/** Admin → Content: every module, a preview in each language, and publishing. */
@ApiTags('admin')
@Controller('admin/content')
export class ContentAdminController {
  constructor(private readonly content: ContentAdminService) {}

  @Get()
  @Can('read', 'Content', { onAll: true })
  @ApiOkResponse({ type: ContentTreeDto })
  tree(): Promise<ContentTreeDto> {
    return this.content.tree();
  }

  @Get('modules/:id')
  @Can('read', 'Content', { onAll: true })
  @ApiOkResponse({ type: ModulePreviewDto })
  preview(
    @Param() params: ModuleIdParam,
    @Query() query: LanguageQueryDto,
  ): Promise<ModulePreviewDto> {
    return this.content.preview(params.id, query.lang ?? 'en');
  }

  @Post('modules/:id/publish')
  @Can('update', 'Content', { onAll: true })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async publish(
    @Param() params: ModuleIdParam,
    @CurrentUser() staff: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<void> {
    await this.content.publish(params.id, staff, ctx);
  }

  @Post('modules/:id/unpublish')
  @Can('update', 'Content', { onAll: true })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async unpublish(
    @Param() params: ModuleIdParam,
    @Body() dto: UnpublishDto,
    @CurrentUser() staff: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<void> {
    await this.content.unpublish(params.id, dto.reason?.trim(), staff, ctx);
  }
}
