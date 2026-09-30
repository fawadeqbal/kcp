import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ReqContext, type RequestContext } from '../common/request-context.js';
import type { AppAbility } from '../permissions/ability.factory.js';
import type { AuthUser } from '../permissions/auth-user.js';
import { Can, CurrentAbility, CurrentUser } from '../permissions/permission.decorators.js';
import {
  ListUsersQueryDto,
  UpdateUserStatusDto,
  UserListDto,
  UserSummaryDto,
} from './dto/user.dto.js';
import { UsersService } from './users.service.js';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  /** Search all accounts (staff). */
  @Get()
  @Can('read', 'User', { onAll: true })
  @ApiOkResponse({ type: UserListDto })
  list(@Query() query: ListUsersQueryDto): Promise<UserListDto> {
    return this.users.list(query);
  }

  /** One account — only if the caller's rules allow it (e.g. a parent and their own child). */
  @Get(':id')
  @Can('read', 'User')
  @ApiOkResponse({ type: UserSummaryDto })
  get(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentAbility() ability: AppAbility,
  ): Promise<UserSummaryDto> {
    return this.users.get(id, ability);
  }

  /** Suspend or reactivate an account. Suspending signs the account out everywhere. */
  @Patch(':id/status')
  @Can('update', 'User')
  @ApiOkResponse({ type: UserSummaryDto })
  setStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser() actor: AuthUser,
    @CurrentAbility() ability: AppAbility,
    @ReqContext() ctx: RequestContext,
  ): Promise<UserSummaryDto> {
    return this.users.setStatus(id, dto.status, dto.reason, actor, ability, ctx);
  }

  /** Signs the account out on every device. */
  @Post(':id/sessions/revoke')
  @Can('update', 'User')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  revokeSessions(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() actor: AuthUser,
    @CurrentAbility() ability: AppAbility,
    @ReqContext() ctx: RequestContext,
  ): Promise<void> {
    return this.users.revokeSessions(id, actor, ability, ctx);
  }
}
