import { randomInt } from 'node:crypto';
import { Prisma } from '@kcp/database';
import {
  FRIEND_CODE_ALPHABET,
  FRIEND_CODE_LENGTH,
  FRIEND_REQUEST_DAYS,
  MAX_FRIENDS,
  MAX_PENDING_FRIEND_REQUESTS,
  normalizeFriendCode,
} from '@kcp/shared';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import type { Redis } from 'ioredis';
import { AuditService } from '../audit/audit.service.js';
import type { RequestContext } from '../common/request-context.js';
import { AppConfigService } from '../config/app-config.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { MailService } from '../mail/mail.service.js';
import { toMailLanguage } from '../mail/templates.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import type { AuthUser } from '../permissions/auth-user.js';
import { localDay, weekOfDay } from '../progress/xp-rules.js';
import { PushService } from '../push/push.service.js';
import { REDIS } from '../redis/redis.constants.js';
import type {
  FriendBoardDto,
  FriendDto,
  FriendsDto,
  ParentFriendRequestDto,
  StaffFriendDto,
  StudentFriendRequestDto,
} from './friends.dto.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const LOCK_SECONDS = 10 * 60;

const asDate = (day: string) => new Date(`${day}T00:00:00Z`);
/** Friendships are stored once, the smaller ID first. */
const pair = (a: string, b: string) =>
  a < b ? { userAId: a, userBId: b } : { userAId: b, userBId: a };

const profileSelect = { select: { nickname: true, avatarKey: true } } as const;

/** A request as a student sees it (nothing when the other account is gone). */
function summary(
  request: { id: string; status: StudentFriendRequestDto['status']; createdAt: Date },
  profile: { nickname: string; avatarKey: string } | null,
): StudentFriendRequestDto[] {
  return profile
    ? [
        {
          id: request.id,
          nickname: profile.nickname,
          avatarKey: profile.avatarKey,
          status: request.status,
          createdAt: request.createdAt,
        },
      ]
    : [];
}

const notFound = () =>
  new NotFoundException({
    error: 'FRIEND_CODE_NOT_FOUND',
    message: 'No student has this friend code.',
  });

/**
 * Friends between students. A student gives their friend code to a friend, who sends a
 * request with it; the two children become friends only once a parent of each has
 * approved (either parent can say no). Friends see each other by nickname and avatar
 * on the friends board (this week's XP) and in leagues. Either child or parent can end
 * a friendship at any time.
 */
@Injectable()
export class FriendsService {
  private readonly logger = new Logger(FriendsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly mail: MailService,
    private readonly push: PushService,
    private readonly audit: AuditService,
    private readonly config: AppConfigService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  private assertStudent(user: AuthUser) {
    if (user.kind !== 'STUDENT') {
      throw new ForbiddenException({ error: 'STUDENTS_ONLY', message: 'For students only.' });
    }
  }

  private assertParent(user: AuthUser) {
    if (user.roleKey !== 'parent') {
      throw new ForbiddenException({ error: 'PARENTS_ONLY', message: 'For parents only.' });
    }
  }

  // ── Students ─────────────────────────────────────────────────────────────

  /** The student's friend code, made the first time it's asked for. */
  async codeOf(userId: string): Promise<string> {
    const profile = await this.prisma.studentProfile.findUniqueOrThrow({
      where: { userId },
      select: { friendCode: true },
    });
    if (profile.friendCode) return profile.friendCode;
    for (let attempt = 0; attempt < 8; attempt++) {
      const code = Array.from(
        { length: FRIEND_CODE_LENGTH },
        () => FRIEND_CODE_ALPHABET[randomInt(FRIEND_CODE_ALPHABET.length)],
      ).join('');
      try {
        const updated = await this.prisma.studentProfile.updateMany({
          where: { userId, friendCode: null },
          data: { friendCode: code },
        });
        if (updated.count === 1) return code;
        // Made at the same moment by another request: use that one.
        const again = await this.prisma.studentProfile.findUniqueOrThrow({
          where: { userId },
          select: { friendCode: true },
        });
        if (again.friendCode) return again.friendCode;
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')) {
          throw error;
        }
        // Someone else has that code: try another.
      }
    }
    throw new Error('Could not make a friend code');
  }

  private async friendsOf(userId: string): Promise<FriendDto[]> {
    const rows = await this.prisma.friendship.findMany({
      where: { OR: [{ userAId: userId }, { userBId: userId }] },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        createdAt: true,
        userAId: true,
        userA: { select: { studentProfile: profileSelect } },
        userBId: true,
        userB: { select: { studentProfile: profileSelect } },
      },
    });
    return rows.flatMap((row) => {
      const [friendId, friend] =
        row.userAId === userId ? [row.userBId, row.userB] : [row.userAId, row.userA];
      const profile = friend.studentProfile;
      return profile
        ? [
            {
              userId: friendId,
              nickname: profile.nickname,
              avatarKey: profile.avatarKey,
              since: row.createdAt,
            },
          ]
        : [];
    });
  }

  /** The student's code, friends, and requests waiting for the parents. */
  async forStudent(user: AuthUser, now = new Date()): Promise<FriendsDto> {
    this.assertStudent(user);
    const recent = new Date(now.getTime() - FRIEND_REQUEST_DAYS * DAY_MS);
    const [code, friends, sent, received] = await Promise.all([
      this.codeOf(user.id),
      this.friendsOf(user.id),
      this.prisma.friendRequest.findMany({
        where: {
          fromId: user.id,
          OR: [
            { status: 'PENDING' },
            { status: { in: ['DECLINED', 'EXPIRED'] }, updatedAt: { gte: recent } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        include: { to: { select: { studentProfile: profileSelect } } },
      }),
      this.prisma.friendRequest.findMany({
        where: { toId: user.id, status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
        include: { from: { select: { studentProfile: profileSelect } } },
      }),
    ]);
    return {
      code,
      friends,
      sent: sent.flatMap((r) => summary(r, r.to.studentProfile)),
      received: received.flatMap((r) => summary(r, r.from.studentProfile)),
    };
  }

  /** Sends a friend request with a friend's code; both children's parents then decide. */
  async send(user: AuthUser, rawCode: string): Promise<StudentFriendRequestDto> {
    this.assertStudent(user);
    const code = normalizeFriendCode(rawCode);
    if (code.length !== FRIEND_CODE_LENGTH) throw notFound();
    const target = await this.prisma.studentProfile.findUnique({
      where: { friendCode: code },
      select: {
        userId: true,
        nickname: true,
        avatarKey: true,
        user: { select: { status: true } },
      },
    });
    if (!target || target.user.status !== 'ACTIVE') throw notFound();
    if (target.userId === user.id) {
      throw new BadRequestException({
        error: 'FRIEND_SELF',
        message: 'That is your own friend code.',
      });
    }
    const ids = pair(user.id, target.userId);
    const [friendship, open, pending, myFriends, theirFriends] = await Promise.all([
      this.prisma.friendship.findUnique({ where: { userAId_userBId: ids } }),
      this.prisma.friendRequest.findFirst({
        where: {
          status: 'PENDING',
          OR: [
            { fromId: user.id, toId: target.userId },
            { fromId: target.userId, toId: user.id },
          ],
        },
      }),
      this.prisma.friendRequest.count({ where: { fromId: user.id, status: 'PENDING' } }),
      this.countFriends(user.id),
      this.countFriends(target.userId),
    ]);
    if (friendship) {
      throw new ConflictException({
        error: 'ALREADY_FRIENDS',
        message: 'You are friends already.',
      });
    }
    if (open) {
      throw new ConflictException({
        error: 'FRIEND_REQUEST_EXISTS',
        message: 'A request between you is already waiting for your parents.',
      });
    }
    if (pending >= MAX_PENDING_FRIEND_REQUESTS) {
      throw new ConflictException({
        error: 'TOO_MANY_FRIEND_REQUESTS',
        message: 'Wait until your parents answer the requests you sent.',
      });
    }
    if (myFriends >= MAX_FRIENDS || theirFriends >= MAX_FRIENDS) {
      throw new ConflictException({
        error: 'TOO_MANY_FRIENDS',
        message: `A student can have up to ${MAX_FRIENDS} friends.`,
      });
    }
    let request;
    try {
      request = await this.prisma.friendRequest.create({
        data: { fromId: user.id, toId: target.userId },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException({
          error: 'FRIEND_REQUEST_EXISTS',
          message: 'A request between you is already waiting for your parents.',
        });
      }
      throw error;
    }
    await this.tellParents(request.id);
    return {
      id: request.id,
      nickname: target.nickname,
      avatarKey: target.avatarKey,
      status: request.status,
      createdAt: request.createdAt,
    };
  }

  private countFriends(userId: string) {
    return this.prisma.friendship.count({
      where: { OR: [{ userAId: userId }, { userBId: userId }] },
    });
  }

  /** The sender takes back a request the parents haven't answered yet. */
  async cancel(user: AuthUser, requestId: string, now = new Date()) {
    this.assertStudent(user);
    const updated = await this.prisma.friendRequest.updateMany({
      where: { id: requestId, fromId: user.id, status: 'PENDING' },
      data: { status: 'CANCELLED', decidedById: user.id, decidedAt: now },
    });
    if (updated.count === 0) throw new NotFoundException('No such request.');
  }

  /** Ends a friendship (the student's own). */
  async unfriend(user: AuthUser, friendId: string) {
    this.assertStudent(user);
    await this.end(user.id, friendId);
  }

  private async end(userId: string, friendId: string) {
    const deleted = await this.prisma.friendship.deleteMany({ where: pair(userId, friendId) });
    if (deleted.count === 0) throw new NotFoundException('Not friends.');
  }

  /** This week's XP of the student and their friends, best first. */
  async board(user: AuthUser, now = new Date()): Promise<FriendBoardDto> {
    this.assertStudent(user);
    const me = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: {
        country: { select: { timezone: true } },
        studentProfile: profileSelect,
      },
    });
    const week = weekOfDay(localDay(now, me.country?.timezone ?? 'UTC'));
    const friends = await this.friendsOf(user.id);
    const people = [
      {
        userId: user.id,
        nickname: me.studentProfile?.nickname ?? '',
        avatarKey: me.studentProfile?.avatarKey ?? 'rocket',
      },
      ...friends,
    ];
    const sums = await this.prisma.xpEvent.groupBy({
      by: ['userId'],
      where: {
        userId: { in: people.map((p) => p.userId) },
        day: { gte: asDate(week.startDay), lt: asDate(week.endDay) },
      },
      _sum: { amount: true },
    });
    const xpOf = new Map(sums.map((s) => [s.userId, Math.max(0, s._sum.amount ?? 0)]));
    const sorted = people
      .map((p) => ({ ...p, xp: xpOf.get(p.userId) ?? 0, isMe: p.userId === user.id }))
      .toSorted((a, b) => b.xp - a.xp || a.nickname.localeCompare(b.nickname));
    return {
      week: { key: week.key, startDay: week.startDay, endDay: week.endDay },
      entries: sorted.map((entry, index) => ({ rank: index + 1, ...entry })),
    };
  }

  // ── Parents ──────────────────────────────────────────────────────────────

  private async childrenOf(parentId: string): Promise<Set<string>> {
    const links = await this.prisma.parentChildLink.findMany({
      where: { parentId, child: { status: { not: 'DELETED' } } },
      select: { childId: true },
    });
    return new Set(links.map((l) => l.childId));
  }

  /** Friend requests of the parent's children that are still open. */
  async forParent(parent: AuthUser): Promise<ParentFriendRequestDto[]> {
    this.assertParent(parent);
    const kids = [...(await this.childrenOf(parent.id))];
    if (kids.length === 0) return [];
    const mine = new Set(kids);
    const requests = await this.prisma.friendRequest.findMany({
      where: { status: 'PENDING', OR: [{ fromId: { in: kids } }, { toId: { in: kids } }] },
      orderBy: { createdAt: 'desc' },
      include: {
        from: { select: { studentProfile: profileSelect } },
        to: { select: { studentProfile: profileSelect } },
      },
    });
    return requests.flatMap((request) => {
      const sent = mine.has(request.fromId);
      const [childId, child, other] = sent
        ? [request.fromId, request.from.studentProfile, request.to.studentProfile]
        : [request.toId, request.to.studentProfile, request.from.studentProfile];
      if (!child || !other) return [];
      const myApproval = sent ? request.fromParentApprovedAt : request.toParentApprovedAt;
      const theirApproval = sent ? request.toParentApprovedAt : request.fromParentApprovedAt;
      // Brothers and sisters: this parent decides for both sides.
      const bothMine = mine.has(request.fromId) && mine.has(request.toId);
      return [
        {
          id: request.id,
          child: { id: childId, nickname: child.nickname, avatarKey: child.avatarKey },
          other: { nickname: other.nickname, avatarKey: other.avatarKey },
          direction: sent ? ('sent' as const) : ('received' as const),
          waitingForYou: bothMine
            ? !request.fromParentApprovedAt || !request.toParentApprovedAt
            : !myApproval,
          waitingForOtherFamily: bothMine ? false : !theirApproval,
          createdAt: request.createdAt,
        },
      ];
    });
  }

  /**
   * A parent approves or declines a request involving their child. Once a parent of
   * each child has approved, the two are friends.
   */
  async decide(
    parent: AuthUser,
    requestId: string,
    approve: boolean,
    now = new Date(),
  ): Promise<{ status: StudentFriendRequestDto['status'] }> {
    this.assertParent(parent);
    const kids = await this.childrenOf(parent.id);
    const result = await this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM friend_requests WHERE id = ${requestId}::uuid FOR UPDATE`;
      const request = locked.length
        ? await tx.friendRequest.findUnique({ where: { id: requestId } })
        : null;
      if (!request || (!kids.has(request.fromId) && !kids.has(request.toId))) {
        throw new NotFoundException('No such request.');
      }
      if (request.status !== 'PENDING') {
        throw new ConflictException({
          error: 'FRIEND_REQUEST_CLOSED',
          message: 'This request was already answered.',
        });
      }
      if (!approve) {
        await tx.friendRequest.update({
          where: { id: requestId },
          data: { status: 'DECLINED', decidedById: parent.id, decidedAt: now },
        });
        return { status: 'DECLINED' as const, friends: null };
      }
      const data: Prisma.FriendRequestUpdateInput = {};
      if (kids.has(request.fromId) && !request.fromParentApprovedAt) {
        data.fromParentApprovedAt = now;
        data.fromParentId = parent.id;
      }
      if (kids.has(request.toId) && !request.toParentApprovedAt) {
        data.toParentApprovedAt = now;
        data.toParentId = parent.id;
      }
      const fromDone = !!(request.fromParentApprovedAt ?? data.fromParentApprovedAt);
      const toDone = !!(request.toParentApprovedAt ?? data.toParentApprovedAt);
      if (!fromDone || !toDone) {
        await tx.friendRequest.update({ where: { id: requestId }, data });
        return { status: 'PENDING' as const, friends: null };
      }
      const counts = await Promise.all(
        [request.fromId, request.toId].map((id) =>
          tx.friendship.count({ where: { OR: [{ userAId: id }, { userBId: id }] } }),
        ),
      );
      if (counts.some((count) => count >= MAX_FRIENDS)) {
        throw new ConflictException({
          error: 'TOO_MANY_FRIENDS',
          message: `A student can have up to ${MAX_FRIENDS} friends.`,
        });
      }
      await tx.friendRequest.update({
        where: { id: requestId },
        data: { ...data, status: 'APPROVED', decidedAt: now },
      });
      await tx.friendship.upsert({
        where: { userAId_userBId: pair(request.fromId, request.toId) },
        create: { ...pair(request.fromId, request.toId), requestId },
        update: {},
      });
      return { status: 'APPROVED' as const, friends: [request.fromId, request.toId] as const };
    });
    if (result.friends) await this.tellFriends(...result.friends);
    return { status: result.status };
  }

  /** A child's friends, for their parent. */
  async childFriends(parent: AuthUser, childId: string): Promise<FriendDto[]> {
    this.assertParent(parent);
    if (!(await this.childrenOf(parent.id)).has(childId)) {
      throw new NotFoundException('Child not found.');
    }
    return this.friendsOf(childId);
  }

  /** A parent ends one of their child's friendships. */
  async endChildFriendship(parent: AuthUser, childId: string, friendId: string) {
    this.assertParent(parent);
    if (!(await this.childrenOf(parent.id)).has(childId)) {
      throw new NotFoundException('Child not found.');
    }
    await this.end(childId, friendId);
  }

  // ── Staff ────────────────────────────────────────────────────────────────

  async forStaff(studentId: string): Promise<StaffFriendDto[]> {
    const friends = await this.friendsOf(studentId);
    const rows = await this.prisma.friendship.findMany({
      where: { OR: [{ userAId: studentId }, { userBId: studentId }] },
      select: { id: true, userAId: true, userBId: true },
    });
    const idOf = new Map(
      rows.map((r) => [r.userAId === studentId ? r.userBId : r.userAId, r.id] as const),
    );
    return friends.map((f) => ({ ...f, friendshipId: idOf.get(f.userId) ?? '' }));
  }

  /** Staff end a reported friendship, with a reason in the audit log. */
  async endByStaff(staff: AuthUser, friendshipId: string, reason: string, ctx: RequestContext) {
    await this.prisma.$transaction(async (tx) => {
      const friendship = await tx.friendship.findUnique({ where: { id: friendshipId } });
      if (!friendship) throw new NotFoundException('No such friendship.');
      await tx.friendship.delete({ where: { id: friendshipId } });
      await this.audit.record(
        {
          actor: { id: staff.id, roleKey: staff.roleKey },
          action: 'friendship.end',
          entityType: 'Friendship',
          entityId: friendshipId,
          before: { userAId: friendship.userAId, userBId: friendship.userBId },
          after: { reason },
          context: ctx,
        },
        tx,
      );
    });
  }

  // ── Messages and jobs ────────────────────────────────────────────────────

  /** Both children's parents hear about a new request (bell, email and phone). */
  private async tellParents(requestId: string) {
    try {
      const request = await this.prisma.friendRequest.findUniqueOrThrow({
        where: { id: requestId },
        include: {
          from: { select: { studentProfile: profileSelect } },
          to: { select: { studentProfile: profileSelect } },
        },
      });
      const sides = [
        {
          childId: request.fromId,
          child: request.from,
          friendId: request.toId,
          friend: request.to,
        },
        {
          childId: request.toId,
          child: request.to,
          friendId: request.fromId,
          friend: request.from,
        },
      ];
      for (const side of sides) {
        const nickname = side.child.studentProfile?.nickname ?? '';
        const friendNickname = side.friend.studentProfile?.nickname ?? '';
        const parents = await this.prisma.parentChildLink.findMany({
          where: { childId: side.childId, parent: { status: 'ACTIVE' } },
          select: {
            parent: {
              select: { id: true, email: true, displayName: true, languageCode: true },
            },
          },
        });
        await this.notifications.notify(
          parents.map((p) => p.parent.id),
          'friend_request',
          { requestId, childId: side.childId, friendId: side.friendId, nickname, friendNickname },
        );
        for (const { parent } of parents) {
          if (!parent.email) continue;
          const language = toMailLanguage(parent.languageCode);
          await this.mail
            .send({
              to: parent.email,
              template: 'friendRequest',
              language,
              params: {
                name: parent.displayName ?? '',
                actionUrl: `${this.config.get('WEB_APP_URL')}/${language}/dashboard`,
                vars: { nickname, friend: friendNickname },
              },
            })
            .catch((error: Error) =>
              this.logger.warn(`Friend request email not sent: ${error.message}`),
            );
        }
        await this.push
          .sendToUsers(
            parents.map((p) => p.parent.id),
            { kind: 'friendRequest', params: { nickname, friend: friendNickname } },
          )
          .catch((error: Error) =>
            this.logger.warn(`Friend request push failed: ${error.message}`),
          );
      }
    } catch (error) {
      this.logger.warn(`Parents not told about a friend request: ${(error as Error).message}`);
    }
  }

  private async tellFriends(a: string, b: string) {
    const profiles = await this.prisma.studentProfile.findMany({
      where: { userId: { in: [a, b] } },
      select: { userId: true, nickname: true },
    });
    const nick = new Map(profiles.map((p) => [p.userId, p.nickname]));
    await this.notifications.notify([a], 'friend_added', { nickname: nick.get(b) ?? '' });
    await this.notifications.notify([b], 'friend_added', { nickname: nick.get(a) ?? '' });
  }

  /** Requests no one answered in FRIEND_REQUEST_DAYS days expire (every night). */
  @Cron('10 3 * * *', { name: 'friend-requests-expire', timeZone: 'UTC' })
  async expireScheduled() {
    try {
      if (this.redis.status === 'wait') await this.redis.connect();
      if (!(await this.redis.set('friendsjob:expire', '1', 'EX', LOCK_SECONDS, 'NX'))) return;
      try {
        const count = await this.expire();
        if (count) this.logger.log(`${count} friend requests expired`);
      } finally {
        await this.redis.del('friendsjob:expire');
      }
    } catch (error) {
      this.logger.error(`Friend request expiry failed: ${(error as Error).message}`);
    }
  }

  async expire(now = new Date()): Promise<number> {
    const result = await this.prisma.friendRequest.updateMany({
      where: {
        status: 'PENDING',
        createdAt: { lt: new Date(now.getTime() - FRIEND_REQUEST_DAYS * DAY_MS) },
      },
      data: { status: 'EXPIRED', decidedAt: now },
    });
    return result.count;
  }
}
