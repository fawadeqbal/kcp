import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Res } from '@nestjs/common';
import { ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { byIp, RateLimit } from '../common/rate-limit/rate-limit.decorator.js';
import { ReqContext, type RequestContext } from '../common/request-context.js';
import type { AuthUser } from '../permissions/auth-user.js';
import { Authenticated, CurrentUser } from '../permissions/permission.decorators.js';
import { DeleteAccountDto } from './account.dto.js';
import { AccountService } from './account.service.js';

/** A parent's own data: download a copy, or delete the account. */
@ApiTags('account')
@Controller('account')
export class AccountController {
  constructor(private readonly account: AccountService) {}

  /** A copy of everything we keep about the family, as a JSON file. */
  @Get('export')
  @Authenticated()
  @RateLimit({ name: 'account-export-ip', limit: 10, windowSeconds: 60 * 60, key: byIp })
  @ApiOkResponse({ description: 'JSON file' })
  async export(
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
    @Res({ passthrough: true }) res: Response,
  ): Promise<Record<string, unknown>> {
    const data = await this.account.export(user, ctx);
    res.setHeader('Content-Disposition', 'attachment; filename="kids-coding-platform-data.json"');
    return data;
  }

  /** Deletes the parent's account and every child account in it (password required). */
  @Delete()
  @Authenticated()
  @HttpCode(HttpStatus.NO_CONTENT)
  @RateLimit({ name: 'account-delete-ip', limit: 10, windowSeconds: 15 * 60, key: byIp })
  @ApiNoContentResponse()
  async delete(
    @Body() dto: DeleteAccountDto,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<void> {
    await this.account.delete(user, dto.password, ctx);
  }
}
