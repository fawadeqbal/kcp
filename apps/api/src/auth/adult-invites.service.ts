import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@kcp/database';
import { AuditService } from '../audit/audit.service.js';
import type { RequestContext } from '../common/request-context.js';
import { AppConfigService } from '../config/app-config.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { MailService } from '../mail/mail.service.js';
import { toMailLanguage } from '../mail/templates.js';
import type { AuthUser } from '../permissions/auth-user.js';
import { VerificationTokenService } from './verification-token.service.js';

/** Invitation links last three days (a working weekend). */
const INVITE_TTL_HOURS = 72;

export interface AdultInvite {
  email: string;
  displayName: string;
  languageCode: string;
  roleKey: 'mentor' | 'teacher';
  countryCode?: string | null;
}

/**
 * Accounts staff make for adults who work with children in the web app (mentors,
 * teachers): no password until the person chooses one from the invitation email,
 * which also confirms the address. They set up two-factor login at their first login.
 */
@Injectable()
export class AdultInvitesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: VerificationTokenService,
    private readonly mail: MailService,
    private readonly audit: AuditService,
    private readonly config: AppConfigService,
  ) {}

  async invite(
    invite: AdultInvite,
    staff: AuthUser,
    ctx: RequestContext,
    extra?: (tx: Prisma.TransactionClient, userId: string) => Promise<unknown>,
  ): Promise<string> {
    if (await this.prisma.user.findUnique({ where: { email: invite.email } })) {
      throw new ConflictException({
        error: 'EMAIL_TAKEN',
        message: 'An account with this email address exists already.',
      });
    }
    const role = await this.prisma.role.findUniqueOrThrow({ where: { key: invite.roleKey } });
    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          kind: 'ADULT',
          status: 'PENDING_VERIFICATION',
          roleId: role.id,
          email: invite.email,
          displayName: invite.displayName,
          languageCode: invite.languageCode,
          countryCode: invite.countryCode ?? null,
        },
      });
      await extra?.(tx, created.id);
      await this.audit.record(
        {
          actor: { id: staff.id, roleKey: staff.roleKey },
          action: 'user.invite',
          entityType: 'User',
          entityId: created.id,
          after: { role: role.key },
          context: ctx,
        },
        tx,
      );
      return created;
    });
    await this.send(user.id);
    return user.id;
  }

  /** Sends the invitation again (a new link; the old one stops working). */
  async resend(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.passwordHash) {
      throw new NotFoundException('No invitation is waiting for this account.');
    }
    await this.send(userId);
  }

  private async send(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { role: { select: { key: true } } },
    });
    const token = await this.tokens.issue(user.id, 'PASSWORD_RESET', INVITE_TTL_HOURS);
    const base = this.config.get('WEB_APP_URL').replace(/\/+$/, '');
    await this.mail.send({
      to: user.email!,
      template: 'adultInvite',
      language: toMailLanguage(user.languageCode),
      params: {
        name: user.displayName ?? '',
        actionUrl: `${base}/${toMailLanguage(user.languageCode)}/reset-password?token=${encodeURIComponent(token)}`,
        vars: { role: user.role.key },
      },
    });
  }
}
