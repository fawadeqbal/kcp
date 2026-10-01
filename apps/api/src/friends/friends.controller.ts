import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { byIp, RateLimit } from '../common/rate-limit/rate-limit.decorator.js';
import { ReqContext, type RequestContext } from '../common/request-context.js';
import type { AuthUser } from '../permissions/auth-user.js';
import { Can, CurrentUser } from '../permissions/permission.decorators.js';
import {
  EndFriendshipDto,
  FriendBoardDto,
  FriendDecisionDto,
  FriendDto,
  FriendsDto,
  ParentFriendDecisionResultDto,
  ParentFriendRequestDto,
  SendFriendRequestDto,
  StaffFriendDto,
  StudentFriendRequestDto,
} from './friends.dto.js';
import { FriendsService } from './friends.service.js';

const MINUTE = 60;

/** Students: their friend code, friends, requests and the friends board. */
@ApiTags('friends')
@Controller('friends')
export class FriendsController {
  constructor(private readonly friends: FriendsService) {}

  @Get()
  @Can('read', 'Friendship')
  @ApiOkResponse({ type: FriendsDto })
  list(@CurrentUser() user: AuthUser): Promise<FriendsDto> {
    return this.friends.forStudent(user);
  }

  /** Sends a request with a friend's code: a parent of each child must approve. */
  @Post('requests')
  @Can('create', 'Friendship')
  @RateLimit({ name: 'friend-request-ip', limit: 30, windowSeconds: 15 * MINUTE, key: byIp })
  @ApiOkResponse({ type: StudentFriendRequestDto })
  @HttpCode(HttpStatus.OK)
  send(
    @Body() dto: SendFriendRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<StudentFriendRequestDto> {
    return this.friends.send(user, dto.code);
  }

  /** Takes back a request the parents haven't answered yet. */
  @Delete('requests/:id')
  @Can('create', 'Friendship')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async cancel(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.friends.cancel(user, id);
  }

  /** This week's XP of the student and their friends. */
  @Get('board')
  @Can('read', 'Friendship')
  @ApiOkResponse({ type: FriendBoardDto })
  board(@CurrentUser() user: AuthUser): Promise<FriendBoardDto> {
    return this.friends.board(user);
  }

  @Delete(':userId')
  @Can('delete', 'Friendship')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async unfriend(
    @Param('userId', new ParseUUIDPipe()) friendId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.friends.unfriend(user, friendId);
  }
}

/** Parents: approve or decline their children's friend requests, and end friendships. */
@ApiTags('friends')
@Controller()
export class ParentFriendsController {
  constructor(private readonly friends: FriendsService) {}

  @Get('friend-requests')
  @Can('update', 'Friendship')
  @ApiOkResponse({ type: [ParentFriendRequestDto] })
  requests(@CurrentUser() user: AuthUser): Promise<ParentFriendRequestDto[]> {
    return this.friends.forParent(user);
  }

  @Post('friend-requests/:id/decision')
  @Can('update', 'Friendship')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: ParentFriendDecisionResultDto })
  decide(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: FriendDecisionDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ParentFriendDecisionResultDto> {
    return this.friends.decide(user, id, dto.approve);
  }

  @Get('children/:id/friends')
  @Can('update', 'Friendship')
  @ApiOkResponse({ type: [FriendDto] })
  childFriends(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<FriendDto[]> {
    return this.friends.childFriends(user, id);
  }

  @Delete('children/:id/friends/:friendId')
  @Can('update', 'Friendship')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async endChildFriendship(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('friendId', new ParseUUIDPipe()) friendId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.friends.endChildFriendship(user, id, friendId);
  }
}

/** Staff: a student's friends, and ending a reported friendship (with a reason). */
@ApiTags('admin')
@Controller('admin')
export class FriendsAdminController {
  constructor(private readonly friends: FriendsService) {}

  @Get('students/:id/friends')
  @Can('read', 'Friendship', { onAll: true })
  @ApiOkResponse({ type: [StaffFriendDto] })
  list(@Param('id', new ParseUUIDPipe()) id: string): Promise<StaffFriendDto[]> {
    return this.friends.forStaff(id);
  }

  @Post('friendships/:id/end')
  @Can('delete', 'Friendship', { onAll: true })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async end(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: EndFriendshipDto,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<void> {
    await this.friends.endByStaff(user, id, dto.reason, ctx);
  }
}
