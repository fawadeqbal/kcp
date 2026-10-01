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

/**
 * Accounts that sign in with a two-factor code: staff (in the admin panel), the adults
 * who see children's work in the web app (mentors and teachers), and clients (they pay
 * and approve the hub's work).
 */
export const TWO_FACTOR_ROLE_KEYS: readonly RoleKey[] = [
  ...STAFF_ROLE_KEYS,
  ROLE_KEYS.MENTOR,
  ROLE_KEYS.TEACHER,
  ROLE_KEYS.CLIENT,
];

export const requiresTwoFactor = (roleKey: string): boolean =>
  (TWO_FACTOR_ROLE_KEYS as readonly string[]).includes(roleKey);

/** The code of conduct mentors sign before their first review (web: mentor.conduct). */
export const MENTOR_CODE_OF_CONDUCT_VERSION = '2026-10';

/** Mentor reviews should be decided within this many hours of the request. */
export const REVIEW_TARGET_HOURS = 48;

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
  /** The weekly leaderboards (nickname and avatar only), and the student's league. */
  'Leaderboard',
  /** Friends between students, and friend requests (both parents approve). */
  'Friendship',
  /** Team, class and event rooms (members, and their parents, read them). */
  'Chat',
  /** Reports about messages and students, and what moderators did about them. */
  'Moderation',
  /** Words the room filter refuses, on top of the built-in lists. */
  'BlockedTerm',
  /** Hackathons: set up and run by staff; students take part in teams. */
  'Event',
  /** A team in an event: its members (a parent approves each), repository and pull requests. */
  'EventTeam',
  /** Judges' scores for the teams' submissions. */
  'EventScore',
  /** Schools and their licences (staff); teachers see the schools they teach at. */
  'School',
  /** A teacher's class: its students, assignments, progress and board. */
  'SchoolClass',
  /** A student's place in a class (they join with a code, a parent approves). */
  'ClassMember',
  /** The hub readiness check: a timed project a mentor grades. */
  'ReadinessCheck',
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
  /** Translations written, reviewed and published in the content studio. */
  'ContentText',
  /** Mentors' reviews of students' projects (`studentId`, `parentIds`). */
  'Review',
  /** Mentors' notes about a student, for other mentors only. */
  'MentorNote',
  /** A mentor's onboarding: background check, code of conduct, languages (`userId`). */
  'MentorProfile',
  /** Verified parental consent for children under 13 (signed forms staff check). */
  'ParentalConsent',
  /** A student's way into paid hub work: the steps, a lead's sign-off, the parent's consent. */
  'HubEligibility',
  /** The hub's double-entry ledger (staff read it; nobody edits it). */
  'Ledger',
  /** Running the hub (staff): intake, clients, projects, and who may do paid work. */
  'Hub',
  /** A client organisation: its details, the client agreement, its people (`memberIds`). */
  'ClientOrg',
  /** A project request from a client (`clientIds`: the organisation's people). */
  'HubIntake',
  /**
   * A client project: its quote, tasks, team, board, deliveries and messages. Clients
   * (`clientIds`), the lead (`leadId`), team students (`memberIds`) and their parents
   * (`parentIds`) each see their own part of it.
   */
  'HubProject',
  /** A client's invoices for a project, and paying them (`clientIds`). */
  'HubInvoice',
  /** A student's hub earnings: held, payable and paid (`studentId`, `parentIds`). */
  'HubEarnings',
  /** Where a parent's payouts go: a bank or wallet account in their name (`parentId`). */
  'PayoutAccount',
  /** Payouts to parents, in batches two super admins approve (`parentId`). */
  'Payout',
  /** A short earnings story for the marketing site, with the parent's consent (`parentId`). */
  'HubStory',
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
