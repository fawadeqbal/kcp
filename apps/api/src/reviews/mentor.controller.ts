import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ReqContext, type RequestContext } from '../common/request-context.js';
import type { AuthUser } from '../permissions/auth-user.js';
import { Can, CurrentUser } from '../permissions/permission.decorators.js';
import {
  AddCommentDto,
  AddNoteDto,
  CommentParams,
  DecisionDto,
  MentorQueueDto,
  MentorReviewDto,
  MentorStatusDto,
  QueueQueryDto,
  ReviewIdParam,
  SignConductDto,
  StudentIdParam,
} from './reviews.dto.js';
import { ReviewsService } from './reviews.service.js';

/** The mentor console: the review queue, reviewing, and notes about students. */
@ApiTags('mentor')
@Controller('mentor')
export class MentorController {
  constructor(private readonly reviews: ReviewsService) {}

  /** Whether the mentor may review yet (background check, code of conduct). */
  @Get('status')
  @Can('read', 'MentorProfile')
  @ApiOkResponse({ type: MentorStatusDto })
  status(@CurrentUser() user: AuthUser): Promise<MentorStatusDto> {
    return this.reviews.status(user);
  }

  @Post('code-of-conduct')
  @Can('update', 'MentorProfile')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async signConduct(
    @Body() dto: SignConductDto,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<void> {
    await this.reviews.signConduct(user, dto.version, ctx);
  }

  @Get('queue')
  @Can('update', 'Review', { onAll: true })
  @ApiOkResponse({ type: MentorQueueDto })
  queue(@Query() query: QueueQueryDto, @CurrentUser() user: AuthUser): Promise<MentorQueueDto> {
    return this.reviews.queue(user, query.languages ?? 'mine');
  }

  @Get('reviews/:id')
  @Can('update', 'Review', { onAll: true })
  @ApiOkResponse({ type: MentorReviewDto })
  review(@Param() p: ReviewIdParam, @CurrentUser() user: AuthUser): Promise<MentorReviewDto> {
    return this.reviews.forMentor(p.id, user);
  }

  @Post('reviews/:id/claim')
  @Can('update', 'Review', { onAll: true })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async claim(
    @Param() p: ReviewIdParam,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<void> {
    await this.reviews.claim(p.id, user, ctx);
  }

  @Post('reviews/:id/release')
  @Can('update', 'Review', { onAll: true })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async release(
    @Param() p: ReviewIdParam,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<void> {
    await this.reviews.release(p.id, user, ctx);
  }

  @Post('reviews/:id/comments')
  @Can('update', 'Review', { onAll: true })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async comment(
    @Param() p: ReviewIdParam,
    @Body() dto: AddCommentDto,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.reviews.addComment(p.id, dto, user);
  }

  @Delete('reviews/:id/comments/:commentId')
  @Can('update', 'Review', { onAll: true })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async uncomment(@Param() p: CommentParams, @CurrentUser() user: AuthUser): Promise<void> {
    await this.reviews.deleteComment(p.id, p.commentId, user);
  }

  @Post('reviews/:id/decision')
  @Can('update', 'Review', { onAll: true })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async decide(
    @Param() p: ReviewIdParam,
    @Body() dto: DecisionDto,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<void> {
    await this.reviews.decide(p.id, dto, user, ctx);
  }

  @Post('students/:id/notes')
  @Can('create', 'MentorNote', { onAll: true })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async note(
    @Param() p: StudentIdParam,
    @Body() dto: AddNoteDto,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.reviews.addNote(p.id, dto.body, user);
  }
}
