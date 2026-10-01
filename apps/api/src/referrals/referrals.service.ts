import { createHmac, randomInt } from 'node:crypto';
import { Prisma } from '@kcp/database';
import {
  REFERRAL_CODE_ALPHABET,
  REFERRAL_CODE_LENGTH,
  REFERRAL_CODE_PATTERN,
  REFERRAL_MAX_PER_YEAR,
  REFERRAL_REWARD_DAYS,
} from '@kcp/shared';
import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { ipNetwork } from '../common/rate-limit/rate-limit.decorator.js';
import type { RequestContext } from '../common/request-context.js';
import { AppConfigService } from '../config/app-config.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { MailService } from '../mail/mail.service.js';
import { toMailLanguage } from '../mail/templates.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import type { AuthUser } from '../permissions/auth-user.js';
import type { ReferralSummaryDto } from './referrals.dto.js';

const DAY_MS = 24 * 60 * 60 * 1000;
/** A referrer's sessions from this long ago still count for "the same network". */
const NETWORK_LOOKBACK_DAYS = 90;

type Outcome =
  | { status: 'REWARDED'; childIds: string[] }
  | {
      status: 'NOT_REWARDED';
      reason: 'SAME_NETWORK' | 'SAME_FAMILY' | 'YEARLY_LIMIT' | 'NO_CHILDREN' | 'REFERRER_GONE';
    };

/**
 * Invite links between families. A parent shares their link; a family that signs up
 * with it counts as their invitation. Once one of the new family's children ships
 * their first project, each child of the inviting family gets REFERRAL_REWARD_DAYS
 * of premium, at most REFERRAL_MAX_PER_YEAR times in any 365 days. No reward when the
 * two families look like one: signed up from the same network, or sharing a child.
 * The inviting family never learns who signed up.
 */
@Injectable()
export class ReferralsService {
  private readonly logger = new Logger(ReferralsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly mail: MailService,
    private readonly config: AppConfigService,
  ) {}

  /** A keyed hash of an address's network (IPv6 /64), so it can be compared, never read. */
  networkHash(ip: string | undefined): string | null {
    const network = ipNetwork(ip);
    if (!network) return null;
    return createHmac('sha256', this.config.get('JWT_ACCESS_SECRET'))
      .update(`referral-network:${network}`)
      .digest('hex');
  }

  private assertParent(user: AuthUser) {
    if (user.roleKey !== 'parent') {
      throw new ForbiddenException({ error: 'PARENTS_ONLY', message: 'For parents only.' });
    }
  }

  /** The parent's invite code, made the first time it's asked for. */
  async codeOf(parentId: string): Promise<string> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: parentId },
      select: { referralCode: true },
    });
    if (user.referralCode) return user.referralCode;
    for (let attempt = 0; attempt < 8; attempt++) {
      const code = Array.from(
        { length: REFERRAL_CODE_LENGTH },
        () => REFERRAL_CODE_ALPHABET[randomInt(REFERRAL_CODE_ALPHABET.length)],
      ).join('');
      try {
        const updated = await this.prisma.user.updateMany({
          where: { id: parentId, referralCode: null },
          data: { referralCode: code },
        });
        if (updated.count === 1) return code;
        const again = await this.prisma.user.findUniqueOrThrow({
          where: { id: parentId },
          select: { referralCode: true },
        });
        if (again.referralCode) return again.referralCode;
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')) {
          throw error;
        }
      }
    }
    throw new Error('Could not make an invite code');
  }

  /** The parent's invite link and how their invitations went. */
  async summary(parent: AuthUser, now = new Date()): Promise<ReferralSummaryDto> {
    this.assertParent(parent);
    const [code, account, invitations, rewarded] = await Promise.all([
      this.codeOf(parent.id),
      this.prisma.user.findUniqueOrThrow({
        where: { id: parent.id },
        select: { languageCode: true },
      }),
      this.prisma.referral.findMany({
        where: { referrerId: parent.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.rewardedInYear(parent.id, now),
    ]);
    const language = toMailLanguage(account.languageCode);
    return {
      code,
      link: `${this.config.get('WEB_APP_URL')}/${language}/sign-up?ref=${code}`,
      rewardDays: REFERRAL_REWARD_DAYS,
      maxPerYear: REFERRAL_MAX_PER_YEAR,
      rewardedThisYear: rewarded,
      invitations: invitations.map((r) => ({
        status: r.status,
        reason: r.reason,
        rewardDays: r.rewardDays,
        createdAt: r.createdAt,
        decidedAt: r.decidedAt,
      })),
    };
  }

  private rewardedInYear(referrerId: string, now: Date) {
    return this.prisma.referral.count({
      where: {
        referrerId,
        status: 'REWARDED',
        decidedAt: { gt: new Date(now.getTime() - 365 * DAY_MS) },
      },
    });
  }

  /**
   * A new parent signed up with an invite code: remember who invited them. Unknown
   * codes, and codes that aren't a parent's, are ignored (sign-up never fails for it).
   */
  async recordSignUp(inviteeId: string, rawCode: string | undefined, ctx: RequestContext) {
    const code = rawCode?.trim().toUpperCase();
    if (!code || !REFERRAL_CODE_PATTERN.test(code)) return;
    try {
      const referrer = await this.prisma.user.findUnique({
        where: { referralCode: code },
        select: { id: true, status: true, role: { select: { key: true } } },
      });
      if (!referrer || referrer.id === inviteeId || referrer.role.key !== 'parent') return;
      if (referrer.status === 'DELETED') return;
      await this.prisma.referral.create({
        data: {
          referrerId: referrer.id,
          inviteeId,
          inviteeNetworkHash: this.networkHash(ctx.ip),
        },
      });
    } catch (error) {
      this.logger.warn(`Invitation not recorded: ${(error as Error).message}`);
    }
  }

  /**
   * A child shipped a project: if it's their family's first, and that family was
   * invited, the invitation is decided (rewarded or not). Never fails the ship.
   */
  async childShipped(childId: string, now = new Date()) {
    try {
      const links = await this.prisma.parentChildLink.findMany({
        where: { childId },
        select: { parentId: true },
      });
      const pending = await this.prisma.referral.findMany({
        where: { inviteeId: { in: links.map((l) => l.parentId) }, status: 'PENDING' },
      });
      for (const referral of pending) await this.decide(referral.id, now);
    } catch (error) {
      this.logger.warn(`Invitation not decided: ${(error as Error).message}`);
    }
  }

  private async outcomeFor(
    tx: Prisma.TransactionClient,
    referral: { referrerId: string; inviteeId: string; inviteeNetworkHash: string | null },
    now: Date,
  ): Promise<Outcome> {
    const referrer = await tx.user.findUnique({
      where: { id: referral.referrerId },
      select: {
        status: true,
        childLinks: {
          where: { child: { status: 'ACTIVE' } },
          select: { childId: true },
        },
      },
    });
    if (!referrer || referrer.status !== 'ACTIVE') {
      return { status: 'NOT_REWARDED', reason: 'REFERRER_GONE' };
    }
    const theirChildren = await tx.parentChildLink.findMany({
      where: { parentId: referral.inviteeId },
      select: { childId: true },
    });
    const mine = new Set(referrer.childLinks.map((l) => l.childId));
    if (theirChildren.some((l) => mine.has(l.childId))) {
      return { status: 'NOT_REWARDED', reason: 'SAME_FAMILY' };
    }
    if (referral.inviteeNetworkHash) {
      const sessions = await tx.session.findMany({
        where: {
          userId: referral.referrerId,
          createdAt: { gt: new Date(now.getTime() - NETWORK_LOOKBACK_DAYS * DAY_MS) },
          ipAddress: { not: null },
        },
        select: { ipAddress: true },
        take: 200,
      });
      const hashes = new Set(sessions.map((s) => this.networkHash(s.ipAddress ?? undefined)));
      if (hashes.has(referral.inviteeNetworkHash)) {
        return { status: 'NOT_REWARDED', reason: 'SAME_NETWORK' };
      }
    }
    if (mine.size === 0) return { status: 'NOT_REWARDED', reason: 'NO_CHILDREN' };
    const rewarded = await tx.referral.count({
      where: {
        referrerId: referral.referrerId,
        status: 'REWARDED',
        decidedAt: { gt: new Date(now.getTime() - 365 * DAY_MS) },
      },
    });
    if (rewarded >= REFERRAL_MAX_PER_YEAR) {
      return { status: 'NOT_REWARDED', reason: 'YEARLY_LIMIT' };
    }
    return { status: 'REWARDED', childIds: [...mine] };
  }

  private async decide(referralId: string, now: Date) {
    const result = await this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM referrals WHERE id = ${referralId}::uuid AND status = 'PENDING' FOR UPDATE`;
      if (!locked.length) return null;
      const referral = await tx.referral.findUniqueOrThrow({ where: { id: referralId } });
      const outcome = await this.outcomeFor(tx, referral, now);
      if (outcome.status === 'NOT_REWARDED') {
        await tx.referral.update({
          where: { id: referralId },
          data: { status: 'NOT_REWARDED', reason: outcome.reason, decidedAt: now },
        });
        return { referrerId: referral.referrerId, outcome };
      }
      for (const childId of outcome.childIds) {
        // Days add up: a new reward starts when the child's current one ends.
        const latest = await tx.premiumGrant.findFirst({
          where: { userId: childId, revokedAt: null, endsAt: { gt: now } },
          orderBy: { endsAt: 'desc' },
          select: { endsAt: true },
        });
        const startsAt = latest ? latest.endsAt : now;
        await tx.premiumGrant.create({
          data: {
            userId: childId,
            grantedById: null,
            source: 'REFERRAL',
            referralId,
            reason: 'Referral reward',
            startsAt,
            endsAt: new Date(startsAt.getTime() + REFERRAL_REWARD_DAYS * DAY_MS),
          },
        });
      }
      await tx.referral.update({
        where: { id: referralId },
        data: { status: 'REWARDED', rewardDays: REFERRAL_REWARD_DAYS, decidedAt: now },
      });
      return { referrerId: referral.referrerId, outcome };
    });
    if (result?.outcome.status === 'REWARDED') await this.tellReferrer(result.referrerId);
  }

  private async tellReferrer(referrerId: string) {
    await this.notifications.notify([referrerId], 'referral_rewarded', {
      days: REFERRAL_REWARD_DAYS,
    });
    try {
      const parent = await this.prisma.user.findUniqueOrThrow({
        where: { id: referrerId },
        select: { email: true, displayName: true, languageCode: true },
      });
      if (!parent.email) return;
      const language = toMailLanguage(parent.languageCode);
      await this.mail.send({
        to: parent.email,
        template: 'referralRewarded',
        language,
        params: {
          name: parent.displayName ?? '',
          actionUrl: `${this.config.get('WEB_APP_URL')}/${language}/dashboard`,
          vars: { days: String(REFERRAL_REWARD_DAYS) },
        },
      });
    } catch (error) {
      this.logger.warn(`Referral email not sent: ${(error as Error).message}`);
    }
  }
}
