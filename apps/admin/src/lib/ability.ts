import { createMongoAbility, type MongoAbility, type RawRuleOf, subject } from '@casl/ability';

/**
 * The signed-in staff member's permissions, from the rules the API sends with /me.
 * Only used to hide buttons the API would refuse; the API always checks again.
 */
export type Action = 'manage' | 'create' | 'read' | 'update' | 'delete';
export type Subject =
  | 'all'
  | 'User'
  | 'Child'
  | 'AuditLog'
  | 'ConsentRecord'
  | 'Role'
  | 'FeatureFlag'
  | 'Feedback'
  | 'PremiumGrant'
  | 'Metrics'
  | 'LeaderboardSeason'
  | 'XpAdjustment'
  | 'UserBadge'
  | 'Payment'
  | 'PlanPrice'
  | 'Waitlist'
  | 'Certificate'
  | 'Content'
  | 'AppCrash'
  | 'Country'
  | 'Language';
export type AdminAbility = MongoAbility<[Action, Subject | ReturnType<typeof subject>]>;

export function abilityFrom(rules: Record<string, unknown>[]): AdminAbility {
  return createMongoAbility(rules as unknown as RawRuleOf<AdminAbility>[]);
}

/** A user record as the API's permission rules see it. */
export function userSubject(user: {
  id: string;
  kind: 'STUDENT' | 'ADULT';
  status: string;
  role: { key: string };
}) {
  return subject('User', {
    id: user.id,
    accountKind: user.kind,
    status: user.status,
    roleKey: user.role.key,
  });
}
