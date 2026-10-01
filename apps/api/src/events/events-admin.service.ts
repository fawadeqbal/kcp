import { Prisma } from '@kcp/database';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service.js';
import { ChatService } from '../chat/chat.service.js';
import type { RequestContext } from '../common/request-context.js';
import { PrismaService } from '../database/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import type { AuthUser } from '../permissions/auth-user.js';
import type {
  AdminEventDto,
  AdminEventSummaryDto,
  EventStatusValue,
  RubricItemDto,
  SaveEventDto,
} from './events.dto.js';
import { EventsService } from './events.service.js';
import { DEFAULT_RUBRIC, DEFAULT_STARTER, READY_MENTOR, submissionOf } from './events.shared.js';
import { GitWorkspaceService } from './git-workspace.service.js';

const NEXT: Record<EventStatusValue, EventStatusValue | null> = {
  DRAFT: 'OPEN',
  OPEN: 'RUNNING',
  RUNNING: 'JUDGING',
  JUDGING: 'FINISHED',
  FINISHED: null,
};
const STARTER_PATH = /^[\w.-]+(?:\/[\w.-]+){0,2}$/;

/** Staff set up and run hackathons: status, judges, each team's mentor, results. */
@Injectable()
export class EventsAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsService,
    private readonly workspace: GitWorkspaceService,
    private readonly chat: ChatService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  async list(): Promise<AdminEventSummaryDto[]> {
    const events = await this.prisma.event.findMany({
      orderBy: { startsAt: 'desc' },
      include: { _count: { select: { teams: true } } },
    });
    return events.map((e) => ({
      id: e.id,
      slug: e.slug,
      title: e.title,
      status: e.status,
      startsAt: e.startsAt,
      endsAt: e.endsAt,
      teams: e._count.teams,
    }));
  }

  async get(id: string): Promise<AdminEventDto> {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        judges: { include: { user: { select: { id: true, displayName: true } } } },
        teams: {
          orderBy: [{ rank: 'asc' }, { name: 'asc' }],
          include: {
            mentor: { select: { id: true, displayName: true } },
            members: {
              orderBy: { joinedAt: 'asc' },
              include: {
                user: {
                  select: { username: true, studentProfile: { select: { nickname: true } } },
                },
              },
            },
            submission: true,
            scores: { include: { judge: { select: { displayName: true } } } },
          },
        },
      },
    });
    if (!event) throw new NotFoundException('No such event.');
    const mentors = await this.prisma.user.findMany({
      where: READY_MENTOR,
      orderBy: { displayName: 'asc' },
      select: { id: true, displayName: true },
      take: 200,
    });
    return {
      id: event.id,
      slug: event.slug,
      title: event.title,
      status: event.status,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      teams: event.teams.length,
      description: event.description,
      teamSize: event.teamSize,
      minAge: event.minAge,
      rubric: event.rubric as unknown as RubricItemDto[],
      starter: event.starter as Record<string, string>,
      judges: event.judges.map((j) => ({ id: j.user.id, name: j.user.displayName ?? '' })),
      mentors: mentors.map((m) => ({ id: m.id, name: m.displayName ?? '' })),
      teamList: event.teams.map((team) => ({
        id: team.id,
        name: team.name,
        joinCode: team.joinCode,
        mentor: team.mentor ? { id: team.mentor.id, name: team.mentor.displayName ?? '' } : null,
        repo: team.repo,
        members: team.members.map((m) => ({
          userId: m.userId,
          nickname: m.user.studentProfile?.nickname ?? '',
          username: m.user.username,
          status: m.status,
          isCaptain: m.isCaptain,
        })),
        submission: submissionOf(team.submission),
        scores: team.scores.map((s) => ({
          judge: s.judge.displayName ?? '',
          total: Object.values(s.scores as Record<string, number>).reduce((a, b) => a + b, 0),
        })),
        rank: team.rank,
        score: team.score,
      })),
    };
  }

  private checkDto(dto: SaveEventDto) {
    if (dto.endsAt <= dto.startsAt) {
      throw new BadRequestException({
        error: 'EVENT_DATES',
        message: 'The end comes after the start.',
      });
    }
    const rubric = dto.rubric ?? DEFAULT_RUBRIC;
    if (rubric.length === 0 || new Set(rubric.map((r) => r.key)).size !== rubric.length) {
      throw new BadRequestException({
        error: 'RUBRIC_INVALID',
        message: 'Each criterion needs its own key.',
      });
    }
    const starter = dto.starter ?? DEFAULT_STARTER;
    const entries = Object.entries(starter);
    if (
      entries.length > 10 ||
      entries.some(
        ([path, content]) =>
          !STARTER_PATH.test(path) || typeof content !== 'string' || content.length > 20_000,
      )
    ) {
      throw new BadRequestException({
        error: 'STARTER_INVALID',
        message: 'Up to 10 small text files.',
      });
    }
    return { rubric, starter };
  }

  async create(staff: AuthUser, dto: SaveEventDto, ctx: RequestContext): Promise<AdminEventDto> {
    const { rubric, starter } = this.checkDto(dto);
    let id: string;
    try {
      id = await this.prisma.$transaction(async (tx) => {
        const made = await tx.event.create({
          data: {
            slug: dto.slug,
            title: dto.title,
            description: dto.description,
            startsAt: dto.startsAt,
            endsAt: dto.endsAt,
            teamSize: dto.teamSize,
            minAge: dto.minAge,
            rubric: rubric as unknown as Prisma.InputJsonValue,
            starter,
            createdById: staff.id,
          },
        });
        await this.audit.record(
          {
            actor: { id: staff.id, roleKey: staff.roleKey },
            action: 'event.create',
            entityType: 'Event',
            entityId: made.id,
            after: { slug: dto.slug, title: dto.title },
            context: ctx,
          },
          tx,
        );
        return made.id;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException({
          error: 'SLUG_TAKEN',
          message: 'Another event has this address.',
        });
      }
      throw error;
    }
    return this.get(id);
  }

  async update(
    staff: AuthUser,
    id: string,
    dto: SaveEventDto,
    ctx: RequestContext,
  ): Promise<AdminEventDto> {
    const { rubric, starter } = this.checkDto(dto);
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('No such event.');
    if (event.status !== 'DRAFT' && dto.slug !== event.slug) {
      throw new ConflictException({
        error: 'SLUG_FIXED',
        message: 'The address can’t change once the event is open.',
      });
    }
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.event.update({
          where: { id },
          data: {
            slug: dto.slug,
            title: dto.title,
            description: dto.description,
            startsAt: dto.startsAt,
            endsAt: dto.endsAt,
            teamSize: dto.teamSize,
            minAge: dto.minAge,
            rubric: rubric as unknown as Prisma.InputJsonValue,
            starter,
          },
        });
        await this.audit.record(
          {
            actor: { id: staff.id, roleKey: staff.roleKey },
            action: 'event.update',
            entityType: 'Event',
            entityId: id,
            before: { title: event.title, status: event.status },
            after: { title: dto.title },
            context: ctx,
          },
          tx,
        );
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException({
          error: 'SLUG_TAKEN',
          message: 'Another event has this address.',
        });
      }
      throw error;
    }
    return this.get(id);
  }

  /** Moves the event one step on (draft → open → running → judging → finished). */
  async setStatus(
    staff: AuthUser,
    id: string,
    status: EventStatusValue,
    ctx: RequestContext,
  ): Promise<AdminEventDto> {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('No such event.');
    if (NEXT[event.status] !== status) {
      throw new ConflictException({
        error: 'STATUS_ORDER',
        message: `From ${event.status.toLowerCase()} the next step is ${(NEXT[event.status] ?? 'none').toLowerCase()}.`,
      });
    }
    if (status === 'JUDGING') {
      const judges = await this.prisma.eventJudge.count({ where: { eventId: id } });
      if (judges === 0) {
        throw new ConflictException({
          error: 'NO_JUDGES',
          message: 'Add at least one judge first.',
        });
      }
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.event.update({ where: { id }, data: { status } });
      // Judging starts: places still waiting for a parent are closed.
      if (status === 'JUDGING') {
        await tx.eventTeamMember.deleteMany({ where: { eventId: id, status: 'PENDING' } });
      }
      if (status === 'FINISHED') await this.rank(tx, id);
      await this.audit.record(
        {
          actor: { id: staff.id, roleKey: staff.roleKey },
          action: 'event.status',
          entityType: 'Event',
          entityId: id,
          before: { status: event.status },
          after: { status },
          context: ctx,
        },
        tx,
      );
    });
    if (status === 'FINISHED') await this.finish(id);
    return this.get(id);
  }

  /**
   * Each team's score: the average of its judges' totals. Teams that handed nothing
   * in get no rank; equal scores share a rank (1, 1, 3).
   */
  private async rank(tx: Prisma.TransactionClient, eventId: string) {
    const teams = await tx.eventTeam.findMany({
      where: { eventId },
      include: { submission: true, scores: true },
    });
    const scored = teams
      .filter((team) => team.submission)
      .map((team) => {
        const totals = team.scores.map((s) =>
          Object.values(s.scores as Record<string, number>).reduce((a, b) => a + b, 0),
        );
        return {
          id: team.id,
          score: totals.length ? totals.reduce((a, b) => a + b, 0) / totals.length : 0,
        };
      })
      .toSorted((a, b) => b.score - a.score);
    for (const team of teams) {
      if (!team.submission) {
        await tx.eventTeam.update({ where: { id: team.id }, data: { rank: null, score: null } });
      }
    }
    let previous: { score: number; rank: number } | null = null;
    for (const [index, team] of scored.entries()) {
      const rank: number = previous && previous.score === team.score ? previous.rank : index + 1;
      previous = { score: team.score, rank };
      await tx.eventTeam.update({ where: { id: team.id }, data: { rank, score: team.score } });
    }
  }

  /** Results are out: rooms close (still readable) and every member hears their rank. */
  private async finish(eventId: string) {
    const event = await this.prisma.event.findUniqueOrThrow({
      where: { id: eventId },
      include: { teams: { include: { members: { where: { status: 'APPROVED' } } } } },
    });
    const rooms = await this.prisma.chatRoom.findMany({
      where: {
        OR: [
          { kind: 'EVENT', refId: eventId },
          { kind: 'TEAM', refId: { in: event.teams.map((t) => t.id) } },
        ],
      },
      select: { id: true },
    });
    for (const room of rooms) await this.chat.archive(room.id);
    for (const team of event.teams) {
      await this.notifications.notify(
        team.members.map((m) => m.userId),
        'event_results',
        { slug: event.slug, event: event.title, rank: team.rank ?? 0 },
      );
    }
  }

  async setJudges(
    staff: AuthUser,
    id: string,
    judgeIds: string[],
    ctx: RequestContext,
  ): Promise<AdminEventDto> {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('No such event.');
    const ready = await this.prisma.user.findMany({
      where: { id: { in: judgeIds }, ...READY_MENTOR },
      select: { id: true },
    });
    if (ready.length !== new Set(judgeIds).size) {
      throw new BadRequestException({
        error: 'JUDGE_NOT_READY',
        message: 'Judges are mentors whose background check passed.',
      });
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.eventJudge.deleteMany({ where: { eventId: id } });
      await tx.eventJudge.createMany({ data: ready.map((r) => ({ eventId: id, userId: r.id })) });
      await this.audit.record(
        {
          actor: { id: staff.id, roleKey: staff.roleKey },
          action: 'event.judges',
          entityType: 'Event',
          entityId: id,
          after: { judgeIds: ready.map((r) => r.id) },
          context: ctx,
        },
        tx,
      );
    });
    return this.get(id);
  }

  /** Gives a team its mentor (or none): they join the team's room and repository. */
  async setMentor(
    staff: AuthUser,
    teamId: string,
    mentorId: string | null,
    ctx: RequestContext,
  ): Promise<AdminEventDto> {
    const team = await this.prisma.eventTeam.findUnique({
      where: { id: teamId },
      include: { event: true },
    });
    if (!team) throw new NotFoundException('No such team.');
    let mentor: { id: string; displayName: string | null } | null = null;
    if (mentorId) {
      mentor = await this.prisma.user.findFirst({
        where: { id: mentorId, ...READY_MENTOR },
        select: { id: true, displayName: true },
      });
      if (!mentor) {
        throw new BadRequestException({
          error: 'MENTOR_NOT_READY',
          message: 'Mentors need a passed background check and the signed code of conduct.',
        });
      }
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.eventTeam.update({ where: { id: teamId }, data: { mentorId } });
      await this.audit.record(
        {
          actor: { id: staff.id, roleKey: staff.roleKey },
          action: 'event.team_mentor',
          entityType: 'EventTeam',
          entityId: teamId,
          before: { mentorId: team.mentorId },
          after: { mentorId },
          context: ctx,
        },
        tx,
      );
    });
    const room = await this.chat.roomOf('TEAM', teamId);
    if (team.mentorId && team.mentorId !== mentorId) {
      if (room) await this.chat.removeMember(room.id, team.mentorId);
      await this.workspace.removeFromRepo(teamId, team.mentorId);
    }
    if (mentor) {
      if (room) await this.chat.addMember(room.id, mentor.id, 'ADULT');
      await this.workspace.addToRepo(teamId, { id: mentor.id, name: mentor.displayName ?? '' });
    }
    return this.get(team.eventId);
  }

  /** Staff take a student out of a team (after a report, or a parent's request). */
  async removeMember(
    staff: AuthUser,
    teamId: string,
    userId: string,
    reason: string,
    ctx: RequestContext,
  ): Promise<void> {
    const membership = await this.prisma.eventTeamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });
    if (!membership) throw new NotFoundException('Not in this team.');
    await this.events.removeMember(teamId, userId);
    await this.audit.record({
      actor: { id: staff.id, roleKey: staff.roleKey },
      action: 'event.member_remove',
      entityType: 'EventTeam',
      entityId: teamId,
      before: { userId },
      after: { reason },
      context: ctx,
    });
  }
}
