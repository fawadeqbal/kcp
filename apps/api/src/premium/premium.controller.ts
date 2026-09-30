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
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ReqContext, type RequestContext } from '../common/request-context.js';
import type { AuthUser } from '../permissions/auth-user.js';
import { Can, CurrentUser } from '../permissions/permission.decorators.js';
import {
  GrantPremiumDto,
  PremiumGrantDto,
  PremiumStatusDto,
  RevokePremiumDto,
} from './dto/premium.dto.js';
import { PremiumService } from './premium.service.js';

/** Premium by hand for pilot families (admin panel). */
@ApiTags('admin')
@Controller('admin')
export class PremiumController {
  constructor(private readonly premium: PremiumService) {}

  /** Premium grants of a student, or of every child of a parent. */
  @Get('users/:id/premium')
  @Can('read', 'PremiumGrant', { onAll: true })
  @ApiOkResponse({ type: PremiumStatusDto })
  list(@Param('id', new ParseUUIDPipe()) id: string): Promise<PremiumStatusDto> {
    return this.premium.list(id);
  }

  /** Grant premium to a student, or to each child of a parent. */
  @Post('users/:id/premium')
  @Can('create', 'PremiumGrant')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: PremiumStatusDto })
  grant(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: GrantPremiumDto,
    @CurrentUser() staff: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<PremiumStatusDto> {
    return this.premium.grant(id, dto.months, dto.reason, staff, ctx);
  }

  @Post('premium/:grantId/revoke')
  @Can('update', 'PremiumGrant')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: PremiumGrantDto })
  revoke(
    @Param('grantId', new ParseUUIDPipe()) grantId: string,
    @Body() dto: RevokePremiumDto,
    @CurrentUser() staff: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<PremiumGrantDto> {
    return this.premium.revoke(grantId, dto.reason, staff, ctx);
  }
}
