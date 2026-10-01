import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ReqContext, type RequestContext } from '../common/request-context.js';
import type { AuthUser } from '../permissions/auth-user.js';
import { Can, CurrentUser } from '../permissions/permission.decorators.js';
import {
  AdminEventDto,
  AdminEventSummaryDto,
  CreateTeamDto,
  EventDecisionDto,
  EventDecisionResultDto,
  EventDetailDto,
  EventJudgesDto,
  EventStatusDto,
  EventSubmissionDto,
  EventSummaryDto,
  JoinTeamDto,
  JudgingDto,
  MentorEventsDto,
  OpenPullDto,
  ParentEventRequestDto,
  PullCommentBodyDto,
  PullDetailDto,
  PullReviewBodyDto,
  RemoveMemberDto,
  PullSummaryDto,
  SaveEventDto,
  ScoreTeamDto,
  SubmitWorkDto,
  TeamFilesDto,
  TeamFilesQueryDto,
  TeamMentorDto,
  WorkspaceDto,
} from './events.dto.js';
import { EventsAdminService } from './events-admin.service.js';
import { EventsService } from './events.service.js';
import { GitWorkspaceService } from './git-workspace.service.js';
import { JudgingService } from './judging.service.js';

const SLUG = ':slug';

/** Students: hackathons, making or joining a team (a parent approves). */
@ApiTags('events')
@Controller('events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Get()
  @Can('read', 'Event')
  @ApiOkResponse({ type: [EventSummaryDto] })
  list(@CurrentUser() user: AuthUser): Promise<EventSummaryDto[]> {
    return this.events.list(user);
  }

  @Get(SLUG)
  @Can('read', 'Event')
  @ApiOkResponse({ type: EventDetailDto })
  detail(@Param('slug') slug: string, @CurrentUser() user: AuthUser): Promise<EventDetailDto> {
    return this.events.detail(user, slug);
  }

  @Post(`${SLUG}/teams`)
  @Can('create', 'EventTeam')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: EventDetailDto })
  createTeam(
    @Param('slug') slug: string,
    @Body() dto: CreateTeamDto,
    @CurrentUser() user: AuthUser,
  ): Promise<EventDetailDto> {
    return this.events.createTeam(user, slug, dto.name);
  }

  @Post(`${SLUG}/join`)
  @Can('create', 'EventTeam')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: EventDetailDto })
  join(
    @Param('slug') slug: string,
    @Body() dto: JoinTeamDto,
    @CurrentUser() user: AuthUser,
  ): Promise<EventDetailDto> {
    return this.events.joinTeam(user, slug, dto.code);
  }

  @Post(`${SLUG}/leave`)
  @Can('update', 'EventTeam')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async leave(@Param('slug') slug: string, @CurrentUser() user: AuthUser): Promise<void> {
    await this.events.leaveTeam(user, slug);
  }
}

/** Parents: their children's requests to join teams. */
@ApiTags('events')
@Controller('event-requests')
export class ParentEventsController {
  constructor(private readonly events: EventsService) {}

  @Get()
  @Can('update', 'EventTeam')
  @ApiOkResponse({ type: [ParentEventRequestDto] })
  requests(@CurrentUser() user: AuthUser): Promise<ParentEventRequestDto[]> {
    return this.events.requests(user);
  }

  @Post(':teamId/decision')
  @Can('update', 'EventTeam')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: EventDecisionResultDto })
  decide(
    @Param('teamId', new ParseUUIDPipe()) teamId: string,
    @Body() dto: EventDecisionDto,
    @CurrentUser() user: AuthUser,
  ): Promise<EventDecisionResultDto> {
    return this.events.decide(user, teamId, dto.childId, dto.approve);
  }
}

/** A team's repository: the workspace, pull requests, handing in, previews. */
@ApiTags('events')
@Controller('teams/:id')
export class TeamsController {
  constructor(private readonly workspace: GitWorkspaceService) {}

  @Get('workspace')
  @Can('update', 'EventTeam')
  @ApiOkResponse({ type: WorkspaceDto })
  open(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<WorkspaceDto> {
    return this.workspace.workspace(user, id);
  }

  @Get('pulls')
  @Can('read', 'EventTeam')
  @ApiOkResponse({ type: [PullSummaryDto] })
  pulls(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<PullSummaryDto[]> {
    return this.workspace.pulls(user, id);
  }

  @Post('pulls')
  @Can('update', 'EventTeam')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: PullSummaryDto })
  openPull(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: OpenPullDto,
    @CurrentUser() user: AuthUser,
  ): Promise<PullSummaryDto> {
    return this.workspace.openPull(user, id, dto);
  }

  @Get('pulls/:number')
  @Can('read', 'EventTeam')
  @ApiOkResponse({ type: PullDetailDto })
  pull(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('number', ParseIntPipe) number: number,
    @CurrentUser() user: AuthUser,
  ): Promise<PullDetailDto> {
    return this.workspace.pull(user, id, number);
  }

  @Post('pulls/:number/comments')
  @Can('update', 'EventTeam')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async comment(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('number', ParseIntPipe) number: number,
    @Body() dto: PullCommentBodyDto,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.workspace.comment(user, id, number, dto.body);
  }

  @Post('pulls/:number/reviews')
  @Can('update', 'EventTeam')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async review(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('number', ParseIntPipe) number: number,
    @Body() dto: PullReviewBodyDto,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.workspace.review(user, id, number, dto);
  }

  @Post('pulls/:number/merge')
  @Can('update', 'EventTeam')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async merge(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('number', ParseIntPipe) number: number,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.workspace.merge(user, id, number);
  }

  /** Hands the work in: a title, a description, and the latest commit on main. */
  @Put('submission')
  @Can('update', 'EventTeam')
  @ApiOkResponse({ type: EventSubmissionDto })
  submit(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: SubmitWorkDto,
    @CurrentUser() user: AuthUser,
  ): Promise<EventSubmissionDto> {
    return this.workspace.submit(user, id, dto);
  }

  @Get('files')
  @Can('read', 'EventTeam')
  @ApiOkResponse({ type: TeamFilesDto })
  files(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query() query: TeamFilesQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<TeamFilesDto> {
    return this.workspace.files(user, id, query.ref);
  }
}

/** Mentors: the teams they mentor, and judging. */
@ApiTags('events')
@Controller('mentor')
export class MentorEventsController {
  constructor(private readonly judging: JudgingService) {}

  @Get('events')
  @Can('read', 'EventScore')
  @ApiOkResponse({ type: MentorEventsDto })
  events(@CurrentUser() user: AuthUser): Promise<MentorEventsDto> {
    return this.judging.mentorEvents(user);
  }

  @Get('judging/:slug')
  @Can('create', 'EventScore')
  @ApiOkResponse({ type: JudgingDto })
  judge(@Param('slug') slug: string, @CurrentUser() user: AuthUser): Promise<JudgingDto> {
    return this.judging.judging(user, slug);
  }

  @Put('judging/teams/:id/score')
  @Can('create', 'EventScore')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async score(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ScoreTeamDto,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.judging.score(user, id, dto);
  }
}

/** Staff: set up and run events. */
@ApiTags('admin')
@Controller('admin/events')
export class EventsAdminController {
  constructor(private readonly admin: EventsAdminService) {}

  // Staff only: families may read events, but not every team.
  @Get()
  @Can('read', 'EventTeam', { onAll: true })
  @ApiOkResponse({ type: [AdminEventSummaryDto] })
  list(): Promise<AdminEventSummaryDto[]> {
    return this.admin.list();
  }

  @Post()
  @Can('create', 'Event', { onAll: true })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AdminEventDto })
  create(
    @Body() dto: SaveEventDto,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<AdminEventDto> {
    return this.admin.create(user, dto, ctx);
  }

  @Get(':id')
  @Can('read', 'EventTeam', { onAll: true })
  @ApiOkResponse({ type: AdminEventDto })
  get(@Param('id', new ParseUUIDPipe()) id: string): Promise<AdminEventDto> {
    return this.admin.get(id);
  }

  @Put(':id')
  @Can('update', 'Event', { onAll: true })
  @ApiOkResponse({ type: AdminEventDto })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: SaveEventDto,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<AdminEventDto> {
    return this.admin.update(user, id, dto, ctx);
  }

  @Post(':id/status')
  @Can('update', 'Event', { onAll: true })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AdminEventDto })
  status(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: EventStatusDto,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<AdminEventDto> {
    return this.admin.setStatus(user, id, dto.status, ctx);
  }

  @Put(':id/judges')
  @Can('update', 'Event', { onAll: true })
  @ApiOkResponse({ type: AdminEventDto })
  judges(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: EventJudgesDto,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<AdminEventDto> {
    return this.admin.setJudges(user, id, dto.judgeIds, ctx);
  }

  @Put('teams/:teamId/mentor')
  @Can('update', 'EventTeam', { onAll: true })
  @ApiOkResponse({ type: AdminEventDto })
  mentor(
    @Param('teamId', new ParseUUIDPipe()) teamId: string,
    @Body() dto: TeamMentorDto,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<AdminEventDto> {
    return this.admin.setMentor(user, teamId, dto.mentorId ?? null, ctx);
  }

  @Post('teams/:teamId/members/:userId/remove')
  @Can('update', 'EventTeam', { onAll: true })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async removeMember(
    @Param('teamId', new ParseUUIDPipe()) teamId: string,
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Body() dto: RemoveMemberDto,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<void> {
    await this.admin.removeMember(user, teamId, userId, dto.reason, ctx);
  }
}
