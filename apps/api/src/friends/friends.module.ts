import { Module } from '@nestjs/common';
import { PushModule } from '../push/push.module.js';
import {
  FriendsAdminController,
  FriendsController,
  ParentFriendsController,
} from './friends.controller.js';
import { FriendsService } from './friends.service.js';

/** Friends between students, approved by both children's parents. */
@Module({
  imports: [PushModule],
  controllers: [FriendsController, ParentFriendsController, FriendsAdminController],
  providers: [FriendsService],
  exports: [FriendsService],
})
export class FriendsModule {}
