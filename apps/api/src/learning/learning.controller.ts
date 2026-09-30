import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../permissions/auth-user.js';
import { Authenticated, Can, CurrentUser } from '../permissions/permission.decorators.js';
import {
  LanguageQueryDto,
  LearningOverviewDto,
  LessonDto,
  LessonProgressDto,
  SaveDraftDto,
  SubmissionResultDto,
  SubmitDto,
} from './dto/learning.dto.js';
import { ContentIdPipe } from './content.js';
import { LearningService } from './learning.service.js';

/**
 * Lessons, and each student's progress through them. Reading lessons is open to
 * every signed-in account (parents can see what their children learn); saving code
 * and progress is for students, and only ever their own.
 */
@ApiTags('learning')
@Controller('learning')
export class LearningController {
  constructor(private readonly learning: LearningService) {}

  /** Tracks, modules and lessons, with the student's status for each lesson. */
  @Get('tracks')
  @Authenticated()
  @ApiOkResponse({ type: LearningOverviewDto })
  overview(
    @Query() query: LanguageQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<LearningOverviewDto> {
    return this.learning.overview(user, query.lang ?? 'en');
  }

  /** A lesson with its explainer and challenges (and the student's saved code). */
  @Get('lessons/:id')
  @Authenticated()
  @ApiOkResponse({ type: LessonDto })
  lesson(
    @Param('id', new ContentIdPipe()) id: string,
    @Query() query: LanguageQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<LessonDto> {
    return this.learning.lesson(id, user, query.lang ?? 'en');
  }

  /** Marks the lesson as started (safe to call again). */
  @Post('lessons/:id/start')
  @Can('create', 'Submission')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: LessonProgressDto })
  start(
    @Param('id', new ContentIdPipe()) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<LessonProgressDto> {
    return this.learning.start(id, user);
  }

  /** Saves the student's code while they type. */
  @Put('challenges/:id/draft')
  @Can('create', 'Submission')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  saveDraft(
    @Param('id', new ContentIdPipe()) id: string,
    @Body() dto: SaveDraftDto,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    return this.learning.saveDraft(id, dto.code, user);
  }

  /** Stores one "Check my code": the code and what the checks found. */
  @Post('challenges/:id/submissions')
  @Can('create', 'Submission')
  @ApiCreatedResponse({ type: SubmissionResultDto })
  submit(
    @Param('id', new ContentIdPipe()) id: string,
    @Body() dto: SubmitDto,
    @CurrentUser() user: AuthUser,
  ): Promise<SubmissionResultDto> {
    return this.learning.submit(id, dto.code, dto.results, user);
  }
}
