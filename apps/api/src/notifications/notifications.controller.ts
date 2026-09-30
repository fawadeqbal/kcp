import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../permissions/auth-user.js';
import { Authenticated, CurrentUser } from '../permissions/permission.decorators.js';
import { MarkReadDto, NotificationListDto } from './notifications.dto.js';
import { NotificationsService } from './notifications.service.js';

/** The signed-in account's own notifications (the bell in the app's header). */
@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @Authenticated()
  @ApiOkResponse({ type: NotificationListDto })
  list(@CurrentUser() user: AuthUser): Promise<NotificationListDto> {
    return this.notifications.list(user.id);
  }

  @Post('read')
  @Authenticated()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async markRead(@Body() dto: MarkReadDto, @CurrentUser() user: AuthUser): Promise<void> {
    await this.notifications.markRead(user.id, dto.all ? 'all' : (dto.ids ?? []));
  }
}
