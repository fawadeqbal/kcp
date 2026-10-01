import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
} from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CONSENT_FORM_TYPES } from '@kcp/shared';
import type { Request } from 'express';
import { ChildrenService } from '../children/children.service.js';
import { byIp, RateLimit } from '../common/rate-limit/rate-limit.decorator.js';
import { ReqContext, type RequestContext } from '../common/request-context.js';
import type { AppAbility } from '../permissions/ability.factory.js';
import type { AuthUser } from '../permissions/auth-user.js';
import { Can, CurrentAbility, CurrentUser, Public } from '../permissions/permission.decorators.js';
import {
  ConfirmConsentEmailDto,
  ConfirmedConsentDto,
  ParentalConsentStatusDto,
  StartConsentDto,
  StartConsentResultDto,
} from './parental-consent.dto.js';
import { ParentalConsentService } from './parental-consent.service.js';

const MINUTE = 60;

/** A parent confirms consent for their child under 13 (the child's account stays closed until then). */
@ApiTags('children')
@Controller()
export class ParentalConsentController {
  constructor(
    private readonly consent: ParentalConsentService,
    private readonly children: ChildrenService,
  ) {}

  @Get('children/:id/parental-consent')
  @Can('read', 'Child')
  @ApiOkResponse({ type: ParentalConsentStatusDto })
  async status(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() parent: AuthUser,
    @CurrentAbility() ability: AppAbility,
  ): Promise<ParentalConsentStatusDto> {
    await this.children.assertParentOf(id, parent, ability, 'read');
    return this.consent.status(id);
  }

  /** Starts a method: a card check page (CARD_CHECK), an email (EMAIL_PLUS), or nothing yet (SIGNED_FORM). */
  @Post('children/:id/parental-consent')
  @Can('update', 'Child')
  @HttpCode(HttpStatus.OK)
  @RateLimit({ name: 'consent-start-ip', limit: 20, windowSeconds: 15 * MINUTE, key: byIp })
  @ApiOkResponse({ type: StartConsentResultDto })
  async start(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: StartConsentDto,
    @CurrentUser() parent: AuthUser,
    @CurrentAbility() ability: AppAbility,
    @ReqContext() ctx: RequestContext,
  ): Promise<StartConsentResultDto> {
    await this.children.assertParentOf(id, parent, ability, 'update');
    return this.consent.start(id, dto.method, dto.locale ?? 'en', parent, ctx);
  }

  /** The signed form: the file itself as the body (PDF, PNG or JPEG, up to 5 MB). */
  @Post('children/:id/parental-consent/form')
  @Can('update', 'Child')
  @HttpCode(HttpStatus.OK)
  @RateLimit({ name: 'consent-form-ip', limit: 10, windowSeconds: 15 * MINUTE, key: byIp })
  @ApiConsumes(...CONSENT_FORM_TYPES)
  @ApiBody({ schema: { type: 'string', format: 'binary' } })
  @ApiOkResponse({ type: ParentalConsentStatusDto })
  async uploadForm(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: Request,
    @CurrentUser() parent: AuthUser,
    @CurrentAbility() ability: AppAbility,
    @ReqContext() ctx: RequestContext,
  ): Promise<ParentalConsentStatusDto> {
    await this.children.assertParentOf(id, parent, ability, 'update');
    return this.consent.uploadForm(id, req.body as Buffer | undefined, parent, ctx);
  }

  /** The link in the "email plus" email (no sign-in: the one-time token is the proof). */
  @Post('parental-consent/confirm')
  @Public()
  @HttpCode(HttpStatus.OK)
  @RateLimit({ name: 'consent-confirm-ip', limit: 30, windowSeconds: 15 * MINUTE, key: byIp })
  @ApiOkResponse({ type: ConfirmedConsentDto })
  confirm(
    @Body() dto: ConfirmConsentEmailDto,
    @ReqContext() ctx: RequestContext,
  ): Promise<ConfirmedConsentDto> {
    return this.consent.confirmEmail(dto.token, ctx);
  }
}
