import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { AppConfigService } from '../config/app-config.service.js';
import { Public } from '../permissions/permission.decorators.js';
import { LivenessResponseDto } from './dto/liveness-response.dto.js';
import {
  DatabaseHealthIndicator,
  RedisHealthIndicator,
  StorageHealthIndicator,
} from './health.indicators.js';

@ApiTags('health')
@Controller('health')
@Public()
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly database: DatabaseHealthIndicator,
    private readonly redis: RedisHealthIndicator,
    private readonly storage: StorageHealthIndicator,
    private readonly config: AppConfigService,
  ) {}

  /** Liveness: is the process up? Used by the container platform to restart a stuck app. */
  @Get('live')
  @ApiOkResponse({ type: LivenessResponseDto })
  live(): LivenessResponseDto {
    return {
      status: 'ok',
      version: this.config.get('APP_VERSION'),
      uptimeSeconds: Math.round(process.uptime()),
    };
  }

  /**
   * Readiness: can the app serve traffic? Checks PostgreSQL and Redis, which every
   * request relies on. File storage has its own check below, so a storage outage
   * only affects shipping and viewing projects, not logins and lessons.
   */
  @Get('ready')
  @HealthCheck()
  @ApiServiceUnavailableResponse({ description: 'A dependency is down' })
  ready() {
    return this.health.check([() => this.database.check(), () => this.redis.check()]);
  }

  /** File storage (R2): for uptime monitoring and after setting up a new environment. */
  @Get('storage')
  @HealthCheck()
  @ApiServiceUnavailableResponse({ description: 'File storage is unreachable' })
  storageCheck() {
    return this.health.check([() => this.storage.check()]);
  }
}
