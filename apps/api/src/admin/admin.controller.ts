import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { AppAbility } from '../permissions/ability.factory.js';
import { Can, CurrentAbility } from '../permissions/permission.decorators.js';
import { AdminService } from './admin.service.js';
import {
  AdminConsentListDto,
  AuditListDto,
  AuditQueryDto,
  ConsentQueryDto,
  FamilyDto,
  OverviewDto,
  RoleDto,
} from './dto/admin.dto.js';

/** Data for the admin panel. Staff roles only, through their permission rules. */
@ApiTags('admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  /** Headline numbers and the latest activity. */
  @Get('overview')
  @Can('read', 'User', { onAll: true })
  @ApiOkResponse({ type: OverviewDto })
  overview(@CurrentAbility() ability: AppAbility): Promise<OverviewDto> {
    return this.admin.overview(ability.can('read', 'AuditLog'));
  }

  /** All consent records: who agreed to what, for which child, and when. */
  @Get('consents')
  @Can('read', 'ConsentRecord', { onAll: true })
  @ApiOkResponse({ type: AdminConsentListDto })
  consents(@Query() query: ConsentQueryDto): Promise<AdminConsentListDto> {
    return this.admin.consents(query);
  }

  /** The audit log: who changed what, and when. */
  @Get('audit-logs')
  @Can('read', 'AuditLog', { onAll: true })
  @ApiOkResponse({ type: AuditListDto })
  auditLogs(@Query() query: AuditQueryDto): Promise<AuditListDto> {
    return this.admin.auditLogs(query);
  }

  @Get('roles')
  @Can('read', 'User', { onAll: true })
  @ApiOkResponse({ type: [RoleDto] })
  roles(): Promise<RoleDto[]> {
    return this.admin.roles();
  }

  /** Parents and children linked to an account. */
  @Get('users/:id/family')
  @Can('read', 'User', { onAll: true })
  @ApiOkResponse({ type: FamilyDto })
  family(@Param('id', new ParseUUIDPipe()) id: string): Promise<FamilyDto> {
    return this.admin.family(id);
  }
}
