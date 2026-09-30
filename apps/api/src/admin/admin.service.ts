import { Injectable } from '@nestjs/common';
import type { Prisma, UserStatus } from '@kcp/database';
import { PrismaService } from '../database/prisma.service.js';
import type {
  AdminConsentListDto,
  AuditEntryDto,
  AuditListDto,
  AuditQueryDto,
  ConsentQueryDto,
  CountByStatusDto,
  FamilyDto,
  OverviewDto,
  PersonRefDto,
  RoleDto,
} from './dto/admin.dto.js';

const personSelect = {
  id: true,
  email: true,
  username: true,
  displayName: true,
  kind: true,
  studentProfile: { select: { nickname: true } },
} satisfies Prisma.UserSelect;

type Person = Prisma.UserGetPayload<{ select: typeof personSelect }>;

function toPerson(user: Person): PersonRefDto {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    displayName:
      user.kind === 'STUDENT' ? (user.studentProfile?.nickname ?? null) : user.displayName,
  };
}

const DAY_MS = 86_400_000;

/** Read-only views for the admin panel. Every list is paged and newest first. */
@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  /** `withActivity`: whether the caller may read the audit log (moderators may not). */
  async overview(withActivity: boolean): Promise<OverviewDto> {
    const since = new Date(Date.now() - 7 * DAY_MS);
    const [byRoleStatus, staff, childrenCreated, consentChanges, recent, safetyReports] =
      await Promise.all([
        this.prisma.user.groupBy({
          by: ['kind', 'status'],
          where: { role: { key: { in: ['parent', 'student'] } } },
          _count: { _all: true },
        }),
        this.prisma.user.count({ where: { role: { isStaff: true }, status: 'ACTIVE' } }),
        this.prisma.auditLog.count({
          where: { action: 'child.create', createdAt: { gte: since } },
        }),
        this.prisma.auditLog.count({
          where: { action: 'child.consent_change', createdAt: { gte: since } },
        }),
        withActivity ? this.auditLogs({ page: 1, pageSize: 10 }) : { items: [] },
        this.prisma.feedback.count({ where: { kind: 'SAFETY', status: { not: 'DONE' } } }),
      ]);
    const counts = (kind: 'ADULT' | 'STUDENT'): CountByStatusDto => {
      const count = (status: UserStatus) =>
        byRoleStatus.find((row) => row.kind === kind && row.status === status)?._count._all ?? 0;
      return {
        pendingVerification: count('PENDING_VERIFICATION'),
        active: count('ACTIVE'),
        suspended: count('SUSPENDED'),
      };
    };
    return {
      parents: counts('ADULT'),
      students: counts('STUDENT'),
      staff,
      childrenCreatedLast7Days: childrenCreated,
      consentChangesLast7Days: consentChanges,
      openSafetyReports: safetyReports,
      recentActivity: recent.items,
    };
  }

  async consents(query: ConsentQueryDto): Promise<AdminConsentListDto> {
    const where: Prisma.ConsentRecordWhereInput = {
      ...(query.type ? { type: query.type } : {}),
      ...(query.state === 'active' ? { revokedAt: null } : {}),
      ...(query.state === 'revoked' ? { revokedAt: { not: null } } : {}),
      ...(query.search
        ? {
            OR: [
              { parent: { email: { contains: query.search, mode: 'insensitive' } } },
              { child: { username: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.consentRecord.count({ where }),
      this.prisma.consentRecord.findMany({
        where,
        include: { parent: { select: personSelect }, child: { select: personSelect } },
        orderBy: { grantedAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return {
      items: rows.map((row) => ({
        id: row.id,
        type: row.type,
        policyVersion: row.policyVersion,
        method: row.method,
        grantedAt: row.grantedAt,
        revokedAt: row.revokedAt,
        parent: toPerson(row.parent),
        child: toPerson(row.child),
      })),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async auditLogs(
    query: Partial<AuditQueryDto> & { page: number; pageSize: number },
  ): Promise<AuditListDto> {
    const where: Prisma.AuditLogWhereInput = {
      ...(query.action
        ? query.action.endsWith('.')
          ? { action: { startsWith: query.action } }
          : { action: query.action }
        : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
      ...(query.actorId ? { actorId: query.actorId } : {}),
    };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    // The audit log has no foreign key to users (it outlives them), so look actors up.
    const actorIds = [
      ...new Set(rows.map((row) => row.actorId).filter((id): id is string => Boolean(id))),
    ];
    const actors = new Map(
      (
        await this.prisma.user.findMany({
          where: { id: { in: actorIds } },
          select: { id: true, email: true },
        })
      ).map((user) => [user.id, user.email]),
    );
    const items: AuditEntryDto[] = rows.map((row) => ({
      id: row.id,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      actor: row.actorId
        ? { id: row.actorId, role: row.actorRole, email: actors.get(row.actorId) ?? null }
        : null,
      before: row.before,
      after: row.after,
      ipAddress: row.ipAddress,
      requestId: row.requestId,
      createdAt: row.createdAt,
    }));
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async roles(): Promise<RoleDto[]> {
    const roles = await this.prisma.role.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { users: true } } },
    });
    return roles.map((role) => ({
      key: role.key,
      name: role.name,
      isStaff: role.isStaff,
      userCount: role._count.users,
    }));
  }

  async family(userId: string): Promise<FamilyDto> {
    const links = await this.prisma.parentChildLink.findMany({
      where: { OR: [{ parentId: userId }, { childId: userId }] },
      include: { parent: { select: personSelect }, child: { select: personSelect } },
    });
    return {
      parents: links.filter((link) => link.childId === userId).map((link) => toPerson(link.parent)),
      children: links
        .filter((link) => link.parentId === userId)
        .map((link) => toPerson(link.child)),
    };
  }
}
