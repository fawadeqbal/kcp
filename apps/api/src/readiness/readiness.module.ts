import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module.js';
import { ReadinessController } from './readiness.controller.js';
import { ReadinessService } from './readiness.service.js';

/** The hub readiness check (graded in the mentor console, as a READINESS review). */
@Module({
  imports: [BillingModule],
  controllers: [ReadinessController],
  providers: [ReadinessService],
})
export class ReadinessModule {}
