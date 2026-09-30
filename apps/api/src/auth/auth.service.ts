import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ROLE_KEYS, type User } from '@kcp/database';
import type { Redis } from 'ioredis';
import { dummyPasswordHash, hashPassword, verifyPassword } from '../common/crypto/passwords.js';
import { SecretBox } from '../common/crypto/secret-box.js';
import {
  generateTotpSecret,
  otpauthUrl,
  TOTP_PERIOD_SECONDS,
  verifyTotp,
} from '../common/crypto/totp.js';
import { RateLimiterService } from '../common/rate-limit/rate-limiter.service.js';
import type { RequestContext } from '../common/request-context.js';
import { AuditService } from '../audit/audit.service.js';
import { AppConfigService } from '../config/app-config.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { MailService } from '../mail/mail.service.js';
import { type MailTemplate, toMailLanguage } from '../mail/templates.js';
import { AbilityFactory } from '../permissions/ability.factory.js';
import { REDIS } from '../redis/redis.constants.js';
import { AccessTokenService, type MfaStage } from './access-token.service.js';
import {
  EMAIL_VERIFICATION_TTL_HOURS,
  MFA_LOCK_SECONDS,
  MFA_MAX_FAILURES,
  PASSWORD_RESET_TTL_HOURS,
  TERMS_VERSION,
  TOTP_ISSUER,
} from './auth.constants.js';
import type { LoginResponseDto, MeDto, MfaSetupResponseDto } from './dto/auth-response.dto.js';
import type { ClientApp } from './dto/login.dto.js';
import type { ParentSignUpDto } from './dto/sign-up.dto.js';
import { assertStrongPassword } from './password-policy.js';
import { SessionService } from './session.service.js';
import { VerificationTokenService } from './verification-token.service.js';

/** Result of a successful login, before the controller decides how to deliver the refresh token. */
export interface AuthenticatedResult {
  response: LoginResponseDto;
  refreshToken?: string;
  refreshExpiresAt?: Date;
}

const INVALID_CREDENTIALS = {
  error: 'INVALID_CREDENTIALS',
  message: 'Email or password is incorrect.',
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly secretBox: SecretBox;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly tokens: AccessTokenService,
    private readonly sessions: SessionService,
    private readonly emailTokens: VerificationTokenService,
    private readonly mail: MailService,
    private readonly audit: AuditService,
    private readonly abilities: AbilityFactory,
    private readonly limiter: RateLimiterService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {
    this.secretBox = new SecretBox(config.get('ENCRYPTION_KEY'));
  }

  // ── Sign-up and email verification ─────────────────────────────────────────

  /**
   * Creates a parent account waiting for email verification. The response never
   * reveals whether the email is already registered; the inbox owner finds out.
   */
  async signUpParent(dto: ParentSignUpDto, ctx: RequestContext): Promise<void> {
    // Checked before looking the email up, so the answer can't tell accounts apart.
    assertStrongPassword(dto.password, { email: dto.email, name: dto.displayName });
    // Hash first on every path, so timing doesn't reveal existing accounts either.
    const passwordHash = await hashPassword(dto.password);

    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      if (existing.status === 'PENDING_VERIFICATION') {
        await this.sendVerificationEmail(existing);
      } else if (existing.status === 'ACTIVE') {
        await this.mail.send({
          to: dto.email,
          template: 'accountExists',
          language: toMailLanguage(existing.languageCode),
          params: {
            name: existing.displayName ?? '',
            actionUrl: this.appUrl(existing.languageCode, '/login'),
          },
        });
      }
      return;
    }

    const [language, country, parentRole] = await Promise.all([
      this.prisma.language.findFirst({ where: { code: dto.languageCode, isActive: true } }),
      this.prisma.country.findFirst({ where: { code: dto.countryCode, isActive: true } }),
      this.prisma.role.findUniqueOrThrow({ where: { key: ROLE_KEYS.PARENT } }),
    ]);
    if (!language) {
      throw new BadRequestException({
        error: 'UNSUPPORTED_LANGUAGE',
        message: 'This language is not available yet.',
      });
    }
    if (!country) {
      throw new BadRequestException({
        error: 'UNSUPPORTED_COUNTRY',
        message: 'We are not open in this country yet.',
      });
    }

    const user = await this.prisma.user.create({
      data: {
        kind: 'ADULT',
        status: 'PENDING_VERIFICATION',
        roleId: parentRole.id,
        email: dto.email,
        passwordHash,
        displayName: dto.displayName,
        languageCode: language.code,
        countryCode: country.code,
        termsVersion: TERMS_VERSION,
        termsAcceptedAt: new Date(),
      },
    });
    await this.audit.record({
      actor: { id: user.id, roleKey: ROLE_KEYS.PARENT },
      action: 'auth.sign_up',
      entityType: 'User',
      entityId: user.id,
      after: { role: ROLE_KEYS.PARENT, countryCode: country.code, termsVersion: TERMS_VERSION },
      context: ctx,
    });
    await this.sendVerificationEmail(user);
  }

  async resendVerification(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user?.status === 'PENDING_VERIFICATION') {
      await this.sendVerificationEmail(user);
    }
  }

  async verifyEmail(token: string): Promise<void> {
    const verified = await this.prisma.$transaction(async (tx) => {
      const userId = await this.emailTokens.consume(token, 'EMAIL_VERIFICATION', tx);
      const updated = await tx.user.updateMany({
        where: { id: userId, status: 'PENDING_VERIFICATION' },
        data: { status: 'ACTIVE', emailVerifiedAt: new Date() },
      });
      return updated.count ? userId : null;
    });
    if (verified) await this.sendWelcomeEmail(verified);
  }

  /** After the email is confirmed: what to do next (add a child). Never fails the request. */
  private async sendWelcomeEmail(userId: string): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user?.email) return;
      await this.mail.send({
        to: user.email,
        template: 'welcome',
        language: toMailLanguage(user.languageCode),
        params: {
          name: user.displayName ?? '',
          actionUrl: this.appUrl(user.languageCode, '/children/new'),
        },
      });
    } catch (error) {
      this.logger.warn(`Welcome email not sent: ${(error as Error).message}`);
    }
  }

  // ── Password reset ─────────────────────────────────────────────────────────

  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (
      !user ||
      user.kind !== 'ADULT' ||
      user.status === 'DELETED' ||
      user.status === 'SUSPENDED'
    ) {
      return;
    }
    const token = await this.emailTokens.issue(user.id, 'PASSWORD_RESET', PASSWORD_RESET_TTL_HOURS);
    await this.mail.send({
      to: email,
      template: 'resetPassword',
      language: toMailLanguage(user.languageCode),
      params: {
        name: user.displayName ?? '',
        actionUrl: this.appUrl(
          user.languageCode,
          `/reset-password?token=${encodeURIComponent(token)}`,
        ),
      },
    });
  }

  async resetPassword(token: string, password: string, ctx: RequestContext): Promise<void> {
    assertStrongPassword(password);
    const passwordHash = await hashPassword(password);
    const user = await this.prisma.$transaction(async (tx) => {
      const userId = await this.emailTokens.consume(token, 'PASSWORD_RESET', tx);
      const current = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        include: { role: true },
      });
      // Refused here, the link stays unused (the transaction rolls back).
      assertStrongPassword(password, { email: current.email, name: current.displayName });
      // Opening the reset link proves the parent owns the inbox, so it also verifies the email.
      const updated = await tx.user.update({
        where: { id: userId },
        data: {
          passwordHash,
          ...(current.status === 'PENDING_VERIFICATION'
            ? { status: 'ACTIVE', emailVerifiedAt: new Date() }
            : {}),
        },
      });
      await this.audit.record(
        {
          actor: { id: userId, roleKey: current.role.key },
          action: 'auth.password_reset',
          entityType: 'User',
          entityId: userId,
          context: ctx,
        },
        tx,
      );
      return updated;
    });
    // Anyone holding an old session is signed out.
    await this.sessions.revokeAllForUser(user.id);
    await this.securityEmail(user, 'passwordChanged');
  }

  // ── Login ──────────────────────────────────────────────────────────────────

  async login(
    email: string,
    password: string,
    ctx: RequestContext,
    app: ClientApp = 'web',
  ): Promise<AuthenticatedResult> {
    const user = await this.prisma.user.findUnique({ where: { email }, include: { role: true } });
    const passwordOk = await verifyPassword(
      user?.passwordHash ?? (await dummyPasswordHash()),
      password,
    );
    if (!user || user.kind !== 'ADULT' || !passwordOk) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }
    this.assertCanSignIn(user);
    // Staff: the failed-login count clears only after the two-factor code (verifyMfa),
    // so a known password can't be used to try codes over and over.
    if (!user.role.isStaff) await this.limiter.reset('login-email', email);

    if (app === 'admin' && !user.role.isStaff) {
      throw new ForbiddenException({
        error: 'NOT_STAFF',
        message: 'The admin panel is for staff accounts only.',
      });
    }
    if (app === 'mobile' && user.role.key !== ROLE_KEYS.PARENT) {
      throw new ForbiddenException({
        error: 'NOT_FAMILY',
        message: 'The app is for students and parents. Staff use the admin panel.',
      });
    }

    if (user.role.isStaff) {
      const stage: MfaStage = user.totpEnabledAt ? 'verify' : 'setup';
      return {
        response: {
          status: stage === 'verify' ? 'mfa_required' : 'mfa_setup_required',
          mfaToken: await this.tokens.signMfa({ sub: user.id, stage }),
        },
      };
    }
    return this.startSession(user.id, ctx);
  }

  /**
   * Students log in with the username their parent received. Deleted accounts
   * answer exactly like unknown ones.
   */
  async loginStudent(
    username: string,
    password: string,
    ctx: RequestContext,
    app: ClientApp = 'web',
  ): Promise<AuthenticatedResult> {
    if (app === 'admin') {
      // Children never have staff roles; don't even look the username up.
      throw new ForbiddenException({
        error: 'NOT_STAFF',
        message: 'The admin panel is for staff accounts only.',
      });
    }
    const user = await this.prisma.user.findUnique({ where: { username } });
    const passwordOk = await verifyPassword(
      user?.passwordHash ?? (await dummyPasswordHash()),
      password,
    );
    if (!user || user.kind !== 'STUDENT' || user.status === 'DELETED' || !passwordOk) {
      throw new UnauthorizedException({
        error: 'INVALID_CREDENTIALS',
        message: 'Username or password is incorrect.',
      });
    }
    this.assertCanSignIn(user);
    await this.limiter.reset('student-login-username', username);
    return this.startSession(user.id, ctx);
  }

  /** Staff without two-factor: create (or replace) a pending secret to show as a QR code. */
  async setupMfa(mfaToken: string): Promise<MfaSetupResponseDto> {
    const claims = await this.tokens.verifyMfa(mfaToken);
    if (claims.stage !== 'setup') {
      throw new BadRequestException({
        error: 'MFA_ALREADY_ENABLED',
        message: 'Two-factor login is already set up.',
      });
    }
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: claims.sub } });
    // The token said "set up", but the database decides: an enrolled authenticator is
    // never replaced this way (only by staff resetting two-factor for the account).
    if (user.totpEnabledAt) {
      throw new BadRequestException({
        error: 'MFA_ALREADY_ENABLED',
        message: 'Two-factor login is already set up.',
      });
    }
    const secret = generateTotpSecret();
    await this.prisma.user.update({
      where: { id: user.id },
      data: { totpSecret: this.secretBox.encrypt(secret), totpEnabledAt: null },
    });
    return {
      secret,
      otpauthUrl: otpauthUrl({ secret, account: user.email ?? user.id, issuer: TOTP_ISSUER }),
    };
  }

  /** Checks the authenticator code, finishes setup if needed, and signs the staff member in. */
  async verifyMfa(
    mfaToken: string,
    code: string,
    ctx: RequestContext,
  ): Promise<AuthenticatedResult> {
    const claims = await this.tokens.verifyMfa(mfaToken);
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: claims.sub },
      include: { role: true },
    });
    this.assertCanSignIn(user);
    if (!user.totpSecret) {
      throw new BadRequestException({
        error: 'MFA_NOT_SET_UP',
        message: 'Set up two-factor login first.',
      });
    }
    if (claims.stage === 'setup' && user.totpEnabledAt) {
      throw new BadRequestException({
        error: 'MFA_ALREADY_ENABLED',
        message: 'Two-factor login is already set up.',
      });
    }
    // Wrong codes count per account, whatever IP or login they come from.
    const failuresKey = `auth:mfa-failures:${user.id}`;
    if (Number(await this.redis.get(failuresKey)) >= MFA_MAX_FAILURES) {
      throw new HttpException(
        {
          error: 'TOO_MANY_ATTEMPTS',
          message: 'Too many wrong codes. Two-factor login is paused for this account for an hour.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    const step = verifyTotp(this.secretBox.decrypt(user.totpSecret), code);
    const invalidCode = new UnauthorizedException({
      error: 'INVALID_CODE',
      message: 'That code is not right. Wait for a new code and try again.',
    });
    const failed = async () => {
      // Counted within an hour of the first wrong code (one atomic step, so the count
      // can't be left without an expiry); reaching the limit pauses two-factor login
      // for a full hour from then.
      const [[, count]] = (await this.redis
        .multi()
        .incr(failuresKey)
        .expire(failuresKey, MFA_LOCK_SECONDS, 'NX')
        .exec()) as [[Error | null, number], [Error | null, number]];
      const failures = Number(count);
      if (failures >= MFA_MAX_FAILURES) await this.redis.expire(failuresKey, MFA_LOCK_SECONDS);
      if (failures === MFA_MAX_FAILURES) {
        await this.audit.record({
          actor: { id: user.id, roleKey: user.role.key },
          action: 'auth.mfa_locked',
          entityType: 'User',
          entityId: user.id,
          context: ctx,
        });
      }
      return invalidCode;
    };
    if (step === null) {
      throw await failed();
    }
    // A code is valid for ~90 seconds; remember it so it can't be used twice.
    const firstUse = await this.redis.set(
      `auth:totp:${user.id}:${step}`,
      '1',
      'EX',
      TOTP_PERIOD_SECONDS * 4,
      'NX',
    );
    if (firstUse !== 'OK') {
      throw await failed();
    }
    await this.redis.del(failuresKey);
    if (user.email) await this.limiter.reset('login-email', user.email);

    if (claims.stage === 'setup') {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { totpEnabledAt: new Date() },
      });
      await this.audit.record({
        actor: { id: user.id, roleKey: user.role.key },
        action: 'auth.mfa_enabled',
        entityType: 'User',
        entityId: user.id,
        context: ctx,
      });
      await this.securityEmail(user, 'twoFactorEnabled');
    }
    await this.audit.record({
      actor: { id: user.id, roleKey: user.role.key },
      action: 'auth.staff_login',
      entityType: 'User',
      entityId: user.id,
      context: ctx,
    });
    return this.startSession(user.id, ctx);
  }

  // ── Sessions ───────────────────────────────────────────────────────────────

  async refresh(refreshToken: string, ctx: RequestContext): Promise<AuthenticatedResult> {
    const rotated = await this.sessions.rotate(refreshToken, ctx);
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: rotated.userId },
      include: { role: true },
    });
    if (user.status !== 'ACTIVE') {
      await this.sessions.revoke(rotated.sessionId);
      throw new UnauthorizedException({
        error: 'ACCOUNT_DISABLED',
        message: 'This account is not active.',
      });
    }
    return this.buildAuthenticated(
      user,
      rotated.sessionId,
      rotated.refreshToken,
      rotated.expiresAt,
    );
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (refreshToken) {
      await this.sessions.revokeByRefreshToken(refreshToken);
    }
  }

  async me(userId: string): Promise<MeDto> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { role: true, studentProfile: { select: { nickname: true, avatarKey: true } } },
    });
    const rules = await this.abilities.rulesFor({ id: user.id, roleId: user.roleId });
    return {
      id: user.id,
      kind: user.kind,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      languageCode: user.languageCode,
      countryCode: user.countryCode,
      role: { key: user.role.key, name: user.role.name, isStaff: user.role.isStaff },
      twoFactorEnabled: Boolean(user.totpEnabledAt),
      // Parents accept the terms for their family; a new version asks again.
      mustAcceptTerms: user.role.key === ROLE_KEYS.PARENT && user.termsVersion !== TERMS_VERSION,
      student: user.studentProfile,
      rules: rules as unknown as Record<string, unknown>[],
    };
  }

  /**
   * A signed-in adult changes their password (typing the current one). Every other
   * session ends; this one stays, and the account's email hears about it.
   */
  async changePassword(
    user: { id: string; sessionId: string },
    currentPassword: string,
    newPassword: string,
    ctx: RequestContext,
  ): Promise<void> {
    const account = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      include: { role: true },
    });
    if (account.kind !== 'ADULT' || !account.passwordHash) {
      throw new ForbiddenException({
        error: 'ADULTS_ONLY',
        message: "Children's passwords are changed by their parent.",
      });
    }
    if (!(await verifyPassword(account.passwordHash, currentPassword))) {
      throw new BadRequestException({
        error: 'WRONG_PASSWORD',
        message: 'Your current password is not right.',
      });
    }
    assertStrongPassword(newPassword, { email: account.email, name: account.displayName });
    await this.prisma.user.update({
      where: { id: account.id },
      data: { passwordHash: await hashPassword(newPassword) },
    });
    await this.audit.record({
      actor: { id: account.id, roleKey: account.role.key },
      action: 'auth.password_changed',
      entityType: 'User',
      entityId: account.id,
      context: ctx,
    });
    await this.sessions.revokeAllForUser(account.id, user.sessionId);
    await this.securityEmail(account, 'passwordChanged');
  }

  /** A parent accepts the current terms of use and privacy policy. */
  async acceptTerms(userId: string, version: string, ctx: RequestContext): Promise<void> {
    if (version !== TERMS_VERSION) {
      throw new BadRequestException({
        error: 'TERMS_VERSION_OUTDATED',
        message: 'The terms changed again. Please reload the page and read the new version.',
      });
    }
    const account = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { role: true },
    });
    if (account.termsVersion === version) return;
    await this.prisma.user.update({
      where: { id: userId },
      data: { termsVersion: version, termsAcceptedAt: new Date() },
    });
    await this.audit.record({
      actor: { id: userId, roleKey: account.role.key },
      action: 'auth.terms_accepted',
      entityType: 'User',
      entityId: userId,
      before: { termsVersion: account.termsVersion },
      after: { termsVersion: version },
      context: ctx,
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  /** "Your password changed" and the like. Never fails what triggered it. */
  private async securityEmail(
    user: Pick<User, 'email' | 'displayName' | 'languageCode'>,
    template: Extract<MailTemplate, 'passwordChanged' | 'twoFactorEnabled'>,
  ): Promise<void> {
    if (!user.email) return;
    try {
      await this.mail.send({
        to: user.email,
        template,
        language: toMailLanguage(user.languageCode),
        params: {
          name: user.displayName ?? '',
          actionUrl: this.appUrl(user.languageCode, '/forgot-password'),
        },
      });
    } catch (error) {
      this.logger.warn(`Security email "${template}" not sent: ${(error as Error).message}`);
    }
  }

  private async startSession(userId: string, ctx: RequestContext): Promise<AuthenticatedResult> {
    const issued = await this.sessions.create(userId, ctx);
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
      include: { role: true },
    });
    return this.buildAuthenticated(user, issued.sessionId, issued.refreshToken, issued.expiresAt);
  }

  private async buildAuthenticated(
    user: User & { role: { key: string } },
    sessionId: string,
    refreshToken: string,
    refreshExpiresAt: Date,
  ): Promise<AuthenticatedResult> {
    const accessToken = await this.tokens.signAccess({
      sub: user.id,
      sid: sessionId,
      role: user.role.key,
      kind: user.kind,
    });
    return {
      response: {
        status: 'authenticated',
        accessToken,
        expiresIn: this.tokens.accessTtlSeconds,
        user: await this.me(user.id),
      },
      refreshToken,
      refreshExpiresAt,
    };
  }

  private assertCanSignIn(user: Pick<User, 'status'>): void {
    if (user.status === 'PENDING_VERIFICATION') {
      throw new ForbiddenException({
        error: 'EMAIL_NOT_VERIFIED',
        message: 'Please confirm your email address first. We can send the link again.',
      });
    }
    if (user.status !== 'ACTIVE') {
      throw new ForbiddenException({
        error: 'ACCOUNT_DISABLED',
        message: 'This account is not active. Please contact support.',
      });
    }
  }

  private async sendVerificationEmail(user: User): Promise<void> {
    if (!user.email) {
      return;
    }
    const token = await this.emailTokens.issue(
      user.id,
      'EMAIL_VERIFICATION',
      EMAIL_VERIFICATION_TTL_HOURS,
    );
    await this.mail.send({
      to: user.email,
      template: 'verifyEmail',
      language: toMailLanguage(user.languageCode),
      params: {
        name: user.displayName ?? '',
        actionUrl: this.appUrl(
          user.languageCode,
          `/verify-email?token=${encodeURIComponent(token)}`,
        ),
      },
    });
    this.logger.debug(`Verification email queued for user ${user.id}`);
  }

  /** Links in emails open the web app in the account's language. */
  private appUrl(languageCode: string, path: string): string {
    const base = this.config.get('WEB_APP_URL').replace(/\/+$/, '');
    return `${base}/${toMailLanguage(languageCode)}${path}`;
  }
}
