/**
 * Stable role keys. The scope defines one role per account; levels such as
 * Explorer, Builder and Senior live inside the student role, not as roles.
 */
export const ROLE_KEYS = {
  STUDENT: 'student',
  PARENT: 'parent',
  MENTOR: 'mentor',
  CONTENT_CREATOR: 'content_creator',
  CLIENT: 'client',
  TEACHER: 'teacher',
  MODERATOR: 'moderator',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
} as const;

export type RoleKey = (typeof ROLE_KEYS)[keyof typeof ROLE_KEYS];

/** Roles that must sign in to the admin panel with two-factor login. */
export const STAFF_ROLE_KEYS: readonly RoleKey[] = [
  ROLE_KEYS.CONTENT_CREATOR,
  ROLE_KEYS.MODERATOR,
  ROLE_KEYS.ADMIN,
  ROLE_KEYS.SUPER_ADMIN,
];

/** Languages available at launch. Others are seeded but switched off. */
export const LAUNCH_LANGUAGES = ['en', 'ar', 'ur'] as const;
export type LaunchLanguage = (typeof LAUNCH_LANGUAGES)[number];

/** CASL actions. `manage` means every action. */
export const ACTIONS = ['manage', 'create', 'read', 'update', 'delete'] as const;
export type Action = (typeof ACTIONS)[number];

/** Things permissions are granted on. `all` means every subject. */
export const SUBJECTS = [
  'all',
  'User',
  /** A student account, seen from the family that manages it. */
  'Child',
  'AuditLog',
  'Role',
  'FeatureFlag',
  'ConsentRecord',
  'Country',
  'Language',
  /** A student's code for a challenge: drafts, submissions and lesson progress. */
  'Submission',
  /** A student's module project and its portfolio item. */
  'Project',
  /** The weekly leaderboards (nickname and avatar only). */
  'Leaderboard',
  /** Messages sent with the in-app feedback button. */
  'Feedback',
  /** Premium given by hand to pilot families. */
  'PremiumGrant',
  /** The five numbers on the admin dashboard. */
  'Metrics',
  /** Leaderboard seasons, the boards as staff see them, and past results. */
  'LeaderboardSeason',
  /** A student's XP history, and XP taken away by staff (with a reason). */
  'XpAdjustment',
  /** Badges given (or taken back) by staff, like "Helper". */
  'UserBadge',
  /** A family's own plan, invoices and checkout (parents; `parentId` is theirs). */
  'Billing',
  /** Every family's subscriptions, payments, invoices and refunds (staff). */
  'Payment',
  /** Plan prices per country and the family discount (staff). */
  'PlanPrice',
  /** People waiting for the platform in their country (the marketing site's list). */
  'Waitlist',
  /** Certificates for finished modules (`userId` is the student's). */
  'Certificate',
  /** Tracks, modules and lessons as staff preview and publish them. */
  'Content',
  /** Crash reports sent by the mobile app (no account or device in them). */
  'AppCrash',
] as const;
export type Subject = (typeof SUBJECTS)[number];

/** Placeholder replaced with the signed-in user's ID when rules are evaluated. */
export const SELF_PLACEHOLDER = '${user.id}';

export interface PermissionRule {
  action: Action;
  subject: Subject;
  /** CASL (MongoDB-style) conditions; may contain SELF_PLACEHOLDER. */
  conditions?: Record<string, unknown>;
  /** Limits the rule to these fields. */
  fields?: string[];
  /** true = explicit "cannot". */
  inverted?: boolean;
}
