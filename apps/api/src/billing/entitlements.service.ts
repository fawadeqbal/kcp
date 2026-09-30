import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import type { AuthUser } from '../permissions/auth-user.js';

/** Where a student's premium comes from right now. */
export type PremiumSource = 'subscription' | 'grant' | 'trial';

export interface PremiumStatus {
  active: boolean;
  source: PremiumSource | null;
  /** When the premium that applies now ends (a subscription renews on its own). */
  until: Date | null;
  /** The student's free trial, over or not. */
  trialEndsAt: Date | null;
}

/** Subscriptions that give premium: live, and the period still running. */
const LIVE_STATUSES = ['ACTIVE', 'PAST_DUE'] as const;

/**
 * Who may open premium lessons and projects. A student has premium while their
 * family's subscription runs, while staff gave it by hand, or during their trial.
 * Parents and staff can always look at every lesson (to decide, and to help).
 */
@Injectable()
export class EntitlementsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Premium for several students at once (a family's billing page). */
  async statusMany(studentIds: string[], now = new Date()): Promise<Map<string, PremiumStatus>> {
    const result = new Map<string, PremiumStatus>();
    if (studentIds.length === 0) return result;
    const [profiles, grants, links] = await Promise.all([
      this.prisma.studentProfile.findMany({
        where: { userId: { in: studentIds } },
        select: { userId: true, trialEndsAt: true },
      }),
      this.prisma.premiumGrant.findMany({
        where: {
          userId: { in: studentIds },
          revokedAt: null,
          startsAt: { lte: now },
          endsAt: { gt: now },
        },
        select: { userId: true, endsAt: true },
      }),
      this.prisma.parentChildLink.findMany({
        where: { childId: { in: studentIds } },
        select: { childId: true, parentId: true },
      }),
    ]);
    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        parentId: { in: [...new Set(links.map((l) => l.parentId))] },
        status: { in: [...LIVE_STATUSES] },
        currentPeriodEnd: { gt: now },
      },
      select: { parentId: true, currentPeriodEnd: true },
    });
    const subscriptionEnd = new Map(subscriptions.map((s) => [s.parentId, s.currentPeriodEnd]));
    for (const id of studentIds) {
      const trialEndsAt = profiles.find((p) => p.userId === id)?.trialEndsAt ?? null;
      const familyEnd = links
        .filter((l) => l.childId === id)
        .map((l) => subscriptionEnd.get(l.parentId))
        .find(Boolean);
      const grantEnd = grants
        .filter((g) => g.userId === id)
        .map((g) => g.endsAt)
        .toSorted((a, b) => b.getTime() - a.getTime())[0];
      if (familyEnd) {
        result.set(id, { active: true, source: 'subscription', until: familyEnd, trialEndsAt });
      } else if (grantEnd) {
        result.set(id, { active: true, source: 'grant', until: grantEnd, trialEndsAt });
      } else if (trialEndsAt && trialEndsAt > now) {
        result.set(id, { active: true, source: 'trial', until: trialEndsAt, trialEndsAt });
      } else {
        result.set(id, { active: false, source: null, until: null, trialEndsAt });
      }
    }
    return result;
  }

  async status(studentId: string, now = new Date()): Promise<PremiumStatus> {
    const status = (await this.statusMany([studentId], now)).get(studentId);
    return status ?? { active: false, source: null, until: null, trialEndsAt: null };
  }

  /** Whether this account may open a lesson or project (free ones always). */
  async canAccess(user: AuthUser, item: { isPremium: boolean }): Promise<boolean> {
    if (!item.isPremium || user.kind !== 'STUDENT') return true;
    return (await this.status(user.id)).active;
  }

  /** Refuses premium content to students without premium (403 PREMIUM_REQUIRED). */
  async assertAccess(user: AuthUser, item: { isPremium: boolean }): Promise<void> {
    if (await this.canAccess(user, item)) return;
    throw new ForbiddenException({
      error: 'PREMIUM_REQUIRED',
      message: 'This is part of premium. Ask your parent about a plan.',
    });
  }
}
