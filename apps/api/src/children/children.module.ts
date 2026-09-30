import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { BillingModule } from '../billing/billing.module.js';
import { ProgressModule } from '../progress/progress.module.js';
import { ProjectsModule } from '../projects/projects.module.js';
import { ChildrenController } from './children.controller.js';
import { ChildrenService } from './children.service.js';

@Module({
  imports: [AuthModule, ProgressModule, ProjectsModule, BillingModule],
  controllers: [ChildrenController],
  providers: [ChildrenService],
  exports: [ChildrenService],
})
export class ChildrenModule {}
