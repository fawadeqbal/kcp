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
import { ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ContentIdPipe } from '../learning/content.js';
import { LanguageQueryDto } from '../learning/dto/learning.dto.js';
import type { AuthUser } from '../permissions/auth-user.js';
import { Can, CurrentUser } from '../permissions/permission.decorators.js';
import {
  PortfolioDto,
  ProjectDto,
  SaveProjectDraftDto,
  ShipProjectDto,
  ShipResultDto,
} from './dto/projects.dto.js';
import { ProjectsService } from './projects.service.js';

/** A student's module projects and their portfolio — only ever their own. */
@ApiTags('projects')
@Controller()
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  /** A project brief with the student's saved code and whether it has shipped. */
  @Get('projects/:id')
  @Can('read', 'Project')
  @ApiOkResponse({ type: ProjectDto })
  get(
    @Param('id', ContentIdPipe) id: string,
    @Query() query: LanguageQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ProjectDto> {
    return this.projects.get(id, user, query.lang ?? 'en');
  }

  /** Autosave while the student types. */
  @Put('projects/:id/draft')
  @Can('create', 'Project')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async saveDraft(
    @Param('id', ContentIdPipe) id: string,
    @Body() dto: SaveProjectDraftDto,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.projects.saveDraft(id, dto.code, user);
  }

  /** Ships the project to the portfolio when every requirement passed. */
  @Post('projects/:id/ship')
  @Can('create', 'Project')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: ShipResultDto })
  ship(
    @Param('id', ContentIdPipe) id: string,
    @Body() dto: ShipProjectDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ShipResultDto> {
    return this.projects.ship(id, dto.code, dto.results, user);
  }

  /** The student's shipped projects, with their files. */
  @Get('portfolio')
  @Can('read', 'Project')
  @ApiOkResponse({ type: PortfolioDto })
  portfolio(
    @Query() query: LanguageQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<PortfolioDto> {
    return this.projects.portfolio(user, query.lang ?? 'en');
  }
}
