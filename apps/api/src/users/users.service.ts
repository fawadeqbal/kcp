import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { subject } from '@casl/ability';
import type { Prisma } from '@kcp/database';
import { AuditService } from '../audit/audit.service.js';
import type { RequestContext } from '../common/request-context.js';
import { PrismaService } from '../database/prisma.service.js';
import { SessionService } from '../auth/session.service.js';
import type { AppAbility } from '../permissions/ability.factory.js';
import type { AuthUser } from '../permissions/auth-user.js';
import { LeaderboardService } from '../progress/leaderboard.service.js';
import type { ListUsersQueryDto, UserListDto, UserSummaryDto } from './dto/user.dto.js';

const userInclude = {
  role: true,
  studentProfile: { select: { nickname: true } },
  parentLinks: { select: { parentId: true } },
} satisfies Prisma.UserInclude;

type LoadedUser = Prisma.UserGetPayload<{ include: typeof userInclude }>;

/** The attributes permission rules can check on a User (see permissions.ts in the database package). */
export function userSubject(user: LoadedUser) {
  return subject('User', {
    id: user.id,
    accountKind: user.kind,
    status: user.status,
    roleKey: user.role.key,
    parentIds: user.parentLinks.map((link) => link.parentId),
  });
}

function toSummary(user: LoadedUser): UserSummaryDto {
  return {
    id: user.id,
    kind: user.kind,
    status: user.status,
    email: user.email,
    username: user.username,
    displayName:
      user.kind === 'STUDENT' ? (user.studentProfile?.nickname ?? null) : user.displayName,
    role: { key: user.role.key, name: user.role.name },
    countryCode: user.countryCode,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
  };
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly sessions: SessionService,
    private readonly leaderboards: LeaderboardService,
  ) {}

  async list(query: ListUsersQueryDto): Promise<UserListDto> {
    const search = query.search?.trim();
    const where: Prisma.UserWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.role ? { role: { key: query.role } } : {}),
      ...(search
        ? {
            OR: [
              { email: { contains: search, mode: 'insensitive' } },
              { username: { contains: search, mode: 'insensitive' } },
              { displayName: { contains: search, mode: 'insensitive' } },
              { studentProfile: { nickname: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const [total, users] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        include: userInclude,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return { items: users.map(toSummary), total, page: query.page, pageSize: query.pageSize };
  }

  /** Returns 404 (not 403) when the caller may not see the account, so IDs of children can't be probed. */
  async get(id: string, ability: AppAbility): Promise<UserSummaryDto> {
    const user = await this.load(id);
    if (!user || !ability.can('read', userSubject(user))) {
      throw new NotFoundException('Account not found.');
    }
    return toSummary(user);
  }

  async setStatus(
    id: string,
    status: 'ACTIVE' | 'SUSPENDED',
    reason: string,
    actor: AuthUser,
    ability: AppAbility,
    ctx: RequestContext,
  ): Promise<UserSummaryDto> {
    const user = await this.load(id);
    if (!user || !ability.can('read', userSubject(user))) {
      throw new NotFoundException('Account not found.');
    }
    if (user.id === actor.id) {
      throw new BadRequestException({
        error: 'CANNOT_CHANGE_OWN_STATUS',
        message: 'You cannot change your own status.',
      });
    }
    if (!ability.can('update', userSubject(user), 'status')) {
      throw new ForbiddenException('You are not allowed to change the status of this account.');
    }
    if (user.status === 'DELETED' || user.status === 'PENDING_VERIFICATION') {
      throw new BadRequestException({
        error: 'INVALID_STATUS_CHANGE',
        message: 'Only active or suspended accounts can be changed here.',
      });
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.user.update({
        where: { id },
        data: { status },
        include: userInclude,
      });
      await this.audit.record(
        {
          actor: { id: actor.id, roleKey: actor.roleKey },
          action: status === 'SUSPENDED' ? 'user.suspend' : 'user.reactivate',
          entityType: 'User',
          entityId: id,
          before: { status: user.status },
          after: { status, reason },
          context: ctx,
        },
        tx,
      );
      return result;
    });
    if (status === 'SUSPENDED') {
      await this.sessions.revokeAllForUser(id);
    }
    // Suspended students leave the public leaderboards; reactivated ones come back.
    if (user.kind === 'STUDENT') await this.leaderboards.refreshStudent(id);
    return toSummary(updated);
  }

  /** Signs an account out on every device (e.g. a lost phone). */
  async revokeSessions(
    id: string,
    actor: AuthUser,
    ability: AppAbility,
    ctx: RequestContext,
  ): Promise<void> {
    const user = await this.load(id);
    if (!user || !ability.can('read', userSubject(user))) {
      throw new NotFoundException('Account not found.');
    }
    if (!ability.can('update', userSubject(user), 'sessions')) {
      throw new ForbiddenException('You are not allowed to sign this account out.');
    }
    await this.sessions.revokeAllForUser(id);
    await this.audit.record({
      actor: { id: actor.id, roleKey: actor.roleKey },
      action: 'user.sign_out_everywhere',
      entityType: 'User',
      entityId: id,
      context: ctx,
    });
  }

  private load(id: string): Promise<LoadedUser | null> {
    return this.prisma.user.findUnique({ where: { id }, include: userInclude });
  }
}
