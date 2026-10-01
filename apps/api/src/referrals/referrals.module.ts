import { Module } from '@nestjs/common';
import { ReferralsController } from './referrals.controller.js';
import { ReferralsService } from './referrals.service.js';

/** Invite links between families, rewarded with premium days. */
@Module({
  controllers: [ReferralsController],
  providers: [ReferralsService],
  exports: [ReferralsService],
})
export class ReferralsModule {}
