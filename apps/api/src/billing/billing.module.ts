import { Module } from '@nestjs/common';
import { BillingJobsService } from './billing-jobs.service.js';
import { BillingNotifier } from './billing-notifier.service.js';
import { BillingRecordsService } from './billing-records.service.js';
import { BillingController } from './billing.controller.js';
import { BillingService } from './billing.service.js';
import { EntitlementsService } from './entitlements.service.js';
import { PaymentsAdminController } from './payments-admin.controller.js';
import { PaymentsAdminService } from './payments-admin.service.js';
import { PaymentsPublicController } from './payments-public.controller.js';
import { PricingService } from './pricing.service.js';
import { StripeWebhooksService } from './stripe/stripe-webhooks.service.js';
import { StripeGateway } from './stripe/stripe.gateway.js';

/**
 * Plans and payments: Stripe for cards (a mock in development), manual payments
 * recorded by staff, invoices, refunds, and who has premium (EntitlementsService).
 */
@Module({
  controllers: [BillingController, PaymentsAdminController, PaymentsPublicController],
  providers: [
    EntitlementsService,
    BillingRecordsService,
    BillingService,
    BillingNotifier,
    PaymentsAdminService,
    PricingService,
    StripeGateway,
    StripeWebhooksService,
    BillingJobsService,
  ],
  exports: [EntitlementsService, BillingService, BillingNotifier, BillingRecordsService],
})
export class BillingModule {}
