import { SetMetadata } from '@nestjs/common';
import type { Request } from 'express';

export interface RateLimitRule {
  /** Short name used in the Redis key, e.g. "login-ip". */
  name: string;
  /** Allowed requests per window. */
  limit: number;
  windowSeconds: number;
  /** What to count by. Returning undefined skips this rule for the request. */
  key: (req: Request) => string | undefined;
}

export const RATE_LIMITS = Symbol('rateLimits');

/** Limits how often a route can be called, e.g. to slow down password guessing. */
export const RateLimit = (...rules: RateLimitRule[]) => SetMetadata(RATE_LIMITS, rules);

/** Count by client IP address. */
export const byIp = (req: Request): string | undefined => req.ip;

/** Count by a normalised string field of the JSON body (e.g. the email being tried). */
export const byBodyField =
  (field: string) =>
  (req: Request): string | undefined => {
    const value = (req.body as Record<string, unknown> | undefined)?.[field];
    return typeof value === 'string' && value.trim() ? value.trim().toLowerCase() : undefined;
  };
