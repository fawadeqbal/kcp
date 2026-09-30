import { Inject, Injectable } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { REDIS } from '../../redis/redis.constants.js';
import { sha256 } from '../crypto/tokens.js';

export const RATE_LIMIT_KEY_PREFIX = 'rl:';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/** Fixed-window counters in Redis, shared by every API instance. */
@Injectable()
export class RateLimiterService {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async consume(
    name: string,
    subject: string,
    limit: number,
    windowSeconds: number,
  ): Promise<RateLimitResult> {
    // Hash the subject so emails and IPs are not stored in Redis in clear text.
    const key = `${RATE_LIMIT_KEY_PREFIX}${name}:${sha256(subject)}`;
    const results = await this.redis
      .multi()
      .incr(key)
      .expire(key, windowSeconds, 'NX')
      .ttl(key)
      .exec();
    const count = Number(results?.[0]?.[1] ?? 0);
    const ttl = Number(results?.[2]?.[1] ?? windowSeconds);
    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      retryAfterSeconds: ttl > 0 ? ttl : windowSeconds,
    };
  }

  /** Clears a counter, e.g. after a successful login. */
  async reset(name: string, subject: string): Promise<void> {
    await this.redis.del(`${RATE_LIMIT_KEY_PREFIX}${name}:${sha256(subject)}`);
  }
}
