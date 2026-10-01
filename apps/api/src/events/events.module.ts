import { Module } from '@nestjs/common';
import { ChatModule } from '../chat/chat.module.js';
import { PushModule } from '../push/push.module.js';
import {
  EventsAdminController,
  EventsController,
  MentorEventsController,
  ParentEventsController,
  TeamsController,
} from './events.controller.js';
import { EventsAdminService } from './events-admin.service.js';
import { EventsService } from './events.service.js';
import { ForgejoService } from './forgejo.service.js';
import { GitProxyController } from './git-proxy.controller.js';
import { GitWorkspaceService } from './git-workspace.service.js';
import { JudgingService } from './judging.service.js';

/** Hackathons: teams (parents approve), team repositories on Forgejo, judging. */
@Module({
  imports: [ChatModule, PushModule],
  controllers: [
    EventsController,
    ParentEventsController,
    TeamsController,
    MentorEventsController,
    EventsAdminController,
    GitProxyController,
  ],
  providers: [
    ForgejoService,
    GitWorkspaceService,
    EventsService,
    JudgingService,
    EventsAdminService,
  ],
  exports: [ForgejoService, EventsService],
})
export class EventsModule {}
