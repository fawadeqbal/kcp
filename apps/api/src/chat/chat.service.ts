import type { ChatMemberRole, ChatRoomKind, Prisma } from '@kcp/database';
import { CHAT_RETENTION_DAYS, mayTypeInRooms } from '@kcp/shared';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import type { Redis } from 'ioredis';
import { RateLimiterService } from '../common/rate-limit/rate-limiter.service.js';
import { PrismaService } from '../database/prisma.service.js';
import type { AuthUser } from '../permissions/auth-user.js';
import { REDIS } from '../redis/redis.constants.js';
import { filterProblem } from './chat-filter.js';
import type {
  ChatMessageDto,
  ChatMessagesDto,
  ChatRoomDto,
  ReportChatDto,
  SendChatMessageDto,
} from './chat.dto.js';
import { ChatGateway } from './chat.gateway.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const PAGE_SIZE = 50;
const LOCK_SECONDS = 10 * 60;
/** Staff-added words are read at most this often (per API server). */
const TERMS_TTL_MS = 60 * 1000;

/** Sending: a burst, and an hour. */
export const CHAT_SEND_LIMITS = [
  { name: 'chat-burst', limit: 5, windowSeconds: 10 },
  { name: 'chat-hour', limit: 60, windowSeconds: 60 * 60 },
] as const;
export const CHAT_REPORT_LIMIT = { name: 'chat-report', limit: 10, windowSeconds: 60 * 60 };

const authorSelect = {
  select: {
    id: true,
    kind: true,
    displayName: true,
    studentProfile: { select: { nickname: true, avatarKey: true } },
  },
} as const;

type MessageRow = Prisma.ChatMessageGetPayload<{ include: { author: typeof authorSelect } }>;

export function toMessageDto(row: MessageRow): ChatMessageDto {
  const hidden = row.hiddenAt !== null;
  const student = row.author.studentProfile;
  return {
    id: row.id,
    roomId: row.roomId,
    author: {
      id: row.author.id,
      name: student?.nickname ?? row.author.displayName ?? '',
      avatarKey: student?.avatarKey ?? null,
      isAdult: row.author.kind !== 'STUDENT',
    },
    kind: row.kind,
    phraseKey: hidden ? null : row.phraseKey,
    text: hidden ? null : row.text,
    hidden,
    createdAt: row.createdAt,
  };
}

const tooMany = (retryAfterSeconds: number) =>
  new HttpException(
    {
      statusCode: HttpStatus.TOO_MANY_REQUESTS,
      error: 'TOO_MANY_MESSAGES',
      message: 'Slow down a little, then try again.',
      details: { retryAfterSeconds },
    },
    HttpStatus.TOO_MANY_REQUESTS,
  );

const noRoom = () => new NotFoundException({ error: 'ROOM_NOT_FOUND', message: 'No such room.' });

/**
 * Rooms for teams, classes and events. Only members see a room (and their parents,
 * read only). Every student can send the ready-made phrases; students 13 and older
 * (and the adults in the room) can also type text, which passes the filter first.
 * Sending goes through here (stored, then pushed to connected members by the gateway).
 * Anyone in a room can report a message or a member to the moderators.
 */
@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private terms: { at: number; list: string[] } | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: ChatGateway,
    private readonly limiter: RateLimiterService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  // ── Rooms (made by teams, classes and events) ────────────────────────────

  /** Makes the room for a team, class or event (or returns the one it has). */
  async createRoom(
    kind: ChatRoomKind,
    refId: string,
    name: string,
    members: { userId: string; role?: ChatMemberRole }[] = [],
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<{ id: string }> {
    const room = await tx.chatRoom.upsert({
      where: { kind_refId: { kind, refId } },
      create: { kind, refId, name },
      update: { name, isArchived: false },
      select: { id: true },
    });
    if (members.length) {
      await tx.chatMember.createMany({
        data: members.map((m) => ({ roomId: room.id, userId: m.userId, role: m.role ?? 'MEMBER' })),
        skipDuplicates: true,
      });
      for (const m of members) this.gateway.join(m.userId, room.id);
    }
    return room;
  }

  async roomOf(kind: ChatRoomKind, refId: string): Promise<{ id: string } | null> {
    return this.prisma.chatRoom.findUnique({
      where: { kind_refId: { kind, refId } },
      select: { id: true },
    });
  }

  async addMember(
    roomId: string,
    userId: string,
    role: ChatMemberRole = 'MEMBER',
    tx: Prisma.TransactionClient = this.prisma,
  ) {
    await tx.chatMember.upsert({
      where: { roomId_userId: { roomId, userId } },
      create: { roomId, userId, role },
      update: { role },
    });
    this.gateway.join(userId, roomId);
  }

  async removeMember(roomId: string, userId: string, tx: Prisma.TransactionClient = this.prisma) {
    await tx.chatMember.deleteMany({ where: { roomId, userId } });
    this.gateway.leave(userId, roomId);
  }

  async rename(roomId: string, name: string) {
    await this.prisma.chatRoom.update({ where: { id: roomId }, data: { name } });
  }

  /** The team, class or event ended: the room stays readable, no one can send. */
  async archive(roomId: string, tx: Prisma.TransactionClient = this.prisma) {
    await tx.chatRoom.update({ where: { id: roomId }, data: { isArchived: true } });
  }

  // ── Members ──────────────────────────────────────────────────────────────

  private async viewer(userId: string, now: Date) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        kind: true,
        studentProfile: { select: { birthYear: true, chatMutedUntil: true } },
      },
    });
    const profile = user.studentProfile;
    const mutedUntil =
      profile?.chatMutedUntil && profile.chatMutedUntil > now ? profile.chatMutedUntil : null;
    const canType =
      user.kind !== 'STUDENT' ||
      (profile !== null && mayTypeInRooms(profile.birthYear, now.getUTCFullYear()));
    return { isStudent: user.kind === 'STUDENT', canType, mutedUntil };
  }

  private async roomDtos(
    userId: string,
    memberships: {
      role: ChatMemberRole;
      joinedAt: Date;
      lastReadAt: Date | null;
      room: {
        id: string;
        kind: ChatRoomKind;
        name: string;
        isArchived: boolean;
      };
    }[],
    viewer: { canType: boolean; mutedUntil: Date | null } | null,
  ): Promise<ChatRoomDto[]> {
    const rooms = await Promise.all(
      memberships.map(async (m) => {
        const [unread, last] = await Promise.all([
          viewer
            ? this.prisma.chatMessage.count({
                where: {
                  roomId: m.room.id,
                  authorId: { not: userId },
                  createdAt: { gt: m.lastReadAt ?? m.joinedAt },
                },
              })
            : Promise.resolve(0),
          this.prisma.chatMessage.findFirst({
            where: { roomId: m.room.id },
            orderBy: { createdAt: 'desc' },
            select: { createdAt: true },
          }),
        ]);
        return {
          id: m.room.id,
          kind: m.room.kind,
          name: m.room.name,
          unread,
          lastMessageAt: last?.createdAt ?? null,
          canType: viewer !== null && !m.room.isArchived && (viewer.canType || m.role === 'ADULT'),
          mutedUntil: viewer?.mutedUntil ?? null,
          archived: m.room.isArchived,
        };
      }),
    );
    return rooms.toSorted(
      (a, b) =>
        Number(a.archived) - Number(b.archived) ||
        (b.lastMessageAt?.getTime() ?? 0) - (a.lastMessageAt?.getTime() ?? 0) ||
        a.name.localeCompare(b.name),
    );
  }

  private membershipSelect = {
    role: true,
    joinedAt: true,
    lastReadAt: true,
    room: { select: { id: true, kind: true, name: true, isArchived: true } },
  } as const;

  /** The rooms the caller is in, newest activity first (archived ones last). */
  async myRooms(user: AuthUser, now = new Date()): Promise<ChatRoomDto[]> {
    const [viewer, memberships] = await Promise.all([
      this.viewer(user.id, now),
      this.prisma.chatMember.findMany({
        where: { userId: user.id },
        select: this.membershipSelect,
      }),
    ]);
    return this.roomDtos(user.id, memberships, viewer);
  }

  private async page(roomId: string, before: Date | undefined) {
    const rows = await this.prisma.chatMessage.findMany({
      where: { roomId, ...(before ? { createdAt: { lt: before } } : {}) },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: PAGE_SIZE + 1,
      include: { author: authorSelect },
    });
    return {
      messages: rows.slice(0, PAGE_SIZE).toReversed().map(toMessageDto),
      hasMore: rows.length > PAGE_SIZE,
    };
  }

  private async membership(userId: string, roomId: string) {
    const member = await this.prisma.chatMember.findUnique({
      where: { roomId_userId: { roomId, userId } },
      select: this.membershipSelect,
    });
    if (!member) throw noRoom();
    return member;
  }

  /** A page of a room's messages (members only). */
  async messages(
    user: AuthUser,
    roomId: string,
    before?: Date,
    now = new Date(),
  ): Promise<ChatMessagesDto> {
    const member = await this.membership(user.id, roomId);
    const [[room], page] = await Promise.all([
      this.roomDtos(user.id, [member], await this.viewer(user.id, now)),
      this.page(roomId, before),
    ]);
    return { room: room!, ...page };
  }

  /** The member read the room up to now. */
  async markRead(user: AuthUser, roomId: string, now = new Date()) {
    const updated = await this.prisma.chatMember.updateMany({
      where: { roomId, userId: user.id },
      data: { lastReadAt: now },
    });
    if (updated.count === 0) throw noRoom();
  }

  private async blockedTerms(): Promise<string[]> {
    const now = Date.now();
    if (this.terms && now - this.terms.at < TERMS_TTL_MS) return this.terms.list;
    const rows = await this.prisma.blockedTerm.findMany({ select: { term: true } });
    this.terms = { at: now, list: rows.map((r) => r.term) };
    return this.terms.list;
  }

  /** Staff changed the word list: use it from the next message on. */
  forgetTerms() {
    this.terms = null;
  }

  /** Checks a text against the filter (also used by the admin page to try a word). */
  async check(text: string) {
    return filterProblem(text, await this.blockedTerms());
  }

  /** Sends a phrase or (13 and older, and adults) a typed text. */
  async send(
    user: AuthUser,
    roomId: string,
    dto: SendChatMessageDto,
    now = new Date(),
  ): Promise<ChatMessageDto> {
    const member = await this.membership(user.id, roomId);
    if (member.room.isArchived) {
      throw new ConflictException({
        error: 'ROOM_ARCHIVED',
        message: 'This room is closed: you can read it, not send.',
      });
    }
    if ((dto.phrase === undefined) === (dto.text === undefined)) {
      throw new BadRequestException({
        error: 'MESSAGE_EMPTY',
        message: 'Send either a phrase or a text.',
      });
    }
    const viewer = await this.viewer(user.id, now);
    if (viewer.mutedUntil) {
      throw new ForbiddenException({
        error: 'CHAT_MUTED',
        message: 'A moderator paused your messages for a while.',
        details: { mutedUntil: viewer.mutedUntil.toISOString() },
      });
    }
    if (dto.text !== undefined && !viewer.canType && member.role !== 'ADULT') {
      throw new ForbiddenException({
        error: 'PHRASES_ONLY',
        message: 'You can send the ready-made phrases.',
      });
    }
    for (const rule of CHAT_SEND_LIMITS) {
      const result = await this.limiter.consume(rule.name, user.id, rule.limit, rule.windowSeconds);
      if (!result.allowed) throw tooMany(result.retryAfterSeconds);
    }
    if (dto.text !== undefined) {
      const problem = await this.check(dto.text);
      if (problem) {
        throw new BadRequestException({
          error: 'MESSAGE_BLOCKED',
          details: { reason: problem },
          message: 'This message can’t be sent. Try saying it another way.',
        });
      }
    }
    const row = await this.prisma.$transaction(async (tx) => {
      const created = await tx.chatMessage.create({
        data: {
          roomId,
          authorId: user.id,
          kind: dto.text !== undefined ? 'TEXT' : 'PHRASE',
          phraseKey: dto.phrase ?? null,
          text: dto.text ?? null,
          createdAt: now,
        },
        include: { author: authorSelect },
      });
      await tx.chatMember.update({
        where: { roomId_userId: { roomId, userId: user.id } },
        data: { lastReadAt: now },
      });
      return created;
    });
    const message = toMessageDto(row);
    this.gateway.message(message);
    return message;
  }

  /** Reports a message (or a member) in a room the caller is in, for the moderators. */
  async report(user: AuthUser, roomId: string, dto: ReportChatDto): Promise<{ id: string }> {
    await this.membership(user.id, roomId);
    let subjectId: string;
    let messageId: string | null = null;
    let snapshot: string | null = null;
    if (dto.messageId) {
      const message = await this.prisma.chatMessage.findFirst({
        where: { id: dto.messageId, roomId },
        select: { id: true, authorId: true, kind: true, text: true, phraseKey: true },
      });
      if (!message) throw new NotFoundException('No such message.');
      subjectId = message.authorId;
      messageId = message.id;
      snapshot = message.kind === 'TEXT' ? message.text : `[${message.phraseKey}]`;
    } else if (dto.userId) {
      const member = await this.prisma.chatMember.findUnique({
        where: { roomId_userId: { roomId, userId: dto.userId } },
      });
      if (!member) throw new NotFoundException('No such member.');
      subjectId = dto.userId;
    } else {
      throw new BadRequestException({
        error: 'REPORT_WHAT',
        message: 'Report a message or a member.',
      });
    }
    if (subjectId === user.id) {
      throw new BadRequestException({
        error: 'REPORT_SELF',
        message: 'You can’t report yourself.',
      });
    }
    // Reporting the same thing twice keeps one report.
    const open = await this.prisma.chatReport.findFirst({
      where: { reporterId: user.id, subjectId, messageId, status: 'OPEN' },
      select: { id: true },
    });
    if (open) return open;
    const limit = CHAT_REPORT_LIMIT;
    const result = await this.limiter.consume(
      limit.name,
      user.id,
      limit.limit,
      limit.windowSeconds,
    );
    if (!result.allowed) throw tooMany(result.retryAfterSeconds);
    return this.prisma.chatReport.create({
      data: { reporterId: user.id, roomId, messageId, subjectId, reason: dto.reason, snapshot },
      select: { id: true },
    });
  }

  // ── Parents (read only) ──────────────────────────────────────────────────

  private async assertChild(parent: AuthUser, childId: string) {
    const link = await this.prisma.parentChildLink.findFirst({
      where: { parentId: parent.id, childId, child: { status: { not: 'DELETED' } } },
    });
    if (!link) throw new NotFoundException('Child not found.');
  }

  async childRooms(parent: AuthUser, childId: string): Promise<ChatRoomDto[]> {
    await this.assertChild(parent, childId);
    const memberships = await this.prisma.chatMember.findMany({
      where: { userId: childId },
      select: this.membershipSelect,
    });
    return this.roomDtos(childId, memberships, null);
  }

  async childMessages(
    parent: AuthUser,
    childId: string,
    roomId: string,
    before?: Date,
  ): Promise<ChatMessagesDto> {
    await this.assertChild(parent, childId);
    const member = await this.membership(childId, roomId);
    const [[room], page] = await Promise.all([
      this.roomDtos(childId, [member], null),
      this.page(roomId, before),
    ]);
    return { room: room!, ...page };
  }

  // ── Staff (read any room, for context) ───────────────────────────────────

  async staffMessages(roomId: string, before?: Date): Promise<ChatMessagesDto> {
    const room = await this.prisma.chatRoom.findUnique({ where: { id: roomId } });
    if (!room) throw noRoom();
    const page = await this.page(roomId, before);
    return {
      room: {
        id: room.id,
        kind: room.kind,
        name: room.name,
        unread: 0,
        lastMessageAt: page.messages.at(-1)?.createdAt ?? null,
        canType: false,
        mutedUntil: null,
        archived: room.isArchived,
      },
      ...page,
    };
  }

  /** Hides a message for everyone (a moderator's action). */
  async hide(messageId: string, staffId: string, tx: Prisma.TransactionClient, now = new Date()) {
    const message = await tx.chatMessage.findUnique({
      where: { id: messageId },
      select: { id: true, roomId: true, hiddenAt: true },
    });
    if (!message) throw new NotFoundException('No such message.');
    if (!message.hiddenAt) {
      await tx.chatMessage.update({
        where: { id: messageId },
        data: { hiddenAt: now, hiddenById: staffId },
      });
    }
    return message;
  }

  announceHidden(roomId: string, messageId: string) {
    this.gateway.hidden(roomId, messageId);
  }

  // ── Jobs ─────────────────────────────────────────────────────────────────

  /** Messages older than CHAT_RETENTION_DAYS are deleted (every night). */
  @Cron('25 3 * * *', { name: 'chat-retention', timeZone: 'UTC' })
  async retentionScheduled() {
    try {
      if (this.redis.status === 'wait') await this.redis.connect();
      if (!(await this.redis.set('chatjob:retention', '1', 'EX', LOCK_SECONDS, 'NX'))) return;
      try {
        const count = await this.deleteOld();
        if (count) this.logger.log(`${count} old room messages deleted`);
      } finally {
        await this.redis.del('chatjob:retention');
      }
    } catch (error) {
      this.logger.error(`Room retention failed: ${(error as Error).message}`);
    }
  }

  async deleteOld(now = new Date()): Promise<number> {
    const result = await this.prisma.chatMessage.deleteMany({
      where: { createdAt: { lt: new Date(now.getTime() - CHAT_RETENTION_DAYS * DAY_MS) } },
    });
    return result.count;
  }
}
