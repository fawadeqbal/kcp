import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { byIp, RateLimit } from '../common/rate-limit/rate-limit.decorator.js';
import { ReqContext, type RequestContext } from '../common/request-context.js';
import type { AppAbility } from '../permissions/ability.factory.js';
import type { AuthUser } from '../permissions/auth-user.js';
import { LanguageQueryDto } from '../learning/dto/learning.dto.js';
import { Can, CurrentAbility, CurrentUser } from '../permissions/permission.decorators.js';
import { ChildPortfolioDto, PortfolioShareDto } from '../projects/dto/projects.dto.js';
import { ProjectsService } from '../projects/projects.service.js';
import { ChildrenService } from './children.service.js';
import {
  ChildConsentsDto,
  ChildDto,
  ChildRulesDto,
  ConsentRecordDto,
  CreateChildDto,
  DeleteChildDto,
  NicknameSuggestionsDto,
  PicturePasswordDto,
  ResetChildPasswordDto,
  UpdateChildDto,
} from './dto/children.dto.js';

/** A parent's children. Every route only ever touches the caller's own children. */
@ApiTags('children')
@Controller('children')
export class ChildrenController {
  constructor(
    private readonly children: ChildrenService,
    private readonly projects: ProjectsService,
  ) {}

  /** The signed-in parent's children. */
  @Get()
  @Can('read', 'Child')
  @ApiOkResponse({ type: [ChildDto] })
  list(@CurrentUser() parent: AuthUser): Promise<ChildDto[]> {
    return this.children.list(parent);
  }

  /** What the "add a child" form may offer: birth years and avatars. */
  @Get('rules')
  @Can('create', 'Child')
  @ApiOkResponse({ type: ChildRulesDto })
  rules(@CurrentUser() parent: AuthUser): Promise<ChildRulesDto> {
    return this.children.rules(parent);
  }

  /** Safe nickname ideas, e.g. "SwiftFalcon27". */
  @Get('nickname-suggestions')
  @Can('create', 'Child')
  @ApiOkResponse({ type: NicknameSuggestionsDto })
  suggestions(): NicknameSuggestionsDto {
    return { suggestions: this.children.nicknameSuggestions() };
  }

  /** Creates a child account and records the parent's consent. */
  @Post()
  @Can('create', 'Child')
  @ApiCreatedResponse({ type: ChildDto })
  create(
    @Body() dto: CreateChildDto,
    @CurrentUser() parent: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<ChildDto> {
    return this.children.create(dto, parent, ctx);
  }

  @Get(':id')
  @Can('read', 'Child')
  @ApiOkResponse({ type: ChildDto })
  get(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() parent: AuthUser,
    @CurrentAbility() ability: AppAbility,
  ): Promise<ChildDto> {
    return this.children.get(id, parent, ability);
  }

  /** Change nickname, avatar, language or location. */
  @Patch(':id')
  @Can('update', 'Child')
  @ApiOkResponse({ type: ChildDto })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateChildDto,
    @CurrentUser() parent: AuthUser,
    @CurrentAbility() ability: AppAbility,
    @ReqContext() ctx: RequestContext,
  ): Promise<ChildDto> {
    return this.children.update(id, dto, parent, ability, ctx);
  }

  /** Switch public leaderboards and the public portfolio on or off. */
  @Put(':id/consents')
  @Can('update', 'Child')
  @ApiOkResponse({ type: ChildDto })
  setConsents(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ChildConsentsDto,
    @CurrentUser() parent: AuthUser,
    @CurrentAbility() ability: AppAbility,
    @ReqContext() ctx: RequestContext,
  ): Promise<ChildDto> {
    return this.children.setConsents(id, dto, parent, ability, ctx);
  }

  /** Every consent the parent has given or withdrawn for this child. */
  @Get(':id/consents')
  @Can('read', 'Child')
  @ApiOkResponse({ type: [ConsentRecordDto] })
  consents(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() parent: AuthUser,
    @CurrentAbility() ability: AppAbility,
  ): Promise<ConsentRecordDto[]> {
    return this.children.consentHistory(id, parent, ability);
  }

  /** The child's shipped projects, and the share link if the parent made one. */
  @Get(':id/portfolio')
  @Can('read', 'Child')
  @ApiOkResponse({ type: ChildPortfolioDto })
  async portfolio(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query() query: LanguageQueryDto,
    @CurrentUser() parent: AuthUser,
    @CurrentAbility() ability: AppAbility,
  ): Promise<ChildPortfolioDto> {
    await this.children.assertParentOf(id, parent, ability, 'read');
    return this.projects.childPortfolio(id, query.lang ?? 'en');
  }

  /** A new share link for the portfolio (the old one stops working). Needs "Public projects". */
  @Post(':id/portfolio/share-link')
  @RateLimit({ name: 'share-link-ip', limit: 30, windowSeconds: 60 * 60, key: byIp })
  @Can('update', 'Child')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: PortfolioShareDto })
  async createShareLink(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() parent: AuthUser,
    @CurrentAbility() ability: AppAbility,
    @ReqContext() ctx: RequestContext,
  ): Promise<PortfolioShareDto> {
    await this.children.assertParentOf(id, parent, ability, 'update');
    return this.projects.createShareLink(id, parent, ctx);
  }

  /** Stops the share link working. */
  @Delete(':id/portfolio/share-link')
  @RateLimit({ name: 'share-link-ip', limit: 30, windowSeconds: 60 * 60, key: byIp })
  @Can('update', 'Child')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async removeShareLink(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() parent: AuthUser,
    @CurrentAbility() ability: AppAbility,
    @ReqContext() ctx: RequestContext,
  ): Promise<void> {
    await this.children.assertParentOf(id, parent, ability, 'update');
    await this.projects.removeShareLink(id, parent, ctx);
  }

  /** Sets a new password for the child and signs them out everywhere. */
  @Post(':id/password')
  @Can('update', 'Child')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  resetPassword(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ResetChildPasswordDto,
    @CurrentUser() parent: AuthUser,
    @CurrentAbility() ability: AppAbility,
    @ReqContext() ctx: RequestContext,
  ): Promise<void> {
    return this.children.resetPassword(id, dto.password, parent, ability, ctx);
  }

  /** Sets (or, with null, removes) the child's picture password. */
  @Put(':id/picture-password')
  @Can('update', 'Child')
  @ApiOkResponse({ type: ChildDto })
  setPicturePassword(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: PicturePasswordDto,
    @CurrentUser() parent: AuthUser,
    @CurrentAbility() ability: AppAbility,
    @ReqContext() ctx: RequestContext,
  ): Promise<ChildDto> {
    return this.children.setPicturePassword(id, dto.pictures ?? null, parent, ability, ctx);
  }

  /** Deletes the child's account and personal data. Confirm with the nickname. */
  @Delete(':id')
  @Can('delete', 'Child')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: DeleteChildDto,
    @CurrentUser() parent: AuthUser,
    @CurrentAbility() ability: AppAbility,
    @ReqContext() ctx: RequestContext,
  ): Promise<void> {
    return this.children.delete(id, dto.nickname, parent, ability, ctx);
  }
}
