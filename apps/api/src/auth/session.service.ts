import { Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { randomToken, sha256 } from '../common/crypto/tokens.js';
import type { RequestContext } from '../common/request-context.js';
import { AppConfigService } from '../config/app-config.service.js';
import { PrismaService } from '../database/prisma.service.js';
import type { AuthUser } from '../permissions/auth-user.js';
import { REDIS } from '../redis/redis.constants.js';
import { REFRESH_REUSE_GRACE_SECONDS } from './auth.constants.js';

const CACHE_PREFIX = 'auth:session:';
const CACHE_TTL_SECONDS = 60;

export interface IssuedSession {
  sessionId: string;
  refreshToken: string;
  expiresAt: Date;
}

/**
 * Server-side sessions behind the refresh tokens. Access tokens name their session,
 * so revoking a session (logout, suspension, password reset) locks the caller out
 * within a minute at most — the time a validation result is cached.
 */
@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  /**
   * A new session. `authenticatedAt` is when the user last typed their password (a
   * refresh passes the original one on), so a session ends at a fixed time however
   * often it's refreshed: REFRESH_TOKEN_TTL_DAYS for families, STAFF_SESSION_HOURS
   * for staff.
   */
  async create(
    userId: string,
    ctx: RequestContext,
    authenticatedAt = new Date(),
  ): Promise<IssuedSession> {
    const expiresAt = new Date(authenticatedAt.getTime() + (await this.lifetimeMs(userId)));
    const refreshToken = randomToken();
    const session = await this.prisma.session.create({
      data: {
        userId,
        refreshTokenHash: sha256(refreshToken),
        authenticatedAt,
        expiresAt,
        ipAddress: ctx.ip ?? null,
        userAgent: ctx.userAgent ?? null,
      },
    });
    return { sessionId: session.id, refreshToken, expiresAt };
  }

  /** How long after typing their password a user stays signed in. */
  private async lifetimeMs(userId: string): Promise<number> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: { select: { isStaff: true } } },
    });
    return user?.role.isStaff
      ? this.config.get('STAFF_SESSION_HOURS') * 3_600_000
      : this.config.get('REFRESH_TOKEN_TTL_DAYS') * 86_400_000;
  }

  /**
   * Swaps a refresh token for a new one. Presenting an already-rotated token is a
   * sign it was stolen, so every session of that user is revoked.
   */
  async rotate(
    refreshToken: string,
    ctx: RequestContext,
  ): Promise<{ userId: string } & IssuedSession> {
    const session = await this.prisma.session.findUnique({
      where: { refreshTokenHash: sha256(refreshToken) },
    });
    const invalid = new UnauthorizedException({
      error: 'INVALID_REFRESH_TOKEN',
      message: 'Your session has ended. Please log in again.',
    });
    if (!session) {
      throw invalid;
    }
    if (session.revokedAt) {
      const secondsSinceRevoked = (Date.now() - session.revokedAt.getTime()) / 1000;
      if (session.replacedById && secondsSinceRevoked > REFRESH_REUSE_GRACE_SECONDS) {
        this.logger.warn(
          `Refresh token reuse detected for user ${session.userId}; revoking all sessions`,
        );
        await this.revokeAllForUser(session.userId);
      }
      throw invalid;
    }
    if (session.expiresAt.getTime() <= Date.now()) {
      throw invalid;
    }
    // Measured again from the login time: the lifetime may have been shortened since
    // (STAFF_SESSION_HOURS lowered, or the user became staff).
    const endsAt = session.authenticatedAt.getTime() + (await this.lifetimeMs(session.userId));
    if (endsAt <= Date.now()) {
      await this.revoke(session.id);
      throw invalid;
    }

    // The new session keeps the original login time: it ends when the old one would.
    const next = await this.create(session.userId, ctx, session.authenticatedAt);
    const rotated = await this.prisma.session.updateMany({
      where: { id: session.id, revokedAt: null },
      data: { revokedAt: new Date(), replacedById: next.sessionId },
    });
    if (rotated.count === 0) {
      // Another request rotated it first; don't hand out a second live session.
      await this.revoke(next.sessionId);
      throw invalid;
    }
    await this.forget(session.id);
    return { userId: session.userId, ...next };
  }

  async revoke(sessionId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.forget(sessionId);
  }

  async revokeByRefreshToken(refreshToken: string): Promise<void> {
    const session = await this.prisma.session.findUnique({
      where: { refreshTokenHash: sha256(refreshToken) },
      select: { id: true },
    });
    if (session) {
      await this.revoke(session.id);
    }
  }

  /** Signs the account out everywhere (except, if given, the session in use now). */
  async revokeAllForUser(userId: string, exceptSessionId?: string): Promise<void> {
    const where = {
      userId,
      revokedAt: null,
      ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
    };
    const sessions = await this.prisma.session.findMany({ where, select: { id: true } });
    await this.prisma.session.updateMany({ where, data: { revokedAt: new Date() } });
    await Promise.all(sessions.map((s) => this.forget(s.id)));
  }

  /**
   * Removes every session of an account, with the IP addresses and devices they hold.
   * Used when a child's account is deleted.
   */
  async deleteAllForUser(userId: string): Promise<void> {
    const sessions = await this.prisma.session.findMany({
      where: { userId },
      select: { id: true },
    });
    await this.prisma.session.deleteMany({ where: { userId } });
    await Promise.all(sessions.map((s) => this.forget(s.id)));
  }

  /** Checks that the session behind an access token is still live and the account active. */
  async validate(sessionId: string, userId: string): Promise<AuthUser | null> {
    const cached = await this.redis.get(CACHE_PREFIX + sessionId);
    if (cached) {
      const user = JSON.parse(cached) as AuthUser | { revoked: true };
      return 'revoked' in user || user.id !== userId ? null : user;
    }

    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { user: { include: { role: true } } },
    });
    const live =
      session &&
      session.userId === userId &&
      !session.revokedAt &&
      session.expiresAt.getTime() > Date.now() &&
      session.user.status === 'ACTIVE';

    const value: AuthUser | { revoked: true } = live
      ? {
          id: session.user.id,
          sessionId: session.id,
          roleId: session.user.roleId,
          roleKey: session.user.role.key,
          kind: session.user.kind,
          isStaff: session.user.role.isStaff,
        }
      : { revoked: true };
    await this.redis.set(CACHE_PREFIX + sessionId, JSON.stringify(value), 'EX', CACHE_TTL_SECONDS);
    return 'revoked' in value ? null : value;
  }

  private async forget(sessionId: string): Promise<void> {
    await this.redis.del(CACHE_PREFIX + sessionId);
  }
}
