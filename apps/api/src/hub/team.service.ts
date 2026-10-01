import type { Prisma } from '@kcp/database';
import { HUB_SHARE_TOTAL, REVIEW_SCORE_MAX } from '@kcp/shared';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  type OnModuleInit,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service.js';
import { ChatService } from '../chat/chat.service.js';
import type { RequestContext } from '../common/request-context.js';
import { AppConfigService } from '../config/app-config.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { MailService } from '../mail/mail.service.js';
import { toMailLanguage } from '../mail/templates.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import type { AuthUser } from '../permissions/auth-user.js';
import { reference } from './clients.service.js';
import type { HubPersonDto } from './dto/projects.dto.js';
import type {
  AnonymousMemberDto,
  ChildHubProjectDto,
  HubMemberDto,
  InviteDto,
  MatchDto,
  ParentApprovalDto,
  StudentInviteDto,
  StudentProjectDto,
  StudentProjectSummaryDto,
} from './dto/team.dto.js';
import { HubEligibilityService } from './eligibility.service.js';
import { HubGitService } from './hub-git.service.js';
import { ProjectsService, projectNotFound } from './projects.service.js';
import { HubTimeService } from './time.service.js';
import { isLeadDeveloper } from './hub-rules.js';

/** Up to this many students on one project. */
export const TEAM_MAX = 6;
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
/** Projects a student can be on at once. */
const ACTIVE_PROJECTS_MAX = 2;
const OPEN_STATUSES = ['QUOTED', 'AWAITING_DEPOSIT', 'ACTIVE', 'DELIVERED'] as const;
const ON_TEAM = ['INVITED', 'ACCEPTED', 'APPROVED'] as const;

const memberNotFound = () =>
  new NotFoundException({ error: 'INVITE_NOT_FOUND', message: 'No such invitation.' });

/** Rounds a score part to one decimal. */
const part = (value: number, weight: number) =>
  Math.round(Math.max(0, Math.min(1, value)) * weight * 10) / 10;

/**
 * The team: the lead finds students (suggestions scored on skills, reviews,
 * experience and hours left), invites them for a task; the student says yes and a
 * parent approves each project. Approved students join the team's room and
 * repository. Clients see the team by pseudonym only.
 */
@Injectable()
export class HubTeamService implements OnModuleInit {
  private readonly logger = new Logger(HubTeamService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eligibility: HubEligibilityService,
    private readonly projects: ProjectsService,
    private readonly chat: ChatService,
    private readonly git: HubGitService,
    private readonly time: HubTimeService,
    private readonly notifications: NotificationsService,
    private readonly mail: MailService,
    private readonly audit: AuditService,
    private readonly config: AppConfigService,
  ) {}

  onModuleInit() {
    // A consent taken back, or staff pausing the student: they leave their projects.
    this.eligibility.onPaused((studentId, reason) => this.leaveAll(studentId, reason));
  }

  // ── Who is on a project ──────────────────────────────────────────────────

  /** The team's students by ID (pseudonym, nickname, avatar), for the lead's and team's views. */
  async people(projectId: string): Promise<Map<string, HubPersonDto>> {
    const members = await this.prisma.hubMember.findMany({
      where: { projectId },
      include: {
        student: { select: { studentProfile: { select: { nickname: true, avatarKey: true } } } },
      },
    });
    return new Map(
      members.map((m) => [
        m.studentId,
        {
          id: m.studentId,
          pseudonym: m.pseudonym,
          nickname: m.student.studentProfile?.nickname ?? '',
          avatarKey: m.student.studentProfile?.avatarKey ?? '',
        },
      ]),
    );
  }

  async members(projectId: string): Promise<HubMemberDto[]> {
    const [members, minutes] = await Promise.all([
      this.prisma.hubMember.findMany({
        where: { projectId },
        orderBy: { invitedAt: 'asc' },
        include: {
          student: { select: { studentProfile: { select: { nickname: true, avatarKey: true } } } },
        },
      }),
      this.time.minutesOnProject(projectId),
    ]);
    return members.map((m) => ({
      memberId: m.id,
      id: m.studentId,
      pseudonym: m.pseudonym,
      nickname: m.student.studentProfile?.nickname ?? '',
      avatarKey: m.student.studentProfile?.avatarKey ?? '',
      status: m.status,
      invitedAt: m.invitedAt,
      answeredAt: m.answeredAt,
      decidedAt: m.decidedAt,
      declinedBy: (m.declinedBy as 'STUDENT' | 'PARENT' | null) ?? null,
      removedAt: m.removedAt,
      taskId: m.taskId,
      minutes: minutes.get(m.studentId) ?? 0,
    }));
  }

  /** The team as the client sees it: pseudonyms, skills and finished work. Nothing else. */
  async anonymousTeam(projectId: string): Promise<AnonymousMemberDto[]> {
    const members = await this.prisma.hubMember.findMany({
      where: { projectId, status: 'APPROVED' },
      orderBy: { pseudonym: 'asc' },
      select: { studentId: true, pseudonym: true },
    });
    const ids = members.map((m) => m.studentId);
    const [skills, certificates, shipped, done] = await Promise.all([
      this.skillsOf(ids),
      this.prisma.certificate.findMany({
        where: { userId: { in: ids }, revokedAt: null },
        select: { userId: true, moduleId: true },
      }),
      this.prisma.portfolioItem.groupBy({
        by: ['userId'],
        where: { userId: { in: ids } },
        _count: { _all: true },
      }),
      this.prisma.hubTask.groupBy({
        by: ['assigneeId'],
        where: { projectId, status: 'DONE', assigneeId: { in: ids } },
        _count: { _all: true },
      }),
    ]);
    const modules = await this.prisma.module.findMany({
      where: { id: { in: [...new Set(certificates.map((c) => c.moduleId))] } },
      select: { id: true, titles: true },
    });
    const title = (id: string) =>
      ((modules.find((m) => m.id === id)?.titles ?? {}) as Record<string, string>)['en'] ?? id;
    return members.map((m) => ({
      pseudonym: m.pseudonym,
      skills: [...(skills.get(m.studentId) ?? [])].toSorted(),
      certificates: certificates
        .filter((c) => c.userId === m.studentId)
        .map((c) => title(c.moduleId)),
      shippedProjects: shipped.find((s) => s.userId === m.studentId)?._count._all ?? 0,
      tasksDone: done.find((d) => d.assigneeId === m.studentId)?._count._all ?? 0,
    }));
  }

  /** Skill keys each student has (from the lessons they finished, and hub tasks done). */
  private async skillsOf(studentIds: string[]): Promise<Map<string, Set<string>>> {
    const result = new Map<string, Set<string>>(studentIds.map((id) => [id, new Set()]));
    if (studentIds.length === 0) return result;
    const [lessons, tasks] = await Promise.all([
      this.prisma.lessonProgress.findMany({
        where: { userId: { in: studentIds }, status: 'COMPLETED' },
        select: { userId: true, lesson: { select: { skills: true } } },
      }),
      this.prisma.hubTask.findMany({
        where: { assigneeId: { in: studentIds }, status: 'DONE' },
        select: { assigneeId: true, skillTags: true },
      }),
    ]);
    for (const row of lessons)
      for (const skill of row.lesson.skills) result.get(row.userId)?.add(skill);
    for (const row of tasks) for (const tag of row.skillTags) result.get(row.assigneeId!)?.add(tag);
    return result;
  }

  // ── Matching ─────────────────────────────────────────────────────────────

  /**
   * Hub-eligible students for a task, best first: skills (40), reviews so far (25),
   * experience (15) and hours left this week against the estimate (20).
   */
  async suggestions(user: AuthUser, projectId: string, taskId: string): Promise<MatchDto[]> {
    const project = await this.projects.forLead(user, projectId);
    const task = project.quotes.flatMap((q) => q.tasks).find((t) => t.id === taskId);
    if (!task) throw new NotFoundException({ error: 'TASK_NOT_FOUND', message: 'No such task.' });
    const candidates = await this.prisma.hubEligibility.findMany({
      where: {
        eligibleAt: { not: null },
        revokedAt: null,
        student: { deletedAt: null, status: 'ACTIVE' },
      },
      select: { studentId: true },
      // The most recently eligible first, if there are ever more than this.
      orderBy: { eligibleAt: 'desc' },
      take: 500,
    });
    const taken = await this.prisma.hubMember.findMany({
      where: { projectId, status: { in: [...ON_TEAM] } },
      select: { studentId: true },
    });
    const ids = candidates
      .map((c) => c.studentId)
      .filter((id) => !taken.some((t) => t.studentId === id));
    const states = await this.eligibility.states(ids);
    const eligible = ids.filter((id) => states.get(id)?.eligible);
    if (eligible.length === 0) return [];
    const [students, skills, hubReviews, mentorReviews, certificates, active] = await Promise.all([
      this.prisma.user.findMany({
        where: { id: { in: eligible } },
        select: {
          id: true,
          countryCode: true,
          studentProfile: { select: { nickname: true, avatarKey: true, xpTotal: true } },
          readinessChecks: { where: { status: 'PASSED' }, select: { score: true }, take: 1 },
        },
      }),
      this.skillsOf(eligible),
      this.prisma.hubCodeReview.groupBy({
        by: ['studentId'],
        where: { studentId: { in: eligible } },
        _avg: { score: true },
      }),
      this.prisma.review.findMany({
        where: { studentId: { in: eligible }, status: { in: ['APPROVED', 'CHANGES_REQUESTED'] } },
        select: { studentId: true, scores: true },
        take: 2000,
      }),
      this.prisma.certificate.groupBy({
        by: ['userId'],
        where: { userId: { in: eligible }, revokedAt: null },
        _count: { _all: true },
      }),
      this.prisma.hubMember.groupBy({
        by: ['studentId'],
        where: {
          studentId: { in: eligible },
          status: 'APPROVED',
          project: { status: { in: [...OPEN_STATUSES] } },
        },
        _count: { _all: true },
      }),
    ]);
    const matches: MatchDto[] = [];
    for (const student of students) {
      const have = skills.get(student.id) ?? new Set<string>();
      const matched = task.skillTags.filter((tag) => have.has(tag));
      const skillPart = task.skillTags.length ? matched.length / task.skillTags.length : 0.5;
      const hub = hubReviews.find((r) => r.studentId === student.id)?._avg.score ?? null;
      const mentor = mentorReviews
        .filter((r) => r.studentId === student.id)
        .flatMap((r) => Object.values((r.scores ?? {}) as Record<string, number>))
        .filter((n) => typeof n === 'number');
      const reputation =
        hub !== null
          ? (hub - 1) / 4
          : mentor.length
            ? mentor.reduce((a, b) => a + b, 0) / mentor.length / REVIEW_SCORE_MAX
            : (student.readinessChecks[0]?.score ?? 8) / 16;
      const xp = student.studentProfile?.xpTotal ?? 0;
      const certs = certificates.find((c) => c.userId === student.id)?._count._all ?? 0;
      const experience = (Math.min(xp / 5000, 1) + Math.min(certs / 5, 1)) / 2;
      const usage = await this.time.usage(student.id);
      const availability = usage.leftMinutes / Math.max(task.estimateMinutes, 1);
      const score = {
        skills: part(skillPart, 40),
        reputation: part(reputation, 25),
        experience: part(experience, 15),
        availability: usage.leftMinutes > 0 ? part(availability, 20) : 0,
        total: 0,
      };
      score.total = Math.round(
        score.skills + score.reputation + score.experience + score.availability,
      );
      matches.push({
        studentId: student.id,
        nickname: student.studentProfile?.nickname ?? '',
        avatarKey: student.studentProfile?.avatarKey ?? '',
        countryCode: student.countryCode,
        score,
        matchedSkills: matched,
        minutesLeft: usage.leftMinutes,
        activeProjects: active.find((a) => a.studentId === student.id)?._count._all ?? 0,
      });
    }
    return matches.toSorted((a, b) => b.score.total - a.score.total).slice(0, 30);
  }

  // ── Invitations ──────────────────────────────────────────────────────────

  /** The lead invites a hub-eligible student to the project (for a task). */
  async invite(user: AuthUser, projectId: string, dto: InviteDto, ctx: RequestContext) {
    const project = await this.projects.forLead(user, projectId);
    if (!['AWAITING_DEPOSIT', 'ACTIVE', 'DELIVERED'].includes(project.status)) {
      throw new ConflictException({
        error: 'PROJECT_NOT_STAFFING',
        message: 'Invite students once the client has approved the quote.',
      });
    }
    if (!(await this.eligibility.isEligible(dto.studentId))) {
      throw new BadRequestException({
        error: 'NOT_ELIGIBLE',
        message: 'This student can’t take hub work now.',
      });
    }
    const task = dto.taskId
      ? project.quotes.flatMap((q) => q.tasks).find((t) => t.id === dto.taskId)
      : null;
    if (dto.taskId && (!task || task.status === 'DONE' || task.status === 'CANCELLED')) {
      throw new NotFoundException({ error: 'TASK_NOT_FOUND', message: 'No such task.' });
    }
    const busy = await this.prisma.hubMember.count({
      where: {
        studentId: dto.studentId,
        status: 'APPROVED',
        project: { status: { in: [...OPEN_STATUSES] }, id: { not: projectId } },
      },
    });
    if (busy >= ACTIVE_PROJECTS_MAX) {
      throw new ConflictException({
        error: 'STUDENT_BUSY',
        message: 'This student is on two projects already.',
      });
    }
    const memberId = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM hub_projects WHERE id = ${projectId}::uuid FOR UPDATE`;
      const existing = await tx.hubMember.findMany({ where: { projectId } });
      if (
        existing.filter((m) => (ON_TEAM as readonly string[]).includes(m.status)).length >= TEAM_MAX
      ) {
        throw new ConflictException({
          error: 'TEAM_FULL',
          message: `Up to ${TEAM_MAX} students per project.`,
        });
      }
      const before = existing.find((m) => m.studentId === dto.studentId);
      if (before && (ON_TEAM as readonly string[]).includes(before.status)) {
        throw new ConflictException({
          error: 'ALREADY_INVITED',
          message: 'This student is invited already.',
        });
      }
      const pseudonym =
        before?.pseudonym ??
        `Developer ${[...LETTERS].find((letter) => !existing.some((m) => m.pseudonym === `Developer ${letter}`)) ?? existing.length + 1}`;
      const data = {
        status: 'INVITED' as const,
        taskId: task?.id ?? null,
        note: dto.note?.trim() || null,
        invitedById: user.id,
        invitedAt: new Date(),
        answeredAt: null,
        parentId: null,
        decidedAt: null,
        declinedBy: null,
        removedAt: null,
        removedReason: null,
      };
      const member = before
        ? await tx.hubMember.update({ where: { id: before.id }, data })
        : await tx.hubMember.create({
            data: { ...data, projectId, studentId: dto.studentId, pseudonym },
          });
      await this.audit.record(
        {
          actor: { id: user.id, roleKey: user.roleKey },
          action: 'hub.invite',
          entityType: 'HubProject',
          entityId: projectId,
          after: {
            studentId: dto.studentId,
            taskId: task?.id ?? null,
            pseudonym: member.pseudonym,
          },
          context: ctx,
        },
        tx,
      );
      return member.id;
    });
    await this.notifications.notify([dto.studentId], 'hub_invite', {
      projectId,
      title: project.title,
    });
    return memberId;
  }

  /** What a project invitation offers the student (and their parent). */
  private async offer(
    member: Prisma.HubMemberGetPayload<{ include: typeof OFFER_INCLUDE }>,
  ): Promise<StudentInviteDto> {
    const task = member.task;
    const quote = task ? member.project.quotes.find((q) => q.id === task.quoteId) : null;
    return {
      memberId: member.id,
      projectId: member.projectId,
      title: member.project.title,
      summary: member.project.summary,
      leadName: member.project.lead?.displayName ?? null,
      note: member.note,
      status: member.status,
      taskTitle: task?.title ?? null,
      estimateMinutes: task?.estimateMinutes ?? null,
      estimatedEarningsMinor:
        task && quote
          ? Math.floor(
              (((quote.priceMinor * member.project.studentPercent) / 100) * task.shareBp) /
                HUB_SHARE_TOTAL,
            )
          : null,
      currency: member.project.currency,
      invitedAt: member.invitedAt,
    };
  }

  async invitesFor(user: AuthUser): Promise<StudentInviteDto[]> {
    const members = await this.prisma.hubMember.findMany({
      where: { studentId: user.id, status: { in: ['INVITED', 'ACCEPTED'] } },
      orderBy: { invitedAt: 'desc' },
      include: OFFER_INCLUDE,
    });
    return Promise.all(members.map((m) => this.offer(m)));
  }

  /** The student says yes (a parent approves next) or no. */
  async answer(user: AuthUser, memberId: string, accept: boolean) {
    const member = await this.prisma.hubMember.findUnique({
      where: { id: memberId },
      include: {
        project: { select: { title: true } },
        student: {
          select: {
            studentProfile: { select: { nickname: true } },
            parentLinks: {
              select: {
                parent: {
                  select: { id: true, email: true, displayName: true, languageCode: true },
                },
              },
            },
          },
        },
      },
    });
    if (!member || member.studentId !== user.id) throw memberNotFound();
    if (member.status !== 'INVITED') {
      throw new ConflictException({
        error: 'INVITE_ANSWERED',
        message: 'You answered this already.',
      });
    }
    if (accept && !(await this.eligibility.isEligible(user.id))) {
      throw new ConflictException({ error: 'HUB_PAUSED', message: 'Your hub work is paused.' });
    }
    const updated = await this.prisma.hubMember.updateMany({
      where: { id: memberId, status: 'INVITED' },
      data: accept
        ? { status: 'ACCEPTED', answeredAt: new Date() }
        : { status: 'DECLINED', answeredAt: new Date(), declinedBy: 'STUDENT' },
    });
    if (!updated.count || !accept) return;
    const nickname = member.student.studentProfile?.nickname ?? '';
    const parents = member.student.parentLinks.map((l) => l.parent);
    await this.notifications.notify(
      parents.map((p) => p.id),
      'child_hub_invite',
      { memberId, childId: user.id, nickname, title: member.project.title },
    );
    const base = this.config.get('WEB_APP_URL').replace(/\/+$/, '');
    for (const parent of parents) {
      if (!parent.email) continue;
      const language = toMailLanguage(parent.languageCode);
      await this.mail
        .send({
          to: parent.email,
          template: 'hubProjectApproval',
          language,
          params: {
            name: parent.displayName ?? '',
            actionUrl: `${base}/${language}/children/${user.id}/hub`,
            vars: { nickname, project: member.project.title },
          },
        })
        .catch((error: Error) =>
          this.logger.warn(`Project approval email not sent: ${error.message}`),
        );
    }
  }

  /** Projects waiting for the parent's approval. */
  async approvalsFor(user: AuthUser): Promise<ParentApprovalDto[]> {
    const members = await this.prisma.hubMember.findMany({
      where: {
        status: 'ACCEPTED',
        student: { deletedAt: null, parentLinks: { some: { parentId: user.id } } },
      },
      orderBy: { answeredAt: 'desc' },
      include: {
        ...OFFER_INCLUDE,
        student: { select: { studentProfile: { select: { nickname: true } } } },
      },
    });
    return Promise.all(
      members.map(async (m) => ({
        ...(await this.offer(m)),
        childId: m.studentId,
        nickname: m.student.studentProfile?.nickname ?? '',
        shareBp: m.task?.shareBp ?? null,
        studentPercent: m.project.studentPercent,
      })),
    );
  }

  /**
   * A parent approves (or declines) their child's place on a project. Approved: the
   * child joins the team's room and repository, and gets the task they were invited for.
   */
  async decide(user: AuthUser, memberId: string, approve: boolean, ctx: RequestContext) {
    const member = await this.prisma.hubMember.findUnique({
      where: { id: memberId },
      include: {
        project: { select: { id: true, title: true, leadId: true, status: true } },
        student: {
          select: {
            studentProfile: { select: { nickname: true } },
            parentLinks: { select: { parentId: true } },
          },
        },
      },
    });
    if (!member || !member.student.parentLinks.some((l) => l.parentId === user.id))
      throw memberNotFound();
    if (member.status !== 'ACCEPTED') {
      throw new ConflictException({
        error: 'INVITE_ANSWERED',
        message: 'This was decided already.',
      });
    }
    if (approve && !(await this.eligibility.isEligible(member.studentId))) {
      throw new ConflictException({
        error: 'HUB_PAUSED',
        message: 'Your child’s hub work is paused.',
      });
    }
    const nickname = member.student.studentProfile?.nickname ?? '';
    const decided = await this.prisma.$transaction(async (tx) => {
      const done = await tx.hubMember.updateMany({
        where: { id: memberId, status: 'ACCEPTED' },
        data: approve
          ? { status: 'APPROVED', parentId: user.id, decidedAt: new Date() }
          : { status: 'DECLINED', parentId: user.id, decidedAt: new Date(), declinedBy: 'PARENT' },
      });
      if (!done.count) return false;
      if (approve) {
        if (member.taskId) {
          await tx.hubTask.updateMany({
            where: { id: member.taskId, assigneeId: null, status: { in: ['TODO', 'IN_PROGRESS'] } },
            data: { assigneeId: member.studentId },
          });
        }
        // The lead joins the room only while they're a lead developer who may work.
        const lead =
          member.project.leadId && (await isLeadDeveloper(this.prisma, member.project.leadId))
            ? [{ userId: member.project.leadId, role: 'ADULT' as const }]
            : [];
        await this.chat.createRoom(
          'HUB',
          member.project.id,
          member.project.title,
          [...lead, { userId: member.studentId }],
          tx,
        );
      }
      await this.audit.record(
        {
          actor: { id: user.id, roleKey: user.roleKey },
          action: approve ? 'hub.member_approve' : 'hub.member_decline',
          entityType: 'HubProject',
          entityId: member.project.id,
          after: { studentId: member.studentId, memberId },
          context: ctx,
        },
        tx,
      );
      return true;
    });
    if (!decided) {
      throw new ConflictException({
        error: 'INVITE_ANSWERED',
        message: 'This was decided already.',
      });
    }
    if (approve) {
      await this.git.addToRepo(member.project.id, { id: member.studentId, name: nickname });
      await this.notifications.notify([member.studentId], 'hub_joined', {
        projectId: member.project.id,
        title: member.project.title,
      });
    }
  }

  // ── The lead runs the team ───────────────────────────────────────────────

  /** Takes a student off the project: their open tasks go back to the board. */
  async remove(user: AuthUser, memberId: string, reason: string, ctx: RequestContext) {
    const member = await this.prisma.hubMember.findUnique({
      where: { id: memberId },
      include: { project: { select: { id: true, leadId: true } } },
    });
    if (!member || member.project.leadId !== user.id) throw memberNotFound();
    await this.eligibility.assertLead(user.id);
    if (!(ON_TEAM as readonly string[]).includes(member.status)) {
      throw new ConflictException({
        error: 'NOT_ON_TEAM',
        message: 'This student isn’t on the team.',
      });
    }
    await this.takeOff(
      member.projectId,
      member.studentId,
      reason,
      { id: user.id, roleKey: user.roleKey },
      ctx,
    );
  }

  /** Off the team: timer stopped, open tasks unassigned, out of the room and repository. */
  private async takeOff(
    projectId: string,
    studentId: string,
    reason: string,
    actor: { id: string; roleKey: string } | null,
    ctx?: RequestContext,
  ) {
    const running = await this.prisma.hubTimeEntry.findFirst({
      where: { studentId, projectId, endedAt: null },
      select: { id: true },
    });
    if (running) await this.time.stopFor(studentId, actor ? 'LEAD' : 'SYSTEM');
    await this.prisma.$transaction(async (tx) => {
      await tx.hubMember.updateMany({
        where: { projectId, studentId, status: { in: [...ON_TEAM] } },
        data: { status: 'REMOVED', removedAt: new Date(), removedReason: reason },
      });
      await tx.hubTask.updateMany({
        where: {
          projectId,
          assigneeId: studentId,
          status: { in: ['TODO', 'IN_PROGRESS', 'IN_REVIEW'] },
        },
        data: { assigneeId: null, status: 'TODO' },
      });
      const room = await tx.chatRoom.findUnique({
        where: { kind_refId: { kind: 'HUB', refId: projectId } },
      });
      if (room) await this.chat.removeMember(room.id, studentId, tx);
      await this.audit.record(
        {
          actor,
          action: 'hub.member_remove',
          entityType: 'HubProject',
          entityId: projectId,
          after: { studentId, reason },
          context: ctx,
        },
        tx,
      );
    });
    await this.git.removeFromRepo(projectId, studentId);
  }

  /** A project ends (cancelled or completed): the team leaves, and its room is archived. */
  async closeProject(projectId: string, reason: string) {
    const members = await this.prisma.hubMember.findMany({
      where: { projectId, status: { in: [...ON_TEAM] } },
      select: { studentId: true, status: true },
    });
    for (const member of members) {
      if (member.status === 'APPROVED') {
        const running = await this.prisma.hubTimeEntry.findFirst({
          where: { studentId: member.studentId, projectId, endedAt: null },
        });
        if (running) await this.time.stopFor(member.studentId, 'SYSTEM');
      }
    }
    await this.prisma.hubMember.updateMany({
      where: { projectId, status: { in: ['INVITED', 'ACCEPTED'] } },
      data: { status: 'REMOVED', removedAt: new Date(), removedReason: reason },
    });
    const room = await this.chat.roomOf('HUB', projectId);
    if (room) await this.chat.archive(room.id);
  }

  /** Every project a student is on (their hub work stopped). */
  async leaveAll(studentId: string, reason: string) {
    const memberships = await this.prisma.hubMember.findMany({
      where: { studentId, status: { in: [...ON_TEAM] } },
      select: { projectId: true },
    });
    for (const { projectId } of memberships) await this.takeOff(projectId, studentId, reason, null);
  }

  /** The lead gives a task to a student on the team (or takes it back). */
  async assign(user: AuthUser, taskId: string, studentId: string | null, ctx: RequestContext) {
    const task = await this.prisma.hubTask.findUnique({
      where: { id: taskId },
      include: {
        project: { select: { id: true, leadId: true } },
        quote: { select: { status: true, acceptedAt: true } },
      },
    });
    if (!task || task.project.leadId !== user.id) {
      throw new NotFoundException({ error: 'TASK_NOT_FOUND', message: 'No such task.' });
    }
    await this.eligibility.assertLead(user.id);
    if (task.status === 'DONE' || task.status === 'CANCELLED' || task.quote.acceptedAt) {
      throw new ConflictException({ error: 'TASK_LOCKED', message: 'This task can’t change now.' });
    }
    if (studentId) {
      const member = await this.prisma.hubMember.findUnique({
        where: { projectId_studentId: { projectId: task.projectId, studentId } },
      });
      if (member?.status !== 'APPROVED') {
        throw new BadRequestException({
          error: 'NOT_ON_TEAM',
          message: 'Give tasks to students on the team.',
        });
      }
    }
    if (task.assigneeId && task.assigneeId !== studentId) {
      const running = await this.prisma.hubTimeEntry.findFirst({
        where: { taskId, studentId: task.assigneeId, endedAt: null },
      });
      if (running) await this.time.stopFor(task.assigneeId, 'LEAD');
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.hubTask.update({
        where: { id: taskId },
        data: { assigneeId: studentId, ...(studentId ? {} : { status: 'TODO' }) },
      });
      await this.audit.record(
        {
          actor: { id: user.id, roleKey: user.roleKey },
          action: 'hub.task_assign',
          entityType: 'HubTask',
          entityId: taskId,
          before: { assigneeId: task.assigneeId },
          after: { assigneeId: studentId },
          context: ctx,
        },
        tx,
      );
    });
  }

  /**
   * Moves a task on the board: a student moves their own tasks (to do, in progress,
   * in review); the lead moves any (and marks one done without a pull request).
   */
  async moveTask(
    user: AuthUser,
    taskId: string,
    status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE',
    asLead: boolean,
  ) {
    const task = await this.prisma.hubTask.findUnique({
      where: { id: taskId },
      include: {
        project: { select: { leadId: true, status: true } },
        quote: { select: { status: true, acceptedAt: true } },
      },
    });
    const mine = asLead ? task?.project.leadId === user.id : task?.assigneeId === user.id;
    if (!task || !mine)
      throw new NotFoundException({ error: 'TASK_NOT_FOUND', message: 'No such task.' });
    if (asLead) await this.eligibility.assertLead(user.id);
    else {
      const member = await this.prisma.hubMember.findUnique({
        where: { projectId_studentId: { projectId: task.projectId, studentId: user.id } },
      });
      if (member?.status !== 'APPROVED')
        throw new NotFoundException({ error: 'TASK_NOT_FOUND', message: 'No such task.' });
      if (status === 'DONE') {
        throw new ConflictException({
          error: 'LEAD_MARKS_DONE',
          message: 'Your lead marks a task done when its code is merged.',
        });
      }
    }
    if (
      !['ACTIVE', 'DELIVERED'].includes(task.project.status) ||
      task.quote.status !== 'APPROVED' ||
      task.quote.acceptedAt ||
      task.status === 'CANCELLED' ||
      (task.status === 'DONE' && !asLead)
    ) {
      throw new ConflictException({ error: 'TASK_LOCKED', message: 'This task can’t move now.' });
    }
    await this.prisma.hubTask.update({
      where: { id: taskId },
      data: { status, doneAt: status === 'DONE' ? new Date() : null },
    });
  }

  // ── Students' and parents' views ─────────────────────────────────────────

  async studentProjects(user: AuthUser): Promise<StudentProjectSummaryDto[]> {
    const members = await this.prisma.hubMember.findMany({
      where: { studentId: user.id, status: 'APPROVED' },
      orderBy: { decidedAt: 'desc' },
      include: {
        project: {
          select: {
            id: true,
            number: true,
            title: true,
            status: true,
            tasks: {
              where: { assigneeId: user.id, status: { in: ['TODO', 'IN_PROGRESS', 'IN_REVIEW'] } },
              select: { id: true },
            },
          },
        },
      },
    });
    return members.map((m) => ({
      id: m.project.id,
      reference: reference('P', m.project.number),
      title: m.project.title,
      status: m.project.status,
      memberStatus: m.status,
      openTasks: m.project.tasks.length,
    }));
  }

  /** A project as a team student sees it (the client's name is never shown to them). */
  async studentProject(user: AuthUser, projectId: string): Promise<StudentProjectDto> {
    const member = await this.prisma.hubMember.findUnique({
      where: { projectId_studentId: { projectId, studentId: user.id } },
    });
    if (member?.status !== 'APPROVED') throw projectNotFound();
    const project = await this.projects.forStaff(projectId);
    const people = await this.people(projectId);
    const room = await this.chat.roomOf('HUB', projectId);
    const tasks = project.quotes
      .filter((q) => q.status === 'APPROVED')
      .flatMap((q) => q.tasks)
      .filter((t) => t.status !== 'CANCELLED')
      .map((t) => this.projects.task(t, people));
    const team = await this.prisma.hubMember.findMany({
      where: { projectId, status: 'APPROVED' },
      orderBy: { pseudonym: 'asc' },
      select: { studentId: true },
    });
    return {
      id: project.id,
      reference: reference('P', project.number),
      title: project.title,
      summary: project.summary,
      status: project.status,
      leadName: project.lead?.displayName ?? null,
      currency: project.currency,
      deadline: project.deadline ? project.deadline.toISOString().slice(0, 10) : null,
      memberStatus: member.status,
      team: team.map((t) => ({
        ...people.get(t.studentId)!,
        isMe: t.studentId === user.id,
        isLead: false as const,
      })),
      tasks,
      roomId: room?.id ?? null,
      hasRepo: Boolean(project.repo),
    };
  }

  /** A child's hub projects, for the parent. */
  async childProjects(parentId: string, childId: string): Promise<ChildHubProjectDto[]> {
    const link = await this.prisma.parentChildLink.findFirst({ where: { parentId, childId } });
    if (!link) return [];
    const members = await this.prisma.hubMember.findMany({
      where: { studentId: childId, status: { in: ['APPROVED', 'REMOVED'] } },
      orderBy: { invitedAt: 'desc' },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            status: true,
            lead: { select: { displayName: true } },
            tasks: {
              where: { assigneeId: childId },
              select: { title: true, status: true, estimateMinutes: true },
            },
          },
        },
      },
    });
    const minutes = await this.prisma.hubTimeEntry.groupBy({
      by: ['projectId'],
      where: { studentId: childId },
      _sum: { minutes: true },
    });
    return members.map((m) => ({
      projectId: m.project.id,
      title: m.project.title,
      status: m.project.status,
      memberStatus: m.status,
      leadName: m.project.lead?.displayName ?? null,
      tasks: m.project.tasks,
      minutes: minutes.find((x) => x.projectId === m.project.id)?._sum.minutes ?? 0,
    }));
  }
}

const OFFER_INCLUDE = {
  task: true,
  project: {
    select: {
      id: true,
      title: true,
      summary: true,
      currency: true,
      studentPercent: true,
      lead: { select: { displayName: true } },
      quotes: { select: { id: true, priceMinor: true } },
    },
  },
} satisfies Prisma.HubMemberInclude;
