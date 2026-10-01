import { randomInt } from 'node:crypto';
import { Prisma } from '@kcp/database';
import { FRIEND_CODE_ALPHABET } from '@kcp/shared';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ChatService } from '../chat/chat.service.js';
import { AppConfigService } from '../config/app-config.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { MailService } from '../mail/mail.service.js';
import { toMailLanguage } from '../mail/templates.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import type { AuthUser } from '../permissions/auth-user.js';
import { PushService } from '../push/push.service.js';
import type {
  EventDecisionResultDto,
  EventDetailDto,
  EventMemberDto,
  EventResultDto,
  EventStatusValue,
  EventSummaryDto,
  EventTeamDto,
  ParentEventRequestDto,
  RubricItemDto,
} from './events.dto.js';
import { ForgejoService } from './forgejo.service.js';
import { assertKind, submissionOf, VISIBLE_STATUSES } from './events.shared.js';
import { GitWorkspaceService } from './git-workspace.service.js';

const JOIN_CODE_LENGTH = 6;
/** Teams form while the event is open, and until it ends. */
const JOINABLE: readonly string[] = ['OPEN', 'RUNNING'];
const TEAM_NAME = /^[\p{L}\p{N}][\p{L}\p{N} '’-]{1,28}[\p{L}\p{N}]$/u;

const profile = { select: { nickname: true, avatarKey: true, birthYear: true } } as const;

const eventNotFound = () =>
  new NotFoundException({ error: 'EVENT_NOT_FOUND', message: 'No such event.' });
const teamNotFound = () =>
  new NotFoundException({ error: 'TEAM_NOT_FOUND', message: 'No such team.' });

/**
 * Hackathons for students: events open for teams (up to `teamSize`), a student makes a
 * team or joins one with its code, and a parent approves before the child is in. Each
 * team gets a room and, when git hosting is set up, a private repository (see
 * GitWorkspaceService). Judges score what teams hand in; results show nicknames only.
 */
@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly chat: ChatService,
    private readonly forgejo: ForgejoService,
    private readonly workspace: GitWorkspaceService,
    private readonly notifications: NotificationsService,
    private readonly mail: MailService,
    private readonly push: PushService,
    private readonly config: AppConfigService,
  ) {}

  private assertStudent(user: AuthUser) {
    if (user.kind !== 'STUDENT') {
      throw new ForbiddenException({ error: 'STUDENTS_ONLY', message: 'For students only.' });
    }
  }

  private async ageOf(userId: string, now: Date): Promise<number> {
    const student = await this.prisma.studentProfile.findUniqueOrThrow({
      where: { userId },
      select: { birthYear: true },
    });
    return now.getUTCFullYear() - student.birthYear;
  }

  private async visibleEvent(slug: string) {
    const event = await this.prisma.event.findUnique({ where: { slug } });
    if (!event || !(VISIBLE_STATUSES as readonly string[]).includes(event.status)) {
      throw eventNotFound();
    }
    return event;
  }

  // ── Students ─────────────────────────────────────────────────────────────

  private async summary(
    event: Prisma.EventGetPayload<object>,
    userId: string,
    age: number,
  ): Promise<EventSummaryDto> {
    const [teams, membership] = await Promise.all([
      this.prisma.eventTeam.count({ where: { eventId: event.id } }),
      this.prisma.eventTeamMember.findUnique({
        where: { eventId_userId: { eventId: event.id, userId } },
        include: { team: { select: { id: true, name: true } } },
      }),
    ]);
    return {
      slug: event.slug,
      title: event.title,
      description: event.description,
      status: event.status,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      teamSize: event.teamSize,
      minAge: event.minAge,
      teams,
      myTeam: membership
        ? {
            id: membership.team.id,
            name: membership.team.name,
            approved: membership.status === 'APPROVED',
          }
        : null,
      canJoin: !membership && JOINABLE.includes(event.status) && age >= event.minAge,
    };
  }

  /** Events students can see, the running and open ones first. */
  async list(user: AuthUser, now = new Date()): Promise<EventSummaryDto[]> {
    this.assertStudent(user);
    const age = await this.ageOf(user.id, now);
    // Every event running or open to teams (soonest first), then the latest results.
    const [active, past] = await Promise.all([
      this.prisma.event.findMany({
        where: { status: { in: ['RUNNING', 'OPEN'] } },
        orderBy: { startsAt: 'asc' },
        take: 50,
      }),
      this.prisma.event.findMany({
        where: { status: { in: ['JUDGING', 'FINISHED'] } },
        orderBy: { endsAt: 'desc' },
        take: 20,
      }),
    ]);
    const order: Record<string, number> = { RUNNING: 0, OPEN: 1, JUDGING: 2, FINISHED: 3 };
    const list = await Promise.all(
      [...active, ...past].map((event) => this.summary(event, user.id, age)),
    );
    return list.toSorted((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9));
  }

  private async teamView(teamId: string, viewerId: string): Promise<EventTeamDto> {
    const team = await this.prisma.eventTeam.findUniqueOrThrow({
      where: { id: teamId },
      include: {
        members: {
          orderBy: { joinedAt: 'asc' },
          include: { user: { select: { studentProfile: profile } } },
        },
        mentor: { select: { displayName: true } },
        submission: true,
      },
    });
    const mine = team.members.find((m) => m.userId === viewerId);
    const approved = mine?.status === 'APPROVED';
    const room = approved ? await this.chat.roomOf('TEAM', team.id) : null;
    return {
      id: team.id,
      name: team.name,
      joinCode: approved ? team.joinCode : null,
      members: team.members.flatMap((m): EventMemberDto[] => {
        const p = m.user.studentProfile;
        return p
          ? [
              {
                nickname: p.nickname,
                avatarKey: p.avatarKey,
                isCaptain: m.isCaptain,
                status: m.status,
                isMe: m.userId === viewerId,
              },
            ]
          : [];
      }),
      mentorName: team.mentor?.displayName ?? null,
      roomId: room?.id ?? null,
      submission: submissionOf(team.submission),
      rank: team.rank,
      approved,
    };
  }

  /** Finished events: every team with a rank, best first (nicknames only). */
  async results(eventId: string): Promise<EventResultDto[]> {
    const teams = await this.prisma.eventTeam.findMany({
      where: { eventId, rank: { not: null } },
      orderBy: [{ rank: 'asc' }, { name: 'asc' }],
      include: {
        members: {
          where: { status: 'APPROVED' },
          orderBy: { joinedAt: 'asc' },
          include: { user: { select: { studentProfile: profile } } },
        },
      },
    });
    return teams.map((team) => ({
      rank: team.rank!,
      team: team.name,
      score: Math.round((team.score ?? 0) * 10) / 10,
      members: team.members.flatMap((m) =>
        m.user.studentProfile
          ? [
              {
                nickname: m.user.studentProfile.nickname,
                avatarKey: m.user.studentProfile.avatarKey,
              },
            ]
          : [],
      ),
    }));
  }

  async detail(user: AuthUser, slug: string, now = new Date()): Promise<EventDetailDto> {
    this.assertStudent(user);
    const event = await this.visibleEvent(slug);
    const summary = await this.summary(event, user.id, await this.ageOf(user.id, now));
    return {
      ...summary,
      rubric: event.rubric as unknown as RubricItemDto[],
      team: summary.myTeam ? await this.teamView(summary.myTeam.id, user.id) : null,
      results: event.status === 'FINISHED' ? await this.results(event.id) : [],
      gitEnabled: this.forgejo.enabled,
    };
  }

  private async assertCanJoin(
    user: AuthUser,
    event: { id: string; status: string; minAge: number },
    now: Date,
  ) {
    if (!JOINABLE.includes(event.status)) {
      throw new ConflictException({ error: 'EVENT_CLOSED', message: 'Teams can’t change now.' });
    }
    if ((await this.ageOf(user.id, now)) < event.minAge) {
      throw new ForbiddenException({
        error: 'TOO_YOUNG_FOR_EVENT',
        message: `This event is for students aged ${event.minAge} and over.`,
      });
    }
    const already = await this.prisma.eventTeamMember.findUnique({
      where: { eventId_userId: { eventId: event.id, userId: user.id } },
    });
    if (already) {
      throw new ConflictException({
        error: 'ALREADY_IN_TEAM',
        message: 'You are in a team already.',
      });
    }
  }

  private newJoinCode(): string {
    return Array.from(
      { length: JOIN_CODE_LENGTH },
      () => FRIEND_CODE_ALPHABET[randomInt(FRIEND_CODE_ALPHABET.length)],
    ).join('');
  }

  /** Makes a team (the student is its captain; a parent approves first). */
  async createTeam(
    user: AuthUser,
    slug: string,
    rawName: string,
    now = new Date(),
  ): Promise<EventDetailDto> {
    this.assertStudent(user);
    const event = await this.visibleEvent(slug);
    await this.assertCanJoin(user, event, now);
    const name = rawName.replace(/\s+/g, ' ').trim();
    if (!TEAM_NAME.test(name)) {
      throw new BadRequestException({
        error: 'TEAM_NAME_INVALID',
        message: 'Use 3 to 30 letters, numbers and spaces.',
      });
    }
    assertKind(name, 'TEAM_NAME_BLOCKED');
    let teamId: string | null = null;
    for (let attempt = 0; attempt < 6 && !teamId; attempt++) {
      try {
        const team = await this.prisma.$transaction(async (tx) => {
          const made = await tx.eventTeam.create({
            data: { eventId: event.id, name, joinCode: this.newJoinCode() },
          });
          await tx.eventTeamMember.create({
            data: { teamId: made.id, userId: user.id, eventId: event.id, isCaptain: true },
          });
          return made;
        });
        teamId = team.id;
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')) {
          throw error;
        }
        const target = String((error.meta as { target?: unknown } | undefined)?.target ?? '');
        if (target.includes('name')) {
          throw new ConflictException({
            error: 'TEAM_NAME_TAKEN',
            message: 'A team in this event has that name.',
          });
        }
        if (!target.includes('join_code')) {
          throw new ConflictException({
            error: 'ALREADY_IN_TEAM',
            message: 'You are in a team already.',
          });
        }
        // The join code was taken: try another.
      }
    }
    if (!teamId) throw new Error('Could not make a join code');
    await this.tellParents(user.id, teamId);
    return this.detail(user, slug, now);
  }

  /** Joins a team with its code (a parent approves first). */
  async joinTeam(
    user: AuthUser,
    slug: string,
    rawCode: string,
    now = new Date(),
  ): Promise<EventDetailDto> {
    this.assertStudent(user);
    const event = await this.visibleEvent(slug);
    await this.assertCanJoin(user, event, now);
    const code = rawCode.toUpperCase().replaceAll(/[\s-]/g, '');
    const team = await this.prisma.eventTeam.findFirst({
      where: { eventId: event.id, joinCode: code },
      include: { _count: { select: { members: true } } },
    });
    if (!team) {
      throw new NotFoundException({
        error: 'TEAM_CODE_NOT_FOUND',
        message: 'No team has that code.',
      });
    }
    if (team._count.members >= event.teamSize) {
      throw new ConflictException({ error: 'TEAM_FULL', message: 'This team is full.' });
    }
    try {
      // The team row is locked while places are counted: two friends joining at the
      // same moment can't both take the last place.
      await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM event_teams WHERE id = ${team.id}::uuid FOR UPDATE`;
        const taken = await tx.eventTeamMember.count({ where: { teamId: team.id } });
        if (taken >= event.teamSize) {
          throw new ConflictException({ error: 'TEAM_FULL', message: 'This team is full.' });
        }
        await tx.eventTeamMember.create({
          data: { teamId: team.id, userId: user.id, eventId: event.id },
        });
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException({
          error: 'ALREADY_IN_TEAM',
          message: 'You are in a team already.',
        });
      }
      throw error;
    }
    await this.tellParents(user.id, team.id);
    return this.detail(user, slug, now);
  }

  /** Leaves the team (before judging). The last one out closes the team. */
  async leaveTeam(user: AuthUser, slug: string): Promise<void> {
    this.assertStudent(user);
    const event = await this.visibleEvent(slug);
    if (!JOINABLE.includes(event.status)) {
      throw new ConflictException({ error: 'EVENT_CLOSED', message: 'Teams can’t change now.' });
    }
    const membership = await this.prisma.eventTeamMember.findUnique({
      where: { eventId_userId: { eventId: event.id, userId: user.id } },
    });
    if (!membership) throw teamNotFound();
    await this.removeMember(membership.teamId, user.id);
  }

  /** Takes a student out of a team (their own choice, a parent's, or staff's). */
  async removeMember(teamId: string, userId: string): Promise<void> {
    const team = await this.prisma.eventTeam.findUniqueOrThrow({
      where: { id: teamId },
      include: { members: true },
    });
    await this.prisma.eventTeamMember.delete({ where: { teamId_userId: { teamId, userId } } });
    const room = await this.chat.roomOf('TEAM', teamId);
    if (room) await this.chat.removeMember(room.id, userId);
    const eventRoom = await this.chat.roomOf('EVENT', team.eventId);
    if (eventRoom) await this.chat.removeMember(eventRoom.id, userId);
    await this.workspace.removeFromRepo(teamId, userId);
    const left = team.members.filter((m) => m.userId !== userId);
    if (left.length === 0) {
      await this.prisma.eventTeam.delete({ where: { id: teamId } });
      if (room) await this.chat.archive(room.id);
    } else if (!left.some((m) => m.isCaptain)) {
      await this.prisma.eventTeamMember.update({
        where: { teamId_userId: { teamId, userId: left[0]!.userId } },
        data: { isCaptain: true },
      });
    }
  }

  // ── Parents ──────────────────────────────────────────────────────────────

  private async childrenOf(parentId: string): Promise<string[]> {
    const links = await this.prisma.parentChildLink.findMany({
      where: { parentId, child: { status: { not: 'DELETED' } } },
      select: { childId: true },
    });
    return links.map((l) => l.childId);
  }

  /** The children's requests to join teams, waiting for this parent. */
  async requests(parent: AuthUser): Promise<ParentEventRequestDto[]> {
    const kids = await this.childrenOf(parent.id);
    if (kids.length === 0) return [];
    const pending = await this.prisma.eventTeamMember.findMany({
      where: {
        userId: { in: kids },
        status: 'PENDING',
        team: { event: { status: { in: ['OPEN', 'RUNNING'] } } },
      },
      orderBy: { joinedAt: 'desc' },
      include: {
        user: { select: { studentProfile: profile } },
        team: {
          include: {
            event: true,
            members: { include: { user: { select: { studentProfile: profile } } } },
          },
        },
      },
    });
    return pending.flatMap((m) => {
      const p = m.user.studentProfile;
      if (!p) return [];
      return [
        {
          teamId: m.teamId,
          child: { id: m.userId, nickname: p.nickname, avatarKey: p.avatarKey },
          event: {
            slug: m.team.event.slug,
            title: m.team.event.title,
            startsAt: m.team.event.startsAt,
            endsAt: m.team.event.endsAt,
          },
          team: {
            name: m.team.name,
            members: m.team.members
              .filter((other) => other.userId !== m.userId)
              .flatMap((other) =>
                other.user.studentProfile ? [other.user.studentProfile.nickname] : [],
              ),
          },
          requestedAt: m.joinedAt,
        },
      ];
    });
  }

  /** A parent approves (their child joins the team) or declines (the request goes). */
  async decide(
    parent: AuthUser,
    teamId: string,
    childId: string,
    approve: boolean,
    now = new Date(),
  ): Promise<EventDecisionResultDto> {
    const kids = await this.childrenOf(parent.id);
    if (!kids.includes(childId)) throw teamNotFound();
    const membership = await this.prisma.eventTeamMember.findUnique({
      where: { teamId_userId: { teamId, userId: childId } },
      include: { team: { include: { event: true } } },
    });
    if (!membership || membership.status !== 'PENDING') throw teamNotFound();
    if (!approve) {
      await this.removeMember(teamId, childId);
      return { status: 'DECLINED' };
    }
    // Places are decided while teams form and build; after that the team is closed
    // (approving then would reopen its rooms).
    if (!JOINABLE.includes(membership.team.event.status)) {
      throw new ConflictException({ error: 'EVENT_CLOSED', message: 'Teams can’t change now.' });
    }
    await this.prisma.eventTeamMember.update({
      where: { teamId_userId: { teamId, userId: childId } },
      data: { status: 'APPROVED', approvedById: parent.id, approvedAt: now },
    });
    await this.joinRooms(membership.team, childId);
    const child = await this.prisma.studentProfile.findUnique({
      where: { userId: childId },
      select: { nickname: true },
    });
    await this.workspace.addToRepo(teamId, { id: childId, name: child?.nickname ?? '' });
    const { event } = membership.team;
    await this.notifications.notify([childId], 'event_joined', {
      slug: event.slug,
      event: event.title,
      team: membership.team.name,
    });
    return { status: 'APPROVED' };
  }

  /** An approved member joins the team's room and the event's room. */
  private async joinRooms(
    team: {
      id: string;
      name: string;
      mentorId: string | null;
      event: { id: string; title: string };
    },
    userId: string,
  ) {
    await this.chat.createRoom('TEAM', team.id, `${team.event.title}: ${team.name}`, [
      { userId },
      ...(team.mentorId ? [{ userId: team.mentorId, role: 'ADULT' as const }] : []),
    ]);
    await this.chat.createRoom('EVENT', team.event.id, team.event.title, [{ userId }]);
  }

  /** Both of the child's parents hear about a request (bell, email and phone). */
  private async tellParents(childId: string, teamId: string) {
    try {
      const [child, team] = await Promise.all([
        this.prisma.studentProfile.findUniqueOrThrow({
          where: { userId: childId },
          select: { nickname: true },
        }),
        this.prisma.eventTeam.findUniqueOrThrow({
          where: { id: teamId },
          include: { event: true },
        }),
      ]);
      const parents = await this.prisma.parentChildLink.findMany({
        where: { childId, parent: { status: 'ACTIVE' } },
        select: {
          parent: { select: { id: true, email: true, displayName: true, languageCode: true } },
        },
      });
      const vars = { nickname: child.nickname, event: team.event.title, team: team.name };
      await this.notifications.notify(
        parents.map((p) => p.parent.id),
        'event_join_request',
        { teamId, childId, ...vars },
      );
      for (const { parent } of parents) {
        if (!parent.email) continue;
        const language = toMailLanguage(parent.languageCode);
        await this.mail
          .send({
            to: parent.email,
            template: 'eventJoin',
            language,
            params: {
              name: parent.displayName ?? '',
              actionUrl: `${this.config.get('WEB_APP_URL')}/${language}/dashboard`,
              vars,
            },
          })
          .catch((error: Error) => this.logger.warn(`Event join email not sent: ${error.message}`));
      }
      await this.push
        .sendToUsers(
          parents.map((p) => p.parent.id),
          { kind: 'eventJoin', params: { nickname: child.nickname } },
        )
        .catch((error: Error) => this.logger.warn(`Event join push failed: ${error.message}`));
    } catch (error) {
      this.logger.warn(`Parents not told about a team request: ${(error as Error).message}`);
    }
  }

  // ── Used by the other services ───────────────────────────────────────────

  /** A team the student is an approved member of (404 otherwise). */
  async memberTeam(userId: string, teamId: string) {
    const membership = await this.prisma.eventTeamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
      include: { team: { include: { event: true } } },
    });
    if (!membership || membership.status !== 'APPROVED') throw teamNotFound();
    return membership.team;
  }

  statusOf(event: { status: string }): EventStatusValue {
    return event.status as EventStatusValue;
  }
}
