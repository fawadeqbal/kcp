import { Module } from '@nestjs/common';
import { AppCrashesController } from './app-crashes.controller.js';
import { AppCrashesService } from './app-crashes.service.js';

/** Crash reports from the mobile app (first-party: no crash-reporting SDK). */
@Module({
  controllers: [AppCrashesController],
  providers: [AppCrashesService],
})
export class AppCrashesModule {}
