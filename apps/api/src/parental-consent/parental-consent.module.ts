import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { BillingModule } from '../billing/billing.module.js';
import { ChildrenModule } from '../children/children.module.js';
import { ParentalConsentAdminController } from './parental-consent-admin.controller.js';
import { ParentalConsentJobs } from './parental-consent-jobs.service.js';
import { ParentalConsentController } from './parental-consent.controller.js';
import { ParentalConsentService } from './parental-consent.service.js';

@Module({
  imports: [AuthModule, BillingModule, ChildrenModule],
  controllers: [ParentalConsentController, ParentalConsentAdminController],
  providers: [ParentalConsentService, ParentalConsentJobs],
  exports: [ParentalConsentService],
})
export class ParentalConsentModule {}
