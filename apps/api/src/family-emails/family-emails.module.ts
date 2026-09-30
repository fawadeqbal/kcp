import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module.js';
import { FamilyEmailsController } from './family-emails.controller.js';
import { FamilyEmailsService } from './family-emails.service.js';

/** Scheduled emails to families: trial reminders and the monthly summary. */
@Module({
  imports: [BillingModule],
  controllers: [FamilyEmailsController],
  providers: [FamilyEmailsService],
  exports: [FamilyEmailsService],
})
export class FamilyEmailsModule {}
