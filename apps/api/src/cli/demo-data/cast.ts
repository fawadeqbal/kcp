/**
 * Who is in the demo: families in Pakistan and Egypt, their children, how each child
 * learns, and how each family pays. Everything else (usernames, nicknames, dates) is
 * worked out from this when the data is loaded.
 *
 * Lahore has more than AREA_BOARD_MIN_STUDENTS children on public boards, so its city
 * board and the Punjab region board show up; smaller places show "not enough students
 * yet" instead.
 */

/** Every demo account's email ends with this (and the script finds its data by it). */
export const DEMO_DOMAIN = 'kcp-demo.test';

export const PASSWORDS = {
  parent: 'demo password 123',
  child: 'kid pass 42',
  staff: 'demo staff password',
} as const;

/**
 * How a child learns:
 * - star: nearly every day, long streaks, far ahead;
 * - steady: most days;
 * - weekend: mostly at the weekend;
 * - faded: keen for the first weeks, then stopped;
 * - returning: took a break of two weeks, then came back;
 * - new: joined in the last days;
 * - idle: opened one lesson and never came back.
 */
export type Pattern = 'star' | 'steady' | 'weekend' | 'faded' | 'returning' | 'new' | 'idle';

/**
 * How a family pays. Card plans go through the Stripe mock when it is on (without it
 * they become manual plans, except the ended one, which is only history).
 */
export type PlanScenario =
  | 'card-monthly'
  | 'card-yearly'
  /** The last renewal failed: premium stays until the period ends. */
  | 'card-past-due'
  /** Cancelled a few days ago: premium stays until the period ends. */
  | 'card-canceling'
  /** Cancelled after the first month, ended since. */
  | 'card-ended'
  /** Paid three months by bank transfer or wallet. */
  | 'manual'
  /** Paid three months, part of it given back. */
  | 'manual-partial-refund'
  /** Paid, then refunded in full: premium ended at once. */
  | 'manual-refunded'
  /** Paid one month and didn't renew. */
  | 'manual-expired'
  | 'none';

/** Premium given by staff to the family's first child. */
export type GrantScenario = 'active' | 'revoked' | 'expired';

export interface ChildSpec {
  /** City slug from the seed (packages/database/prisma/seed-data/locations.ts), or none. */
  city: string | null;
  pattern: Pattern;
  /** Days ago the child's account was made. */
  joined: number;
  /** Public leaderboards (the parent's switch); on unless false. */
  boards?: boolean;
  /** Public portfolio (the parent's switch). */
  portfolio?: boolean;
  age?: 14 | 15 | 16;
}

export interface FamilySpec {
  name: string;
  /** Before the @: "sana.malik" → sana.malik@kcp-demo.test */
  email: string;
  language: 'en' | 'ar' | 'ur';
  country: 'PK' | 'EG';
  plan: PlanScenario;
  children: ChildSpec[];
  grant?: GrantScenario;
  /** How a manual plan was paid. */
  method?: string;
  /** A second adult on the family's account (a guardian). */
  guardian?: { name: string; email: string };
}

const kid = (
  city: string | null,
  pattern: Pattern,
  joined: number,
  extra: Partial<ChildSpec> = {},
): ChildSpec => ({ city, pattern, joined, ...extra });

export const FAMILIES: FamilySpec[] = [
  // ── Lahore (Punjab): enough students for city and region boards ───────────
  {
    name: 'Sana Malik',
    email: 'sana.malik',
    language: 'en',
    country: 'PK',
    plan: 'card-monthly',
    guardian: { name: 'Adeel Malik', email: 'adeel.malik' },
    children: [
      kid('lahore', 'star', 60, { portfolio: true }),
      kid('lahore', 'steady', 58, { age: 14 }),
    ],
  },
  {
    name: 'Imran Qureshi',
    email: 'imran.qureshi',
    language: 'ur',
    country: 'PK',
    plan: 'card-yearly',
    children: [kid('lahore', 'star', 62, { portfolio: true, age: 16 })],
  },
  {
    name: 'Hina Butt',
    email: 'hina.butt',
    language: 'ur',
    country: 'PK',
    plan: 'manual',
    method: 'Bank transfer',
    children: [kid('lahore', 'steady', 50), kid('lahore', 'weekend', 50, { age: 14 })],
  },
  {
    name: 'Farhan Sheikh',
    email: 'farhan.sheikh',
    language: 'en',
    country: 'PK',
    plan: 'card-past-due',
    children: [kid('lahore', 'steady', 45, { portfolio: true })],
  },
  {
    name: 'Ayesha Raza',
    email: 'ayesha.raza',
    language: 'en',
    country: 'PK',
    plan: 'none',
    grant: 'active',
    children: [kid('lahore', 'star', 55, { portfolio: true, age: 16 })],
  },
  {
    name: 'Kamran Javed',
    email: 'kamran.javed',
    language: 'ur',
    country: 'PK',
    plan: 'none',
    grant: 'revoked',
    children: [kid('lahore', 'faded', 56), kid('lahore', 'idle', 40, { age: 14 })],
  },
  {
    name: 'Nadia Aslam',
    email: 'nadia.aslam',
    language: 'en',
    country: 'PK',
    plan: 'card-canceling',
    children: [kid('lahore', 'weekend', 48)],
  },
  {
    name: 'Bilal Chaudhry',
    email: 'bilal.chaudhry',
    language: 'ur',
    country: 'PK',
    plan: 'manual-partial-refund',
    method: 'JazzCash',
    children: [kid('lahore', 'steady', 40, { portfolio: true })],
  },
  {
    name: 'Zainab Tariq',
    email: 'zainab.tariq',
    language: 'en',
    country: 'PK',
    plan: 'none',
    children: [kid('lahore', 'new', 6)],
  },
  {
    name: 'Usman Ghani',
    email: 'usman.ghani',
    language: 'ur',
    country: 'PK',
    plan: 'none',
    children: [kid('lahore', 'new', 3, { age: 14 })],
  },
  {
    name: 'Mehwish Anwar',
    email: 'mehwish.anwar',
    language: 'en',
    country: 'PK',
    plan: 'card-monthly',
    children: [
      kid('lahore', 'steady', 35, { portfolio: true, age: 16 }),
      kid('lahore', 'weekend', 35),
      kid('lahore', 'new', 9, { age: 14 }),
    ],
  },
  {
    name: 'Saad Iqbal',
    email: 'saad.iqbal',
    language: 'ur',
    country: 'PK',
    plan: 'manual-expired',
    method: 'Easypaisa',
    children: [kid('lahore', 'faded', 52)],
  },
  {
    name: 'Rabia Khalid',
    email: 'rabia.khalid',
    language: 'en',
    country: 'PK',
    plan: 'none',
    grant: 'expired',
    children: [kid('lahore', 'returning', 44)],
  },
  {
    name: 'Asad Mirza',
    email: 'asad.mirza',
    language: 'en',
    country: 'PK',
    plan: 'card-ended',
    children: [kid('lahore', 'faded', 58, { portfolio: true })],
  },
  {
    name: 'Fatima Noor',
    email: 'fatima.noor',
    language: 'ur',
    country: 'PK',
    plan: 'none',
    children: [kid('lahore', 'new', 1, { boards: false })],
  },
  {
    name: 'Hamza Siddiqui',
    email: 'hamza.siddiqui',
    language: 'en',
    country: 'PK',
    plan: 'none',
    children: [kid('lahore', 'weekend', 30)],
  },
  {
    name: 'Sobia Rafiq',
    email: 'sobia.rafiq',
    language: 'ur',
    country: 'PK',
    plan: 'none',
    children: [kid('lahore', 'idle', 20, { boards: false })],
  },
  {
    name: 'Tahir Abbas',
    email: 'tahir.abbas',
    language: 'en',
    country: 'PK',
    plan: 'none',
    children: [kid('lahore', 'steady', 25)],
  },
  // ── Elsewhere in Punjab ────────────────────────────────────────────────────
  {
    name: 'Nabeel Akhtar',
    email: 'nabeel.akhtar',
    language: 'en',
    country: 'PK',
    plan: 'card-monthly',
    children: [kid('rawalpindi', 'star', 61, { portfolio: true })],
  },
  {
    name: 'Shazia Parveen',
    email: 'shazia.parveen',
    language: 'ur',
    country: 'PK',
    plan: 'none',
    children: [kid('rawalpindi', 'steady', 33), kid('rawalpindi', 'idle', 33, { age: 14 })],
  },
  {
    name: 'Adnan Latif',
    email: 'adnan.latif',
    language: 'ur',
    country: 'PK',
    plan: 'manual-refunded',
    method: 'Bank transfer',
    children: [kid('faisalabad', 'faded', 47)],
  },
  // ── Sindh ──────────────────────────────────────────────────────────────────
  {
    name: 'Maria Fernandes',
    email: 'maria.fernandes',
    language: 'en',
    country: 'PK',
    plan: 'card-monthly',
    children: [
      kid('karachi', 'star', 59, { portfolio: true, age: 16 }),
      kid('karachi', 'steady', 57),
    ],
  },
  {
    name: 'Owais Memon',
    email: 'owais.memon',
    language: 'ur',
    country: 'PK',
    plan: 'none',
    children: [kid('karachi', 'steady', 41)],
  },
  {
    name: 'Sadia Baig',
    email: 'sadia.baig',
    language: 'en',
    country: 'PK',
    plan: 'card-yearly',
    children: [kid('karachi', 'steady', 38, { portfolio: true })],
  },
  {
    name: 'Junaid Shah',
    email: 'junaid.shah',
    language: 'ur',
    country: 'PK',
    plan: 'none',
    children: [kid('karachi', 'weekend', 29), kid('karachi', 'new', 4, { age: 14 })],
  },
  {
    name: 'Areeba Hussain',
    email: 'areeba.hussain',
    language: 'en',
    country: 'PK',
    plan: 'none',
    children: [kid('karachi', 'returning', 50)],
  },
  {
    name: 'Faisal Khan',
    email: 'faisal.khan',
    language: 'ur',
    country: 'PK',
    plan: 'none',
    grant: 'active',
    children: [kid('hyderabad', 'steady', 36)],
  },
  // ── Islamabad, Peshawar, and a family without a city ──────────────────────
  {
    name: 'Omer Hayat',
    email: 'omer.hayat',
    language: 'en',
    country: 'PK',
    plan: 'card-monthly',
    children: [
      kid('islamabad', 'star', 63, { portfolio: true, age: 15 }),
      kid('islamabad', 'steady', 40),
    ],
  },
  {
    name: 'Samina Yousaf',
    email: 'samina.yousaf',
    language: 'ur',
    country: 'PK',
    plan: 'none',
    children: [kid('islamabad', 'faded', 60)],
  },
  {
    name: 'Waqas Ahmed',
    email: 'waqas.ahmed',
    language: 'en',
    country: 'PK',
    plan: 'none',
    children: [
      kid('islamabad', 'new', 8),
      kid('islamabad', 'idle', 12, { boards: false, age: 14 }),
    ],
  },
  {
    name: 'Gul Khan',
    email: 'gul.khan',
    language: 'ur',
    country: 'PK',
    plan: 'none',
    children: [kid('peshawar', 'weekend', 27)],
  },
  {
    name: 'Irfan Haider',
    email: 'irfan.haider',
    language: 'en',
    country: 'PK',
    plan: 'none',
    children: [kid(null, 'steady', 22)],
  },
  // ── Egypt ──────────────────────────────────────────────────────────────────
  {
    name: 'Mona Adel',
    email: 'mona.adel',
    language: 'ar',
    country: 'EG',
    plan: 'card-monthly',
    children: [
      kid('cairo', 'star', 60, { portfolio: true }),
      kid('cairo', 'steady', 54, { age: 14 }),
    ],
  },
  {
    name: 'Karim Mostafa',
    email: 'karim.mostafa',
    language: 'ar',
    country: 'EG',
    plan: 'manual',
    method: 'Vodafone Cash',
    children: [kid('cairo', 'steady', 43, { portfolio: true })],
  },
  {
    name: 'Yasmin Fathy',
    email: 'yasmin.fathy',
    language: 'en',
    country: 'EG',
    plan: 'none',
    children: [kid('cairo', 'weekend', 31), kid('cairo', 'new', 5, { age: 14 })],
  },
  {
    name: 'Tarek Hassan',
    email: 'tarek.hassan',
    language: 'ar',
    country: 'EG',
    plan: 'card-yearly',
    children: [kid('cairo', 'star', 57, { portfolio: true, age: 16 })],
  },
  {
    name: 'Heba Samir',
    email: 'heba.samir',
    language: 'ar',
    country: 'EG',
    plan: 'none',
    children: [kid('cairo', 'faded', 55), kid('cairo', 'returning', 46)],
  },
  {
    name: 'Sherif Nabil',
    email: 'sherif.nabil',
    language: 'ar',
    country: 'EG',
    plan: 'none',
    children: [kid('cairo', 'idle', 15)],
  },
  {
    name: 'Rania Lotfy',
    email: 'rania.lotfy',
    language: 'ar',
    country: 'EG',
    plan: 'card-monthly',
    children: [kid('giza', 'steady', 42), kid('giza', 'weekend', 42, { age: 14 })],
  },
  {
    name: 'Ahmed Zaki',
    email: 'ahmed.zaki',
    language: 'en',
    country: 'EG',
    plan: 'none',
    children: [kid('giza', 'new', 2), kid('giza', 'steady', 26, { age: 16 })],
  },
  {
    name: 'Dina Magdy',
    email: 'dina.magdy',
    language: 'ar',
    country: 'EG',
    plan: 'manual',
    method: 'InstaPay',
    children: [kid('alexandria', 'star', 58, { portfolio: true })],
  },
  {
    name: 'Mahmoud Saeed',
    email: 'mahmoud.saeed',
    language: 'ar',
    country: 'EG',
    plan: 'none',
    children: [kid('alexandria', 'faded', 49), kid('alexandria', 'new', 7, { age: 14 })],
  },
  {
    name: 'Laila Gamal',
    email: 'laila.gamal',
    language: 'en',
    country: 'EG',
    plan: 'none',
    children: [kid('alexandria', 'steady', 34)],
  },
];

/** Parents who signed up but haven't added a child: one confirmed, one not yet. */
export const PARENTS_WITHOUT_CHILDREN = [
  { name: 'Amna Saleem', email: 'amna.saleem', language: 'ur', country: 'PK', verified: true },
  { name: 'Hassan Raza', email: 'hassan.raza', language: 'en', country: 'PK', verified: false },
] as const;

/** The team, in the admin panel. Each sets up two-factor login the first time. */
export const STAFF = [
  { name: 'Demo Super Admin', email: 'superadmin', role: 'super_admin' },
  // Hub payout batches need two different super admins.
  { name: 'Demo Finance Lead', email: 'superadmin.two', role: 'super_admin' },
  { name: 'Demo Admin', email: 'admin', role: 'admin' },
  { name: 'Demo Moderator', email: 'moderator', role: 'moderator' },
  { name: 'Demo Content Creator', email: 'content', role: 'content_creator' },
] as const;

/** Families waiting for their country to open (the marketing site's waitlist). */
export const WAITLIST = [
  { email: 'noura.alharbi', country: 'SA', age: 'AGE_13_16', language: 'ar', confirmed: true },
  { email: 'faisal.alotaibi', country: 'SA', age: 'AGE_9_12', language: 'ar', confirmed: true },
  { email: 'reem.alqahtani', country: 'SA', age: 'AGE_13_16', language: 'en', confirmed: false },
  { email: 'omar.alshehri', country: 'SA', age: 'AGE_9_12', language: 'ar', confirmed: true },
  { email: 'layla.almansoori', country: 'AE', age: 'AGE_13_16', language: 'en', confirmed: true },
  { email: 'khalid.alnuaimi', country: 'AE', age: 'AGE_9_12', language: 'ar', confirmed: true },
  { email: 'priya.nair', country: 'AE', age: 'AGE_13_16', language: 'en', confirmed: false },
  { email: 'ali.hamdan', country: 'AE', age: 'AGE_9_12', language: 'ur', confirmed: true },
  { email: 'sara.aldhaheri', country: 'AE', age: 'AGE_13_16', language: 'ar', confirmed: true },
  { email: 'yousuf.qasim', country: 'AE', age: 'AGE_13_16', language: 'ur', confirmed: false },
] as const;
