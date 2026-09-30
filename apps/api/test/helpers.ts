import { randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import type { Redis } from 'ioredis';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { hashPassword } from '../src/common/crypto/passwords.js';
import { totp } from '../src/common/crypto/totp.js';
import { RATE_LIMIT_KEY_PREFIX } from '../src/common/rate-limit/rate-limiter.service.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { MailService, type SentMail } from '../src/mail/mail.service.js';
import { REDIS } from '../src/redis/redis.constants.js';

export const PASSWORD = 'a long enough password 123';

export interface TestContext {
  app: NestExpressApplication;
  prisma: PrismaService;
  redis: Redis;
  mail: MailService;
  http: () => ReturnType<typeof request>;
}

export async function createTestApp(): Promise<TestContext> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>({
    bufferLogs: true,
    bodyParser: false,
  });
  configureApp(app, { swagger: true });
  await app.init();
  return {
    app,
    prisma: app.get(PrismaService),
    redis: app.get(REDIS),
    mail: app.get(MailService),
    http: () => request(app.getHttpServer()),
  };
}

/** Rate limits are shared per IP; tests all come from 127.0.0.1, so reset them. */
export async function resetRateLimits(redis: Redis): Promise<void> {
  const keys = await redis.keys(`${RATE_LIMIT_KEY_PREFIX}*`);
  if (keys.length) {
    await redis.del(...keys);
  }
}

export const uniqueEmail = (label = 'parent') =>
  `${label}-${randomUUID().slice(0, 8)}@e2e.test`.toLowerCase();

/** The newest email sent to an address, from the in-memory outbox. */
export function lastMailTo(mail: MailService, to: string): SentMail | undefined {
  return mail.outbox.findLast((m) => m.to === to);
}

/** Pulls the token out of the link in an email. */
export function tokenFrom(sent: SentMail | undefined): string {
  const url = new URL(sent?.params.actionUrl ?? 'http://missing');
  const token = url.searchParams.get('token');
  if (!token) throw new Error('No token in email link');
  return token;
}

/** Creates an active account directly in the database (staff can't sign up). */
export async function createUser(
  prisma: PrismaService,
  roleKey: string,
  overrides: { email?: string; status?: 'ACTIVE' | 'SUSPENDED'; kind?: 'ADULT' | 'STUDENT' } = {},
) {
  const role = await prisma.role.findUniqueOrThrow({ where: { key: roleKey } });
  const kind = overrides.kind ?? 'ADULT';
  return prisma.user.create({
    data: {
      kind,
      status: overrides.status ?? 'ACTIVE',
      roleId: role.id,
      email: kind === 'ADULT' ? (overrides.email ?? uniqueEmail(roleKey)) : null,
      username: kind === 'STUDENT' ? `student-${randomUUID().slice(0, 8)}` : null,
      passwordHash: await hashPassword(PASSWORD),
      displayName: `${roleKey} tester`,
      emailVerifiedAt: kind === 'ADULT' ? new Date() : null,
    },
  });
}

/** Signs up, verifies and logs in a parent; returns their access token and refresh cookie. */
export async function signUpAndLogin(ctx: TestContext, language = 'en') {
  const email = uniqueEmail();
  await ctx
    .http()
    .post('/v1/auth/parents/sign-up')
    .send({
      email,
      password: PASSWORD,
      displayName: 'Test Parent',
      languageCode: language,
      countryCode: 'PK',
      acceptTerms: true,
    })
    .expect(202);
  await ctx
    .http()
    .post('/v1/auth/email/verify')
    .send({ token: tokenFrom(lastMailTo(ctx.mail, email)) })
    .expect(200);
  const login = await ctx
    .http()
    .post('/v1/auth/login')
    .send({ email, password: PASSWORD })
    .expect(200);
  const user = await ctx.prisma.user.findUniqueOrThrow({ where: { email } });
  return {
    email,
    user,
    accessToken: login.body.accessToken as string,
    cookie: refreshCookie(login.headers['set-cookie']),
  };
}

export function refreshCookie(setCookie: string | string[] | undefined): string {
  const cookies = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
  const cookie = cookies.find((c) => c.startsWith('kcp_refresh='));
  if (!cookie) throw new Error('No refresh cookie set');
  return cookie.split(';')[0]!;
}

export interface ChildInput {
  nickname?: string;
  avatarKey?: string;
  birthYear?: number;
  countryCode?: string;
  languageCode?: string;
  password?: string;
  regionId?: string;
  cityId?: string;
  consents?: { publicLeaderboards: boolean; publicPortfolio: boolean };
}

export const CHILD_PASSWORD = 'kid pass 42';

/** A valid "add a child" body (a 14-year-old in Lahore by default). */
export function childBody(overrides: ChildInput = {}) {
  return {
    nickname:
      overrides.nickname ??
      `Coder${Math.floor(Math.random() * 90_000 + 10_000)
        .toString()
        .slice(0, 4)}x`,
    avatarKey: overrides.avatarKey ?? 'rocket',
    birthYear: overrides.birthYear ?? new Date().getUTCFullYear() - 14,
    countryCode: overrides.countryCode ?? 'PK',
    languageCode: overrides.languageCode ?? 'ur',
    password: overrides.password ?? CHILD_PASSWORD,
    ...(overrides.regionId ? { regionId: overrides.regionId } : {}),
    ...(overrides.cityId ? { cityId: overrides.cityId } : {}),
    consents: overrides.consents ?? { publicLeaderboards: false, publicPortfolio: false },
  };
}

/** Staff login through the admin app (its own cookie) with two-factor setup. */
export async function staffLogin(ctx: TestContext, roleKey: string) {
  const user = await createUser(ctx.prisma, roleKey);
  const login = await ctx
    .http()
    .post('/v1/auth/login')
    .send({ email: user.email, password: PASSWORD, app: 'admin' })
    .expect(200);
  const setup = await ctx
    .http()
    .post('/v1/auth/mfa/setup')
    .send({ mfaToken: login.body.mfaToken })
    .expect(200);
  const done = await ctx
    .http()
    .post('/v1/auth/mfa/verify')
    .send({ mfaToken: login.body.mfaToken, code: totp(setup.body.secret), app: 'admin' })
    .expect(200);
  return {
    user,
    token: done.body.accessToken as string,
    setCookie: done.headers['set-cookie'] as unknown as string[],
  };
}
