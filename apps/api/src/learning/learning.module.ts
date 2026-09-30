import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module.js';
import { ProgressModule } from '../progress/progress.module.js';
import { LearningController } from './learning.controller.js';
import { LearningService } from './learning.service.js';

@Module({
  imports: [ProgressModule, BillingModule],
  controllers: [LearningController],
  providers: [LearningService],
})
export class LearningModule {}
