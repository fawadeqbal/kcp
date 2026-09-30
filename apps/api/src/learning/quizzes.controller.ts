import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../permissions/auth-user.js';
import { Can, CurrentUser } from '../permissions/permission.decorators.js';
import { ContentIdPipe } from './content.js';
import { LanguageQueryDto } from './dto/learning.dto.js';
import { PracticeDto, QuizAnswerDto, QuizResultDto } from './dto/quiz.dto.js';
import { QuizService } from './quiz.service.js';

/**
 * Quizzes and the daily practice: short questions that work on a phone. Students
 * answer; the server grades (the answers never reach the apps).
 */
@ApiTags('learning')
@Controller('learning')
export class QuizzesController {
  constructor(private readonly quizzes: QuizService) {}

  /** Grades an answer. The first right answer earns the quiz's XP. */
  @Post('quizzes/:id/answers')
  @Can('create', 'Submission')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: QuizResultDto })
  answer(
    @Param('id', new ContentIdPipe()) id: string,
    @Body() dto: QuizAnswerDto,
    @Query() query: LanguageQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<QuizResultDto> {
    return this.quizzes.answer(id, dto, user, query.lang ?? 'en');
  }

  /** Today's practice: a few quizzes from the lessons the student is on. */
  @Get('practice')
  @Can('create', 'Submission')
  @ApiOkResponse({ type: PracticeDto })
  practice(@Query() query: LanguageQueryDto, @CurrentUser() user: AuthUser): Promise<PracticeDto> {
    return this.quizzes.practice(user, query.lang ?? 'en');
  }
}
