import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ReqContext, type RequestContext } from '../common/request-context.js';
import type { AuthUser } from '../permissions/auth-user.js';
import { Can, CurrentUser } from '../permissions/permission.decorators.js';
import {
  CreateFeedbackDto,
  FeedbackCreatedDto,
  FeedbackItemDto,
  FeedbackListDto,
  FeedbackQueryDto,
  UpdateFeedbackDto,
} from './dto/feedback.dto.js';
import { FeedbackService } from './feedback.service.js';

@ApiTags('feedback')
@Controller()
export class FeedbackController {
  constructor(private readonly feedback: FeedbackService) {}

  /** The in-app feedback button (students and parents). */
  @Post('feedback')
  @Can('create', 'Feedback')
  @ApiCreatedResponse({ type: FeedbackCreatedDto })
  create(
    @Body() dto: CreateFeedbackDto,
    @CurrentUser() user: AuthUser,
  ): Promise<FeedbackCreatedDto> {
    return this.feedback.create(dto, user);
  }

  /** Everything sent with the feedback button, newest first. */
  @Get('admin/feedback')
  @Can('read', 'Feedback', { onAll: true })
  @ApiOkResponse({ type: FeedbackListDto })
  list(@Query() query: FeedbackQueryDto): Promise<FeedbackListDto> {
    return this.feedback.list(query);
  }

  /** Mark a message read or done. */
  @Patch('admin/feedback/:id')
  @Can('update', 'Feedback')
  @ApiOkResponse({ type: FeedbackItemDto })
  setStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateFeedbackDto,
    @CurrentUser() staff: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<FeedbackItemDto> {
    return this.feedback.setStatus(id, dto.status, staff, ctx);
  }
}
