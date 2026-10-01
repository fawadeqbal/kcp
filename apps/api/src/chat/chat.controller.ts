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
  Query,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ReqContext, type RequestContext } from '../common/request-context.js';
import type { AppAbility } from '../permissions/ability.factory.js';
import type { AuthUser } from '../permissions/auth-user.js';
import { Can, CurrentAbility, CurrentUser } from '../permissions/permission.decorators.js';
import {
  ChatMessageDto,
  ChatMessagesDto,
  ChatMessagesQueryDto,
  ChatRoomDto,
  ChatReportCreatedDto,
  ReportChatDto,
  SendChatMessageDto,
} from './chat.dto.js';
import { ChatService } from './chat.service.js';
import {
  BlockedTermDto,
  CheckTextDto,
  CheckTextResultDto,
  CreateBlockedTermDto,
  ModerationActDto,
  ModerationQueueDto,
  ModerationQueueQueryDto,
  ModerationReportDto,
  StudentModerationDto,
} from './moderation.dto.js';
import { ModerationService } from './moderation.service.js';

/** Rooms for the caller's teams, classes and events: read, send, report. */
@ApiTags('rooms')
@Controller('rooms')
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get()
  @Can('read', 'Chat')
  @ApiOkResponse({ type: [ChatRoomDto] })
  rooms(@CurrentUser() user: AuthUser): Promise<ChatRoomDto[]> {
    return this.chat.myRooms(user);
  }

  @Get(':id/messages')
  @Can('read', 'Chat')
  @ApiOkResponse({ type: ChatMessagesDto })
  messages(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query() query: ChatMessagesQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ChatMessagesDto> {
    return this.chat.messages(user, id, query.before);
  }

  /** A ready-made phrase, or (13 and older, and adults) a text that passes the filter. */
  @Post(':id/messages')
  @Can('create', 'Chat')
  @ApiCreatedResponse({ type: ChatMessageDto })
  send(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: SendChatMessageDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ChatMessageDto> {
    return this.chat.send(user, id, dto);
  }

  @Post(':id/read')
  @Can('read', 'Chat')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async read(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.chat.markRead(user, id);
  }

  /** Tells the moderators about a message or a member. */
  @Post(':id/reports')
  @Can('create', 'Chat')
  @ApiCreatedResponse({ type: ChatReportCreatedDto })
  report(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ReportChatDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ChatReportCreatedDto> {
    return this.chat.report(user, id, dto);
  }
}

/** Parents read their children's rooms (never write in them). */
@ApiTags('rooms')
@Controller('children/:childId/rooms')
export class ParentChatController {
  constructor(private readonly chat: ChatService) {}

  @Get()
  @Can('read', 'Chat')
  @ApiOkResponse({ type: [ChatRoomDto] })
  rooms(
    @Param('childId', new ParseUUIDPipe()) childId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<ChatRoomDto[]> {
    return this.chat.childRooms(user, childId);
  }

  @Get(':roomId/messages')
  @Can('read', 'Chat')
  @ApiOkResponse({ type: ChatMessagesDto })
  messages(
    @Param('childId', new ParseUUIDPipe()) childId: string,
    @Param('roomId', new ParseUUIDPipe()) roomId: string,
    @Query() query: ChatMessagesQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ChatMessagesDto> {
    return this.chat.childMessages(user, childId, roomId, query.before);
  }
}

/** Moderators: the report queue, actions, any room for context, and the word list. */
@ApiTags('admin')
@Controller('admin')
export class ModerationAdminController {
  constructor(
    private readonly moderation: ModerationService,
    private readonly chat: ChatService,
  ) {}

  @Get('moderation/reports')
  @Can('read', 'Moderation', { onAll: true })
  @ApiOkResponse({ type: ModerationQueueDto })
  queue(@Query() query: ModerationQueueQueryDto): Promise<ModerationQueueDto> {
    return this.moderation.queue(query.status);
  }

  @Get('moderation/reports/:id')
  @Can('read', 'Moderation', { onAll: true })
  @ApiOkResponse({ type: ModerationReportDto })
  report(@Param('id', new ParseUUIDPipe()) id: string): Promise<ModerationReportDto> {
    return this.moderation.report(id);
  }

  /** Warn, mute, suspend, remove the message, or dismiss (kept in the audit log). */
  @Post('moderation/reports/:id/actions')
  @Can('update', 'Moderation', { onAll: true })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: ModerationReportDto })
  act(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ModerationActDto,
    @CurrentUser() user: AuthUser,
    @CurrentAbility() ability: AppAbility,
    @ReqContext() ctx: RequestContext,
  ): Promise<ModerationReportDto> {
    return this.moderation.act(user, ability, id, dto, ctx);
  }

  @Get('moderation/students/:id')
  @Can('read', 'Moderation', { onAll: true })
  @ApiOkResponse({ type: StudentModerationDto })
  student(@Param('id', new ParseUUIDPipe()) id: string): Promise<StudentModerationDto> {
    return this.moderation.forStudent(id);
  }

  @Post('moderation/students/:id/unmute')
  @Can('update', 'Moderation', { onAll: true })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async unmute(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<void> {
    await this.moderation.unmute(user, id, ctx);
  }

  @Get('rooms/:id/messages')
  @Can('read', 'Chat', { onAll: true })
  @ApiOkResponse({ type: ChatMessagesDto })
  room(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query() query: ChatMessagesQueryDto,
  ): Promise<ChatMessagesDto> {
    return this.chat.staffMessages(id, query.before);
  }

  @Get('blocked-terms')
  @Can('read', 'BlockedTerm', { onAll: true })
  @ApiOkResponse({ type: [BlockedTermDto] })
  terms(): Promise<BlockedTermDto[]> {
    return this.moderation.terms();
  }

  @Post('blocked-terms')
  @Can('create', 'BlockedTerm', { onAll: true })
  @ApiCreatedResponse({ type: BlockedTermDto })
  addTerm(
    @Body() dto: CreateBlockedTermDto,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<BlockedTermDto> {
    return this.moderation.addTerm(user, dto, ctx);
  }

  @Delete('blocked-terms/:id')
  @Can('delete', 'BlockedTerm', { onAll: true })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async removeTerm(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<void> {
    await this.moderation.removeTerm(user, id, ctx);
  }

  /** Tries a text against the filter (built-in lists and the staff's words). */
  @Post('blocked-terms/check')
  @Can('read', 'BlockedTerm', { onAll: true })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: CheckTextResultDto })
  async check(@Body() dto: CheckTextDto): Promise<CheckTextResultDto> {
    return { problem: await this.chat.check(dto.text) };
  }
}
