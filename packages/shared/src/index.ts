/**
 * Rules the API enforces and the apps show to people. Changing a value here
 * changes both, so the web form and the server never disagree.
 */

// ── Passwords ────────────────────────────────────────────────────────────────

/** Parents and staff. A short sentence is easy to remember and hard to guess. */
export const ADULT_PASSWORD_MIN_LENGTH = 12;
/** Children's passwords are set by their parent and must be easy to type. */
export const CHILD_PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

// ── Legal texts ──────────────────────────────────────────────────────────────

/**
 * Version of the terms of use and privacy policy (the pages show it). Bump it when
 * their meaning changes: parents then accept the new version at their next visit,
 * and each acceptance (and every consent record) stores the version it was for.
 */
export const TERMS_VERSION = '2026-10';
/** When the current version was published (shown on the pages as "Last updated"). */
export const TERMS_UPDATED = '2026-10-01';

// ── Children ─────────────────────────────────────────────────────────────────

/** Ages the platform is for (scope: 9–16). */
export const CHILD_MIN_AGE = 9;
export const CHILD_MAX_AGE = 16;
/**
 * Below this age, stricter consent rules apply (for example COPPA in the US).
 * Accounts for younger children stay closed until the lawyer-approved consent
 * method ships (feature flag "under_13_accounts").
 */
export const PARENTAL_CONSENT_AGE = 13;

/**
 * We only store the birth year (data minimisation), so ages are known to within a
 * year. The years a parent can pick are chosen so that no child can be younger than
 * the limit — and, while under-13 accounts are closed, no child can be under 13.
 */
export function allowedBirthYears(currentYear: number, allowUnder13: boolean): number[] {
  const youngest = allowUnder13 ? CHILD_MIN_AGE : PARENTAL_CONSENT_AGE + 1;
  const years: number[] = [];
  // Turning CHILD_MAX_AGE + 1 this year may still mean CHILD_MAX_AGE today.
  for (let age = youngest; age <= CHILD_MAX_AGE + 1; age++) {
    years.push(currentYear - age);
  }
  return years;
}

// ── Nicknames and usernames ──────────────────────────────────────────────────

/** Letters, digits and underscores; starts with a letter; 3–20 characters. */
export const NICKNAME_PATTERN = /^[A-Za-z][A-Za-z0-9_]{2,19}$/;
export const NICKNAME_MIN_LENGTH = 3;
export const NICKNAME_MAX_LENGTH = 20;

/** Generated student logins look like "swift-falcon-4821". */
export const STUDENT_USERNAME_PATTERN = /^[a-z]+-[a-z]+-\d{4}$/;

// ── Avatars ──────────────────────────────────────────────────────────────────

/** Preset avatars. Children never upload photos. */
export const AVATAR_KEYS = [
  'rocket',
  'star',
  'bolt',
  'planet',
  'robot',
  'leaf',
  'moon',
  'sun',
  'cube',
  'gamepad',
  'music',
  'code',
] as const;
export type AvatarKey = (typeof AVATAR_KEYS)[number];

export function isAvatarKey(value: string): value is AvatarKey {
  return (AVATAR_KEYS as readonly string[]).includes(value);
}

// ── Consent ──────────────────────────────────────────────────────────────────

/** What a parent can switch on or off for each child. Both start off. */
export const CHILD_CONSENTS = ['publicLeaderboards', 'publicPortfolio'] as const;
export type ChildConsent = (typeof CHILD_CONSENTS)[number];

// ── Code challenges ──────────────────────────────────────────────────────────

/** Files a student can edit in a challenge: a web page (html, css, js) or a Python program (py). */
export const CODE_FILE_KEYS = ['html', 'css', 'js', 'py'] as const;
export type CodeFileKey = (typeof CODE_FILE_KEYS)[number];

/**
 * Largest file a student can save or submit (characters). Plenty for any lesson,
 * and three full files still fit the API's request size limit.
 */
export const MAX_CODE_FILE_LENGTH = 20_000;

// ── XP, streaks and feedback ─────────────────────────────────────────────────

/** Most XP a student can earn in one day (their time zone): keeps boards fair. */
export const DAILY_XP_CAP = 300;
/** The daily goal behind streaks: about two challenges. */
export const DAILY_GOAL_XP = 20;
/** How many students each leaderboard shows. */
export const LEADERBOARD_SIZE = 50;
/** Streak freezes: one is earned every STREAK_FREEZE_EVERY days of streak, and a
 * student holds at most MAX_STREAK_FREEZES. Each one covers a missed day. */
export const STREAK_FREEZE_EVERY = 7;
export const MAX_STREAK_FREEZES = 2;

// ── Leaderboards ─────────────────────────────────────────────────────────────

export const BOARD_SCOPES = ['global', 'country', 'region', 'city'] as const;
export type BoardScope = (typeof BOARD_SCOPES)[number];
export const BOARD_PERIODS = ['week', 'season', 'all'] as const;
export type BoardPeriod = (typeof BOARD_PERIODS)[number];
/**
 * Region and city boards only appear once at least this many students there are on
 * public boards, so no child stands out in a small place.
 */
export const AREA_BOARD_MIN_STUDENTS = 20;
/** Places kept from each finished week or season (the "Top 10" badge counts these). */
export const BOARD_RESULTS_SIZE = 10;

// ── Badges ───────────────────────────────────────────────────────────────────

export const BADGE_CATEGORIES = [
  'SKILL',
  'SHIPPING',
  'STREAK',
  'LEVEL',
  'LEADERBOARD',
  'HELPING',
] as const;
export type BadgeCategory = (typeof BADGE_CATEGORIES)[number];

/** How a badge is earned. */
export type BadgeCriteria =
  | { type: 'challenges_passed'; min: number }
  | { type: 'lessons_completed'; min: number }
  | { type: 'module_completed'; moduleId: string }
  | { type: 'projects_shipped'; min: number }
  | { type: 'python_passed'; min: number }
  | { type: 'streak_days'; min: number }
  | { type: 'level'; min: number }
  /** A place in the top `rank` of a finished weekly country board (weekly job). */
  | { type: 'weekly_top'; rank: number }
  /** Feedback the team marked done (reporting bugs, ideas that shipped). */
  | { type: 'feedback_done'; min: number }
  /** Given by staff, with a reason (e.g. helping classmates in a pilot class). */
  | { type: 'manual' };

export interface BadgeDefinition {
  /** Stable key; names and descriptions are `badges.<key>.name/description` in i18n. */
  key: string;
  category: BadgeCategory;
  /** One emoji. */
  icon: string;
  criteria: BadgeCriteria;
}

/** Every badge, in display order. The seed writes them to the badges table. */
export const BADGES: readonly BadgeDefinition[] = [
  {
    key: 'first-steps',
    category: 'SKILL',
    icon: '👣',
    criteria: { type: 'challenges_passed', min: 1 },
  },
  {
    key: 'first-lesson',
    category: 'SKILL',
    icon: '📘',
    criteria: { type: 'lessons_completed', min: 1 },
  },
  {
    key: 'five-lessons',
    category: 'SKILL',
    icon: '📚',
    criteria: { type: 'lessons_completed', min: 5 },
  },
  {
    key: 'ten-lessons',
    category: 'SKILL',
    icon: '🎓',
    criteria: { type: 'lessons_completed', min: 10 },
  },
  {
    key: 'challenge-champ',
    category: 'SKILL',
    icon: '🧩',
    criteria: { type: 'challenges_passed', min: 25 },
  },
  {
    key: 'web-builder',
    category: 'SKILL',
    icon: '🌐',
    criteria: { type: 'module_completed', moduleId: 'builder-m01' },
  },
  {
    key: 'first-python',
    category: 'SKILL',
    icon: '🐍',
    criteria: { type: 'python_passed', min: 1 },
  },
  {
    key: 'python-explorer',
    category: 'SKILL',
    icon: '🗺️',
    criteria: { type: 'module_completed', moduleId: 'builder-m02' },
  },
  {
    key: 'first-ship',
    category: 'SHIPPING',
    icon: '🚀',
    criteria: { type: 'projects_shipped', min: 1 },
  },
  {
    key: 'serial-shipper',
    category: 'SHIPPING',
    icon: '🛳️',
    criteria: { type: 'projects_shipped', min: 3 },
  },
  { key: 'streak-3', category: 'STREAK', icon: '🔥', criteria: { type: 'streak_days', min: 3 } },
  { key: 'streak-7', category: 'STREAK', icon: '⚡', criteria: { type: 'streak_days', min: 7 } },
  { key: 'streak-30', category: 'STREAK', icon: '🏆', criteria: { type: 'streak_days', min: 30 } },
  { key: 'level-5', category: 'LEVEL', icon: '⭐', criteria: { type: 'level', min: 5 } },
  { key: 'level-10', category: 'LEVEL', icon: '🌟', criteria: { type: 'level', min: 10 } },
  {
    key: 'weekly-top-10',
    category: 'LEADERBOARD',
    icon: '🥇',
    criteria: { type: 'weekly_top', rank: 10 },
  },
  {
    key: 'bug-hunter',
    category: 'HELPING',
    icon: '🐞',
    criteria: { type: 'feedback_done', min: 1 },
  },
  { key: 'helper', category: 'HELPING', icon: '🤝', criteria: { type: 'manual' } },
];

/** Longest message the feedback button accepts (characters). */
export const FEEDBACK_MAX_LENGTH = 1000;
/** SAFETY first: a family should find "something isn't safe" straight away. */
export const FEEDBACK_KINDS = ['SAFETY', 'BUG', 'IDEA', 'PRAISE', 'OTHER'] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];

// ── Plans and payments ─────────────────────────────────────────────────────

/** Every new student can try premium for this many days. */
export const TRIAL_DAYS = 14;
/**
 * Free trials a family can start in all (one per new child). Deleting a child
 * doesn't give it back, so the trial can't be restarted again and again.
 */
export const MAX_TRIALS_PER_FAMILY = 4;
/** Plans families can buy; prices per country are set in the admin panel. */
export const PLAN_KEYS = ['monthly', 'yearly'] as const;
export type PlanKey = (typeof PLAN_KEYS)[number];
/** Refunds, manual payments and seasons need a reason at least this long. */
export const REASON_MIN_LENGTH = 3;

export interface FamilyPrice {
  /** The first child's price. */
  firstMinor: number;
  /** Each further child's price, after the family discount. */
  extraUnitMinor: number;
  extraChildren: number;
  totalMinor: number;
}

/**
 * What a family pays for one period: the first child at the full price, every other
 * child with the family discount. Amounts in the currency's minor unit.
 */
export function familyPrice(
  unitMinor: number,
  children: number,
  discountPercent: number,
): FamilyPrice {
  const extraChildren = Math.max(0, Math.floor(children) - 1);
  const extraUnitMinor = Math.round((unitMinor * (100 - discountPercent)) / 100);
  return {
    firstMinor: unitMinor,
    extraUnitMinor,
    extraChildren,
    totalMinor: unitMinor + extraUnitMinor * extraChildren,
  };
}
