import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../permissions/auth-user.js';
import { Authenticated, Can, CurrentUser } from '../permissions/permission.decorators.js';
import { BadgesService } from './badges.service.js';
import {
  BadgesDto,
  LeaderboardDto,
  LeaderboardQueryDto,
  MarkBadgesSeenDto,
  ProgressDto,
} from './dto/progress.dto.js';
import { ProgressService } from './progress.service.js';

@ApiTags('progress')
@Controller()
export class ProgressController {
  constructor(
    private readonly progress: ProgressService,
    private readonly badges: BadgesService,
  ) {}

  /** The student's XP, level, daily goal, streak, badges and this week's ranks. */
  @Get('progress')
  @Authenticated()
  @ApiOkResponse({ type: ProgressDto })
  summary(@CurrentUser() user: AuthUser): Promise<ProgressDto> {
    return this.progress.summary(user);
  }

  /** A board (week, season or all time; global, country, region or city): nickname, avatar and XP only. */
  @Get('leaderboards')
  @Can('read', 'Leaderboard')
  @ApiOkResponse({ type: LeaderboardDto })
  board(
    @Query() query: LeaderboardQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<LeaderboardDto> {
    return this.progress.board(
      query.scope ?? 'global',
      query.period ?? 'week',
      user,
      query.lang ?? 'en',
    );
  }

  /** Every badge, with the ones the student has earned. */
  @Get('badges')
  @Authenticated()
  @ApiOkResponse({ type: BadgesDto })
  list(@CurrentUser() user: AuthUser): Promise<BadgesDto> {
    return this.badges.forStudent(user);
  }

  /** The student saw these badges' celebrations. */
  @Post('badges/seen')
  @Authenticated()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async seen(@Body() dto: MarkBadgesSeenDto, @CurrentUser() user: AuthUser): Promise<void> {
    await this.badges.markSeen(user, dto.keys);
  }
}
