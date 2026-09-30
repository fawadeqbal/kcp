import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module.js';
import { ProgressModule } from '../progress/progress.module.js';
import { LearningController } from './learning.controller.js';
import { LearningService } from './learning.service.js';
import { QuizService } from './quiz.service.js';
import { QuizzesController } from './quizzes.controller.js';

@Module({
  imports: [ProgressModule, BillingModule],
  controllers: [LearningController, QuizzesController],
  providers: [LearningService, QuizService],
})
export class LearningModule {}
