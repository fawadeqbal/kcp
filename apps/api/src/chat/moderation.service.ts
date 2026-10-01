import { Prisma } from '@kcp/database';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service.js';
import type { RequestContext } from '../common/request-context.js';
import { PrismaService } from '../database/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import type { AppAbility } from '../permissions/ability.factory.js';
import type { AuthUser } from '../permissions/auth-user.js';
import { UsersService } from '../users/users.service.js';
import { normalizeTerm } from './chat-filter.js';
import { ChatService, toMessageDto } from './chat.service.js';
import type {
  BlockedTermDto,
  CreateBlockedTermDto,
  ModerationActDto,
  ModerationActionDto,
  ModerationPersonDto,
  ModerationQueueDto,
  ModerationReportDto,
  StudentModerationDto,
} from './moderation.dto.js';

const HOUR_MS = 60 * 60 * 1000;
const QUEUE_SIZE = 50;
const CONTEXT = 5;

const personSelect = {
  select: {
    id: true,
    kind: true,
    status: true,
    displayName: true,
    username: true,
    studentProfile: { select: { nickname: true, avatarKey: true, chatMutedUntil: true } },
  },
} as const;

const authorSelect = {
  select: {
    id: true,
    kind: true,
    displayName: true,
    studentProfile: { select: { nickname: true, avatarKey: true } },
  },
} as const;

type Person = Prisma.UserGetPayload<typeof personSelect>;

function person(user: Person): ModerationPersonDto {
  const student = user.studentProfile;
  return {
    id: user.id,
    name: student?.nickname ?? user.displayName ?? '',
    avatarKey: student?.avatarKey ?? null,
    isAdult: user.kind !== 'STUDENT',
    username: user.kind === 'STUDENT' ? user.username : null,
  };
}

const actionInclude = { staff: { select: { displayName: true } } } as const;

function toAction(
  row: Prisma.ModerationActionGetPayload<{ include: typeof actionInclude }>,
): ModerationActionDto {
  return {
    id: row.id,
    kind: row.kind,
    reason: row.reason,
    until: row.until,
    staffName: row.staff.displayName ?? '',
    createdAt: row.createdAt,
  };
}

/**
 * The moderators' side of the rooms: reports with their context, and what to do about
 * them (warn, mute for a while, suspend the account, remove the message, or dismiss).
 * Every action is kept (and audited); the student and their parents hear about it.
 */
@Injectable()
export class ModerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chat: ChatService,
    private readonly users: UsersService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  async queue(status: 'OPEN' | 'RESOLVED' = 'OPEN', now = new Date()): Promise<ModerationQueueDto> {
    const [rows, open] = await Promise.all([
      this.prisma.chatReport.findMany({
        where: { status },
        orderBy: { createdAt: status === 'OPEN' ? 'asc' : 'desc' },
        take: QUEUE_SIZE,
        select: { id: true },
      }),
      this.prisma.chatReport.count({ where: { status: 'OPEN' } }),
    ]);
    const reports = await Promise.all(rows.map((r) => this.report(r.id, now)));
    return { reports, open };
  }

  async report(id: string, now = new Date()): Promise<ModerationReportDto> {
    const report = await this.prisma.chatReport.findUnique({
      where: { id },
      include: {
        reporter: personSelect,
        subject: personSelect,
        room: { select: { id: true, name: true, kind: true } },
        message: { include: { author: authorSelect } },
        actions: { include: actionInclude, orderBy: { createdAt: 'asc' } },
      },
    });
    if (!report) throw new NotFoundException('No such report.');
    const [openReports, pastActions, context] = await Promise.all([
      this.prisma.chatReport.count({ where: { subjectId: report.subjectId, status: 'OPEN' } }),
      this.prisma.moderationAction.count({
        where: { subjectId: report.subjectId, kind: { not: 'DISMISS' } },
      }),
      this.context(report),
    ]);
    const muted = report.subject.studentProfile?.chatMutedUntil;
    return {
      id: report.id,
      reason: report.reason,
      status: report.status,
      createdAt: report.createdAt,
      room: report.room,
      reporter: person(report.reporter),
      subject: {
        ...person(report.subject),
        status: report.subject.status,
        mutedUntil: muted && muted > now ? muted : null,
        openReports,
        pastActions,
      },
      message: report.message ? toMessageDto(report.message) : null,
      snapshot: report.snapshot,
      context,
      actions: report.actions.map(toAction),
      resolvedAt: report.resolvedAt,
    };
  }

  private async context(report: {
    roomId: string | null;
    subjectId: string;
    message: { createdAt: Date } | null;
  }) {
    if (!report.roomId) return [];
    const include = { author: authorSelect };
    if (!report.message) {
      const rows = await this.prisma.chatMessage.findMany({
        where: { roomId: report.roomId, authorId: report.subjectId },
        orderBy: { createdAt: 'desc' },
        take: CONTEXT * 2,
        include,
      });
      return rows.toReversed().map(toMessageDto);
    }
    const at = report.message.createdAt;
    const [before, after] = await Promise.all([
      this.prisma.chatMessage.findMany({
        where: { roomId: report.roomId, createdAt: { lt: at } },
        orderBy: { createdAt: 'desc' },
        take: CONTEXT,
        include,
      }),
      this.prisma.chatMessage.findMany({
        where: { roomId: report.roomId, createdAt: { gte: at } },
        orderBy: { createdAt: 'asc' },
        take: CONTEXT + 1,
        include,
      }),
    ]);
    return [...before.toReversed(), ...after].map(toMessageDto);
  }

  /** Acts on an open report (and closes the other open reports about the same message). */
  async act(
    staff: AuthUser,
    ability: AppAbility,
    reportId: string,
    dto: ModerationActDto,
    ctx: RequestContext,
    now = new Date(),
  ): Promise<ModerationReportDto> {
    const report = await this.prisma.chatReport.findUnique({
      where: { id: reportId },
      include: { subject: personSelect },
    });
    if (!report) throw new NotFoundException('No such report.');
    if (report.status !== 'OPEN') {
      throw new ConflictException({
        error: 'REPORT_CLOSED',
        message: 'Someone already dealt with this report.',
      });
    }
    const hide = dto.kind === 'HIDE' || (dto.hideMessage === true && dto.kind !== 'DISMISS');
    if (hide && !report.messageId) {
      throw new BadRequestException({
        error: 'NO_MESSAGE',
        message: 'This report is about a member, not a message.',
      });
    }
    const isStudent = report.subject.kind === 'STUDENT';
    if (dto.kind === 'MUTE' && !isStudent) {
      throw new BadRequestException({
        error: 'STUDENTS_ONLY',
        message: 'Only students can be muted.',
      });
    }
    // Suspending goes through the accounts' own rules (staff can't be suspended here).
    if (dto.kind === 'SUSPEND') {
      await this.users.setStatus(report.subjectId, 'SUSPENDED', dto.reason, staff, ability, ctx);
    }
    const until = dto.kind === 'MUTE' ? new Date(now.getTime() + dto.hours! * HOUR_MS) : null;
    let hiddenRoom: string | null = null;
    await this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ status: string }[]>`
        SELECT status FROM chat_reports WHERE id = ${reportId}::uuid FOR UPDATE`;
      if (locked[0]?.status !== 'OPEN') {
        throw new ConflictException({
          error: 'REPORT_CLOSED',
          message: 'Someone already dealt with this report.',
        });
      }
      const base = {
        subjectId: report.subjectId,
        reportId,
        messageId: report.messageId,
        staffId: staff.id,
        reason: dto.reason,
        createdAt: now,
      };
      await tx.moderationAction.create({ data: { ...base, kind: dto.kind, until } });
      if (hide) {
        const message = await this.chat.hide(report.messageId!, staff.id, tx, now);
        hiddenRoom = message.roomId;
        if (dto.kind !== 'HIDE')
          await tx.moderationAction.create({ data: { ...base, kind: 'HIDE' } });
      }
      if (until) {
        await tx.studentProfile.update({
          where: { userId: report.subjectId },
          data: { chatMutedUntil: until },
        });
      }
      await tx.chatReport.updateMany({
        where: {
          status: 'OPEN',
          OR: [{ id: reportId }, ...(report.messageId ? [{ messageId: report.messageId }] : [])],
        },
        data: { status: 'RESOLVED', resolvedById: staff.id, resolvedAt: now },
      });
      await this.audit.record(
        {
          actor: { id: staff.id, roleKey: staff.roleKey },
          action: `moderation.${dto.kind.toLowerCase()}`,
          entityType: 'ChatReport',
          entityId: reportId,
          after: {
            subjectId: report.subjectId,
            messageId: report.messageId,
            hidden: hide,
            until: until?.toISOString() ?? null,
            reason: dto.reason,
          },
          context: ctx,
        },
        tx,
      );
    });
    if (hiddenRoom) this.chat.announceHidden(hiddenRoom, report.messageId!);
    await this.tell(report.reporterId, report.subjectId, report.subject, dto.kind, until);
    return this.report(reportId, now);
  }

  /** The student, their parents and the one who reported hear what happened. */
  private async tell(
    reporterId: string,
    subjectId: string,
    subject: Person,
    kind: ModerationActDto['kind'],
    until: Date | null,
  ) {
    await this.notifications.notify([reporterId], 'chat_report_done', {});
    if (kind === 'DISMISS' || kind === 'HIDE' || subject.kind !== 'STUDENT') return;
    if (kind === 'WARN') await this.notifications.notify([subjectId], 'chat_warning', {});
    if (kind === 'MUTE') {
      await this.notifications.notify([subjectId], 'chat_muted', { until: until!.toISOString() });
    }
    await this.notifications.notify(
      await this.notifications.parentsOf(subjectId),
      'child_chat_action',
      {
        childId: subjectId,
        nickname: subject.studentProfile?.nickname ?? '',
        action: kind,
        ...(until ? { until: until.toISOString() } : {}),
      },
    );
  }

  /** A student's moderation history (on their page in the admin panel). */
  async forStudent(studentId: string, now = new Date()): Promise<StudentModerationDto> {
    const [profile, openReports, actions] = await Promise.all([
      this.prisma.studentProfile.findUnique({
        where: { userId: studentId },
        select: { chatMutedUntil: true },
      }),
      this.prisma.chatReport.count({ where: { subjectId: studentId, status: 'OPEN' } }),
      this.prisma.moderationAction.findMany({
        where: { subjectId: studentId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: actionInclude,
      }),
    ]);
    if (!profile) throw new NotFoundException('Student not found.');
    const muted = profile.chatMutedUntil;
    return {
      mutedUntil: muted && muted > now ? muted : null,
      openReports,
      actions: actions.map(toAction),
    };
  }

  /** Ends a mute early. */
  async unmute(staff: AuthUser, studentId: string, ctx: RequestContext) {
    await this.prisma.$transaction(async (tx) => {
      const profile = await tx.studentProfile.findUnique({
        where: { userId: studentId },
        select: { chatMutedUntil: true },
      });
      if (!profile) throw new NotFoundException('Student not found.');
      await tx.studentProfile.update({
        where: { userId: studentId },
        data: { chatMutedUntil: null },
      });
      await this.audit.record(
        {
          actor: { id: staff.id, roleKey: staff.roleKey },
          action: 'moderation.unmute',
          entityType: 'User',
          entityId: studentId,
          before: { mutedUntil: profile.chatMutedUntil?.toISOString() ?? null },
          after: { mutedUntil: null },
          context: ctx,
        },
        tx,
      );
    });
  }

  // ── Words the filter refuses ─────────────────────────────────────────────

  async terms(): Promise<BlockedTermDto[]> {
    const rows = await this.prisma.blockedTerm.findMany({
      orderBy: [{ language: 'asc' }, { term: 'asc' }],
    });
    return rows.map((r) => ({
      id: r.id,
      term: r.term,
      language: r.language as BlockedTermDto['language'],
      createdAt: r.createdAt,
    }));
  }

  async addTerm(
    staff: AuthUser,
    dto: CreateBlockedTermDto,
    ctx: RequestContext,
  ): Promise<BlockedTermDto> {
    const term = normalizeTerm(dto.term);
    if (term.length < 2) {
      throw new BadRequestException({ error: 'TERM_TOO_SHORT', message: 'Too short to block.' });
    }
    try {
      const row = await this.prisma.$transaction(async (tx) => {
        const created = await tx.blockedTerm.create({
          data: { term, language: dto.language, createdById: staff.id },
        });
        await this.audit.record(
          {
            actor: { id: staff.id, roleKey: staff.roleKey },
            action: 'blocked_term.add',
            entityType: 'BlockedTerm',
            entityId: created.id,
            after: { term, language: dto.language },
            context: ctx,
          },
          tx,
        );
        return created;
      });
      this.chat.forgetTerms();
      return {
        id: row.id,
        term: row.term,
        language: row.language as BlockedTermDto['language'],
        createdAt: row.createdAt,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException({ error: 'TERM_EXISTS', message: 'That word is on the list.' });
      }
      throw error;
    }
  }

  async removeTerm(staff: AuthUser, id: string, ctx: RequestContext) {
    await this.prisma.$transaction(async (tx) => {
      const row = await tx.blockedTerm.findUnique({ where: { id } });
      if (!row) throw new NotFoundException('No such word.');
      await tx.blockedTerm.delete({ where: { id } });
      await this.audit.record(
        {
          actor: { id: staff.id, roleKey: staff.roleKey },
          action: 'blocked_term.remove',
          entityType: 'BlockedTerm',
          entityId: id,
          before: { term: row.term, language: row.language },
          context: ctx,
        },
        tx,
      );
    });
    this.chat.forgetTerms();
  }
}
