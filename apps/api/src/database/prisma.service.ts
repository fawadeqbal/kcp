import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { createPgAdapter, PrismaClient } from '@kcp/database';
import { AppConfigService } from '../config/app-config.service.js';

/**
 * The API's single door to PostgreSQL. Connects lazily on the first query, so the
 * app (and the OpenAPI export) can start without a database.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(config: AppConfigService) {
    super({
      adapter: createPgAdapter(config.get('DATABASE_URL')),
      log: config.get('NODE_ENV') === 'development' ? ['warn', 'error'] : ['error'],
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
