import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch } from '@nestjs/common';
import { ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ReqContext, type RequestContext } from '../common/request-context.js';
import type { AppAbility } from '../permissions/ability.factory.js';
import type { AuthUser } from '../permissions/auth-user.js';
import { Can, CurrentAbility, CurrentUser } from '../permissions/permission.decorators.js';
import {
  CountryAdminDto,
  CountryCodeParam,
  FeatureFlagListDto,
  FlagKeyParam,
  LanguageCodeParam,
  LanguageListDto,
  UpdateCountryDto,
  UpdateFeatureFlagDto,
  UpdateLanguageDto,
} from './settings-admin.dto.js';
import { SettingsAdminService } from './settings-admin.service.js';

/**
 * Admin → Countries and languages (prices are under /admin/prices) and Feature flags.
 */
@ApiTags('admin')
@Controller('admin')
export class SettingsAdminController {
  constructor(private readonly settings: SettingsAdminService) {}

  /** Switches a country on or off, or changes its currency (while it's off). */
  @Patch('countries/:code')
  // Field by field in the service (admins may change isActive and currency only).
  @Can('update', 'Country')
  @ApiOkResponse({ type: CountryAdminDto })
  updateCountry(
    @Param() params: CountryCodeParam,
    @Body() dto: UpdateCountryDto,
    @CurrentUser() staff: AuthUser,
    @CurrentAbility() ability: AppAbility,
    @ReqContext() ctx: RequestContext,
  ): Promise<CountryAdminDto> {
    return this.settings.updateCountry(params.code, dto, staff, ability, ctx);
  }

  @Get('languages')
  @Can('update', 'Language')
  @ApiOkResponse({ type: LanguageListDto })
  languages(): Promise<LanguageListDto> {
    return this.settings.languages();
  }

  @Patch('languages/:code')
  @Can('update', 'Language')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async updateLanguage(
    @Param() params: LanguageCodeParam,
    @Body() dto: UpdateLanguageDto,
    @CurrentUser() staff: AuthUser,
    @CurrentAbility() ability: AppAbility,
    @ReqContext() ctx: RequestContext,
  ): Promise<void> {
    await this.settings.updateLanguage(params.code, dto.isActive, staff, ability, ctx);
  }

  @Get('feature-flags')
  @Can('read', 'FeatureFlag', { onAll: true })
  @ApiOkResponse({ type: FeatureFlagListDto })
  featureFlags(): Promise<FeatureFlagListDto> {
    return this.settings.featureFlags();
  }

  /** Switches a flag on or off, for every country or some; with a reason. */
  @Patch('feature-flags/:key')
  @Can('update', 'FeatureFlag', { onAll: true })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async updateFeatureFlag(
    @Param() params: FlagKeyParam,
    @Body() dto: UpdateFeatureFlagDto,
    @CurrentUser() staff: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<void> {
    await this.settings.updateFeatureFlag(params.key, dto, staff, ctx);
  }
}
