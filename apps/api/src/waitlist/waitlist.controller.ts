import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiAcceptedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { byBodyField, byIp, RateLimit } from '../common/rate-limit/rate-limit.decorator.js';
import { Can, Public } from '../permissions/permission.decorators.js';
import { ConfirmWaitlistDto, JoinWaitlistDto, WaitlistSummaryDto } from './waitlist.dto.js';
import { WaitlistService } from './waitlist.service.js';

const HOUR = 60 * 60;

@ApiTags('waitlist')
@Controller()
export class WaitlistController {
  constructor(private readonly waitlist: WaitlistService) {}

  /** Joins the waitlist (the marketing site). Always 202: a confirmation email follows. */
  @Post('waitlist')
  @Public()
  @RateLimit(
    { name: 'waitlist-ip', limit: 10, windowSeconds: HOUR, key: byIp },
    { name: 'waitlist-email', limit: 3, windowSeconds: HOUR, key: byBodyField('email') },
  )
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiAcceptedResponse({ description: 'A confirmation email is on its way.' })
  async join(@Body() dto: JoinWaitlistDto): Promise<void> {
    await this.waitlist.join(dto);
  }

  /** The link in the email. 404 unknown or used, 410 expired. */
  @Post('waitlist/confirm')
  @Public()
  @RateLimit({ name: 'waitlist-confirm-ip', limit: 30, windowSeconds: HOUR, key: byIp })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Confirmed.' })
  async confirm(@Body() dto: ConfirmWaitlistDto): Promise<void> {
    await this.waitlist.confirm(dto.token);
  }

  /** Staff: how many families wait, per country, and the latest confirmed. */
  @Get('admin/waitlist')
  @Can('read', 'Waitlist', { onAll: true })
  @ApiOkResponse({ type: WaitlistSummaryDto })
  summary(): Promise<WaitlistSummaryDto> {
    return this.waitlist.summary();
  }
}
