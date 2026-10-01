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
/** A family can have up to this many child accounts. */
export const MAX_CHILDREN_PER_PARENT = 10;

export const CHILD_MIN_AGE = 9;
export const CHILD_MAX_AGE = 16;
/**
 * Below this age, stricter consent rules apply (for example COPPA in the US).
 * Accounts for younger children stay closed until the lawyer-approved consent
 * method ships (feature flag "under_13_accounts").
 */
export const PARENTAL_CONSENT_AGE = 13;

/**
 * Whether a child born in `birthYear` may be under 13 today (we only know the year,
 * so a child who turns 13 this year counts as under 13 until next year).
 */
export function mayBeUnder13(birthYear: number, currentYear: number): boolean {
  return currentYear - birthYear <= PARENTAL_CONSENT_AGE;
}

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

// ── Younger children: picture passwords and signing in with a parent's phone ──

/**
 * The twelve pictures of a picture password (their icons are in packages/ui). A
 * picture password is four of them in order, repeats allowed; the parent sets it.
 */
export const PICTURE_KEYS = [
  'cat',
  'dog',
  'fish',
  'bird',
  'rabbit',
  'sun',
  'moon',
  'star',
  'tree',
  'flower',
  'apple',
  'car',
] as const;
export type PictureKey = (typeof PICTURE_KEYS)[number];
export const PICTURE_PASSWORD_LENGTH = 4;
/** Wrong picture passwords in a row before the picture password is locked for a while. */
export const PICTURE_MAX_FAILURES = 5;
export const PICTURE_LOCK_MINUTES = 60;

export function isPictureKey(value: string): value is PictureKey {
  return (PICTURE_KEYS as readonly string[]).includes(value);
}

/**
 * The code a child's device shows to be signed in from a parent's phone: letters and
 * digits that can't be mixed up (no 0/O, 1/I/L), in two groups, e.g. "K7MQ-4XPR".
 */
export const PAIRING_CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export const PAIRING_CODE_LENGTH = 8;
export const PAIRING_MINUTES = 10;

/** "k7mq 4xpr" → "K7MQ4XPR" (what the parent typed, or read from the QR code). */
export function normalizePairingCode(value: string): string {
  return value.toUpperCase().replace(/[^0-9A-Z]/g, '');
}

// ── Verified parental consent (under 13) ─────────────────────────────────────

export const UNDER13_CONSENT_METHODS = ['CARD_CHECK', 'SIGNED_FORM', 'EMAIL_PLUS'] as const;
export type Under13ConsentMethod = (typeof UNDER13_CONSENT_METHODS)[number];
/** A signed consent form: a photo or scan, up to 5 MB. */
export const CONSENT_FORM_TYPES = ['application/pdf', 'image/png', 'image/jpeg'] as const;
export const CONSENT_FORM_MAX_BYTES = 5 * 1024 * 1024;
/** A child account waiting for consent this long is deleted. */
export const CONSENT_PENDING_DAYS = 30;
/** Uploaded forms are deleted this long after staff decided. */
export const CONSENT_FORM_KEEP_DAYS = 30;
/** "Email plus": the second email goes this long after the parent confirmed. */
export const EMAIL_PLUS_FOLLOW_UP_HOURS = 24;

// ── Consent ──────────────────────────────────────────────────────────────────

/** What a parent can switch on or off for each child. Both start off. */
export const CHILD_CONSENTS = ['publicLeaderboards', 'publicPortfolio'] as const;
export type ChildConsent = (typeof CHILD_CONSENTS)[number];

// ── Code challenges ──────────────────────────────────────────────────────────

/** Files a student can edit in a challenge: a web page (html, css, js) or a Python program (py). */
export const CODE_FILE_KEYS = ['html', 'css', 'js', 'py', 'blocks', 'git'] as const;
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

// ── Leagues and friends ──────────────────────────────────────────────────────

/** League tiers, lowest first (StudentProfile.leagueTier is the index). */
export const LEAGUE_TIERS = [
  'bronze',
  'silver',
  'gold',
  'sapphire',
  'ruby',
  'emerald',
  'diamond',
] as const;
export type LeagueTier = (typeof LEAGUE_TIERS)[number];
/** Students per league group (a new group opens when one is full). */
export const LEAGUE_GROUP_SIZE = 30;
/** How many move up from the top, and down from the bottom, when the week closes. */
export const LEAGUE_PROMOTE = 5;
export const LEAGUE_RELEGATE = 5;
/** Smaller groups than this send no one down (a quiet week isn't a punishment). */
export const LEAGUE_RELEGATE_MIN_GROUP = 12;
/**
 * Levels that compete together: a band is the index of the last start level at or
 * below the student's level (levels 1–2, 3–5, 6–9, 10 and up).
 */
export const LEAGUE_LEVEL_BANDS = [1, 3, 6, 10] as const;

export function leagueLevelBand(level: number): number {
  let band = 0;
  for (const [index, start] of LEAGUE_LEVEL_BANDS.entries()) if (level >= start) band = index;
  return band;
}

export type LeagueOutcomeKey = 'PROMOTED' | 'STAYED' | 'RELEGATED';

/**
 * Where each place in a closed group goes (ranks start at 1). The top LEAGUE_PROMOTE
 * with XP move up (not from the top tier); in groups of at least
 * LEAGUE_RELEGATE_MIN_GROUP, the bottom LEAGUE_RELEGATE move down (not from the lowest
 * tier, and never someone who is moving up).
 */
export function leagueOutcome(
  rank: number,
  groupSize: number,
  tier: number,
  xp: number,
): LeagueOutcomeKey {
  if (rank <= LEAGUE_PROMOTE && xp > 0 && tier < LEAGUE_TIERS.length - 1) return 'PROMOTED';
  if (
    groupSize >= LEAGUE_RELEGATE_MIN_GROUP &&
    rank > groupSize - LEAGUE_RELEGATE &&
    rank > LEAGUE_PROMOTE &&
    tier > 0
  ) {
    return 'RELEGATED';
  }
  return 'STAYED';
}

/** Friend codes: easy to read out and type (no 0/O, 1/I/L). */
export const FRIEND_CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export const FRIEND_CODE_LENGTH = 6;
/** Most friends a student can have, and open requests they can send. */
export const MAX_FRIENDS = 50;
export const MAX_PENDING_FRIEND_REQUESTS = 10;
/** Requests not approved by both parents in this many days expire. */
export const FRIEND_REQUEST_DAYS = 14;

/** "k7mq 4x" → "K7MQ4X". */
export function normalizeFriendCode(value: string): string {
  return value.toUpperCase().replace(/[^0-9A-Z]/g, '');
}

// ── Referrals, activity, reports and skills ─────────────────────────────────

/** Premium days each child of the inviting family gets when an invited family's child ships their first project. */
export const REFERRAL_REWARD_DAYS = 14;
/** Rewarded invitations per family in any 365 days. */
export const REFERRAL_MAX_PER_YEAR = 5;
export const REFERRAL_CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export const REFERRAL_CODE_LENGTH = 8;
export const REFERRAL_CODE_PATTERN = /^[2-9A-HJ-NP-Z]{8}$/;

/** The apps say "still learning" this often while a student works (seconds). */
export const ACTIVITY_HEARTBEAT_SECONDS = 60;
/** Most minutes counted for one day (a tab left open all day doesn't count). */
export const MAX_ACTIVITY_MINUTES_PER_DAY = 240;

/** Skill map groups (content/skills.yaml). */
export const SKILL_CATEGORIES = ['logic', 'web', 'python', 'teamwork'] as const;
export type SkillCategory = (typeof SKILL_CATEGORIES)[number];

// ── Rooms (team, class and event chat) ─────────────────────────────────────

/** Ready-made phrases: under-13s send only these; everyone can. Texts are in the apps' languages. */
export const CHAT_PHRASES = [
  'hello',
  'thanks',
  'great-job',
  'lets-go',
  'i-need-help',
  'can-you-check',
  'i-have-an-idea',
  'my-part-is-done',
  'good-idea',
  'give-me-a-minute',
  'yes',
  'no',
  'see-you',
] as const;
export type ChatPhrase = (typeof CHAT_PHRASES)[number];
/** Students this age and older may also type (filtered) text. */
export const CHAT_TEXT_MIN_AGE = 13;
export const CHAT_MESSAGE_MAX_LENGTH = 300;
/** Messages are deleted after this many days. */
export const CHAT_RETENTION_DAYS = 90;
export const CHAT_REPORT_REASONS = ['UNKIND', 'PERSONAL_INFO', 'SPAM', 'SCARY', 'OTHER'] as const;
export type ChatReportReasonKey = (typeof CHAT_REPORT_REASONS)[number];
/** How long a moderator can mute a student for (hours). */
export const CHAT_MUTE_HOURS = [1, 24, 72, 168] as const;

/** Whether a student of this birth year may type text (by the end of this year's birthday). */
export function mayTypeInRooms(birthYear: number, currentYear: number): boolean {
  return currentYear - birthYear >= CHAT_TEXT_MIN_AGE;
}

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

/**
 * What mentors score in a review, from 1 to REVIEW_SCORE_MAX, by kind of review. Their
 * names and descriptions are in the web messages (review.criteria.*).
 */
export const REVIEW_CRITERIA = {
  PROJECT: ['works', 'code', 'design', 'creativity'],
  READINESS: ['works', 'code', 'design', 'independence'],
} as const;
export type ReviewCriterion = (typeof REVIEW_CRITERIA)[keyof typeof REVIEW_CRITERIA][number];
export const REVIEW_SCORE_MAX = 4;
export * from './hub.js';
