import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { byIp, RateLimit } from '../common/rate-limit/rate-limit.decorator.js';
import { LanguageQueryDto } from '../learning/dto/learning.dto.js';
import { Public } from '../permissions/permission.decorators.js';
import { SharedPortfolioDto } from './dto/projects.dto.js';
import { ProjectsService } from './projects.service.js';

const MINUTE = 60;

/**
 * A portfolio opened with the link a parent shared. No account needed; the link is
 * the key, and it only works while the parent keeps "Public projects" on (and the
 * child has premium). The page showing it lives on the user-content domain
 * (apps/sandbox, /portfolio/#<token>).
 */
@ApiTags('projects')
@Controller('shared')
export class SharedPortfolioController {
  constructor(private readonly projects: ProjectsService) {}

  @Get('portfolios/:token')
  @Public()
  @RateLimit({ name: 'shared-portfolio-ip', limit: 60, windowSeconds: MINUTE, key: byIp })
  // Headers for the page on the user-content domain (any origin, never cached): app.setup.ts.
  @ApiOkResponse({ type: SharedPortfolioDto })
  shared(
    @Param('token') token: string,
    @Query() query: LanguageQueryDto,
  ): Promise<SharedPortfolioDto> {
    return this.projects.shared(/^[\w-]{16,64}$/.test(token) ? token : '-', query.lang ?? 'en');
  }
}
