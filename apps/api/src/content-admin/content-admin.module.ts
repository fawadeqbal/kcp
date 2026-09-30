import { Module } from '@nestjs/common';
import { ContentAdminController } from './content-admin.controller.js';
import { ContentAdminService } from './content-admin.service.js';

/** Staff preview and publish content (lessons are written as files in content/). */
@Module({
  controllers: [ContentAdminController],
  providers: [ContentAdminService],
})
export class ContentAdminModule {}
