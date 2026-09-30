import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { byIpNetwork, RateLimit } from '../common/rate-limit/rate-limit.decorator.js';
import { Can, Public } from '../permissions/permission.decorators.js';
import { AppCrashesService } from './app-crashes.service.js';
import { AppCrashListDto, AppCrashQueryDto, ReportCrashDto } from './dto/app-crash.dto.js';

const HOUR = 60 * 60;

@ApiTags('app')
@Controller()
export class AppCrashesController {
  constructor(private readonly crashes: AppCrashesService) {}

  /**
   * The mobile app reports a crash (no sign-in needed: it may crash before anyone
   * signs in). Nothing in the report names the account or the phone.
   */
  @Post('app/crashes')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @RateLimit({ name: 'app-crash-ip', limit: 20, windowSeconds: HOUR, key: byIpNetwork })
  @ApiNoContentResponse()
  async report(@Body() dto: ReportCrashDto): Promise<void> {
    await this.crashes.report(dto);
  }

  /** Crash reports, newest first (staff). */
  @Get('admin/app-crashes')
  @Can('read', 'AppCrash', { onAll: true })
  @ApiOkResponse({ type: AppCrashListDto })
  list(@Query() query: AppCrashQueryDto): Promise<AppCrashListDto> {
    return this.crashes.list(query);
  }
}
