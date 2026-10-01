import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import type { AuthUser } from '../permissions/auth-user.js';
import type { JudgingDto, MentorEventsDto, RubricItemDto } from './events.dto.js';
import { isReadyMentor, submissionOf, VISIBLE_STATUSES } from './events.shared.js';

const people = {
  where: { status: 'APPROVED' as const },
  orderBy: { joinedAt: 'asc' as const },
  include: {
    user: { select: { studentProfile: { select: { nickname: true, avatarKey: true } } } },
  },
};

const personOf = (m: {
  user: { studentProfile: { nickname: string; avatarKey: string } | null };
}) =>
  m.user.studentProfile
    ? [{ nickname: m.user.studentProfile.nickname, avatarKey: m.user.studentProfile.avatarKey }]
    : [];

/** Mentors: the teams they mentor, and scoring the events they judge. */
@Injectable()
export class JudgingService {
  constructor(private readonly prisma: PrismaService) {}

  async mentorEvents(user: AuthUser): Promise<MentorEventsDto> {
    if (!(await isReadyMentor(this.prisma, user.id))) return { teams: [], judging: [] };
    const [teams, judging] = await Promise.all([
      this.prisma.eventTeam.findMany({
        where: { mentorId: user.id, event: { status: { in: [...VISIBLE_STATUSES] } } },
        orderBy: { createdAt: 'desc' },
        include: { event: true, members: people },
      }),
      this.prisma.eventJudge.findMany({
        where: { userId: user.id, event: { status: { in: [...VISIBLE_STATUSES] } } },
        include: { event: true },
      }),
    ]);
    const rooms = await this.prisma.chatRoom.findMany({
      where: { kind: 'TEAM', refId: { in: teams.map((t) => t.id) } },
      select: { id: true, refId: true },
    });
    const roomOf = new Map(rooms.map((r) => [r.refId, r.id]));
    return {
      teams: teams.map((team) => ({
        id: team.id,
        name: team.name,
        event: { slug: team.event.slug, title: team.event.title, status: team.event.status },
        members: team.members.flatMap(personOf),
        hasRepo: team.repo !== null,
        roomId: roomOf.get(team.id) ?? null,
      })),
      judging: judging.map((j) => ({
        slug: j.event.slug,
        title: j.event.title,
        status: j.event.status,
      })),
    };
  }

  private async judgeOf(userId: string, slug: string) {
    const event = await this.prisma.event.findUnique({
      where: { slug },
      include: { judges: { where: { userId } } },
    });
    if (
      !event ||
      event.judges.length === 0 ||
      !['JUDGING', 'FINISHED'].includes(event.status) ||
      !(await isReadyMentor(this.prisma, userId))
    ) {
      throw new NotFoundException({ error: 'EVENT_NOT_FOUND', message: 'No such event to judge.' });
    }
    return event;
  }

  async judging(user: AuthUser, slug: string): Promise<JudgingDto> {
    const event = await this.judgeOf(user.id, slug);
    const teams = await this.prisma.eventTeam.findMany({
      where: { eventId: event.id, submission: { isNot: null } },
      orderBy: { name: 'asc' },
      include: { members: people, submission: true, scores: { where: { judgeId: user.id } } },
    });
    return {
      slug: event.slug,
      title: event.title,
      status: event.status,
      rubric: event.rubric as unknown as RubricItemDto[],
      teams: teams.map((team) => ({
        id: team.id,
        name: team.name,
        members: team.members.flatMap(personOf),
        submission: submissionOf(team.submission),
        myScores: (team.scores[0]?.scores as Record<string, number> | undefined) ?? null,
        myComment: team.scores[0]?.comment ?? null,
      })),
    };
  }

  async score(
    user: AuthUser,
    teamId: string,
    dto: { scores: Record<string, number>; comment?: string },
  ): Promise<void> {
    const team = await this.prisma.eventTeam.findUnique({
      where: { id: teamId },
      include: { event: { include: { judges: { where: { userId: user.id } } } }, submission: true },
    });
    if (
      !team ||
      team.event.judges.length === 0 ||
      !team.submission ||
      !(await isReadyMentor(this.prisma, user.id))
    ) {
      throw new NotFoundException({ error: 'TEAM_NOT_FOUND', message: 'No such team to judge.' });
    }
    if (team.event.status !== 'JUDGING') {
      throw new ConflictException({ error: 'NOT_JUDGING', message: 'Judging is closed.' });
    }
    const rubric = team.event.rubric as unknown as RubricItemDto[];
    const scores: Record<string, number> = {};
    for (const item of rubric) {
      const value = dto.scores[item.key];
      if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > item.max) {
        throw new BadRequestException({
          error: 'SCORES_NEEDED',
          message: `Give "${item.label}" a whole number from 0 to ${item.max}.`,
        });
      }
      scores[item.key] = value;
    }
    await this.prisma.eventScore.upsert({
      where: { teamId_judgeId: { teamId, judgeId: user.id } },
      create: { teamId, judgeId: user.id, scores, comment: dto.comment ?? null },
      update: { scores, comment: dto.comment ?? null },
    });
  }
}
