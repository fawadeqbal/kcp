import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { byIp, RateLimit } from '../common/rate-limit/rate-limit.decorator.js';
import { ReqContext, type RequestContext } from '../common/request-context.js';
import type { AuthUser } from '../permissions/auth-user.js';
import { Can, CurrentUser, Public } from '../permissions/permission.decorators.js';
import {
  AnswerStoryDto,
  CreateStoryDto,
  HubStoryDto,
  PublicHubStatsDto,
  PublicStoryDto,
  StoryLanguageQueryDto,
  UpdateStoryDto,
} from './dto/stories.dto.js';
import { HubStoriesService } from './stories.service.js';

const uuid = () => new ParseUUIDPipe();
const MINUTE = 60;

/** Parents answer (and can take back) stories about their child. */
@ApiTags('hub')
@Controller('hub/stories')
export class ParentStoriesController {
  constructor(private readonly stories: HubStoriesService) {}

  @Get()
  @Can('read', 'HubStory')
  @ApiOkResponse({ type: [HubStoryDto] })
  list(@CurrentUser() user: AuthUser): Promise<HubStoryDto[]> {
    return this.stories.forParent(user);
  }

  @Post(':id/answer')
  @Can('update', 'HubStory')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: [HubStoryDto] })
  answer(
    @Param('id', uuid()) id: string,
    @Body() dto: AnswerStoryDto,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<HubStoryDto[]> {
    return this.stories.answer(user, id, dto.approve, ctx);
  }

  @Post(':id/withdraw')
  @Can('update', 'HubStory')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: [HubStoryDto] })
  withdraw(
    @Param('id', uuid()) id: string,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<HubStoryDto[]> {
    return this.stories.withdraw(user, id, ctx);
  }
}

@ApiTags('hub')
@Controller('admin/hub/stories')
export class StoriesAdminController {
  constructor(private readonly stories: HubStoriesService) {}

  @Get()
  @Can('read', 'HubStory', { onAll: true })
  @ApiOkResponse({ type: [HubStoryDto] })
  list(): Promise<HubStoryDto[]> {
    return this.stories.list();
  }

  @Post()
  @Can('create', 'HubStory', { onAll: true })
  @ApiOkResponse({ type: HubStoryDto })
  create(
    @Body() dto: CreateStoryDto,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<HubStoryDto> {
    return this.stories.create(user, dto, ctx);
  }

  @Patch(':id')
  @Can('update', 'HubStory', { onAll: true })
  @ApiOkResponse({ type: HubStoryDto })
  update(
    @Param('id', uuid()) id: string,
    @Body() dto: UpdateStoryDto,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<HubStoryDto> {
    return this.stories.update(user, id, dto, ctx);
  }

  @Post(':id/publish')
  @Can('update', 'HubStory', { onAll: true })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: HubStoryDto })
  publish(
    @Param('id', uuid()) id: string,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<HubStoryDto> {
    return this.stories.publish(user, id, true, ctx);
  }

  @Post(':id/unpublish')
  @Can('update', 'HubStory', { onAll: true })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: HubStoryDto })
  unpublish(
    @Param('id', uuid()) id: string,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<HubStoryDto> {
    return this.stories.publish(user, id, false, ctx);
  }
}

/** The marketing site: published stories and the hub in numbers. */
@ApiTags('hub')
@Controller('public/hub')
export class PublicHubController {
  constructor(private readonly stories: HubStoriesService) {}

  @Get('stories')
  @Public()
  @RateLimit({ name: 'hub-stories-ip', limit: 120, windowSeconds: MINUTE, key: byIp })
  @ApiOkResponse({ type: [PublicStoryDto] })
  async list(
    @Query() query: StoryLanguageQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<PublicStoryDto[]> {
    // Short: a story a parent takes back leaves caches within a minute.
    res.setHeader('Cache-Control', 'public, max-age=60');
    return this.stories.published(query.lang ?? 'en');
  }

  @Get('stats')
  @Public()
  @RateLimit({ name: 'hub-stats-ip', limit: 120, windowSeconds: MINUTE, key: byIp })
  @ApiOkResponse({ type: PublicHubStatsDto })
  async stats(@Res({ passthrough: true }) res: Response): Promise<PublicHubStatsDto> {
    res.setHeader('Cache-Control', 'public, max-age=300');
    return this.stories.stats();
  }
}
