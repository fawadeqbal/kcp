import { Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { LanguageQueryDto } from '../learning/dto/learning.dto.js';
import type { AppAbility } from '../permissions/ability.factory.js';
import type { AuthUser } from '../permissions/auth-user.js';
import { Can, CurrentAbility, CurrentUser } from '../permissions/permission.decorators.js';
import { ReviewIdParam, StudentReviewDto } from './reviews.dto.js';
import { ReviewsService } from './reviews.service.js';

/** A mentor's review, for the student and their parents. */
@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get(':id')
  @Can('read', 'Review')
  @ApiOkResponse({ type: StudentReviewDto })
  get(
    @Param() p: ReviewIdParam,
    @Query() query: LanguageQueryDto,
    @CurrentUser() user: AuthUser,
    @CurrentAbility() ability: AppAbility,
  ): Promise<StudentReviewDto> {
    return this.reviews.forFamily(p.id, user, ability, query.lang ?? 'en');
  }

  /** The student opened their result. */
  @Post(':id/seen')
  @Can('read', 'Review')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async seen(@Param() p: ReviewIdParam, @CurrentUser() user: AuthUser): Promise<void> {
    await this.reviews.markSeen(p.id, user);
  }
}
