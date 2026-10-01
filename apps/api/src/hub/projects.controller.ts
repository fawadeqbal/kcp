import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ReqContext, type RequestContext } from '../common/request-context.js';
import type { AuthUser } from '../permissions/auth-user.js';
import { Can, CurrentUser } from '../permissions/permission.decorators.js';
import {
  AdminProjectDto,
  AdminUpdateProjectDto,
  ApproveQuoteDto,
  CheckoutQueryDto,
  CheckoutUrlDto,
  ClientProjectDto,
  CreateQuoteDto,
  HubInvoiceDto,
  InvoiceListQueryDto,
  LeadProjectDto,
  ProjectListQueryDto,
  ProjectSummaryDto,
  ReasonDto,
  RecordHubPaymentDto,
  SharesDto,
  TaskInputDto,
  UpdateProjectDto,
  UpdateQuoteDto,
  UpdateTaskDto,
} from './dto/projects.dto.js';
import { HubInvoicesService } from './invoices.service.js';
import { ProjectsService } from './projects.service.js';
import { ProjectsAdminService } from './projects-admin.service.js';
import { QuotesService } from './quotes.service.js';

const uuid = () => new ParseUUIDPipe();

/** The lead developer's side of a project: scoping, tasks and quotes. */
@ApiTags('hub')
@Controller('mentor/hub')
export class LeadProjectsController {
  constructor(
    private readonly projects: ProjectsService,
    private readonly admin: ProjectsAdminService,
    private readonly quotes: QuotesService,
  ) {}

  @Get('projects')
  @Can('read', 'HubProject')
  @ApiOkResponse({ type: [ProjectSummaryDto] })
  async list(@CurrentUser() user: AuthUser): Promise<ProjectSummaryDto[]> {
    await this.projects.forLeadCheck(user);
    return this.admin.forLead(user.id);
  }

  @Get('projects/:id')
  @Can('read', 'HubProject')
  @ApiOkResponse({ type: LeadProjectDto })
  async get(
    @Param('id', uuid()) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<LeadProjectDto> {
    return this.projects.leadView(await this.projects.forLead(user, id));
  }

  @Patch('projects/:id')
  @Can('update', 'HubProject')
  @ApiOkResponse({ type: LeadProjectDto })
  update(
    @Param('id', uuid()) id: string,
    @Body() dto: UpdateProjectDto,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<LeadProjectDto> {
    return this.quotes.updateProject(user, id, dto, ctx);
  }

  @Post('projects/:id/quotes')
  @Can('update', 'HubProject')
  @ApiOkResponse({ type: LeadProjectDto })
  createQuote(
    @Param('id', uuid()) id: string,
    @Body() dto: CreateQuoteDto,
    @CurrentUser() user: AuthUser,
  ): Promise<LeadProjectDto> {
    return this.quotes.createQuote(user, id, dto);
  }

  @Patch('quotes/:quoteId')
  @Can('update', 'HubProject')
  @ApiOkResponse({ type: LeadProjectDto })
  updateQuote(
    @Param('quoteId', uuid()) quoteId: string,
    @Body() dto: UpdateQuoteDto,
    @CurrentUser() user: AuthUser,
  ): Promise<LeadProjectDto> {
    return this.quotes.updateQuote(user, quoteId, dto);
  }

  @Post('quotes/:quoteId/send')
  @Can('update', 'HubProject')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: LeadProjectDto })
  send(
    @Param('quoteId', uuid()) quoteId: string,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<LeadProjectDto> {
    return this.quotes.send(user, quoteId, ctx);
  }

  @Post('quotes/:quoteId/withdraw')
  @Can('update', 'HubProject')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: LeadProjectDto })
  withdraw(
    @Param('quoteId', uuid()) quoteId: string,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<LeadProjectDto> {
    return this.quotes.withdraw(user, quoteId, ctx);
  }

  @Post('quotes/:quoteId/tasks')
  @Can('update', 'HubProject')
  @ApiOkResponse({ type: LeadProjectDto })
  addTask(
    @Param('quoteId', uuid()) quoteId: string,
    @Body() dto: TaskInputDto,
    @CurrentUser() user: AuthUser,
  ): Promise<LeadProjectDto> {
    return this.quotes.addTask(user, quoteId, dto);
  }

  @Put('quotes/:quoteId/shares')
  @Can('update', 'HubProject')
  @ApiOkResponse({ type: LeadProjectDto })
  shares(
    @Param('quoteId', uuid()) quoteId: string,
    @Body() dto: SharesDto,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<LeadProjectDto> {
    return this.quotes.setShares(user, quoteId, dto.shares, ctx);
  }

  @Patch('tasks/:taskId')
  @Can('update', 'HubProject')
  @ApiOkResponse({ type: LeadProjectDto })
  updateTask(
    @Param('taskId', uuid()) taskId: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() user: AuthUser,
  ): Promise<LeadProjectDto> {
    return this.quotes.updateTask(user, taskId, dto);
  }

  /** Removes a draft's task, or cancels an approved quote's task that isn't done. */
  @Delete('tasks/:taskId')
  @Can('update', 'HubProject')
  @ApiOkResponse({ type: LeadProjectDto })
  removeTask(
    @Param('taskId', uuid()) taskId: string,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<LeadProjectDto> {
    return this.quotes.removeTask(user, taskId, ctx);
  }
}

/** The client's projects, quotes and invoices. */
@ApiTags('client')
@Controller('client')
export class ClientProjectsController {
  constructor(
    private readonly projects: ProjectsService,
    private readonly quotes: QuotesService,
    private readonly invoices: HubInvoicesService,
  ) {}

  @Get('projects')
  @Can('read', 'HubProject')
  @ApiOkResponse({ type: [ProjectSummaryDto] })
  list(@CurrentUser() user: AuthUser): Promise<ProjectSummaryDto[]> {
    return this.projects.listForClient(user);
  }

  @Get('projects/:id')
  @Can('read', 'HubProject')
  @ApiOkResponse({ type: ClientProjectDto })
  async get(
    @Param('id', uuid()) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<ClientProjectDto> {
    return this.projects.clientView(await this.projects.forClient(user, id));
  }

  /** The owner approves a quote and its statement of work. */
  @Post('projects/:id/quotes/:quoteId/approve')
  @Can('update', 'HubProject')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: ClientProjectDto })
  approve(
    @Param('id', uuid()) id: string,
    @Param('quoteId', uuid()) quoteId: string,
    @Body() dto: ApproveQuoteDto,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<ClientProjectDto> {
    return this.quotes.approve(user, id, quoteId, dto.sowVersion, ctx);
  }

  @Post('projects/:id/quotes/:quoteId/decline')
  @Can('update', 'HubProject')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: ClientProjectDto })
  decline(
    @Param('id', uuid()) id: string,
    @Param('quoteId', uuid()) quoteId: string,
    @Body() dto: ReasonDto,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<ClientProjectDto> {
    return this.quotes.decline(user, id, quoteId, dto.reason, ctx);
  }

  @Get('invoices')
  @Can('read', 'HubInvoice')
  @ApiOkResponse({ type: [HubInvoiceDto] })
  invoiceList(@CurrentUser() user: AuthUser): Promise<HubInvoiceDto[]> {
    return this.invoices.forClient(user);
  }

  @Get('invoices/:id')
  @Can('read', 'HubInvoice')
  @ApiOkResponse({ type: HubInvoiceDto })
  invoice(@Param('id', uuid()) id: string, @CurrentUser() user: AuthUser): Promise<HubInvoiceDto> {
    return this.invoices.oneForClient(user, id);
  }

  /** A card checkout page for an open invoice. */
  @Post('invoices/:id/checkout')
  @Can('update', 'HubInvoice')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: CheckoutUrlDto })
  checkout(
    @Param('id', uuid()) id: string,
    @Query() query: CheckoutQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<CheckoutUrlDto> {
    return this.invoices.checkout(user, id, query.locale);
  }
}

/** Projects and client invoices for staff. */
@ApiTags('hub')
@Controller('admin/hub')
export class HubProjectsAdminController {
  constructor(
    private readonly admin: ProjectsAdminService,
    private readonly invoices: HubInvoicesService,
  ) {}

  @Get('projects')
  @Can('read', 'Hub', { onAll: true })
  @ApiOkResponse({ type: [ProjectSummaryDto] })
  list(@Query() query: ProjectListQueryDto): Promise<ProjectSummaryDto[]> {
    return this.admin.list(query.status);
  }

  @Get('projects/:id')
  @Can('read', 'Hub', { onAll: true })
  @ApiOkResponse({ type: AdminProjectDto })
  get(@Param('id', uuid()) id: string): Promise<AdminProjectDto> {
    return this.admin.get(id);
  }

  @Patch('projects/:id')
  @Can('update', 'Hub', { onAll: true })
  @ApiOkResponse({ type: AdminProjectDto })
  update(
    @Param('id', uuid()) id: string,
    @Body() dto: AdminUpdateProjectDto,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<AdminProjectDto> {
    return this.admin.update(id, dto, user, ctx);
  }

  @Post('projects/:id/cancel')
  @Can('update', 'Hub', { onAll: true })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AdminProjectDto })
  cancel(
    @Param('id', uuid()) id: string,
    @Body() dto: ReasonDto,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<AdminProjectDto> {
    return this.admin.cancel(id, dto.reason, user, ctx);
  }

  @Get('invoices')
  @Can('read', 'HubInvoice', { onAll: true })
  @ApiOkResponse({ type: [HubInvoiceDto] })
  invoiceList(@Query() query: InvoiceListQueryDto): Promise<HubInvoiceDto[]> {
    return this.invoices.forStaff(query.status);
  }

  /** Records a bank transfer that paid an invoice in full. */
  @Post('invoices/:id/payments')
  @Can('update', 'HubInvoice', { onAll: true })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async pay(
    @Param('id', uuid()) id: string,
    @Body() dto: RecordHubPaymentDto,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<void> {
    await this.invoices.recordPayment(id, dto, user, ctx);
  }

  @Post('invoices/:id/void')
  @Can('update', 'HubInvoice', { onAll: true })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async void(
    @Param('id', uuid()) id: string,
    @Body() dto: ReasonDto,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<void> {
    await this.invoices.void(id, dto.reason, user, ctx);
  }
}
