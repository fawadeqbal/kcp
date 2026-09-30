import {
  type PermissionRule,
  ROLE_KEYS,
  type RoleKey,
  SELF_PLACEHOLDER as SELF,
} from './constants.js';

/**
 * Who may do what. This file is the source of truth: the seed rewrites the
 * role_permissions table from it on every deploy (prisma/seed.ts), and the API loads the rules
 * from the database. Every rule here must be covered by a test in
 * apps/api/src/permissions/ability.factory.spec.ts.
 *
 * Subjects are checked with extra attributes the API attaches:
 *   User  → roleKey (the account's role), accountKind (STUDENT/ADULT), status,
 *           parentIds (IDs of linked parents)
 *   Child → id, parentIds
 *   ConsentRecord → parentId, childId
 *   Submission → userId
 *   Project → userId
 *   Billing → parentId
 *   Certificate → userId, parentIds
 */

/** Fields any adult may change on their own account. */
const OWN_PROFILE_FIELDS = ['displayName', 'languageCode', 'countryCode', 'regionId', 'cityId'];

const readSelf: PermissionRule = { action: 'read', subject: 'User', conditions: { id: SELF } };
const updateOwnProfile: PermissionRule = {
  action: 'update',
  subject: 'User',
  conditions: { id: SELF },
  fields: OWN_PROFILE_FIELDS,
};

export const permissionMatrix: Record<RoleKey, PermissionRule[]> = {
  [ROLE_KEYS.STUDENT]: [
    readSelf,
    // Students save drafts, check their code and track progress — only their own.
    { action: 'create', subject: 'Submission' },
    { action: 'read', subject: 'Submission', conditions: { userId: SELF } },
    // …build and ship their own projects…
    { action: 'create', subject: 'Project' },
    { action: 'read', subject: 'Project', conditions: { userId: SELF } },
    // …see the weekly boards, and tell us what they think.
    { action: 'read', subject: 'Leaderboard' },
    { action: 'create', subject: 'Feedback' },
    // Certificates for the modules they finished (premium).
    { action: 'create', subject: 'Certificate' },
    { action: 'read', subject: 'Certificate', conditions: { userId: SELF } },
  ],

  [ROLE_KEYS.PARENT]: [
    readSelf,
    updateOwnProfile,
    // A parent can see the accounts of children linked to them — and no one else's.
    { action: 'read', subject: 'User', conditions: { parentIds: { $all: [SELF] } } },
    // Parents create their children's accounts and manage only their own children.
    { action: 'create', subject: 'Child' },
    { action: 'read', subject: 'Child', conditions: { parentIds: { $all: [SELF] } } },
    { action: 'update', subject: 'Child', conditions: { parentIds: { $all: [SELF] } } },
    { action: 'delete', subject: 'Child', conditions: { parentIds: { $all: [SELF] } } },
    { action: 'read', subject: 'ConsentRecord', conditions: { parentId: SELF } },
    { action: 'create', subject: 'Feedback' },
    // Their own family's plan: see it, pay, change or cancel it, and read invoices.
    { action: 'read', subject: 'Billing', conditions: { parentId: SELF } },
    { action: 'update', subject: 'Billing', conditions: { parentId: SELF } },
    // Their children's certificates (checked against the family in the service).
    { action: 'read', subject: 'Certificate', conditions: { parentIds: { $all: [SELF] } } },
  ],

  [ROLE_KEYS.MENTOR]: [readSelf, updateOwnProfile],
  // Preview lessons before they're published (publishing is for admins).
  [ROLE_KEYS.CONTENT_CREATOR]: [readSelf, updateOwnProfile, { action: 'read', subject: 'Content' }],
  [ROLE_KEYS.CLIENT]: [readSelf, updateOwnProfile],
  [ROLE_KEYS.TEACHER]: [readSelf, updateOwnProfile],

  [ROLE_KEYS.MODERATOR]: [
    { action: 'read', subject: 'User' },
    // Can suspend students and parents (and sign them out), never staff.
    {
      action: 'update',
      subject: 'User',
      fields: ['status', 'sessions'],
      conditions: { roleKey: { $in: [ROLE_KEYS.STUDENT, ROLE_KEYS.PARENT] } },
    },
    { action: 'read', subject: 'Child' },
    // Reads the feedback button's messages and marks them read or done.
    { action: 'read', subject: 'Feedback' },
    { action: 'update', subject: 'Feedback', fields: ['status'] },
    // Looks into the boards and a student's XP history when cheating is reported.
    { action: 'read', subject: 'LeaderboardSeason' },
    { action: 'read', subject: 'XpAdjustment' },
  ],

  [ROLE_KEYS.ADMIN]: [
    { action: 'read', subject: 'User' },
    // Can manage every account except admins and super admins.
    // "sessions" = sign the account out everywhere.
    {
      action: 'update',
      subject: 'User',
      fields: ['status', 'sessions', 'displayName', 'languageCode'],
      conditions: { roleKey: { $nin: [ROLE_KEYS.ADMIN, ROLE_KEYS.SUPER_ADMIN] } },
    },
    { action: 'read', subject: 'Child' },
    { action: 'read', subject: 'AuditLog' },
    { action: 'read', subject: 'Role' },
    { action: 'read', subject: 'ConsentRecord' },
    { action: 'manage', subject: 'FeatureFlag' },
    // Switch a country on (with its prices set) and change its currency; switch a
    // language on or off. Preview and publish content.
    { action: 'update', subject: 'Country', fields: ['isActive', 'currency'] },
    { action: 'update', subject: 'Language', fields: ['isActive'] },
    { action: 'read', subject: 'Content' },
    { action: 'update', subject: 'Content' },
    // Crash reports from the mobile app.
    { action: 'read', subject: 'AppCrash' },
    { action: 'read', subject: 'Feedback' },
    { action: 'update', subject: 'Feedback', fields: ['status'] },
    // Pilot families get premium by hand (with a reason, in the audit log).
    { action: 'manage', subject: 'PremiumGrant' },
    { action: 'read', subject: 'Metrics' },
    // Families' payments: looks them up, records manual payments and refunds (with a
    // reason). Prices per country too.
    { action: 'manage', subject: 'Payment' },
    // The waitlist from the marketing site, and revoking a certificate (with a reason).
    { action: 'read', subject: 'Waitlist' },
    { action: 'read', subject: 'Certificate' },
    { action: 'update', subject: 'Certificate' },
    { action: 'read', subject: 'PlanPrice' },
    { action: 'update', subject: 'PlanPrice' },
    // Runs seasons, takes a cheater's XP away and gives badges like "Helper" — each
    // with a written reason in the audit log.
    { action: 'manage', subject: 'LeaderboardSeason' },
    { action: 'read', subject: 'XpAdjustment' },
    { action: 'create', subject: 'XpAdjustment' },
    { action: 'create', subject: 'UserBadge' },
    { action: 'delete', subject: 'UserBadge' },
  ],

  [ROLE_KEYS.SUPER_ADMIN]: [{ action: 'manage', subject: 'all' }],
};
