import { Module } from '@nestjs/common';
import { SettingsAdminController } from './settings-admin.controller.js';
import { SettingsAdminService } from './settings-admin.service.js';

/** Countries, languages and feature flags, as admins switch them. */
@Module({
  controllers: [SettingsAdminController],
  providers: [SettingsAdminService],
})
export class SettingsAdminModule {}
