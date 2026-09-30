import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module.js';
import { PushModule } from '../push/push.module.js';
import { FamilyEmailsController } from './family-emails.controller.js';
import { FamilyEmailsService } from './family-emails.service.js';

/** Scheduled emails (and pushes) to families: trial reminders and the monthly summary. */
@Module({
  imports: [BillingModule, PushModule],
  controllers: [FamilyEmailsController],
  providers: [FamilyEmailsService],
  exports: [FamilyEmailsService],
})
export class FamilyEmailsModule {}
