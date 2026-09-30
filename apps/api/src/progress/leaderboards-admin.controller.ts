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
  Query,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ReqContext, type RequestContext } from '../common/request-context.js';
import type { AuthUser } from '../permissions/auth-user.js';
import { Can, CurrentUser } from '../permissions/permission.decorators.js';
import {
  AdminBoardDto,
  AdminBoardQueryDto,
  GiveBadgeDto,
  RemoveBadgeBody,
  RemoveXpDto,
  ResultListDto,
  ResultsQueryDto,
  SeasonAdminDto,
  SeasonListDto,
  StartSeasonDto,
  StudentXpDto,
} from './dto/progress.dto.js';
import { LeaderboardJobsService } from './leaderboard-jobs.service.js';
import { LeaderboardsAdminService } from './leaderboards-admin.service.js';
import { ProgressService } from './progress.service.js';

/** Admin panel: "Leaderboards and seasons". */
@ApiTags('admin')
@Controller('admin')
export class LeaderboardsAdminController {
  constructor(
    private readonly admin: LeaderboardsAdminService,
    private readonly jobs: LeaderboardJobsService,
    private readonly progress: ProgressService,
  ) {}

  /** A board as staff see it, with usernames. */
  @Get('leaderboards')
  @Can('read', 'LeaderboardSeason')
  @ApiOkResponse({ type: AdminBoardDto })
  board(@Query() query: AdminBoardQueryDto): Promise<AdminBoardDto> {
    return this.admin.board(query.scope ?? 'global', query.period ?? 'week', query.scopeId ?? null);
  }

  /** Rebuilds every current board from PostgreSQL now (it also runs every night). */
  @Post('leaderboards/rebuild')
  @Can('update', 'LeaderboardSeason')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async rebuild(): Promise<void> {
    await this.jobs.rebuildAll();
  }

  /** Final top 10s of the last weeks (or seasons). */
  @Get('leaderboards/results')
  @Can('read', 'LeaderboardSeason')
  @ApiOkResponse({ type: ResultListDto })
  results(@Query() query: ResultsQueryDto): Promise<ResultListDto> {
    return this.admin.results(query.period ?? 'WEEK');
  }

  @Get('seasons')
  @Can('read', 'LeaderboardSeason', { onAll: true })
  @ApiOkResponse({ type: SeasonListDto })
  seasons(): Promise<SeasonListDto> {
    return this.admin.seasons();
  }

  /** Starts a season (only one runs at a time). */
  @Post('seasons')
  @Can('create', 'LeaderboardSeason')
  @ApiCreatedResponse({ type: SeasonAdminDto })
  start(
    @Body() dto: StartSeasonDto,
    @CurrentUser() staff: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<SeasonAdminDto> {
    return this.admin.startSeason(dto.name, dto.startDay, dto.endDay, staff, ctx);
  }

  /** Ends a season now: its final top 10s are kept, and its boards close. */
  @Post('seasons/:id/end')
  @Can('update', 'LeaderboardSeason')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: SeasonAdminDto })
  end(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() staff: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<SeasonAdminDto> {
    return this.admin.endSeason(id, staff, ctx);
  }

  /** A student's XP history. */
  @Get('users/:id/xp')
  @Can('read', 'XpAdjustment')
  @ApiOkResponse({ type: StudentXpDto })
  xp(@Param('id', new ParseUUIDPipe()) id: string): Promise<StudentXpDto> {
    return this.admin.studentXp(id);
  }

  /** Takes XP away from a student, with a written reason. */
  @Post('users/:id/xp-removals')
  @Can('create', 'XpAdjustment')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: StudentXpDto })
  async removeXp(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: RemoveXpDto,
    @CurrentUser() staff: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<StudentXpDto> {
    await this.progress.removeXp(id, dto.amount, dto.reason.trim(), staff, ctx);
    return this.admin.studentXp(id);
  }

  /** Gives a staff-awarded badge (like "Helper"). */
  @Post('users/:id/badges')
  @Can('create', 'UserBadge')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async giveBadge(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: GiveBadgeDto,
    @CurrentUser() staff: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<void> {
    await this.admin.giveBadge(id, dto.badgeKey, dto.reason.trim(), staff, ctx);
  }

  /** Takes back a staff-awarded badge. */
  @Delete('users/:id/badges/:key')
  @Can('delete', 'UserBadge')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async takeBadge(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('key') key: string,
    @Body() dto: RemoveBadgeBody,
    @CurrentUser() staff: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<void> {
    await this.admin.takeBadge(id, key, dto.reason.trim(), staff, ctx);
  }
}
