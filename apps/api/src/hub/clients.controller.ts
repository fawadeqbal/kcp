import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiBody,
  ApiConsumes,
  ApiHeader,
  ApiOkResponse,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { byBodyField, byIp, RateLimit } from '../common/rate-limit/rate-limit.decorator.js';
import { ReqContext, type RequestContext } from '../common/request-context.js';
import type { AuthUser } from '../permissions/auth-user.js';
import { Can, CurrentUser, Public } from '../permissions/permission.decorators.js';
import { ClientsService } from './clients.service.js';
import {
  AcceptedIntakeDto,
  AcceptIntakeDto,
  AdminClientDto,
  AdminIntakeDto,
  ClientMeDto,
  ConfirmIntakeDto,
  CreateIntakeDto,
  DeclineIntakeDto,
  HubLeadDto,
  IntakeDto,
  IntakeListQueryDto,
  InviteColleagueDto,
  PublicIntakeDto,
  SignClientAgreementDto,
  UpdateClientOrgDto,
} from './dto/clients.dto.js';
import { IntakeAdminService } from './intake-admin.service.js';

const HOUR = 60 * 60;

/** Sends a stored file as a download (never shown inline: it came from outside). */
function sendFile(res: Response, file: { body: Buffer; name: string; type: string }) {
  res.setHeader('Content-Type', file.type);
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="file"; filename*=UTF-8''${encodeURIComponent(file.name)}`,
  );
  res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.send(file.body);
}

/** The "Hire our students" page on the marketing site. */
@ApiTags('hub')
@Controller('public/hub')
export class PublicIntakeController {
  constructor(private readonly clients: ClientsService) {}

  /** A project request. Always 202: an email asks the contact to confirm it. */
  @Post('intake')
  @Public()
  @RateLimit(
    { name: 'hub-intake-ip', limit: 5, windowSeconds: HOUR, key: byIp },
    { name: 'hub-intake-email', limit: 3, windowSeconds: HOUR, key: byBodyField('contactEmail') },
  )
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiAcceptedResponse({ description: 'A confirmation email is on its way.' })
  async intake(@Body() dto: PublicIntakeDto): Promise<void> {
    await this.clients.publicIntake(dto);
  }

  /** The link in the email. 404 unknown or used, 410 expired. */
  @Post('intake/confirm')
  @Public()
  @RateLimit({ name: 'hub-intake-confirm-ip', limit: 30, windowSeconds: HOUR, key: byIp })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Confirmed: the request is in the queue.' })
  async confirm(@Body() dto: ConfirmIntakeDto): Promise<void> {
    await this.clients.confirmIntake(dto.token);
  }
}

/** The client portal: the organisation, its agreement, people and project requests. */
@ApiTags('client')
@Controller('client')
export class ClientPortalController {
  constructor(private readonly clients: ClientsService) {}

  @Get('me')
  @Can('read', 'ClientOrg')
  @ApiOkResponse({ type: ClientMeDto })
  me(@CurrentUser() user: AuthUser): Promise<ClientMeDto> {
    return this.clients.me(user);
  }

  /** The owner signs the client agreement (its current version). */
  @Post('agreement')
  @Can('update', 'ClientOrg')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: ClientMeDto })
  sign(
    @Body() dto: SignClientAgreementDto,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<ClientMeDto> {
    return this.clients.signAgreement(user, dto.version, ctx);
  }

  @Patch('org')
  @Can('update', 'ClientOrg')
  @ApiOkResponse({ type: ClientMeDto })
  updateOrg(
    @Body() dto: UpdateClientOrgDto,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<ClientMeDto> {
    return this.clients.updateOrg(user, dto, ctx);
  }

  @Post('colleagues')
  @Can('update', 'ClientOrg')
  // Few invitations: an answer of "that email has an account" mustn't become a lookup.
  @RateLimit({ name: 'hub-colleague-ip', limit: 10, windowSeconds: HOUR, key: byIp })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: ClientMeDto })
  invite(
    @Body() dto: InviteColleagueDto,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<ClientMeDto> {
    return this.clients.inviteColleague(user, dto, ctx);
  }

  @Get('intakes')
  @Can('create', 'HubIntake')
  @ApiOkResponse({ type: [IntakeDto] })
  intakes(@CurrentUser() user: AuthUser): Promise<IntakeDto[]> {
    return this.clients.intakes(user);
  }

  @Post('intakes')
  @Can('create', 'HubIntake')
  @ApiOkResponse({ type: IntakeDto })
  create(@Body() dto: CreateIntakeDto, @CurrentUser() user: AuthUser): Promise<IntakeDto> {
    return this.clients.createIntake(user, dto);
  }

  @Get('intakes/:id')
  @Can('create', 'HubIntake')
  @ApiOkResponse({ type: IntakeDto })
  intake(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<IntakeDto> {
    return this.clients.intake(user, id);
  }

  /**
   * Adds a file to a request waiting in the queue: the file itself as the body
   * (application/octet-stream; PDF, PNG, JPEG or text, up to 10 MB), its name in
   * X-File-Name (URL-encoded).
   */
  @Post('intakes/:id/files')
  @Can('create', 'HubIntake')
  @RateLimit({ name: 'hub-intake-file-ip', limit: 30, windowSeconds: HOUR, key: byIp })
  @HttpCode(HttpStatus.OK)
  @ApiConsumes('application/octet-stream')
  @ApiHeader({ name: 'X-File-Name', required: false })
  @ApiBody({ schema: { type: 'string', format: 'binary' } })
  @ApiOkResponse({ type: IntakeDto })
  addFile(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: Request,
    @Headers('x-file-name') name: string | undefined,
    @CurrentUser() user: AuthUser,
  ): Promise<IntakeDto> {
    return this.clients.addFile(user, id, Buffer.isBuffer(req.body) ? req.body : undefined, name);
  }

  @Delete('intakes/:id/files/:fileId')
  @Can('create', 'HubIntake')
  @ApiOkResponse({ type: IntakeDto })
  removeFile(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('fileId', new ParseUUIDPipe()) fileId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<IntakeDto> {
    return this.clients.removeFile(user, id, fileId);
  }

  @Get('intakes/:id/files/:fileId')
  @Can('create', 'HubIntake')
  @ApiProduces('application/octet-stream')
  @ApiOkResponse({ schema: { type: 'string', format: 'binary' } })
  async file(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('fileId', new ParseUUIDPipe()) fileId: string,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ): Promise<void> {
    sendFile(res, await this.clients.clientFile(user, id, fileId));
  }
}

/** The admin Hub queue: project requests, clients and lead developers. */
@ApiTags('hub')
@Controller('admin/hub')
export class HubIntakeAdminController {
  constructor(
    private readonly intakes: IntakeAdminService,
    private readonly clients: ClientsService,
  ) {}

  @Get('intakes')
  @Can('read', 'Hub', { onAll: true })
  @ApiOkResponse({ type: [AdminIntakeDto] })
  list(@Query() query: IntakeListQueryDto): Promise<AdminIntakeDto[]> {
    return this.intakes.list(query.status);
  }

  @Get('intakes/:id')
  @Can('read', 'Hub', { onAll: true })
  @ApiOkResponse({ type: AdminIntakeDto })
  get(@Param('id', new ParseUUIDPipe()) id: string): Promise<AdminIntakeDto> {
    return this.intakes.get(id);
  }

  @Get('intakes/:id/files/:fileId')
  @Can('read', 'Hub', { onAll: true })
  @ApiProduces('application/octet-stream')
  @ApiOkResponse({ schema: { type: 'string', format: 'binary' } })
  async file(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('fileId', new ParseUUIDPipe()) fileId: string,
    @Res() res: Response,
  ): Promise<void> {
    sendFile(res, await this.clients.file(id, fileId, null));
  }

  /** Accepts a request: a project for a lead developer (and a client account if needed). */
  @Post('intakes/:id/accept')
  @Can('update', 'Hub', { onAll: true })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AcceptedIntakeDto })
  accept(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AcceptIntakeDto,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<AcceptedIntakeDto> {
    return this.intakes.accept(id, dto, user, ctx);
  }

  /** Declines a request; the reason is emailed to the client. */
  @Post('intakes/:id/decline')
  @Can('update', 'Hub', { onAll: true })
  @HttpCode(HttpStatus.NO_CONTENT)
  async decline(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: DeclineIntakeDto,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<void> {
    await this.intakes.decline(id, dto.reason, user, ctx);
  }

  @Get('clients')
  @Can('read', 'Hub', { onAll: true })
  @ApiOkResponse({ type: [AdminClientDto] })
  clientList(): Promise<AdminClientDto[]> {
    return this.intakes.clientList();
  }

  @Get('leads')
  @Can('read', 'Hub', { onAll: true })
  @ApiOkResponse({ type: [HubLeadDto] })
  leads(): Promise<HubLeadDto[]> {
    return this.intakes.leads();
  }
}
