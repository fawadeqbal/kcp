import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { CertificatesModule } from '../certificates/certificates.module.js';
import { MentorController } from './mentor.controller.js';
import { MentorsAdminController } from './mentors-admin.controller.js';
import { MentorsAdminService } from './mentors-admin.service.js';
import { ReviewsController } from './reviews.controller.js';
import { ReviewsService } from './reviews.service.js';

@Module({
  imports: [AuthModule, CertificatesModule],
  controllers: [MentorController, ReviewsController, MentorsAdminController],
  providers: [ReviewsService, MentorsAdminService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
