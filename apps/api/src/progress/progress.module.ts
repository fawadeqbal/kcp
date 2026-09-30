import { Module } from '@nestjs/common';
import { BadgesService } from './badges.service.js';
import { LeaderboardJobsService } from './leaderboard-jobs.service.js';
import { LeaderboardService } from './leaderboard.service.js';
import { LeaderboardsAdminController } from './leaderboards-admin.controller.js';
import { LeaderboardsAdminService } from './leaderboards-admin.service.js';
import { ProgressController } from './progress.controller.js';
import { ProgressService } from './progress.service.js';

@Module({
  controllers: [ProgressController, LeaderboardsAdminController],
  providers: [
    ProgressService,
    LeaderboardService,
    BadgesService,
    LeaderboardsAdminService,
    LeaderboardJobsService,
  ],
  exports: [ProgressService, LeaderboardService, BadgesService],
})
export class ProgressModule {}
