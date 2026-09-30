import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';

const CACHE_TTL_MS = 30_000;

/** Reads feature flags (switched on and off from the admin panel), cached briefly. */
@Injectable()
export class FeatureFlagsService {
  private cache:
    | { flags: Map<string, { enabled: boolean; countryCodes: string[] }>; expiresAt: number }
    | undefined;

  constructor(private readonly prisma: PrismaService) {}

  /** A flag is on when enabled and either global or switched on for this country. */
  async isEnabled(key: string, countryCode?: string | null): Promise<boolean> {
    const flag = (await this.flags()).get(key);
    if (!flag?.enabled) return false;
    return (
      flag.countryCodes.length === 0 ||
      (countryCode ? flag.countryCodes.includes(countryCode) : false)
    );
  }

  /** Clears the cache after a change. */
  invalidate(): void {
    this.cache = undefined;
  }

  private async flags() {
    if (this.cache && this.cache.expiresAt > Date.now()) {
      return this.cache.flags;
    }
    const rows = await this.prisma.featureFlag.findMany();
    const flags = new Map(
      rows.map((row) => [row.key, { enabled: row.enabled, countryCodes: row.countryCodes }]),
    );
    this.cache = { flags, expiresAt: Date.now() + CACHE_TTL_MS };
    return flags;
  }
}
