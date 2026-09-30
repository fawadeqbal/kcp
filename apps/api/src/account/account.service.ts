import { ROLE_KEYS } from '@kcp/database';
import { BadRequestException, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { AuditService } from '../audit/audit.service.js';
import { SessionService } from '../auth/session.service.js';
import { BillingService } from '../billing/billing.service.js';
import { ChildrenService } from '../children/children.service.js';
import { verifyPassword } from '../common/crypto/passwords.js';
import type { RequestContext } from '../common/request-context.js';
import { AppConfigService } from '../config/app-config.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { MailService } from '../mail/mail.service.js';
import { toMailLanguage } from '../mail/templates.js';
import type { AuthUser } from '../permissions/auth-user.js';

/**
 * A parent's own data: a copy of everything we keep about the family (to download),
 * and deleting the whole account. Staff accounts are managed by admins instead.
 */
/** Sign-ins: when, from where (IP address and browser), and whether they ended. */
const SESSION_FIELDS = {
  createdAt: true,
  authenticatedAt: true,
  expiresAt: true,
  revokedAt: true,
  ipAddress: true,
  userAgent: true,
} as const;

@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly children: ChildrenService,
    private readonly billing: BillingService,
    private readonly sessions: SessionService,
    private readonly mail: MailService,
    private readonly audit: AuditService,
    private readonly config: AppConfigService,
  ) {}

  private assertParent(user: AuthUser) {
    if (user.roleKey !== ROLE_KEYS.PARENT) {
      throw new ForbiddenException({
        error: 'PARENTS_ONLY',
        message: 'Only parent accounts can do this. Staff accounts are managed by an admin.',
      });
    }
  }

  /**
   * Everything we keep about the parent and their children, as JSON: the account,
   * the children's profiles, progress, code (drafts and the latest submission of each
   * challenge), XP history, projects and certificates,
   * consents, plans, invoices, payments, notifications, feedback and sign-ins (with
   * their IP addresses). Not in it: the audit log (staff records) and card details
   * (kept by Stripe).
   */
  async export(user: AuthUser, ctx: RequestContext): Promise<Record<string, unknown>> {
    this.assertParent(user);
    const parent = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: {
        email: true,
        displayName: true,
        languageCode: true,
        countryCode: true,
        createdAt: true,
        emailVerifiedAt: true,
        lastLoginAt: true,
        termsVersion: true,
        termsAcceptedAt: true,
        monthlySummaryEmails: true,
        childLinks: { select: { childId: true } },
        sessions: { select: SESSION_FIELDS, orderBy: { createdAt: 'desc' } },
      },
    });
    const childIds = parent.childLinks.map((link) => link.childId);
    const [children, consents, subscriptions, invoices, payments, notifications, feedback] =
      await Promise.all([
        this.prisma.user.findMany({
          where: { id: { in: childIds }, status: { not: 'DELETED' } },
          select: {
            id: true,
            username: true,
            languageCode: true,
            countryCode: true,
            createdAt: true,
            lastLoginAt: true,
            studentProfile: {
              select: {
                nickname: true,
                avatarKey: true,
                birthYear: true,
                showOnPublicBoards: true,
                publicPortfolio: true,
                xpTotal: true,
                trialEndsAt: true,
              },
            },
            lessonProgress: { select: { lessonId: true, status: true, completedAt: true } },
            badges: { select: { badgeKey: true, awardedAt: true } },
            projects: {
              select: { briefId: true, status: true, files: true, shippedAt: true },
            },
            certificates: {
              select: { code: true, moduleId: true, issuedAt: true, revokedAt: true },
            },
            // The code they typed: saved drafts and the submissions we keep.
            challengeDrafts: { select: { challengeId: true, code: true, updatedAt: true } },
            // The latest submission of each challenge (all of them could be thousands).
            submissions: {
              select: { challengeId: true, code: true, passed: true, createdAt: true },
              distinct: ['challengeId'],
              orderBy: [{ challengeId: 'asc' }, { createdAt: 'desc' }],
            },
            xpEvents: {
              select: { amount: true, source: true, sourceId: true, day: true, reason: true },
              orderBy: { createdAt: 'asc' },
            },
            streak: {
              select: {
                current: true,
                longest: true,
                lastGoalDay: true,
                dailyGoalXp: true,
                freezes: true,
              },
            },
            notifications: { select: { type: true, createdAt: true, readAt: true } },
            sessions: { select: SESSION_FIELDS, orderBy: { createdAt: 'desc' } },
          },
        }),
        this.prisma.consentRecord.findMany({
          where: { parentId: user.id },
          orderBy: { grantedAt: 'asc' },
          select: {
            childId: true,
            type: true,
            policyVersion: true,
            method: true,
            grantedAt: true,
            revokedAt: true,
          },
        }),
        this.prisma.subscription.findMany({
          where: { parentId: user.id },
          select: {
            planKey: true,
            provider: true,
            status: true,
            currency: true,
            amountMinor: true,
            children: true,
            currentPeriodStart: true,
            currentPeriodEnd: true,
            canceledAt: true,
            endedAt: true,
            createdAt: true,
          },
        }),
        this.prisma.invoice.findMany({
          where: { parentId: user.id },
          orderBy: { number: 'asc' },
          select: {
            number: true,
            status: true,
            currency: true,
            amountMinor: true,
            periodStart: true,
            periodEnd: true,
            issuedAt: true,
            paidAt: true,
          },
        }),
        this.prisma.payment.findMany({
          where: { parentId: user.id },
          select: {
            provider: true,
            status: true,
            currency: true,
            amountMinor: true,
            refundedMinor: true,
            method: true,
            paidAt: true,
          },
        }),
        this.prisma.notification.findMany({
          where: { userId: user.id },
          select: { type: true, createdAt: true, readAt: true },
        }),
        this.prisma.feedback.findMany({
          where: { userId: user.id },
          select: { kind: true, message: true, createdAt: true },
        }),
      ]);
    await this.audit.record({
      actor: { id: user.id, roleKey: user.roleKey },
      action: 'account.export',
      entityType: 'User',
      entityId: user.id,
      context: ctx,
    });
    const { childLinks: _links, ...account } = parent;
    return {
      exportedAt: new Date().toISOString(),
      about:
        'Everything Kids Coding Platform keeps about your family. Payment card details are kept by our payment provider (Stripe), not by us.',
      account,
      children: children.map(({ id, ...child }) => ({
        ...child,
        consents: consents
          .filter((consent) => consent.childId === id)
          .map(({ childId: _child, ...consent }) => consent),
      })),
      subscriptions,
      invoices: invoices.map((invoice) => ({
        ...invoice,
        number: `KCP-${String(invoice.number).padStart(6, '0')}`,
      })),
      payments,
      notifications,
      feedback,
    };
  }

  /**
   * Deletes the parent's account and every child account in it. The plan stops now;
   * invoices, payments, consent records and the audit log stay (the law asks us to
   * keep them), tied to an anonymous account.
   */
  async delete(user: AuthUser, password: string, ctx: RequestContext): Promise<void> {
    this.assertParent(user);
    const parent = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      include: { childLinks: { select: { childId: true } } },
    });
    if (!parent.passwordHash || !(await verifyPassword(parent.passwordHash, password))) {
      throw new BadRequestException({
        error: 'WRONG_PASSWORD',
        message: 'Your password is not right.',
      });
    }
    for (const { childId } of parent.childLinks) {
      await this.children.remove(childId, user, ctx);
    }
    await this.billing.endForDeletedAccount(user.id);

    // Tell them before the address is gone.
    if (parent.email) {
      try {
        await this.mail.send({
          to: parent.email,
          template: 'accountDeleted',
          language: toMailLanguage(parent.languageCode),
          params: {
            name: parent.displayName ?? '',
            actionUrl: `${this.config.get('WEB_APP_URL')}/${toMailLanguage(parent.languageCode)}`,
          },
        });
      } catch (error) {
        this.logger.warn(`Account-deleted email not sent: ${(error as Error).message}`);
      }
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.verificationToken.deleteMany({ where: { userId: user.id } });
      await tx.notification.deleteMany({ where: { userId: user.id } });
      await tx.feedback.deleteMany({ where: { userId: user.id } });
      if (parent.email) await tx.waitlistEntry.deleteMany({ where: { email: parent.email } });
      await tx.user.update({
        where: { id: user.id },
        data: {
          status: 'DELETED',
          deletedAt: new Date(),
          email: null,
          displayName: null,
          passwordHash: null,
          totpSecret: null,
          totpEnabledAt: null,
          emailVerifiedAt: null,
          regionId: null,
          cityId: null,
          monthlySummaryEmails: false,
        },
      });
      await this.audit.record(
        {
          actor: { id: user.id, roleKey: user.roleKey },
          action: 'account.delete',
          entityType: 'User',
          entityId: user.id,
          after: { children: parent.childLinks.length },
          context: ctx,
        },
        tx,
      );
    });
    // Sessions hold IP addresses and devices: removed, not just ended.
    await this.sessions.deleteAllForUser(user.id);
  }
}
