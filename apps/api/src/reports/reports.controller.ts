import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { LanguageQueryDto } from '../learning/dto/learning.dto.js';
import type { AuthUser } from '../permissions/auth-user.js';
import { Authenticated, Can, CurrentUser } from '../permissions/permission.decorators.js';
import { ParentReportsDto, SkillMapDto } from './reports.dto.js';
import { ReportsService } from './reports.service.js';

@ApiTags('reports')
@Controller()
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  /** The student is working (every minute while a lesson or practice is open): counts a minute. */
  @Post('activity/heartbeat')
  @Authenticated()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async heartbeat(@CurrentUser() user: AuthUser): Promise<void> {
    await this.reports.heartbeat(user);
  }

  /** The student's skill map: what the lessons they finished taught them. */
  @Get('skills')
  @Authenticated()
  @ApiOkResponse({ type: SkillMapDto })
  skills(@Query() query: LanguageQueryDto, @CurrentUser() user: AuthUser): Promise<SkillMapDto> {
    return this.reports.studentSkillMap(user, query.lang ?? 'en');
  }

  /** A child's skill map, for their parent. */
  @Get('children/:id/skills')
  @Can('read', 'Child')
  @ApiOkResponse({ type: SkillMapDto })
  childSkills(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query() query: LanguageQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<SkillMapDto> {
    return this.reports.childSkillMap(user, id, query.lang ?? 'en');
  }

  /** The parent's weekly reports (the last eight), newest first. */
  @Get('reports')
  @Authenticated()
  @ApiOkResponse({ type: ParentReportsDto })
  async list(
    @Query() query: LanguageQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ParentReportsDto> {
    return { reports: await this.reports.forParent(user, query.lang ?? 'en') };
  }
}
