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

/**
 * An IP address's network: IPv4 addresses as they are, IPv6 addresses by their /64
 * (one home or phone usually holds a whole /64, and can change addresses in it at
 * will).
 */
export function ipNetwork(ip: string | undefined): string | undefined {
  if (!ip) return undefined;
  const address = ip.replace(/^::ffff:(?=\d+\.\d+\.\d+\.\d+$)/i, '');
  if (!address.includes(':')) return address;
  const [head = '', tail = ''] = address.toLowerCase().split('::');
  const headGroups = head ? head.split(':') : [];
  const tailGroups = address.includes('::') && tail ? tail.split(':') : [];
  const missing = 8 - headGroups.length - tailGroups.length;
  const groups = address.includes('::')
    ? [...headGroups, ...Array.from({ length: Math.max(0, missing) }, () => '0'), ...tailGroups]
    : headGroups;
  return `${groups
    .slice(0, 4)
    .map((group) => group.replace(/^0+(?=.)/, ''))
    .join(':')}::/64`;
}

/** Count by client network (IPv6 /64): for public endpoints anyone can call. */
export const byIpNetwork = (req: Request): string | undefined => ipNetwork(req.ip);

/** Count by a normalised string field of the JSON body (e.g. the email being tried). */
export const byBodyField =
  (field: string) =>
  (req: Request): string | undefined => {
    const value = (req.body as Record<string, unknown> | undefined)?.[field];
    return typeof value === 'string' && value.trim() ? value.trim().toLowerCase() : undefined;
  };
