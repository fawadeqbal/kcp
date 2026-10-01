import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { byIp, RateLimit } from '../common/rate-limit/rate-limit.decorator.js';
import { ReqContext, type RequestContext } from '../common/request-context.js';
import type { AuthUser } from '../permissions/auth-user.js';
import { Can, CurrentUser, Public } from '../permissions/permission.decorators.js';
import { DeliveriesService } from './deliveries.service.js';
import {
  AcceptDeliveryDto,
  ChangeBodyDto,
  CommentBodyDto,
  CreateDeliveryDto,
  DecideChangeDto,
  HubChangeDto,
  HubCommentDto,
  HubDeliveryDto,
  PreviewDto,
  RequestChangesDto,
} from './dto/deliveries.dto.js';
import { ProjectsService } from './projects.service.js';

const uuid = () => new ParseUUIDPipe();
const MINUTE = 60;

/** The lead developer shares milestones, talks with the client and answers change requests. */
@ApiTags('hub')
@Controller('mentor/hub')
export class LeadDeliveriesController {
  constructor(
    private readonly projects: ProjectsService,
    private readonly deliveries: DeliveriesService,
  ) {}

  @Get('projects/:id/deliveries')
  @Can('read', 'HubProject')
  @ApiOkResponse({ type: [HubDeliveryDto] })
  async list(
    @Param('id', uuid()) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<HubDeliveryDto[]> {
    await this.projects.forLead(user, id);
    return this.deliveries.list(id);
  }

  @Post('projects/:id/deliveries')
  @Can('update', 'HubProject')
  @ApiOkResponse({ type: [HubDeliveryDto] })
  async create(
    @Param('id', uuid()) id: string,
    @Body() dto: CreateDeliveryDto,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<HubDeliveryDto[]> {
    await this.deliveries.create(user, id, dto, ctx);
    return this.deliveries.list(id);
  }

  @Post('deliveries/:deliveryId/withdraw')
  @Can('update', 'HubProject')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async withdraw(
    @Param('deliveryId', uuid()) deliveryId: string,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<void> {
    await this.deliveries.withdraw(user, deliveryId, ctx);
  }

  @Get('projects/:id/comments')
  @Can('read', 'HubProject')
  @ApiOkResponse({ type: [HubCommentDto] })
  async comments(
    @Param('id', uuid()) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<HubCommentDto[]> {
    await this.projects.forLead(user, id);
    return this.deliveries.comments(id, user);
  }

  @Post('projects/:id/comments')
  @Can('update', 'HubProject')
  @ApiOkResponse({ type: [HubCommentDto] })
  async comment(
    @Param('id', uuid()) id: string,
    @Body() dto: CommentBodyDto,
    @CurrentUser() user: AuthUser,
  ): Promise<HubCommentDto[]> {
    await this.projects.forLead(user, id);
    await this.deliveries.addComment(user, id, dto.body, dto.deliveryId);
    return this.deliveries.comments(id, user);
  }

  @Get('projects/:id/changes')
  @Can('read', 'HubProject')
  @ApiOkResponse({ type: [HubChangeDto] })
  async changes(
    @Param('id', uuid()) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<HubChangeDto[]> {
    await this.projects.forLead(user, id);
    return this.deliveries.changes(id);
  }

  @Post('changes/:changeId/decide')
  @Can('update', 'HubProject')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async decide(
    @Param('changeId', uuid()) changeId: string,
    @Body() dto: DecideChangeDto,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<void> {
    await this.deliveries.decideChange(user, changeId, dto, ctx);
  }
}

/** The client reviews milestones, accepts the work or asks for changes, and talks with the team. */
@ApiTags('hub')
@Controller('client/projects/:id')
export class ClientDeliveriesController {
  constructor(
    private readonly projects: ProjectsService,
    private readonly deliveries: DeliveriesService,
  ) {}

  @Get('deliveries')
  @Can('read', 'HubProject')
  @ApiOkResponse({ type: [HubDeliveryDto] })
  async list(
    @Param('id', uuid()) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<HubDeliveryDto[]> {
    await this.projects.forClient(user, id);
    return (await this.deliveries.list(id)).filter((d) => d.status !== 'WITHDRAWN');
  }

  @Post('deliveries/:deliveryId/accept')
  @Can('update', 'HubProject')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async accept(
    @Param('id', uuid()) id: string,
    @Param('deliveryId', uuid()) deliveryId: string,
    @Body() dto: AcceptDeliveryDto,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<void> {
    await this.deliveries.accept(user, id, deliveryId, dto.allowPortfolio, ctx);
  }

  @Post('deliveries/:deliveryId/request-changes')
  @Can('update', 'HubProject')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async requestChanges(
    @Param('id', uuid()) id: string,
    @Param('deliveryId', uuid()) deliveryId: string,
    @Body() dto: RequestChangesDto,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<void> {
    await this.deliveries.requestChanges(user, id, deliveryId, dto.comment, ctx);
  }

  @Get('comments')
  @Can('read', 'HubProject')
  @ApiOkResponse({ type: [HubCommentDto] })
  async comments(
    @Param('id', uuid()) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<HubCommentDto[]> {
    await this.projects.forClient(user, id);
    return this.deliveries.comments(id, user);
  }

  @Post('comments')
  @Can('update', 'HubProject')
  @ApiOkResponse({ type: [HubCommentDto] })
  async comment(
    @Param('id', uuid()) id: string,
    @Body() dto: CommentBodyDto,
    @CurrentUser() user: AuthUser,
  ): Promise<HubCommentDto[]> {
    await this.projects.forClient(user, id);
    await this.deliveries.addComment(user, id, dto.body, dto.deliveryId);
    return this.deliveries.comments(id, user);
  }

  @Get('changes')
  @Can('read', 'HubProject')
  @ApiOkResponse({ type: [HubChangeDto] })
  async changes(
    @Param('id', uuid()) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<HubChangeDto[]> {
    await this.projects.forClient(user, id);
    return this.deliveries.changes(id);
  }

  @Post('changes')
  @Can('update', 'HubProject')
  @ApiOkResponse({ type: [HubChangeDto] })
  async addChange(
    @Param('id', uuid()) id: string,
    @Body() dto: ChangeBodyDto,
    @CurrentUser() user: AuthUser,
  ): Promise<HubChangeDto[]> {
    await this.deliveries.addChange(user, id, dto.body);
    return this.deliveries.changes(id);
  }
}

/** Staff read a project's milestones, messages and change requests, and can answer. */
@ApiTags('hub')
@Controller('admin/hub/projects/:id')
export class HubDeliveriesAdminController {
  constructor(
    private readonly projects: ProjectsService,
    private readonly deliveries: DeliveriesService,
  ) {}

  @Get('deliveries')
  @Can('read', 'Hub', { onAll: true })
  @ApiOkResponse({ type: [HubDeliveryDto] })
  async list(@Param('id', uuid()) id: string): Promise<HubDeliveryDto[]> {
    await this.projects.forStaff(id);
    return this.deliveries.list(id);
  }

  @Get('comments')
  @Can('read', 'Hub', { onAll: true })
  @ApiOkResponse({ type: [HubCommentDto] })
  async comments(
    @Param('id', uuid()) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<HubCommentDto[]> {
    await this.projects.forStaff(id);
    return this.deliveries.comments(id, user);
  }

  @Post('comments')
  @Can('update', 'Hub', { onAll: true })
  @ApiOkResponse({ type: [HubCommentDto] })
  async comment(
    @Param('id', uuid()) id: string,
    @Body() dto: CommentBodyDto,
    @CurrentUser() user: AuthUser,
  ): Promise<HubCommentDto[]> {
    await this.projects.forStaff(id);
    await this.deliveries.addComment(user, id, dto.body, dto.deliveryId);
    return this.deliveries.comments(id, user);
  }

  @Get('changes')
  @Can('read', 'Hub', { onAll: true })
  @ApiOkResponse({ type: [HubChangeDto] })
  async changes(@Param('id', uuid()) id: string): Promise<HubChangeDto[]> {
    await this.projects.forStaff(id);
    return this.deliveries.changes(id);
  }
}

/**
 * A milestone's preview, opened with its secret link on the user-content domain
 * (apps/sandbox, /preview/#<token>). No account needed: the link is the key; it stops
 * working when the delivery is withdrawn or the project cancelled.
 */
@ApiTags('hub')
@Controller('shared')
export class SharedPreviewController {
  constructor(private readonly deliveries: DeliveriesService) {}

  @Get('previews/:token')
  @Public()
  @RateLimit({ name: 'shared-preview-ip', limit: 60, windowSeconds: MINUTE, key: byIp })
  // Headers for the page on the user-content domain (any origin, never cached): app.setup.ts.
  @ApiOkResponse({ type: PreviewDto })
  preview(@Param('token') token: string): Promise<PreviewDto> {
    return this.deliveries.preview(/^[\w-]{16,64}$/.test(token) ? token : '-');
  }
}
