import { subject } from '@casl/ability';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  MENTOR_CODE_OF_CONDUCT_VERSION,
  type Prisma,
  REVIEW_TARGET_HOURS,
  ROLE_KEYS,
  type ReviewStatus,
} from '@kcp/database';
import { parseProgram, programToJs } from '@kcp/checks';
import { CODE_FILE_KEYS, type CodeFileKey, REVIEW_CRITERIA, REVIEW_SCORE_MAX } from '@kcp/shared';
import { AuditService } from '../audit/audit.service.js';
import { CertificatesService } from '../certificates/certificates.service.js';
import type { RequestContext } from '../common/request-context.js';
import { PrismaService } from '../database/prisma.service.js';
import { readinessBrief } from '../readiness/brief.js';
import { pick, pickTranslation } from '../learning/content.js';
import type { CodeFilesDto, StageDto } from '../learning/dto/learning.dto.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import type { AppAbility } from '../permissions/ability.factory.js';
import type { AuthUser } from '../permissions/auth-user.js';
import type {
  AddCommentDto,
  DecisionDto,
  MentorQueueDto,
  MentorQueueItemDto,
  MentorReviewDto,
  MentorStatusDto,
  ReviewSummaryDto,
  StudentReviewDto,
} from './reviews.dto.js';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const OPEN: ReviewStatus[] = ['WAITING', 'IN_REVIEW'];

/** The readiness brief, as the mentor console shows a project brief. */
function readinessForMentor(language: string) {
  const brief = readinessBrief(language);
  return {
    title: brief.title,
    summary: brief.summary,
    body: brief.body,
    checkLabels: brief.requirements,
  };
}

const codeFiles = (value: unknown): CodeFilesDto => {
  const files = (value ?? {}) as Record<string, unknown>;
  const result: CodeFilesDto = {};
  for (const key of CODE_FILE_KEYS) {
    if (typeof files[key] === 'string') result[key] = files[key];
  }
  return result;
};

/**
 * Lines a mentor can comment on. A block program is shown (and commented on) as the
 * JavaScript it stands for; its line count doesn't depend on the language.
 */
function lineCount(key: CodeFileKey, code: string | undefined): number {
  if (code === undefined) return 0;
  if (key !== 'blocks') return code.split('\n').length;
  const program = parseProgram(code);
  return program ? programToJs(program).split('\n').length : 0;
}

const firstName = (name: string | null | undefined) => name?.trim().split(/\s+/)[0] ?? null;

const reviewInclude = {
  student: {
    select: {
      id: true,
      studentProfile: { select: { nickname: true, avatarKey: true } },
    },
  },
  project: {
    select: {
      brief: {
        select: {
          id: true,
          moduleId: true,
          module: { select: { titles: true } },
          translations: true,
          stage: true,
        },
      },
    },
  },
} as const;

type ReviewRow = Prisma.ReviewGetPayload<{ include: typeof reviewInclude }>;

/**
 * Mentor reviews: premium students' shipped projects wait in a queue; a mentor whose
 * background check passed and who signed the code of conduct claims one, comments on
 * lines, scores the rubric and approves or asks for changes. Mentors see nicknames only.
 */
@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly certificates: CertificatesService,
  ) {}

  // ── The mentor's own status ─────────────────────────────────────────────────

  /** Mentor pages are for mentor accounts (admins manage profiles elsewhere). */
  private assertMentor(user: AuthUser) {
    if (user.roleKey !== ROLE_KEYS.MENTOR) {
      throw new ForbiddenException({ error: 'MENTORS_ONLY', message: 'This is for mentors.' });
    }
  }

  private async profile(userId: string) {
    return this.prisma.mentorProfile.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  }

  private isReady(profile: {
    backgroundCheck: string;
    codeOfConductVersion: string | null;
    codeOfConductSignedAt: Date | null;
    isActive: boolean;
  }) {
    return (
      profile.isActive &&
      profile.backgroundCheck === 'PASSED' &&
      profile.codeOfConductSignedAt !== null &&
      profile.codeOfConductVersion === MENTOR_CODE_OF_CONDUCT_VERSION
    );
  }

  async status(user: AuthUser): Promise<MentorStatusDto> {
    this.assertMentor(user);
    const profile = await this.profile(user.id);
    const open = await this.prisma.review.count({
      where: { mentorId: user.id, status: 'IN_REVIEW' },
    });
    return {
      ready: this.isReady(profile),
      backgroundCheck: profile.backgroundCheck,
      codeOfConductSigned:
        profile.codeOfConductSignedAt !== null &&
        profile.codeOfConductVersion === MENTOR_CODE_OF_CONDUCT_VERSION,
      codeOfConductVersion: MENTOR_CODE_OF_CONDUCT_VERSION,
      languages: profile.languages,
      capacity: profile.capacity,
      isActive: profile.isActive,
      open,
    };
  }

  async signConduct(user: AuthUser, version: string, ctx: RequestContext): Promise<void> {
    this.assertMentor(user);
    if (version !== MENTOR_CODE_OF_CONDUCT_VERSION) {
      throw new ConflictException({
        error: 'OLD_VERSION',
        message: 'The code of conduct changed: read the new version.',
      });
    }
    await this.profile(user.id);
    await this.prisma.$transaction(async (tx) => {
      await tx.mentorProfile.update({
        where: { userId: user.id },
        data: {
          codeOfConductVersion: MENTOR_CODE_OF_CONDUCT_VERSION,
          codeOfConductSignedAt: new Date(),
        },
      });
      await this.audit.record(
        {
          actor: { id: user.id, roleKey: user.roleKey },
          action: 'mentor.code_of_conduct',
          entityType: 'MentorProfile',
          entityId: user.id,
          after: { version: MENTOR_CODE_OF_CONDUCT_VERSION },
          context: ctx,
        },
        tx,
      );
    });
  }

  /** The mentor's profile, if they may review; 403 otherwise. */
  private async readyMentor(user: AuthUser) {
    this.assertMentor(user);
    const profile = await this.profile(user.id);
    if (!this.isReady(profile)) {
      throw new ForbiddenException({
        error: 'MENTOR_NOT_READY',
        message:
          'You can review once your background check has passed and you signed the code of conduct.',
      });
    }
    return profile;
  }

  private async language(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { languageCode: true },
    });
    return user?.languageCode ?? 'en';
  }

  // ── The queue ───────────────────────────────────────────────────────────────

  private queueItem(row: ReviewRow, language: string, now: Date): MentorQueueItemDto {
    const brief = row.project?.brief;
    const text = brief ? pickTranslation(brief.translations, language) : undefined;
    const readiness = row.kind === 'READINESS' ? readinessBrief(language) : undefined;
    const end = row.decidedAt ?? now;
    const hoursWaiting = Math.round(((end.getTime() - row.requestedAt.getTime()) / HOUR) * 10) / 10;
    return {
      id: row.id,
      kind: row.kind,
      status: row.status,
      nickname: row.student.studentProfile?.nickname ?? '',
      avatarKey: row.student.studentProfile?.avatarKey ?? 'star',
      title: readiness?.title ?? text?.title ?? brief?.id ?? '',
      moduleTitle: brief ? pick(brief.module.titles, language) : '',
      languageCode: row.languageCode,
      version: row.version,
      requestedAt: row.requestedAt,
      decidedAt: row.decidedAt,
      hoursWaiting,
      overdue: !row.decidedAt && hoursWaiting > REVIEW_TARGET_HOURS,
    };
  }

  async queue(
    user: AuthUser,
    languages: 'mine' | 'all',
    now = new Date(),
  ): Promise<MentorQueueDto> {
    const profile = await this.readyMentor(user);
    const language = await this.language(user.id);
    const languageFilter =
      languages === 'mine' && profile.languages.length
        ? { languageCode: { in: profile.languages } }
        : {};
    const [waiting, mine, decided, waitingCount, overdueCount, stats] = await Promise.all([
      this.prisma.review.findMany({
        where: { status: 'WAITING', ...languageFilter },
        orderBy: { requestedAt: 'asc' },
        take: 100,
        include: reviewInclude,
      }),
      this.prisma.review.findMany({
        where: { status: 'IN_REVIEW', mentorId: user.id },
        orderBy: { claimedAt: 'asc' },
        include: reviewInclude,
      }),
      this.prisma.review.findMany({
        where: { mentorId: user.id, status: { in: ['APPROVED', 'CHANGES_REQUESTED'] } },
        orderBy: { decidedAt: 'desc' },
        take: 20,
        include: reviewInclude,
      }),
      this.prisma.review.count({ where: { status: 'WAITING', ...languageFilter } }),
      this.prisma.review.count({
        where: {
          status: 'WAITING',
          ...languageFilter,
          requestedAt: { lt: new Date(now.getTime() - REVIEW_TARGET_HOURS * HOUR) },
        },
      }),
      this.prisma.review.aggregate({
        where: {
          mentorId: user.id,
          decidedAt: { gte: new Date(now.getTime() - 30 * DAY) },
          status: { in: ['APPROVED', 'CHANGES_REQUESTED'] },
        },
        _count: { _all: true },
        _avg: { turnaroundHours: true },
      }),
    ]);
    const average = stats._avg.turnaroundHours;
    return {
      waiting: waiting.map((row) => this.queueItem(row, language, now)),
      mine: mine.map((row) => this.queueItem(row, language, now)),
      decided: decided.map((row) => this.queueItem(row, language, now)),
      stats: {
        waiting: waitingCount,
        overdue: overdueCount,
        decidedLast30Days: stats._count._all,
        averageTurnaroundHours: average === null ? null : Math.round(average * 10) / 10,
      },
    };
  }

  /** The mentor takes a waiting review (within their capacity). */
  async claim(id: string, user: AuthUser, ctx: RequestContext): Promise<void> {
    const profile = await this.readyMentor(user);
    const open = await this.prisma.review.count({
      where: { mentorId: user.id, status: 'IN_REVIEW' },
    });
    if (open >= profile.capacity) {
      throw new ConflictException({
        error: 'MENTOR_AT_CAPACITY',
        message: `You have ${open} reviews open: finish one before taking another.`,
      });
    }
    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.review.updateMany({
        where: { id, status: 'WAITING' },
        data: { status: 'IN_REVIEW', mentorId: user.id, claimedAt: new Date() },
      });
      if (claimed.count === 0) {
        const exists = await tx.review.findUnique({ where: { id }, select: { id: true } });
        if (!exists) throw new NotFoundException('Review not found.');
        throw new ConflictException({
          error: 'REVIEW_TAKEN',
          message: 'Another mentor took this review.',
        });
      }
      await this.record(tx, 'review.claim', id, user, ctx);
    });
  }

  /** Back to the queue (the mentor's comments go with it). */
  async release(id: string, user: AuthUser, ctx: RequestContext): Promise<void> {
    await this.mine(id, user);
    await this.prisma.$transaction(async (tx) => {
      await tx.reviewComment.deleteMany({ where: { reviewId: id } });
      await tx.review.update({
        where: { id },
        data: { status: 'WAITING', mentorId: null, claimedAt: null, scores: {}, summary: null },
      });
      await this.record(tx, 'review.release', id, user, ctx);
    });
  }

  /** A review the signed-in mentor is doing now; 404 or 409 otherwise. */
  private async mine(id: string, user: AuthUser) {
    await this.readyMentor(user);
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found.');
    if (review.status !== 'IN_REVIEW' || review.mentorId !== user.id) {
      throw new ConflictException({
        error: 'NOT_YOUR_REVIEW',
        message: 'Claim the review first (or it was already decided).',
      });
    }
    return review;
  }

  async forMentor(id: string, user: AuthUser): Promise<MentorReviewDto> {
    await this.readyMentor(user);
    const language = await this.language(user.id);
    const review = await this.prisma.review.findUnique({
      where: { id },
      include: {
        ...reviewInclude,
        comments: { orderBy: [{ file: 'asc' }, { line: 'asc' }, { createdAt: 'asc' }] },
      },
    });
    if (!review || review.status === 'CANCELLED') throw new NotFoundException('Review not found.');
    const [notes, history] = await Promise.all([
      this.prisma.mentorNote.findMany({
        where: { studentId: review.studentId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { author: { select: { displayName: true } } },
      }),
      review.projectId
        ? this.prisma.review.findMany({
            where: { projectId: review.projectId, id: { not: review.id } },
            orderBy: { requestedAt: 'desc' },
            select: { id: true, version: true, status: true, decidedAt: true },
          })
        : Promise.resolve([]),
    ]);
    const brief = review.project?.brief;
    const text = brief ? pickTranslation(brief.translations, language) : undefined;
    const english = brief ? pickTranslation(brief.translations, 'en') : undefined;
    return {
      id: review.id,
      kind: review.kind,
      status: review.status,
      studentId: review.studentId,
      nickname: review.student.studentProfile?.nickname ?? '',
      avatarKey: review.student.studentProfile?.avatarKey ?? 'star',
      languageCode: review.languageCode,
      version: review.version,
      requestedAt: review.requestedAt,
      claimedAt: review.claimedAt,
      decidedAt: review.decidedAt,
      isMine: review.mentorId === user.id,
      brief:
        review.kind === 'READINESS'
          ? readinessForMentor(language)
          : text
            ? {
                title: text.title,
                summary: text.summary,
                body: text.body,
                checkLabels: {
                  ...((english?.checkLabels ?? {}) as Record<string, string>),
                  ...(text.checkLabels as Record<string, string>),
                },
              }
            : null,
      stage: (review.project?.brief.stage as StageDto | null | undefined) ?? null,
      files: codeFiles(review.files),
      comments: review.comments.map((c) => ({
        id: c.id,
        file: c.file as 'html',
        line: c.line,
        body: c.body,
        createdAt: c.createdAt,
        mine: c.authorId === user.id,
      })),
      criteria: [...REVIEW_CRITERIA[review.kind]],
      scores: review.scores as Record<string, number>,
      summary: review.summary,
      notes: notes.map((n) => ({
        id: n.id,
        body: n.body,
        createdAt: n.createdAt,
        author: n.author?.displayName ?? 'A mentor',
      })),
      history,
    };
  }

  async addComment(id: string, dto: AddCommentDto, user: AuthUser): Promise<void> {
    const review = await this.mine(id, user);
    const lines = lineCount(dto.file, codeFiles(review.files)[dto.file]);
    if (dto.line > lines) {
      throw new ConflictException({
        error: 'NO_SUCH_LINE',
        message: 'That line isn’t in the student’s code.',
      });
    }
    const count = await this.prisma.reviewComment.count({ where: { reviewId: id } });
    if (count >= 200) {
      throw new ConflictException({
        error: 'TOO_MANY_COMMENTS',
        message: 'That is enough comments.',
      });
    }
    await this.prisma.reviewComment.create({
      data: { reviewId: id, authorId: user.id, file: dto.file, line: dto.line, body: dto.body },
    });
  }

  async deleteComment(id: string, commentId: string, user: AuthUser): Promise<void> {
    await this.mine(id, user);
    await this.prisma.reviewComment.deleteMany({
      where: { id: commentId, reviewId: id, authorId: user.id },
    });
  }

  /** Approve or ask for changes: the student and their family hear about it. */
  async decide(
    id: string,
    dto: DecisionDto,
    user: AuthUser,
    ctx: RequestContext,
    now = new Date(),
  ) {
    const review = await this.mine(id, user);
    const criteria: readonly string[] = REVIEW_CRITERIA[review.kind];
    const scores: Record<string, number> = {};
    for (const criterion of criteria) {
      const score = dto.scores[criterion];
      if (
        score === undefined ||
        !Number.isInteger(score) ||
        score < 1 ||
        score > REVIEW_SCORE_MAX
      ) {
        throw new ConflictException({
          error: 'SCORES_NEEDED',
          message: `Score every part of the rubric from 1 to ${REVIEW_SCORE_MAX}.`,
        });
      }
      scores[criterion] = score;
    }
    const turnaroundHours =
      Math.round(((now.getTime() - review.requestedAt.getTime()) / HOUR) * 10) / 10;
    await this.prisma.$transaction(async (tx) => {
      await tx.review.update({
        where: { id },
        data: {
          status: dto.decision,
          decidedAt: now,
          turnaroundHours,
          scores,
          summary: dto.summary,
          seenAt: null,
        },
      });
      await this.record(tx, 'review.decide', id, user, ctx, {
        decision: dto.decision,
        turnaroundHours,
      });
    });

    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId: review.studentId },
      select: { nickname: true },
    });
    if (review.kind === 'READINESS') {
      await this.readinessGraded(review, dto.decision === 'APPROVED', scores, now);
      return;
    }
    await this.notifications.notify([review.studentId], 'review_done', {
      reviewId: id,
      decision: dto.decision,
    });
    await this.notifications.notify(
      await this.notifications.parentsOf(review.studentId),
      'child_reviewed',
      {
        reviewId: id,
        childId: review.studentId,
        nickname: profile?.nickname ?? '',
        decision: dto.decision,
      },
    );
    if (dto.decision === 'APPROVED' && review.kind === 'PROJECT' && review.projectId) {
      const project = await this.prisma.project.findUnique({
        where: { id: review.projectId },
        select: { brief: { select: { moduleId: true } } },
      });
      if (project)
        await this.certificates.issueIfEligible(review.studentId, project.brief.moduleId);
    }
  }

  /** The readiness check is graded: it records a pass (or "not yet") and tells the family. */
  private async readinessGraded(
    review: { id: string; studentId: string },
    passed: boolean,
    scores: Record<string, number>,
    now: Date,
  ) {
    const score = Object.values(scores).reduce((a, b) => a + b, 0);
    const updated = await this.prisma.readinessCheck.updateMany({
      where: { reviewId: review.id, status: 'SUBMITTED' },
      data: {
        status: passed ? 'PASSED' : 'NOT_PASSED',
        score,
        decidedAt: now,
        passedAt: passed ? now : null,
      },
    });
    if (updated.count === 0) return;
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId: review.studentId },
      select: { nickname: true },
    });
    await this.notifications.notify([review.studentId], 'readiness_result', {
      reviewId: review.id,
      passed,
    });
    await this.notifications.notify(
      await this.notifications.parentsOf(review.studentId),
      'child_readiness',
      { reviewId: review.id, childId: review.studentId, nickname: profile?.nickname ?? '', passed },
    );
  }

  async addNote(studentId: string, body: string, user: AuthUser): Promise<void> {
    await this.readyMentor(user);
    // Only about students mentors have work from (never a way to look accounts up).
    const known = await this.prisma.review.findFirst({
      where: { studentId },
      select: { id: true },
    });
    if (!known) throw new NotFoundException('Student not found.');
    await this.prisma.mentorNote.create({ data: { studentId, authorId: user.id, body } });
  }

  // ── Students and parents ────────────────────────────────────────────────────

  /** The latest review of each project (for project pages and portfolios). */
  async summaries(projectIds: string[]): Promise<Map<string, ReviewSummaryDto>> {
    if (!projectIds.length) return new Map();
    const rows = await this.prisma.review.findMany({
      where: { projectId: { in: projectIds }, status: { not: 'CANCELLED' } },
      orderBy: { requestedAt: 'desc' },
    });
    const result = new Map<string, ReviewSummaryDto>();
    for (const row of rows) {
      if (!row.projectId || result.has(row.projectId)) continue;
      result.set(row.projectId, summaryOf(row));
    }
    return result;
  }

  /** A review for the student it is about, or their parent. */
  async forFamily(
    id: string,
    user: AuthUser,
    ability: AppAbility,
    language: string,
  ): Promise<StudentReviewDto> {
    const review = await this.prisma.review.findUnique({
      where: { id },
      include: {
        ...reviewInclude,
        comments: { orderBy: [{ file: 'asc' }, { line: 'asc' }, { createdAt: 'asc' }] },
        mentor: { select: { displayName: true } },
        student: {
          select: {
            id: true,
            studentProfile: { select: { nickname: true, avatarKey: true } },
            parentLinks: { select: { parentId: true } },
          },
        },
      },
    });
    const allowed =
      review &&
      review.status !== 'CANCELLED' &&
      ability.can(
        'read',
        subject('Review', {
          studentId: review.studentId,
          parentIds: review.student.parentLinks.map((l) => l.parentId),
        }),
      );
    if (!review || !allowed) throw new NotFoundException('Review not found.');
    const decided = review.status === 'APPROVED' || review.status === 'CHANGES_REQUESTED';
    const brief = review.project?.brief;
    const text = brief ? pickTranslation(brief.translations, language) : undefined;
    return {
      ...summaryOf(review),
      kind: review.kind,
      mentorName: decided ? firstName(review.mentor?.displayName) : null,
      files: codeFiles(review.files),
      // Nothing half-written: comments and scores show once the mentor decided.
      comments: decided
        ? review.comments.map((c) => ({
            id: c.id,
            file: c.file as 'html',
            line: c.line,
            body: c.body,
            createdAt: c.createdAt,
          }))
        : [],
      criteria: [...REVIEW_CRITERIA[review.kind]],
      scores: decided ? (review.scores as Record<string, number>) : {},
      summary: decided ? review.summary : null,
      title:
        review.kind === 'READINESS'
          ? readinessBrief(language).title
          : (text?.title ?? brief?.id ?? ''),
      briefId: brief?.id ?? null,
    };
  }

  /** The student opened their result. */
  async markSeen(id: string, user: AuthUser): Promise<void> {
    await this.prisma.review.updateMany({
      where: {
        id,
        studentId: user.id,
        seenAt: null,
        status: { in: ['APPROVED', 'CHANGES_REQUESTED'] },
      },
      data: { seenAt: new Date() },
    });
  }

  private record(
    tx: Parameters<AuditService['record']>[1],
    action: string,
    id: string,
    user: AuthUser,
    ctx: RequestContext,
    after?: Prisma.InputJsonObject,
  ) {
    return this.audit.record(
      {
        actor: { id: user.id, roleKey: user.roleKey },
        action,
        entityType: 'Review',
        entityId: id,
        ...(after ? { after } : {}),
        context: ctx,
      },
      tx,
    );
  }
}

function summaryOf(row: {
  id: string;
  status: ReviewStatus;
  version: number;
  requestedAt: Date;
  decidedAt: Date | null;
  seenAt: Date | null;
}): ReviewSummaryDto {
  return {
    id: row.id,
    status: row.status,
    version: row.version,
    requestedAt: row.requestedAt,
    decidedAt: row.decidedAt,
    seen: row.seenAt !== null,
  };
}

export const OPEN_REVIEW_STATUSES = OPEN;
