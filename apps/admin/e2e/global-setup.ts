import { Redis } from 'ioredis';

/**
 * Browser tests sign up and log in many times from one IP. Clear the API's rate-limit
 * counters first, so running the suite a few times in a row doesn't hit the limits.
 * Only ever points at the local (or CI) Redis.
 */
export default async function globalSetup() {
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
}
