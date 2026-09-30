import { validateEnv } from './env.js';

const base = {
  DATABASE_URL: 'postgresql://kcp:kcp@localhost:5432/kcp',
  REDIS_URL: 'redis://localhost:6379',
  JWT_ACCESS_SECRET: 'x'.repeat(32),
  ENCRYPTION_KEY: Buffer.alloc(32, 1).toString('base64'),
  SMTP_URL: 'smtp://localhost:1025',
};

const production = {
  ...base,
  NODE_ENV: 'production',
  S3_ENDPOINT: 'https://account.r2.cloudflarestorage.com',
  S3_ACCESS_KEY_ID: 'key',
  S3_SECRET_ACCESS_KEY: 'secret',
};

describe('validateEnv', () => {
  it('applies defaults for optional values', () => {
    const env = validateEnv(base);
    expect(env.NODE_ENV).toBe('development');
    expect(env.API_PORT).toBe(3000);
    expect(env.CORS_ORIGINS).toEqual([]);
    expect(env.SWAGGER_ENABLED).toBe(true);
  });

  it('parses a comma-separated list of CORS origins', () => {
    const env = validateEnv({
      ...base,
      CORS_ORIGINS: 'http://localhost:3001, https://app.example.com',
    });
    expect(env.CORS_ORIGINS).toEqual(['http://localhost:3001', 'https://app.example.com']);
  });

  it('turns API docs off in production unless enabled explicitly', () => {
    expect(validateEnv(production).SWAGGER_ENABLED).toBe(false);
    expect(validateEnv({ ...production, SWAGGER_ENABLED: 'true' }).SWAGGER_ENABLED).toBe(true);
  });

  it('uses the local storage container outside production', () => {
    const env = validateEnv(base);
    expect(env.S3_ENDPOINT).toBe('http://localhost:8333');
    expect(env.S3_ACCESS_KEY_ID).toBe('kcp-dev-access-key');
    expect(env.S3_FORCE_PATH_STYLE).toBe(true);
    expect(env.S3_BUCKET).toBe('kcp-files');
  });

  it('needs real storage credentials in production, and never falls back to the dev ones', () => {
    const { S3_ACCESS_KEY_ID: _key, ...noKey } = production;
    expect(() => validateEnv(noKey)).toThrow(/S3_ACCESS_KEY_ID/);
    const env = validateEnv(production);
    expect(env.S3_ENDPOINT).toBe('https://account.r2.cloudflarestorage.com');
    expect(env.S3_FORCE_PATH_STYLE).toBe(true);
    expect(() => validateEnv({ ...production, S3_ENDPOINT: undefined })).toThrow(/S3_ENDPOINT/);
  });

  it('refuses to start without a database URL', () => {
    const { DATABASE_URL: _omit, ...rest } = base;
    expect(() => validateEnv(rest)).toThrow(/DATABASE_URL/);
  });

  it('requires strong auth secrets', () => {
    expect(() => validateEnv({ ...base, JWT_ACCESS_SECRET: 'short' })).toThrow(/JWT_ACCESS_SECRET/);
    expect(() => validateEnv({ ...base, ENCRYPTION_KEY: 'bm90LTMyLWJ5dGVz' })).toThrow(
      /ENCRYPTION_KEY/,
    );
  });

  it('needs an SMTP server unless mail is kept in memory', () => {
    const { SMTP_URL: _omit, ...rest } = base;
    expect(() => validateEnv(rest)).toThrow(/SMTP_URL/);
    expect(validateEnv({ ...rest, MAIL_TRANSPORT: 'memory' }).MAIL_TRANSPORT).toBe('memory');
  });

  it('rejects malformed values with a readable message', () => {
    expect(() => validateEnv({ ...base, API_PORT: 'abc', CORS_ORIGINS: 'not-a-url' })).toThrow(
      /API_PORT[\s\S]*CORS_ORIGINS/,
    );
  });

  it('uses the Stripe mock in development, real Stripe with a key, and neither in production', () => {
    const dev = validateEnv(base);
    expect(dev.STRIPE_MODE).toBe('mock');
    expect(dev.STRIPE_WEBHOOK_SECRET).toMatch(/^whsec_/);
    expect(validateEnv({ ...base, STRIPE_MOCK: 'false' }).STRIPE_MODE).toBe('off');
    expect(validateEnv(production).STRIPE_MODE).toBe('off');
    expect(validateEnv(production).STRIPE_WEBHOOK_SECRET).toBeUndefined();
    const live = validateEnv({
      ...production,
      STRIPE_SECRET_KEY: 'sk_live_abc123',
      STRIPE_WEBHOOK_SECRET: 'whsec_abc123',
    });
    expect(live.STRIPE_MODE).toBe('stripe');
  });

  it('refuses the Stripe mock in production, and a key without its webhook secret', () => {
    expect(() => validateEnv({ ...production, STRIPE_MOCK: 'true' })).toThrow(/STRIPE_MOCK/);
    expect(() => validateEnv({ ...base, STRIPE_SECRET_KEY: 'sk_test_abc' })).toThrow(
      /STRIPE_WEBHOOK_SECRET/,
    );
  });

  it('refuses a deployment that forgot NODE_ENV=production', () => {
    expect(() => validateEnv({ ...base, WEB_APP_URL: 'https://app.example.com' })).toThrow(
      /NODE_ENV must be production/,
    );
    expect(validateEnv({ ...production, WEB_APP_URL: 'https://app.example.com' }).NODE_ENV).toBe(
      'production',
    );
  });

  it('refuses the published development secrets in production, except on localhost on purpose', () => {
    const devSecrets = {
      JWT_ACCESS_SECRET: 'dev-only-access-token-secret-change-me-0123456789',
      ENCRYPTION_KEY: 'ZGV2LW9ubHktZW5jcnlwdGlvbi1rZXktMzJieXRlcyE=',
    };
    expect(() => validateEnv({ ...production, ...devSecrets })).toThrow(/development values/);
    expect(() =>
      validateEnv({ ...production, JWT_ACCESS_SECRET: 'please-change-me-'.repeat(3) }),
    ).toThrow(/development values/);
    // docker compose --profile api: the production image on your own machine.
    expect(
      validateEnv({ ...production, ...devSecrets, ALLOW_DEVELOPMENT_SECRETS: 'true' }).NODE_ENV,
    ).toBe('production');
    expect(() =>
      validateEnv({
        ...production,
        ...devSecrets,
        ALLOW_DEVELOPMENT_SECRETS: 'true',
        WEB_APP_URL: 'https://app.example.com',
      }),
    ).toThrow(/development values/);
    // Development doesn't care.
    expect(validateEnv({ ...base, ...devSecrets }).NODE_ENV).toBe('development');
  });
});
