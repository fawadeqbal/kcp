import { Readable } from 'node:stream';
import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiExcludeController,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { ReqContext, type RequestContext } from '../common/request-context.js';
import {
  PullCommentBodyDto,
  PullDetailDto,
  PullSummaryDto,
  WorkspaceDto,
} from '../events/events.dto.js';
import { refusedUpdate, refUpdates } from '../events/git-proxy.js';
import type { AuthUser } from '../permissions/auth-user.js';
import { Can, CurrentUser } from '../permissions/permission.decorators.js';
import { LeadProjectDto } from './dto/projects.dto.js';
import {
  AnonymousMemberDto,
  AnswerInviteDto,
  AssigneeDto,
  ChildHubProjectDto,
  HubMemberDto,
  HubReviewDto,
  InviteDto,
  MatchDto,
  MoveTaskDto,
  OpenHubPullDto,
  ParentApprovalDto,
  ParentDecisionDto,
  RemoveMemberDto,
  StudentInviteDto,
  StudentProjectDto,
  StudentProjectSummaryDto,
  TimeUsageDto,
} from './dto/team.dto.js';
import { HubGitService } from './hub-git.service.js';
import { ProjectsService } from './projects.service.js';
import { HubTeamService } from './team.service.js';
import { HubTimeService, type TimeUsage } from './time.service.js';

const uuid = () => new ParseUUIDPipe();

function usageDto(usage: TimeUsage): TimeUsageDto {
  return {
    weekKey: usage.weekKey,
    capMinutes: usage.capMinutes,
    usedMinutes: usage.usedMinutes,
    leftMinutes: usage.leftMinutes,
    allowedNow: usage.allowedNow,
    windowEnd: usage.windowEnd,
    nextWindow: usage.nextWindow,
    running: usage.running
      ? {
          projectId: usage.running.projectId,
          taskId: usage.running.taskId,
          startedAt: usage.running.startedAt,
          stopsAt: usage.running.stopsAt,
        }
      : null,
  };
}

/** The lead developer runs the team: suggestions, invitations, tasks, the board. */
@ApiTags('hub')
@Controller('mentor/hub')
export class LeadTeamController {
  constructor(
    private readonly team: HubTeamService,
    private readonly projects: ProjectsService,
  ) {}

  @Get('projects/:id/team')
  @Can('read', 'HubProject')
  @ApiOkResponse({ type: [HubMemberDto] })
  async members(
    @Param('id', uuid()) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<HubMemberDto[]> {
    await this.projects.forLead(user, id);
    return this.team.members(id);
  }

  /** Hub-eligible students for a task, best first, with why. */
  @Get('projects/:id/tasks/:taskId/suggestions')
  @Can('read', 'HubProject')
  @ApiOkResponse({ type: [MatchDto] })
  suggestions(
    @Param('id', uuid()) id: string,
    @Param('taskId', uuid()) taskId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<MatchDto[]> {
    return this.team.suggestions(user, id, taskId);
  }

  /** Invites a student (their parent approves once they say yes). */
  @Post('projects/:id/invites')
  @Can('update', 'HubProject')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: [HubMemberDto] })
  async invite(
    @Param('id', uuid()) id: string,
    @Body() dto: InviteDto,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<HubMemberDto[]> {
    await this.team.invite(user, id, dto, ctx);
    return this.team.members(id);
  }

  @Delete('members/:memberId')
  @Can('update', 'HubProject')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async remove(
    @Param('memberId', uuid()) memberId: string,
    @Body() dto: RemoveMemberDto,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<void> {
    await this.team.remove(user, memberId, dto.reason, ctx);
  }

  @Put('tasks/:taskId/assignee')
  @Can('update', 'HubProject')
  @ApiOkResponse({ type: LeadProjectDto })
  async assign(
    @Param('taskId', uuid()) taskId: string,
    @Body() dto: AssigneeDto,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<LeadProjectDto> {
    await this.team.assign(user, taskId, dto.studentId, ctx);
    const task = await this.projects.taskProject(taskId);
    return this.projects.leadView(await this.projects.forLead(user, task));
  }

  @Patch('tasks/:taskId/status')
  @Can('update', 'HubProject')
  @ApiOkResponse({ type: LeadProjectDto })
  async move(
    @Param('taskId', uuid()) taskId: string,
    @Body() dto: MoveTaskDto,
    @CurrentUser() user: AuthUser,
  ): Promise<LeadProjectDto> {
    await this.team.moveTask(user, taskId, dto.status, true);
    const task = await this.projects.taskProject(taskId);
    return this.projects.leadView(await this.projects.forLead(user, task));
  }
}

/** The student's side: invitations, projects, the board, the timer. */
@ApiTags('hub')
@Controller('hub')
export class StudentHubController {
  constructor(
    private readonly team: HubTeamService,
    private readonly time: HubTimeService,
  ) {}

  @Get('invites')
  @Can('read', 'HubEligibility')
  @ApiOkResponse({ type: [StudentInviteDto] })
  invites(@CurrentUser() user: AuthUser): Promise<StudentInviteDto[]> {
    return this.team.invitesFor(user);
  }

  /** The student says yes (a parent approves next) or no. */
  @Post('invites/:memberId/answer')
  @Can('read', 'HubEligibility')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async answer(
    @Param('memberId', uuid()) memberId: string,
    @Body() dto: AnswerInviteDto,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.team.answer(user, memberId, dto.accept);
  }

  @Get('projects')
  @Can('read', 'HubProject')
  @ApiOkResponse({ type: [StudentProjectSummaryDto] })
  projects(@CurrentUser() user: AuthUser): Promise<StudentProjectSummaryDto[]> {
    return this.team.studentProjects(user);
  }

  @Get('projects/:id')
  @Can('read', 'HubProject')
  @ApiOkResponse({ type: StudentProjectDto })
  project(
    @Param('id', uuid()) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<StudentProjectDto> {
    return this.team.studentProject(user, id);
  }

  @Patch('tasks/:taskId/status')
  @Can('update', 'HubProject')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async move(
    @Param('taskId', uuid()) taskId: string,
    @Body() dto: MoveTaskDto,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.team.moveTask(user, taskId, dto.status, false);
  }

  /** This week's hub time: the cap, what's left, the allowed hours, the running timer. */
  @Get('time')
  @Can('read', 'HubEligibility')
  @ApiOkResponse({ type: TimeUsageDto })
  async usage(@CurrentUser() user: AuthUser): Promise<TimeUsageDto> {
    return usageDto(await this.time.usage(user.id));
  }

  @Post('tasks/:taskId/timer')
  @Can('update', 'HubProject')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: TimeUsageDto })
  async start(
    @Param('taskId', uuid()) taskId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<TimeUsageDto> {
    return usageDto(await this.time.start(user, taskId));
  }

  @Post('timer/stop')
  @Can('update', 'HubProject')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: TimeUsageDto })
  async stop(@CurrentUser() user: AuthUser): Promise<TimeUsageDto> {
    return usageDto(await this.time.stop(user));
  }
}

/** The project's repository: the workspace, pull requests, reviews and merging. */
@ApiTags('hub')
@Controller('hub/projects/:id')
export class HubGitController {
  constructor(private readonly git: HubGitService) {}

  @Get('workspace')
  @Can('read', 'HubProject')
  @ApiOkResponse({ type: WorkspaceDto })
  workspace(@Param('id', uuid()) id: string, @CurrentUser() user: AuthUser): Promise<WorkspaceDto> {
    return this.git.workspace(user, id);
  }

  @Get('pulls')
  @Can('read', 'HubProject')
  @ApiOkResponse({ type: [PullSummaryDto] })
  pulls(@Param('id', uuid()) id: string, @CurrentUser() user: AuthUser): Promise<PullSummaryDto[]> {
    return this.git.pulls(user, id);
  }

  @Post('pulls')
  @Can('update', 'HubProject')
  @ApiOkResponse({ type: PullSummaryDto })
  open(
    @Param('id', uuid()) id: string,
    @Body() dto: OpenHubPullDto,
    @CurrentUser() user: AuthUser,
  ): Promise<PullSummaryDto> {
    return this.git.openPull(user, id, dto);
  }

  @Get('pulls/:number')
  @Can('read', 'HubProject')
  @ApiOkResponse({ type: PullDetailDto })
  pull(
    @Param('id', uuid()) id: string,
    @Param('number', ParseIntPipe) number: number,
    @CurrentUser() user: AuthUser,
  ): Promise<PullDetailDto> {
    return this.git.pull(user, id, number);
  }

  @Post('pulls/:number/comments')
  @Can('update', 'HubProject')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async comment(
    @Param('id', uuid()) id: string,
    @Param('number', ParseIntPipe) number: number,
    @Body() dto: PullCommentBodyDto,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.git.comment(user, id, number, dto.body);
  }

  /** The lead's review, with a score for the student (counts for the latest commit only). */
  @Post('pulls/:number/review')
  @Can('update', 'HubProject')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async review(
    @Param('id', uuid()) id: string,
    @Param('number', ParseIntPipe) number: number,
    @Body() dto: HubReviewDto,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<void> {
    await this.git.review(user, id, number, dto, ctx);
  }

  @Post('pulls/:number/merge')
  @Can('update', 'HubProject')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async merge(
    @Param('id', uuid()) id: string,
    @Param('number', ParseIntPipe) number: number,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.git.merge(user, id, number);
  }
}

/** Parents approve each project, and follow their children's. */
@ApiTags('hub')
@Controller()
export class ParentHubController {
  constructor(private readonly team: HubTeamService) {}

  @Get('hub/approvals')
  @Can('update', 'HubEligibility')
  @ApiOkResponse({ type: [ParentApprovalDto] })
  approvals(@CurrentUser() user: AuthUser): Promise<ParentApprovalDto[]> {
    return this.team.approvalsFor(user);
  }

  @Post('hub/approvals/:memberId')
  @Can('update', 'HubEligibility')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async decide(
    @Param('memberId', uuid()) memberId: string,
    @Body() dto: ParentDecisionDto,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<void> {
    await this.team.decide(user, memberId, dto.approve, ctx);
  }

  @Get('children/:childId/hub/projects')
  @Can('update', 'HubEligibility')
  @ApiOkResponse({ type: [ChildHubProjectDto] })
  childProjects(
    @Param('childId', uuid()) childId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<ChildHubProjectDto[]> {
    return this.team.childProjects(user.id, childId);
  }
}

/** The client sees the team by pseudonym. */
@ApiTags('client')
@Controller('client/projects/:id')
export class ClientTeamController {
  constructor(
    private readonly team: HubTeamService,
    private readonly projects: ProjectsService,
  ) {}

  @Get('team')
  @Can('read', 'HubProject')
  @ApiOkResponse({ type: [AnonymousMemberDto] })
  async anonymousTeam(
    @Param('id', uuid()) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<AnonymousMemberDto[]> {
    await this.projects.forClient(user, id);
    return this.team.anonymousTeam(id);
  }
}

const SERVICES = new Set(['git-upload-pack', 'git-receive-pack']);
const REQUEST_HEADERS = ['content-type', 'content-encoding', 'git-protocol', 'accept'];
const RESPONSE_HEADERS = ['content-type', 'content-encoding', 'cache-control', 'expires', 'pragma'];

/**
 * Git over HTTP for hub repositories (isomorphic-git in the browser), through the API:
 * students push their own branch only, and only while their timer runs.
 */
@ApiExcludeController()
@Controller('git/hub/:id')
export class HubGitProxyController {
  private readonly logger = new Logger(HubGitProxyController.name);

  constructor(private readonly git: HubGitService) {}

  @Get('info/refs')
  @Can('read', 'HubProject')
  async refs(
    @Param('id', uuid()) id: string,
    @Query('service') service: string,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    if (!SERVICES.has(service)) throw new ForbiddenException('Only smart HTTP.');
    const target = await this.git.gitTarget(user, id, service === 'git-receive-pack');
    await this.forward(
      `${target.url}/info/refs?service=${service}`,
      'GET',
      target.authorization,
      req,
      res,
    );
  }

  @Post('git-upload-pack')
  @HttpCode(200)
  @Can('read', 'HubProject')
  async upload(
    @Param('id', uuid()) id: string,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const target = await this.git.gitTarget(user, id, false);
    await this.forward(`${target.url}/git-upload-pack`, 'POST', target.authorization, req, res);
  }

  @Post('git-receive-pack')
  @HttpCode(200)
  @Can('update', 'HubProject')
  async receive(
    @Param('id', uuid()) id: string,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const target = await this.git.gitTarget(user, id, true);
    const body = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    const updates = refUpdates(body, req.headers['content-encoding']);
    const refused = updates ? refusedUpdate(updates, target.ownBranch) : 'the request';
    if (refused) {
      throw new ForbiddenException({
        error: 'PUSH_REFUSED',
        message:
          refused === 'refs/heads/main'
            ? 'main changes through pull requests: push your own branch.'
            : target.ownBranch
              ? `Push your own branch (${target.ownBranch}), not ${refused}.`
              : `Pushing ${refused} is not allowed.`,
      });
    }
    await this.forward(`${target.url}/git-receive-pack`, 'POST', target.authorization, req, res);
  }

  private async forward(
    url: string,
    method: 'GET' | 'POST',
    authorization: string,
    req: Request,
    res: Response,
  ) {
    const headers: Record<string, string> = { Authorization: authorization };
    for (const name of REQUEST_HEADERS) {
      const value = req.headers[name];
      if (typeof value === 'string') headers[name] = value;
    }
    let upstream: globalThis.Response;
    try {
      const signal = AbortSignal.timeout(60_000);
      upstream =
        method === 'POST'
          ? await fetch(url, {
              method: 'POST',
              headers,
              body: Buffer.isBuffer(req.body) ? new Uint8Array(req.body) : new Uint8Array(),
              signal,
            })
          : await fetch(url, { headers, signal });
    } catch (error) {
      this.logger.error(`Git server unreachable: ${(error as Error).message}`);
      res.status(502).type('text/plain').send('The git server is not reachable.');
      return;
    }
    res.status(upstream.status);
    for (const name of RESPONSE_HEADERS) {
      const value = upstream.headers.get(name);
      if (value) res.setHeader(name, value);
    }
    if (!upstream.body) {
      res.end();
      return;
    }
    Readable.fromWeb(upstream.body as import('node:stream/web').ReadableStream).pipe(res);
  }
}
