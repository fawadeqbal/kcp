import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module.js';
import { ProgressModule } from '../progress/progress.module.js';
import { ReviewsModule } from '../reviews/reviews.module.js';
import { ReferralsModule } from '../referrals/referrals.module.js';
import { ProjectsController } from './projects.controller.js';
import { ProjectsService } from './projects.service.js';
import { SharedPortfolioController } from './shared-portfolio.controller.js';

@Module({
  imports: [ProgressModule, BillingModule, ReviewsModule, ReferralsModule],
  controllers: [ProjectsController, SharedPortfolioController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
