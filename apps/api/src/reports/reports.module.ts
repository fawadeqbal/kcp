import { Module } from '@nestjs/common';
import { ProgressModule } from '../progress/progress.module.js';
import { ReportsController } from './reports.controller.js';
import { ReportsService } from './reports.service.js';

/** Minutes learning, the skill map and parents' weekly reports. */
@Module({
  imports: [ProgressModule],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
