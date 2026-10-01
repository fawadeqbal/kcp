import { test as base } from '@playwright/test';
import { Redis } from 'ioredis';

/**
 * The browser tests sign up and log in many families from one IP address, more than
 * the API's per-IP limits allow in an hour (on purpose: they protect real families).
 * Before each test, this clears the local API's rate-limit counters. It only ever
 * talks to the local (or CI) Redis.
 */
export const test = base.extend<{ freshRateLimits: void }>({
  freshRateLimits: [
    // oxlint-disable-next-line no-empty-pattern -- Playwright requires the destructuring
    async ({}, use) => {
      const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
      });
      try {
        await redis.connect();
        const keys = await redis.keys('rl:*');
        if (keys.length) await redis.del(...keys);
      } finally {
        redis.disconnect();
      }
      await use();
    },
    { auto: true },
  ],
});

export { expect } from '@playwright/test';
