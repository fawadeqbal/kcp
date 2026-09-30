import { Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { byIp, RateLimit } from '../common/rate-limit/rate-limit.decorator.js';
import { Can } from '../permissions/permission.decorators.js';
import { MetricsDto, MetricsQueryDto } from './dto/metrics.dto.js';
import { MetricsService } from './metrics.service.js';

@ApiTags('admin')
@Controller('admin/metrics')
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  /** The five numbers per day and country (today's are worked out fresh). */
  @Get()
  @Can('read', 'Metrics')
  @ApiOkResponse({ type: MetricsDto })
  read(@Query() query: MetricsQueryDto): Promise<MetricsDto> {
    return this.metrics.read(query.days);
  }

  /** Works out every day shown again (e.g. after the job was down). */
  @Post('refresh')
  // Works out up to 90 days again: not something to repeat quickly.
  @RateLimit({ name: 'metrics-refresh-ip', limit: 6, windowSeconds: 60, key: byIp })
  @Can('read', 'Metrics')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: MetricsDto })
  refresh(@Query() query: MetricsQueryDto): Promise<MetricsDto> {
    return this.metrics.read(query.days, true);
  }
}
