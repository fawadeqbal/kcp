import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ReqContext, type RequestContext } from '../common/request-context.js';
import type { AuthUser } from '../permissions/auth-user.js';
import { Can, CurrentUser } from '../permissions/permission.decorators.js';
import {
  ReturnTextDto,
  SaveTextDto,
  StudioLanguagesDto,
  StudioModuleDto,
  StudioModuleParams,
  StudioReviewsDto,
  StudioTextDto,
  StudioVersionDetailDto,
  TextParams,
  VersionParams,
} from './content-studio.dto.js';
import { ContentStudioService } from './content-studio.service.js';

/**
 * Admin → Content → Translate: drafts, review and publishing of every text, in any
 * language, with the history of what went live. For content creators and admins; no
 * student data here.
 */
@ApiTags('admin')
@Controller('admin/content/studio')
export class ContentStudioController {
  constructor(private readonly studio: ContentStudioService) {}

  @Get('languages')
  @Can('read', 'ContentText', { onAll: true })
  @ApiOkResponse({ type: StudioLanguagesDto })
  languages(): Promise<StudioLanguagesDto> {
    return this.studio.languages();
  }

  @Get('reviews')
  @Can('read', 'ContentText', { onAll: true })
  @ApiOkResponse({ type: StudioReviewsDto })
  reviews(): Promise<StudioReviewsDto> {
    return this.studio.reviews();
  }

  @Get('modules/:id/:lang')
  @Can('read', 'ContentText', { onAll: true })
  @ApiOkResponse({ type: StudioModuleDto })
  module(@Param() params: StudioModuleParams): Promise<StudioModuleDto> {
    return this.studio.module(params.id, params.lang);
  }

  @Get('texts/:entity/:id/:lang')
  @Can('read', 'ContentText', { onAll: true })
  @ApiOkResponse({ type: StudioTextDto })
  text(@Param() p: TextParams, @CurrentUser() user: AuthUser): Promise<StudioTextDto> {
    return this.studio.get(p.entity, p.id, p.lang, user);
  }

  @Put('texts/:entity/:id/:lang')
  @Can('create', 'ContentText', { onAll: true })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async save(
    @Param() p: TextParams,
    @Body() dto: SaveTextDto,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<void> {
    await this.studio.save(p.entity, p.id, p.lang, dto.data, user, ctx);
  }

  @Post('texts/:entity/:id/:lang/submit')
  @Can('update', 'ContentText', { onAll: true })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async submit(
    @Param() p: TextParams,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<void> {
    await this.studio.submit(p.entity, p.id, p.lang, user, ctx);
  }

  @Post('texts/:entity/:id/:lang/publish')
  @Can('update', 'ContentText', { onAll: true })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async publish(
    @Param() p: TextParams,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<void> {
    await this.studio.publish(p.entity, p.id, p.lang, user, ctx);
  }

  @Post('texts/:entity/:id/:lang/return')
  @Can('update', 'ContentText', { onAll: true })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async returnDraft(
    @Param() p: TextParams,
    @Body() dto: ReturnTextDto,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<void> {
    await this.studio.returnDraft(p.entity, p.id, p.lang, dto.note, user, ctx);
  }

  @Delete('texts/:entity/:id/:lang/draft')
  @Can('update', 'ContentText', { onAll: true })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async discard(
    @Param() p: TextParams,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<void> {
    await this.studio.discard(p.entity, p.id, p.lang, user, ctx);
  }

  @Get('texts/:entity/:id/:lang/versions/:versionId')
  @Can('read', 'ContentText', { onAll: true })
  @ApiOkResponse({ type: StudioVersionDetailDto })
  version(@Param() p: VersionParams): Promise<StudioVersionDetailDto> {
    return this.studio.version(p.entity, p.id, p.lang, p.versionId);
  }

  @Post('texts/:entity/:id/:lang/versions/:versionId/restore')
  @Can('update', 'ContentText', { onAll: true })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async restore(
    @Param() p: VersionParams,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<void> {
    await this.studio.restore(p.entity, p.id, p.lang, p.versionId, user, ctx);
  }
}
