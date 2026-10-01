import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { UsersModule } from '../users/users.module.js';
import {
  ChatController,
  ModerationAdminController,
  ParentChatController,
} from './chat.controller.js';
import { ChatGateway } from './chat.gateway.js';
import { ChatService } from './chat.service.js';
import { ModerationService } from './moderation.service.js';

/** Team, class and event rooms (live over Socket.IO), reports and moderation. */
@Module({
  imports: [AuthModule, UsersModule],
  controllers: [ChatController, ParentChatController, ModerationAdminController],
  providers: [ChatGateway, ChatService, ModerationService],
  exports: [ChatService],
})
export class ChatModule {}
