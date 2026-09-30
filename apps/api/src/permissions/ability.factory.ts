import { Injectable } from '@nestjs/common';
import {
  createMongoAbility,
  type ForcedSubject,
  type MongoAbility,
  type RawRuleOf,
} from '@casl/ability';
import { type Action, SELF_PLACEHOLDER, type Subject } from '@kcp/database';
import { PrismaService } from '../database/prisma.service.js';
import type { AuthUser } from './auth-user.js';

/** A subject type name ("User") or a record tagged with one via subject('User', {...}). */
export type AppSubject = Subject | ForcedSubject<Exclude<Subject, 'all'>>;
export type AppAbility = MongoAbility<[Action, AppSubject]>;
export type AppRawRule = RawRuleOf<AppAbility>;

const CACHE_TTL_MS = 60_000;

/** Replaces the ${user.id} placeholder anywhere inside a conditions object. */
export function interpolateConditions(value: unknown, userId: string): unknown {
  if (typeof value === 'string') {
    return value === SELF_PLACEHOLDER ? userId : value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => interpolateConditions(item, userId));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, interpolateConditions(item, userId)]),
    );
  }
  return value;
}

/** Turns stored rules into the caller's CASL rules. */
export function rulesForUser(roleRules: AppRawRule[], userId: string): AppRawRule[] {
  return roleRules.map((rule) =>
    rule.conditions
      ? {
          ...rule,
          conditions: interpolateConditions(rule.conditions, userId) as AppRawRule['conditions'],
        }
      : rule,
  );
}

export function buildAbility(rules: AppRawRule[]): AppAbility {
  return createMongoAbility<AppAbility>(rules);
}

/**
 * True when the ability allows the action on every record of the subject — used by
 * list endpoints, which must not return rows the caller may only partly access.
 */
export function canOnAll(ability: AppAbility, action: Action, subject: Subject): boolean {
  const rules = ability.rulesFor(action, subject);
  // Conservative: any deny rule, or only conditional / field-limited rules, means "not all".
  return (
    rules.some((rule) => !rule.inverted && !rule.conditions && !rule.fields) &&
    !rules.some((rule) => rule.inverted)
  );
}

/**
 * Builds a CASL ability from the caller's role. Role rules come from the
 * role_permissions table (written by the seed) and are cached briefly per instance.
 */
@Injectable()
export class AbilityFactory {
  private readonly cache = new Map<string, { rules: AppRawRule[]; expiresAt: number }>();

  constructor(private readonly prisma: PrismaService) {}

  async forUser(user: Pick<AuthUser, 'id' | 'roleId'>): Promise<AppAbility> {
    return buildAbility(await this.rulesFor(user));
  }

  async rulesFor(user: Pick<AuthUser, 'id' | 'roleId'>): Promise<AppRawRule[]> {
    return rulesForUser(await this.roleRules(user.roleId), user.id);
  }

  private async roleRules(roleId: string): Promise<AppRawRule[]> {
    const cached = this.cache.get(roleId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.rules;
    }
    const rows = await this.prisma.rolePermission.findMany({
      where: { roleId },
      include: { permission: true },
    });
    const rules: AppRawRule[] = rows.map((row) => ({
      action: row.permission.action as Action,
      subject: row.permission.subject as Subject,
      ...(row.conditions ? { conditions: row.conditions as AppRawRule['conditions'] } : {}),
      ...(row.fields.length ? { fields: row.fields } : {}),
      ...(row.inverted ? { inverted: true } : {}),
    }));
    this.cache.set(roleId, { rules, expiresAt: Date.now() + CACHE_TTL_MS });
    return rules;
  }
}
