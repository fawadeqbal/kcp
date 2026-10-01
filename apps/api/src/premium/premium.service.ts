import { ROLE_KEYS } from '@kcp/database';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service.js';
import type { RequestContext } from '../common/request-context.js';
import { PrismaService } from '../database/prisma.service.js';
import type { AuthUser } from '../permissions/auth-user.js';
import type { PremiumGrantDto, PremiumStatusDto } from './dto/premium.dto.js';

const include = {
  user: { select: { studentProfile: { select: { nickname: true } } } },
  grantedBy: { select: { displayName: true, email: true } },
} as const;

/** Adds calendar months, keeping the day where it can (31 Jan + 1 month = 28/29 Feb). */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

/**
 * Premium given by hand to pilot families, until payments arrive (Sprint 6). Always
 * with a reason and in the audit log. Premium belongs to a student; granting it to a
 * parent grants it to each of their children.
 */
@Injectable()
export class PremiumService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** When a student's premium ends, or null when they don't have it now. */
  async activeUntil(studentId: string, now = new Date()): Promise<Date | null> {
    const grant = await this.prisma.premiumGrant.findFirst({
      where: { userId: studentId, revokedAt: null, startsAt: { lte: now }, endsAt: { gt: now } },
      orderBy: { endsAt: 'desc' },
      select: { endsAt: true },
    });
    return grant?.endsAt ?? null;
  }

  /**
   * The students an account stands for: itself, or a parent's children. For a new
   * grant (`forGrant`), deleted accounts are refused.
   */
  private async students(accountId: string, forGrant = false): Promise<string[]> {
    const account = await this.prisma.user.findUnique({
      where: { id: accountId },
      select: {
        kind: true,
        status: true,
        role: { select: { key: true } },
        childLinks: {
          where: { child: { status: { not: 'DELETED' } } },
          select: { childId: true },
        },
      },
    });
    if (!account) throw new NotFoundException('User not found.');
    if (forGrant && account.status === 'DELETED') {
      throw new BadRequestException({
        error: 'ACCOUNT_DELETED',
        message: 'This account was deleted.',
      });
    }
    if (account.kind === 'STUDENT') return [accountId];
    if (account.role.key === ROLE_KEYS.PARENT) return account.childLinks.map((l) => l.childId);
    throw new BadRequestException({
      error: 'NOT_A_FAMILY',
      message: 'Premium is for students and their families.',
    });
  }

  private toDto(
    row: Awaited<ReturnType<PremiumService['grantsOf']>>[number],
    now = new Date(),
  ): PremiumGrantDto {
    return {
      id: row.id,
      studentId: row.userId,
      studentNickname: row.user.studentProfile?.nickname ?? null,
      reason: row.reason,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      revokedAt: row.revokedAt,
      // Grants the platform gave (referral rewards) have no staff member.
      grantedBy: row.grantedBy
        ? (row.grantedBy.displayName ?? row.grantedBy.email)
        : row.source === 'REFERRAL'
          ? 'Referral reward'
          : null,
      active: !row.revokedAt && row.startsAt <= now && row.endsAt > now,
    };
  }

  private grantsOf(studentIds: string[]) {
    return this.prisma.premiumGrant.findMany({
      where: { userId: { in: studentIds } },
      include,
      orderBy: { createdAt: 'desc' },
    });
  }

  async list(accountId: string): Promise<PremiumStatusDto> {
    const rows = await this.grantsOf(await this.students(accountId));
    return { grants: rows.map((row) => this.toDto(row)) };
  }

  async grant(
    accountId: string,
    months: number,
    reason: string,
    staff: AuthUser,
    ctx: RequestContext,
  ): Promise<PremiumStatusDto> {
    const studentIds = await this.students(accountId, true);
    if (studentIds.length === 0) {
      throw new BadRequestException({
        error: 'NO_CHILDREN',
        message: 'This parent has no child accounts yet.',
      });
    }
    const now = new Date();
    const endsAt = addMonths(now, months);
    await this.prisma.$transaction(async (tx) => {
      for (const userId of studentIds) {
        const grant = await tx.premiumGrant.create({
          data: { userId, grantedById: staff.id, reason, startsAt: now, endsAt },
        });
        await this.audit.record(
          {
            actor: { id: staff.id, roleKey: staff.roleKey },
            action: 'premium.grant',
            entityType: 'User',
            entityId: userId,
            after: { grantId: grant.id, months, endsAt: endsAt.toISOString(), reason },
            context: ctx,
          },
          tx,
        );
      }
    });
    return this.list(accountId);
  }

  async revoke(grantId: string, reason: string, staff: AuthUser, ctx: RequestContext) {
    const grant = await this.prisma.premiumGrant.findUnique({ where: { id: grantId } });
    if (!grant) throw new NotFoundException('Grant not found.');
    if (grant.revokedAt) {
      throw new BadRequestException({
        error: 'ALREADY_REVOKED',
        message: 'This grant was already revoked.',
      });
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.premiumGrant.update({
        where: { id: grantId },
        data: { revokedAt: new Date(), revokedById: staff.id },
      });
      await this.audit.record(
        {
          actor: { id: staff.id, roleKey: staff.roleKey },
          action: 'premium.revoke',
          entityType: 'User',
          entityId: grant.userId,
          after: { grantId, reason },
          context: ctx,
        },
        tx,
      );
    });
    const [row] = await this.prisma.premiumGrant.findMany({ where: { id: grantId }, include });
    return this.toDto(row!);
  }
}
