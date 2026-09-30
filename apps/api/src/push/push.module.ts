import { Module } from '@nestjs/common';
import { DevicesController } from './devices.controller.js';
import { DevicesService } from './devices.service.js';
import { PushJobsService } from './push-jobs.service.js';
import { PushService } from './push.service.js';

/** Push notifications to the mobile app, and the phones registered for them. */
@Module({
  controllers: [DevicesController],
  providers: [PushService, DevicesService, PushJobsService],
  exports: [PushService, PushJobsService],
})
export class PushModule {}
