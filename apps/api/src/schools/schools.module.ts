import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ChatModule } from '../chat/chat.module.js';
import { PushModule } from '../push/push.module.js';
import { ClassesService } from './classes.service.js';
import { SchoolPremiumService } from './school-premium.service.js';
import {
  ParentClassesController,
  SchoolsAdminController,
  StudentClassesController,
  TeacherController,
} from './schools.controller.js';
import { SchoolsAdminService } from './schools-admin.service.js';

/** Schools: licences (premium for their students), teachers, classes and assignments. */
@Module({
  imports: [AuthModule, ChatModule, PushModule],
  controllers: [
    TeacherController,
    StudentClassesController,
    ParentClassesController,
    SchoolsAdminController,
  ],
  providers: [SchoolPremiumService, ClassesService, SchoolsAdminService],
})
export class SchoolsModule {}
