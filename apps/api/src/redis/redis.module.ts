import { Global, Inject, Logger, Module, type OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';
import { AppConfigService } from '../config/app-config.service.js';
import { REDIS } from './redis.constants.js';

/**
 * Shared Redis connection (leaderboards, cache and — from Sprint 5 — BullMQ queues).
 * Connects lazily so the app can boot while Redis is still starting.
 */
@Global()
@Module({
  providers: [
    {
      provide: REDIS,
      inject: [AppConfigService],
      useFactory: (config: AppConfigService): Redis => {
        const logger = new Logger('Redis');
        const client = new Redis(config.get('REDIS_URL'), {
          lazyConnect: true,
          maxRetriesPerRequest: 2,
          connectionName: 'kcp-api',
        });
        client.on('error', (error: Error) => logger.warn(`Redis error: ${error.message}`));
        return client;
      },
    },
  ],
  exports: [REDIS],
})
export class RedisModule implements OnModuleDestroy {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async onModuleDestroy(): Promise<void> {
    if (this.redis.status === 'ready') {
      await this.redis.quit();
    } else {
      this.redis.disconnect();
    }
  }
}
