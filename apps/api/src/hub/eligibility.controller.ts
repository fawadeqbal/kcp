import { subject } from '@casl/ability';
import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ReqContext, type RequestContext } from '../common/request-context.js';
import type { AppAbility } from '../permissions/ability.factory.js';
import type { AuthUser } from '../permissions/auth-user.js';
import { Can, CurrentAbility, CurrentUser, Public } from '../permissions/permission.decorators.js';
import { clientAgreement, parentAgreement } from './contracts.js';
import {
  ContractDto,
  ContractQueryDto,
  HubCandidateDto,
  HubConsentRequestDto,
  HubEligibilityDto,
  HubFamilyChildDto,
  HubRulesDto,
  HubStudentAdminDto,
  HubStudentListQueryDto,
  PauseHubDto,
  SignOffDto,
  UpdateHubRulesDto,
} from './dto/eligibility.dto.js';
import { HubEligibilityService } from './eligibility.service.js';

/** The hub's agreements, for anyone to read before agreeing. */
@ApiTags('hub')
@Controller('hub/contracts')
export class HubContractsController {
  @Get(':kind')
  @Public()
  @ApiOkResponse({ type: ContractDto })
  contract(@Param('kind') kind: string, @Query() query: ContractQueryDto): ContractDto {
    if (kind === 'parent') return parentAgreement(query.language ?? 'en');
    if (kind === 'client') return clientAgreement();
    throw new NotFoundException({ error: 'CONTRACT_NOT_FOUND', message: 'No such agreement.' });
  }
}

/** A student's steps to paid hub work, and their parents' consent. */
@ApiTags('hub')
@Controller()
export class HubEligibilityController {
  constructor(private readonly eligibility: HubEligibilityService) {}

  @Get('hub/me')
  @Can('read', 'HubEligibility')
  @ApiOkResponse({ type: HubEligibilityDto })
  me(@CurrentUser() user: AuthUser): Promise<HubEligibilityDto> {
    return this.eligibility.forStudent(user);
  }

  /** Each of the parent's children and their way into the hub. */
  @Get('hub/family')
  @Can('update', 'HubEligibility')
  @ApiOkResponse({ type: [HubFamilyChildDto] })
  family(@CurrentUser() user: AuthUser): Promise<HubFamilyChildDto[]> {
    return this.eligibility.family(user);
  }

  @Get('children/:childId/hub')
  @Can('update', 'HubEligibility')
  @ApiOkResponse({ type: HubFamilyChildDto })
  child(
    @Param('childId', new ParseUUIDPipe()) childId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<HubFamilyChildDto> {
    return this.eligibility.forChild(user, childId);
  }

  /** The parent agrees to the parent agreement (paid work and earnings). */
  @Post('children/:childId/hub/consent')
  @Can('update', 'HubEligibility')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: HubFamilyChildDto })
  consent(
    @Param('childId', new ParseUUIDPipe()) childId: string,
    @Body() dto: HubConsentRequestDto,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<HubFamilyChildDto> {
    return this.eligibility.consent(user, childId, dto.version, ctx);
  }

  /** The parent takes the consent back: the child's hub work stops. */
  @Delete('children/:childId/hub/consent')
  @Can('update', 'HubEligibility')
  @ApiOkResponse({ type: HubFamilyChildDto })
  withdraw(
    @Param('childId', new ParseUUIDPipe()) childId: string,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<HubFamilyChildDto> {
    return this.eligibility.withdraw(user, childId, ctx);
  }

  /** Students who passed the readiness check, for lead developers to sign off. */
  @Get('mentor/hub/candidates')
  @Can('update', 'HubEligibility', { onAll: true })
  @ApiOkResponse({ type: [HubCandidateDto] })
  candidates(@CurrentUser() user: AuthUser): Promise<HubCandidateDto[]> {
    return this.eligibility.candidates(user);
  }

  @Post('mentor/hub/candidates/:studentId/sign-off')
  @Can('update', 'HubEligibility', { onAll: true })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async signOff(
    @Param('studentId', new ParseUUIDPipe()) studentId: string,
    @Body() dto: SignOffDto,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<void> {
    await this.eligibility.signOff(user, studentId, dto.note, ctx);
  }

  // ── Staff ────────────────────────────────────────────────────────────────

  @Get('admin/hub/students')
  @Can('read', 'Hub')
  @ApiOkResponse({ type: [HubStudentAdminDto] })
  students(@Query() query: HubStudentListQueryDto): Promise<HubStudentAdminDto[]> {
    return this.eligibility.adminList(query.status);
  }

  @Post('admin/hub/students/:studentId/pause')
  @Can('update', 'Hub')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async pause(
    @Param('studentId', new ParseUUIDPipe()) studentId: string,
    @Body() dto: PauseHubDto,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<void> {
    await this.eligibility.pause(user, studentId, dto.reason, ctx);
  }

  @Post('admin/hub/students/:studentId/resume')
  @Can('update', 'Hub')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async resume(
    @Param('studentId', new ParseUUIDPipe()) studentId: string,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<void> {
    await this.eligibility.resume(user, studentId, ctx);
  }

  @Get('admin/hub/countries')
  @Can('read', 'Hub')
  @ApiOkResponse({ type: [HubRulesDto] })
  countries(): Promise<HubRulesDto[]> {
    return this.eligibility.countries();
  }

  /** A country's hub rules: open or closed, ages, hours, the split, holds. */
  @Put('admin/hub/countries/:code')
  // The field "hubRules" is checked in the service.
  @Can('update', 'Country')
  @ApiOkResponse({ type: HubRulesDto })
  updateRules(
    @Param('code') code: string,
    @Body() dto: UpdateHubRulesDto,
    @CurrentUser() user: AuthUser,
    @CurrentAbility() ability: AppAbility,
    @ReqContext() ctx: RequestContext,
  ): Promise<HubRulesDto> {
    const upper = code.toUpperCase();
    if (!ability.can('update', subject('Country', { code: upper }), 'hubRules')) {
      throw new ForbiddenException({
        error: 'FORBIDDEN',
        message: 'You can’t change a country’s hub rules.',
      });
    }
    return this.eligibility.updateRules(user, upper, dto, ctx);
  }
}
