import { z } from 'zod';
import { parseServiceAccount } from '../push/fcm.js';

const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const;

/** The local storage container (infra/storage); development-only credentials. */
export const LOCAL_STORAGE = {
  endpoint: 'http://localhost:8333',
  accessKeyId: 'kcp-dev-access-key',
  secretAccessKey: 'kcp-dev-secret-key-not-for-production',
} as const;

/** Signs the mock's webhooks in development (the mock is refused in production). */
export const MOCK_STRIPE_WEBHOOK_SECRET = 'whsec_kcpMockDevelopmentOnly';

/** The published development secrets (.env.example, docker-compose.yml). */
const DEVELOPMENT_SECRETS = [
  'dev-only-access-token-secret-change-me-0123456789',
  'ZGV2LW9ubHktZW5jcnlwdGlvbi1rZXktMzJieXRlcyE=',
];
const looksLikeDevelopmentSecret = (value: string) =>
  DEVELOPMENT_SECRETS.includes(value) || /dev-only|change-?me/i.test(value);
const isHttps = (url: string) => url.startsWith('https://');
const isLocalhost = (url: string) => /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/.test(url);

/**
 * Every environment variable the API reads. The app refuses to start if one is
 * missing or malformed, so configuration mistakes surface at deploy time, not at 2 a.m.
 */
export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    LOG_LEVEL: z.enum(LOG_LEVELS).default('info'),
    API_PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
    DATABASE_URL: z
      .string()
      .regex(/^postgres(ql)?:\/\//, 'DATABASE_URL must be a postgresql:// connection string'),
    REDIS_URL: z.string().regex(/^rediss?:\/\//, 'REDIS_URL must be a redis:// or rediss:// URL'),
    /** Comma-separated list of browser origins allowed to call the API. */
    CORS_ORIGINS: z
      .string()
      .default('')
      .transform((value) =>
        value
          .split(',')
          .map((origin) => origin.trim())
          .filter(Boolean),
      )
      .pipe(z.array(z.url())),
    /** Interactive API docs at /docs. Defaults to on everywhere except production. */
    SWAGGER_ENABLED: z.stringbool().optional(),
    /** Set by the Docker build (git SHA or tag); shown by the health endpoint. */
    APP_VERSION: z.string().default('dev'),
    /**
     * How many proxies sit in front of the API and add to X-Forwarded-For (for example
     * 2 for Cloudflare plus the host's load balancer). Rate limits, audit logs and
     * consent records use the client IP found this way. 0 = connected directly.
     */
    TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(1),

    // ── Auth ──
    /** Signs access tokens (HS256). At least 32 random characters; different per environment. */
    JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
    ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(900),
    /** Families stay signed in this long after typing their password, then log in again. */
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(30),
    /** Staff sessions end this long after logging in (password and two-factor code). */
    STAFF_SESSION_HOURS: z.coerce.number().int().min(1).max(72).default(12),
    /** 32 random bytes, base64-encoded. Encrypts two-factor secrets at rest. */
    ENCRYPTION_KEY: z
      .string()
      .refine(
        (value) => Buffer.from(value, 'base64').length === 32,
        'ENCRYPTION_KEY must be 32 bytes, base64-encoded (openssl rand -base64 32)',
      ),
    /** Set on the refresh-token cookie when the API and web app share a parent domain. */
    COOKIE_DOMAIN: z.string().optional(),
    /**
     * Only for running the production image on your own machine (docker compose
     * --profile api): accepts the published development secrets while every URL is
     * http://localhost. Never set this anywhere else.
     */
    ALLOW_DEVELOPMENT_SECRETS: z.stringbool().default(false),

    // ── Email ──
    /** smtp = send through SMTP_URL; memory = keep in memory (tests only). */
    MAIL_TRANSPORT: z.enum(['smtp', 'memory']).default('smtp'),
    SMTP_URL: z
      .string()
      .regex(/^smtps?:\/\//, 'SMTP_URL must be an smtp:// or smtps:// URL')
      .optional(),
    MAIL_FROM: z.string().default('Kids Coding Platform <no-reply@localhost>'),
    /** Public URL of the student and parent web app; used in email links. */
    WEB_APP_URL: z.url().default('http://localhost:3001'),
    /** Public URL of the marketing site (apps/site); used in waitlist emails. */
    SITE_URL: z.url().default('http://localhost:3003'),

    // ── File storage (S3 API: Cloudflare R2 in staging and production) ──
    /**
     * The S3 endpoint, e.g. https://<account>.r2.cloudflarestorage.com. Outside
     * production it defaults to the local storage container (docker compose "storage").
     */
    S3_ENDPOINT: z.url().optional(),
    /** "auto" for R2. */
    S3_REGION: z.string().min(1).default('auto'),
    S3_BUCKET: z.string().min(3).default('kcp-files'),
    S3_ACCESS_KEY_ID: z.string().min(1).optional(),
    S3_SECRET_ACCESS_KEY: z.string().min(1).optional(),
    /** Bucket in the path (http://host/bucket/key). Defaults to on when S3_ENDPOINT is set. */
    S3_FORCE_PATH_STYLE: z.stringbool().optional(),

    // ── Payments ──
    /** Public URL of this API as browsers reach it (the development checkout page). */
    API_PUBLIC_URL: z.url().default('http://localhost:3000'),
    /**
     * Stripe's secret key (sk_test_… or sk_live_…, or a restricted rk_… key). With it,
     * card payments go through Stripe; without it, development uses a mock of Stripe
     * and production has no card payments (manual payments still work).
     */
    STRIPE_SECRET_KEY: z
      .string()
      .regex(/^(sk|rk)_(test|live)_\w+$/, 'STRIPE_SECRET_KEY looks like sk_test_… or sk_live_…')
      .optional(),
    /** Signing secret of the webhook endpoint (whsec_…), from Stripe's dashboard. */
    STRIPE_WEBHOOK_SECRET: z
      .string()
      .regex(/^whsec_\w+$/, 'STRIPE_WEBHOOK_SECRET looks like whsec_…')
      .optional(),
    /** Use the mock of Stripe (never in production). Defaults to on without STRIPE_SECRET_KEY. */
    STRIPE_MOCK: z.stringbool().optional(),

    // ── Push notifications (the mobile app) ──
    /**
     * The Firebase service account (JSON, or the JSON base64-encoded) from the Firebase
     * console → Project settings → Service accounts. With it, push notifications go
     * through Firebase Cloud Messaging; without it, they are only written to the log.
     */
    FIREBASE_SERVICE_ACCOUNT: z
      .string()
      .optional()
      .refine((value) => {
        if (!value) return true;
        try {
          parseServiceAccount(value);
          return true;
        } catch {
          return false;
        }
      }, 'FIREBASE_SERVICE_ACCOUNT must be the service account JSON (or that JSON base64-encoded)'),
    /**
     * fcm = send through Firebase; log = only log them; memory = keep in memory (tests).
     * Defaults to fcm with FIREBASE_SERVICE_ACCOUNT, otherwise log.
     */
    PUSH_TRANSPORT: z.enum(['fcm', 'log', 'memory']).optional(),

    // ── Team git hosting (hackathons) ──
    /**
     * The Forgejo server that holds the teams' repositories (never public: students
     * reach it only through this API). Without it, events run without team repositories.
     */
    FORGEJO_URL: z.url().optional(),
    /** An access token of Forgejo's admin account (scopes: all). */
    FORGEJO_TOKEN: z.string().min(20).optional(),
  })
  .refine((env) => env.MAIL_TRANSPORT !== 'smtp' || Boolean(env.SMTP_URL), {
    message: 'SMTP_URL is required when MAIL_TRANSPORT is smtp',
    path: ['SMTP_URL'],
  })
  .refine(
    (env) =>
      env.NODE_ENV !== 'production' ||
      Boolean(env.S3_ENDPOINT && env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY),
    {
      message: 'S3_ENDPOINT, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY are required in production',
      path: ['S3_ENDPOINT'],
    },
  )
  .refine((env) => !env.STRIPE_SECRET_KEY || Boolean(env.STRIPE_WEBHOOK_SECRET), {
    message: 'STRIPE_WEBHOOK_SECRET is required with STRIPE_SECRET_KEY',
    path: ['STRIPE_WEBHOOK_SECRET'],
  })
  .refine((env) => !env.FORGEJO_URL || Boolean(env.FORGEJO_TOKEN), {
    message: 'FORGEJO_TOKEN is required with FORGEJO_URL',
    path: ['FORGEJO_TOKEN'],
  })
  .refine((env) => env.PUSH_TRANSPORT !== 'fcm' || Boolean(env.FIREBASE_SERVICE_ACCOUNT), {
    message: 'FIREBASE_SERVICE_ACCOUNT is required when PUSH_TRANSPORT is fcm',
    path: ['FIREBASE_SERVICE_ACCOUNT'],
  })
  .refine((env) => env.NODE_ENV !== 'production' || env.STRIPE_MOCK !== true, {
    message: 'STRIPE_MOCK must not be on in production',
    path: ['STRIPE_MOCK'],
  })
  .refine((env) => !(env.STRIPE_SECRET_KEY && env.STRIPE_MOCK === true), {
    message: 'STRIPE_MOCK and STRIPE_SECRET_KEY can’t both be set',
    path: ['STRIPE_MOCK'],
  })
  // A server families reach over https is a real deployment: it must run in production
  // mode (secure cookies, no Stripe mock, no API docs), even if NODE_ENV was forgotten.
  .refine(
    (env) => env.NODE_ENV === 'production' || ![env.WEB_APP_URL, env.API_PUBLIC_URL].some(isHttps),
    {
      message: 'NODE_ENV must be production when WEB_APP_URL or API_PUBLIC_URL uses https',
      path: ['NODE_ENV'],
    },
  )
  .refine(
    (env) =>
      env.NODE_ENV !== 'production' ||
      (env.ALLOW_DEVELOPMENT_SECRETS && [env.WEB_APP_URL, env.API_PUBLIC_URL].every(isLocalhost)) ||
      !(
        looksLikeDevelopmentSecret(env.JWT_ACCESS_SECRET) ||
        looksLikeDevelopmentSecret(env.ENCRYPTION_KEY)
      ),
    {
      message:
        'JWT_ACCESS_SECRET and ENCRYPTION_KEY still have the development values: generate new ones (openssl rand -base64 48 / 32)',
      path: ['JWT_ACCESS_SECRET'],
    },
  )
  .transform((env) => {
    // Development and tests use the storage container and its built-in credentials
    // (infra/storage/s3.json) unless told otherwise.
    const local = env.NODE_ENV !== 'production' && !env.S3_ENDPOINT;
    const endpoint = local ? LOCAL_STORAGE.endpoint : env.S3_ENDPOINT;
    // Cards: the real Stripe with a key, the mock in development, otherwise none.
    const stripeMode: 'stripe' | 'mock' | 'off' = env.STRIPE_SECRET_KEY
      ? 'stripe'
      : (env.STRIPE_MOCK ?? env.NODE_ENV !== 'production')
        ? 'mock'
        : 'off';
    return {
      ...env,
      STRIPE_MODE: stripeMode,
      STRIPE_WEBHOOK_SECRET:
        env.STRIPE_WEBHOOK_SECRET ??
        (stripeMode === 'mock' ? MOCK_STRIPE_WEBHOOK_SECRET : undefined),
      PUSH_TRANSPORT: env.PUSH_TRANSPORT ?? (env.FIREBASE_SERVICE_ACCOUNT ? 'fcm' : 'log'),
      SWAGGER_ENABLED: env.SWAGGER_ENABLED ?? env.NODE_ENV !== 'production',
      S3_ENDPOINT: endpoint,
      S3_ACCESS_KEY_ID: env.S3_ACCESS_KEY_ID ?? (local ? LOCAL_STORAGE.accessKeyId : undefined),
      S3_SECRET_ACCESS_KEY:
        env.S3_SECRET_ACCESS_KEY ?? (local ? LOCAL_STORAGE.secretAccessKey : undefined),
      S3_FORCE_PATH_STYLE: env.S3_FORCE_PATH_STYLE ?? Boolean(endpoint),
    };
  });

export type Env = z.output<typeof envSchema>;

/** Used by ConfigModule: validates process.env and returns the typed, defaulted values. */
export function validateEnv(raw: Record<string, unknown>): Env {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${problems}`);
  }
  return result.data;
}
