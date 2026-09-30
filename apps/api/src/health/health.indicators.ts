import { Inject, Injectable, Logger } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';
import type { Redis } from 'ioredis';
import { PrismaService } from '../database/prisma.service.js';
import { REDIS } from '../redis/redis.constants.js';
import { StorageService } from '../storage/storage.service.js';

const logger = new Logger('Health');

const CHECK_TIMEOUT_MS = 2_000;

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timed out after ${ms} ms`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

@Injectable()
export class DatabaseHealthIndicator {
  constructor(
    private readonly prisma: PrismaService,
    private readonly health: HealthIndicatorService,
  ) {}

  async check(key = 'database') {
    const indicator = this.health.check(key);
    const started = Date.now();
    try {
      await withTimeout(this.prisma.$queryRaw`SELECT 1`, CHECK_TIMEOUT_MS);
      return indicator.up({ latencyMs: Date.now() - started });
    } catch (error) {
      // The reason goes to the logs; the public answer only says it's down.
      logger.warn(`${key} check failed: ${(error as Error).message}`);
      return indicator.down({ message: 'unavailable' });
    }
  }
}

@Injectable()
export class RedisHealthIndicator {
  constructor(
    @Inject(REDIS) private readonly redis: Redis,
    private readonly health: HealthIndicatorService,
  ) {}

  async check(key = 'redis') {
    const indicator = this.health.check(key);
    const started = Date.now();
    try {
      if (this.redis.status === 'wait') {
        await withTimeout(this.redis.connect(), CHECK_TIMEOUT_MS);
      }
      await withTimeout(this.redis.ping(), CHECK_TIMEOUT_MS);
      return indicator.up({ latencyMs: Date.now() - started });
    } catch (error) {
      // The reason goes to the logs; the public answer only says it's down.
      logger.warn(`${key} check failed: ${(error as Error).message}`);
      return indicator.down({ message: 'unavailable' });
    }
  }
}

@Injectable()
export class StorageHealthIndicator {
  constructor(
    private readonly storage: StorageService,
    private readonly health: HealthIndicatorService,
  ) {}

  async check(key = 'storage') {
    const indicator = this.health.check(key);
    const started = Date.now();
    try {
      await withTimeout(this.storage.ping(), CHECK_TIMEOUT_MS);
      return indicator.up({ latencyMs: Date.now() - started });
    } catch (error) {
      logger.warn(`${key} check failed: ${(error as Error).message}`);
      return indicator.down({ message: 'unavailable' });
    }
  }
}
