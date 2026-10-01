import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../permissions/auth-user.js';
import { Authenticated, CurrentUser } from '../permissions/permission.decorators.js';
import { ReferralSummaryDto } from './referrals.dto.js';
import { ReferralsService } from './referrals.service.js';

@ApiTags('referrals')
@Controller('referrals')
export class ReferralsController {
  constructor(private readonly referrals: ReferralsService) {}

  /** The parent's invite link, and how the families they invited are doing. */
  @Get()
  @Authenticated()
  @ApiOkResponse({ type: ReferralSummaryDto })
  summary(@CurrentUser() user: AuthUser): Promise<ReferralSummaryDto> {
    return this.referrals.summary(user);
  }
}
