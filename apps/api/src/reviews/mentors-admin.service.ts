import { Injectable, NotFoundException } from '@nestjs/common';
import { MENTOR_CODE_OF_CONDUCT_VERSION, REVIEW_TARGET_HOURS, ROLE_KEYS } from '@kcp/database';
import { AuditService } from '../audit/audit.service.js';
import { AdultInvitesService } from '../auth/adult-invites.service.js';
import type { RequestContext } from '../common/request-context.js';
import { PrismaService } from '../database/prisma.service.js';
import type { AuthUser } from '../permissions/auth-user.js';
import type { AdminMentorsDto, InviteMentorDto, UpdateMentorDto } from './reviews.dto.js';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const round = (value: number | null) => (value === null ? null : Math.round(value * 10) / 10);

/** Admin → Mentors and tutors: invites, background checks, languages and workload. */
@Injectable()
export class MentorsAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly invites: AdultInvitesService,
  ) {}

  async list(now = new Date()): Promise<AdminMentorsDto> {
    const since = new Date(now.getTime() - 30 * DAY);
    const [mentors, tutors, open, decided, waiting, overdue, oldest, average] = await Promise.all([
      this.prisma.user.findMany({
        where: { role: { key: ROLE_KEYS.MENTOR }, status: { not: 'DELETED' } },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          displayName: true,
          email: true,
          passwordHash: true,
          mentorProfile: true,
        },
      }),
      this.prisma.user.findMany({
        where: { role: { key: ROLE_KEYS.CONTENT_CREATOR }, status: { not: 'DELETED' } },
        orderBy: { createdAt: 'asc' },
        select: { id: true, displayName: true, email: true },
      }),
      this.prisma.review.groupBy({
        by: ['mentorId'],
        where: { status: 'IN_REVIEW' },
        _count: { _all: true },
      }),
      this.prisma.review.groupBy({
        by: ['mentorId'],
        where: { decidedAt: { gte: since }, status: { in: ['APPROVED', 'CHANGES_REQUESTED'] } },
        _count: { _all: true },
        _avg: { turnaroundHours: true },
      }),
      this.prisma.review.count({ where: { status: 'WAITING' } }),
      this.prisma.review.count({
        where: {
          status: 'WAITING',
          requestedAt: { lt: new Date(now.getTime() - REVIEW_TARGET_HOURS * HOUR) },
        },
      }),
      this.prisma.review.findFirst({
        where: { status: 'WAITING' },
        orderBy: { requestedAt: 'asc' },
        select: { requestedAt: true },
      }),
      this.prisma.review.aggregate({
        where: { decidedAt: { gte: since } },
        _avg: { turnaroundHours: true },
      }),
    ]);
    const [drafts, published] = await Promise.all([
      this.prisma.contentDraft.groupBy({ by: ['editedById'], _count: { _all: true } }),
      this.prisma.contentVersion.groupBy({
        by: ['editedById'],
        where: { action: 'PUBLISH', createdAt: { gte: since } },
        _count: { _all: true },
      }),
    ]);
    const openBy = new Map(open.map((row) => [row.mentorId, row._count._all]));
    const decidedBy = new Map(decided.map((row) => [row.mentorId, row]));
    const draftsBy = new Map(drafts.map((row) => [row.editedById, row._count._all]));
    const publishedBy = new Map(published.map((row) => [row.editedById, row._count._all]));
    const inReview = open.reduce((sum, row) => sum + row._count._all, 0);
    return {
      mentors: mentors.map((m) => {
        const profile = m.mentorProfile;
        const done = decidedBy.get(m.id);
        return {
          id: m.id,
          name: m.displayName ?? m.email ?? '',
          email: m.email ?? '',
          invited: m.passwordHash === null,
          backgroundCheck: profile?.backgroundCheck ?? 'NOT_STARTED',
          backgroundCheckedAt: profile?.backgroundCheckedAt ?? null,
          backgroundCheckNote: profile?.backgroundCheckNote ?? null,
          codeOfConductSignedAt: profile?.codeOfConductSignedAt ?? null,
          codeOfConductVersion: profile?.codeOfConductVersion ?? null,
          languages: profile?.languages ?? [],
          capacity: profile?.capacity ?? 5,
          isActive: profile?.isActive ?? true,
          ready: Boolean(
            profile?.isActive &&
            profile.backgroundCheck === 'PASSED' &&
            profile.codeOfConductVersion === MENTOR_CODE_OF_CONDUCT_VERSION,
          ),
          open: openBy.get(m.id) ?? 0,
          decidedLast30Days: done?._count._all ?? 0,
          averageTurnaroundHours: round(done?._avg.turnaroundHours ?? null),
        };
      }),
      tutors: tutors.map((t) => ({
        id: t.id,
        name: t.displayName ?? t.email ?? '',
        email: t.email ?? '',
        drafts: draftsBy.get(t.id) ?? 0,
        publishedLast30Days: publishedBy.get(t.id) ?? 0,
      })),
      queue: {
        waiting,
        overdue,
        inReview,
        oldestHours: oldest ? round((now.getTime() - oldest.requestedAt.getTime()) / HOUR) : null,
        averageTurnaroundHours: round(average._avg.turnaroundHours),
      },
    };
  }

  async invite(dto: InviteMentorDto, staff: AuthUser, ctx: RequestContext): Promise<string> {
    return this.invites.invite(
      {
        email: dto.email,
        displayName: dto.displayName,
        languageCode: dto.languageCode,
        roleKey: 'mentor',
      },
      staff,
      ctx,
      (tx, userId) =>
        tx.mentorProfile.create({
          data: { userId, languages: [...new Set(dto.languages)], capacity: dto.capacity },
        }),
    );
  }

  async resendInvite(id: string): Promise<void> {
    await this.mentor(id);
    await this.invites.resend(id);
  }

  async update(id: string, dto: UpdateMentorDto, staff: AuthUser, ctx: RequestContext) {
    await this.mentor(id);
    const before = await this.prisma.mentorProfile.upsert({
      where: { userId: id },
      create: { userId: id },
      update: {},
    });
    const checkChanged =
      dto.backgroundCheck !== undefined && dto.backgroundCheck !== before.backgroundCheck;
    await this.prisma.$transaction(async (tx) => {
      const after = await tx.mentorProfile.update({
        where: { userId: id },
        data: {
          ...(dto.backgroundCheck !== undefined ? { backgroundCheck: dto.backgroundCheck } : {}),
          ...(checkChanged ? { backgroundCheckedAt: new Date() } : {}),
          ...(dto.backgroundCheckNote !== undefined
            ? { backgroundCheckNote: dto.backgroundCheckNote.trim() || null }
            : {}),
          ...(dto.languages !== undefined ? { languages: [...new Set(dto.languages)] } : {}),
          ...(dto.capacity !== undefined ? { capacity: dto.capacity } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        },
      });
      // A mentor who stops (or whose check failed) hands their open reviews back, and
      // leaves the hackathon teams they mentor, the events they judge and team rooms.
      if (!after.isActive || after.backgroundCheck === 'FAILED') {
        await tx.eventTeam.updateMany({ where: { mentorId: id }, data: { mentorId: null } });
        await tx.eventJudge.deleteMany({ where: { userId: id } });
        await tx.chatMember.deleteMany({ where: { userId: id, room: { kind: 'TEAM' } } });
        await tx.reviewComment.deleteMany({
          where: { review: { mentorId: id, status: 'IN_REVIEW' } },
        });
        await tx.review.updateMany({
          where: { mentorId: id, status: 'IN_REVIEW' },
          data: { status: 'WAITING', mentorId: null, claimedAt: null, scores: {}, summary: null },
        });
      }
      await this.audit.record(
        {
          actor: { id: staff.id, roleKey: staff.roleKey },
          action: 'mentor.update',
          entityType: 'MentorProfile',
          entityId: id,
          before: {
            backgroundCheck: before.backgroundCheck,
            languages: before.languages,
            capacity: before.capacity,
            isActive: before.isActive,
          },
          after: {
            backgroundCheck: after.backgroundCheck,
            languages: after.languages,
            capacity: after.capacity,
            isActive: after.isActive,
            reason: dto.reason.trim(),
          },
          context: ctx,
        },
        tx,
      );
    });
  }

  private async mentor(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { role: { select: { key: true } } },
    });
    if (!user || user.role.key !== ROLE_KEYS.MENTOR)
      throw new NotFoundException('Mentor not found.');
  }
}
