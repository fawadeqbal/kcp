import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ROLE_KEYS } from '@kcp/database';
import {
  normalizePairingCode,
  PAIRING_CODE_ALPHABET,
  PAIRING_CODE_LENGTH,
  PAIRING_MINUTES,
  PICTURE_LOCK_MINUTES,
  PICTURE_MAX_FAILURES,
} from '@kcp/shared';
import { randomInt } from 'node:crypto';
import { AuditService } from '../audit/audit.service.js';
import { dummyPasswordHash, verifyPassword } from '../common/crypto/passwords.js';
import { randomToken, safeEqual, sha256 } from '../common/crypto/tokens.js';
import type { RequestContext } from '../common/request-context.js';
import { PrismaService } from '../database/prisma.service.js';
import type { AuthUser } from '../permissions/auth-user.js';
import { AuthService, type AuthenticatedResult } from './auth.service.js';
import type { PairingInfoDto, PairingStartedDto, PairingStatusDto } from './dto/young-login.dto.js';

/** "Chrome on Android" from a user agent, for the parent's approval screen. */
export function deviceName(userAgent: string | null | undefined): string {
  const ua = userAgent ?? '';
  const system = /iPad/.test(ua)
    ? 'iPad'
    : /iPhone/.test(ua)
      ? 'iPhone'
      : /Android/.test(ua)
        ? 'Android'
        : /Windows/.test(ua)
          ? 'Windows'
          : /Mac OS X|Macintosh/.test(ua)
            ? 'Mac'
            : /CrOS/.test(ua)
              ? 'Chromebook'
              : /Linux/.test(ua)
                ? 'Linux'
                : null;
  const app = /Dart|okhttp|KidsCoding/.test(ua)
    ? 'The app'
    : /Edg\//.test(ua)
      ? 'Edge'
      : /Firefox\//.test(ua)
        ? 'Firefox'
        : /Chrome\//.test(ua)
          ? 'Chrome'
          : /Safari\//.test(ua)
            ? 'Safari'
            : 'A browser';
  return system ? `${app} on ${system}` : app;
}

function pairingCode(): string {
  let code = '';
  for (let i = 0; i < PAIRING_CODE_LENGTH; i++) {
    code += PAIRING_CODE_ALPHABET[randomInt(PAIRING_CODE_ALPHABET.length)];
  }
  return code;
}

/** "K7MQ4XPR" → "K7MQ-4XPR" */
const display = (code: string) => `${code.slice(0, 4)}-${code.slice(4)}`;

/**
 * Easier sign-in for younger children: a picture password (four of twelve pictures,
 * set by the parent), and "sign in with a parent's phone" — the child's device shows a
 * code, a parent approves it for one of their children, and that device is signed in.
 */
@Injectable()
export class YoungLoginService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly audit: AuditService,
  ) {}

  // ── Picture passwords ──────────────────────────────────────────────────────

  async pictureLogin(
    username: string,
    pictures: string[],
    ctx: RequestContext,
  ): Promise<AuthenticatedResult> {
    const user = await this.prisma.user.findUnique({
      where: { username },
      include: { studentProfile: true },
    });
    const profile = user?.kind === 'STUDENT' ? user.studentProfile : null;
    const now = new Date();
    if (profile?.pictureLockedUntil && profile.pictureLockedUntil > now) {
      throw new ForbiddenException({
        error: 'PICTURE_LOCKED',
        message: 'Too many tries. Ask your parent, or wait a while and try again.',
        until: profile.pictureLockedUntil,
      });
    }
    // The same work for unknown names, so answers don't reveal who exists.
    const ok = await verifyPassword(
      profile?.picturePasswordHash ?? (await dummyPasswordHash()),
      pictures.join('-'),
    );
    if (!user || !profile?.picturePasswordHash || user.status === 'DELETED') {
      throw new UnauthorizedException({
        error: 'INVALID_CREDENTIALS',
        message: 'Those pictures aren’t right. Try again!',
      });
    }
    if (!ok) {
      const failures = profile.pictureFailures + 1;
      const lock = failures >= PICTURE_MAX_FAILURES;
      await this.prisma.studentProfile.update({
        where: { userId: user.id },
        data: lock
          ? {
              pictureFailures: 0,
              pictureLockedUntil: new Date(now.getTime() + PICTURE_LOCK_MINUTES * 60_000),
            }
          : { pictureFailures: failures },
      });
      if (lock) {
        await this.audit.record({
          actor: { id: user.id, roleKey: ROLE_KEYS.STUDENT },
          action: 'auth.picture_password_locked',
          entityType: 'User',
          entityId: user.id,
          context: ctx,
        });
      }
      throw new UnauthorizedException({
        error: 'INVALID_CREDENTIALS',
        message: 'Those pictures aren’t right. Try again!',
      });
    }
    if (profile.pictureFailures > 0) {
      await this.prisma.studentProfile.update({
        where: { userId: user.id },
        data: { pictureFailures: 0 },
      });
    }
    return this.auth.signInStudent(user.id, ctx);
  }

  // ── Signing in with a parent's phone ───────────────────────────────────────

  async startPairing(ctx: RequestContext): Promise<PairingStartedDto> {
    const secret = randomToken();
    const expiresAt = new Date(Date.now() + PAIRING_MINUTES * 60_000);
    // Codes are short: on the rare clash with a live code, pick another.
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = pairingCode();
      try {
        const pairing = await this.prisma.devicePairing.create({
          data: {
            codeHash: sha256(code),
            secretHash: sha256(secret),
            userAgent: ctx.userAgent ?? null,
            ipAddress: ctx.ip ?? null,
            expiresAt,
          },
        });
        return { pairingId: pairing.id, code: display(code), secret, expiresAt };
      } catch (error) {
        if ((error as { code?: string }).code !== 'P2002') throw error;
        // An old, expired code may hold the hash: clear expired ones and retry.
        await this.prisma.devicePairing.deleteMany({ where: { expiresAt: { lt: new Date() } } });
      }
    }
    throw new ConflictException({ error: 'PAIRING_BUSY', message: 'Please try again.' });
  }

  private async byCode(code: string) {
    const normalized = normalizePairingCode(code);
    const pairing =
      normalized.length === PAIRING_CODE_LENGTH
        ? await this.prisma.devicePairing.findUnique({ where: { codeHash: sha256(normalized) } })
        : null;
    if (!pairing || pairing.approvedAt || pairing.expiresAt <= new Date()) {
      throw new NotFoundException({
        error: 'PAIRING_NOT_FOUND',
        message: 'This code doesn’t work (any more). Ask for a new one on the child’s device.',
      });
    }
    return pairing;
  }

  private assertParent(parent: AuthUser) {
    if (parent.roleKey !== ROLE_KEYS.PARENT) {
      throw new ForbiddenException({
        error: 'PARENTS_ONLY',
        message: 'Only a parent can sign a child in.',
      });
    }
  }

  /** What the parent sees before approving. */
  async pairingInfo(code: string, parent: AuthUser): Promise<PairingInfoDto> {
    this.assertParent(parent);
    const pairing = await this.byCode(code);
    return {
      device: deviceName(pairing.userAgent),
      createdAt: pairing.createdAt,
      expiresAt: pairing.expiresAt,
    };
  }

  /** The parent signs one of their children in on the device that shows the code. */
  async approvePairing(
    code: string,
    childId: string,
    parent: AuthUser,
    ctx: RequestContext,
  ): Promise<void> {
    this.assertParent(parent);
    const pairing = await this.byCode(code);
    const link = await this.prisma.parentChildLink.findFirst({
      where: { parentId: parent.id, childId, child: { status: { not: 'DELETED' } } },
      include: { child: { select: { status: true } } },
    });
    if (!link) throw new NotFoundException('Child not found.');
    if (link.child.status !== 'ACTIVE') {
      throw new ConflictException({
        error: link.child.status === 'PENDING_CONSENT' ? 'CONSENT_PENDING' : 'ACCOUNT_DISABLED',
        message:
          link.child.status === 'PENDING_CONSENT'
            ? 'Finish giving your consent for this account first.'
            : 'This account is not active.',
      });
    }
    const updated = await this.prisma.devicePairing.updateMany({
      where: { id: pairing.id, approvedAt: null },
      data: { childId, approvedById: parent.id, approvedAt: new Date() },
    });
    if (updated.count === 0) throw new NotFoundException({ error: 'PAIRING_NOT_FOUND' });
    await this.audit.record({
      actor: { id: parent.id, roleKey: parent.roleKey },
      action: 'auth.pairing_approved',
      entityType: 'User',
      entityId: childId,
      after: { device: deviceName(pairing.userAgent) },
      context: ctx,
    });
  }

  private async forDevice(pairingId: string, secret: string) {
    const pairing = await this.prisma.devicePairing.findUnique({ where: { id: pairingId } });
    if (!pairing || !safeEqual(pairing.secretHash, sha256(secret))) {
      throw new NotFoundException({ error: 'PAIRING_NOT_FOUND' });
    }
    return pairing;
  }

  /** The child's device asks (every few seconds) whether a parent approved it yet. */
  async pairingStatus(pairingId: string, secret: string): Promise<PairingStatusDto> {
    const pairing = await this.forDevice(pairingId, secret);
    if (pairing.claimedAt || pairing.expiresAt <= new Date()) return { status: 'expired' };
    return { status: pairing.approvedAt ? 'approved' : 'waiting' };
  }

  /** Once approved, the device that showed the code gets the child's session (once). */
  async claimPairing(
    pairingId: string,
    secret: string,
    ctx: RequestContext,
  ): Promise<AuthenticatedResult> {
    const pairing = await this.forDevice(pairingId, secret);
    if (pairing.expiresAt <= new Date() || pairing.claimedAt) {
      throw new GoneException({ error: 'PAIRING_EXPIRED', message: 'This code has expired.' });
    }
    if (!pairing.approvedAt || !pairing.childId) {
      throw new BadRequestException({
        error: 'PAIRING_NOT_APPROVED',
        message: 'Waiting for a parent to approve.',
      });
    }
    const claimed = await this.prisma.devicePairing.updateMany({
      where: { id: pairing.id, claimedAt: null },
      data: { claimedAt: new Date() },
    });
    if (claimed.count === 0) {
      throw new GoneException({ error: 'PAIRING_EXPIRED', message: 'This code has expired.' });
    }
    return this.auth.signInStudent(pairing.childId, ctx);
  }
}
