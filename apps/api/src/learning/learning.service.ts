import type { Check, CodeFiles } from '@kcp/checks';
import type { Prisma } from '@kcp/database';
import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CODE_FILE_KEYS } from '@kcp/shared';
import { EntitlementsService } from '../billing/entitlements.service.js';
import { RateLimiterService } from '../common/rate-limit/rate-limiter.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { ProgressService, type XpAward } from '../progress/progress.service.js';
import type { AuthUser } from '../permissions/auth-user.js';
import {
  activeContent,
  cleanCode,
  FALLBACK_LANGUAGE,
  openLesson,
  pick,
  pickTranslation,
  type Texts,
} from './content.js';
import { QuizService } from './quiz.service.js';
import { confirmResults, isUnchanged } from './server-checks.js';
import type {
  ChallengeDto,
  CheckResultDto,
  CodeFilesDto,
  LearningOverviewDto,
  LessonDto,
  LessonProgressDto,
  LessonStatusValue,
  SubmissionResultDto,
  TrackDto,
} from './dto/learning.dto.js';

/** "Check my code" presses per student per minute. */
const SUBMISSIONS_PER_MINUTE = 30;
/** …and per day, so one account can't fill the database. */
const SUBMISSIONS_PER_DAY = 1000;
/**
 * Submissions kept per student and challenge: the newest ones, plus the first that
 * passed (it marks the challenge as done). Older attempts are removed.
 */
const SUBMISSIONS_KEPT = 20;
/** Autosaves per student per minute (the web app saves about once a second while typing). */
const DRAFTS_PER_MINUTE = 120;

/**
 * Lessons and challenges (read by any signed-in account), and each student's own
 * progress: drafts, submissions and lesson status. Checks run in the browser
 * sandbox; the API stores what they found.
 */
@Injectable()
export class LearningService {
  private readonly logger = new Logger(LearningService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly limiter: RateLimiterService,
    private readonly progress: ProgressService,
    private readonly entitlements: EntitlementsService,
    private readonly quizzes: QuizService,
  ) {}

  /** Every active lesson in learning order: track, then module, then lesson. */
  private async lessonOrder(): Promise<string[]> {
    const lessons = await this.prisma.lesson.findMany({
      where: openLesson,
      select: {
        id: true,
        sortOrder: true,
        module: { select: { sortOrder: true, track: { select: { sortOrder: true } } } },
      },
    });
    return lessons
      .toSorted(
        (a, b) =>
          a.module.track.sortOrder - b.module.track.sortOrder ||
          a.module.sortOrder - b.module.sortOrder ||
          a.sortOrder - b.sortOrder,
      )
      .map((lesson) => lesson.id);
  }

  private async statuses(user: AuthUser): Promise<Map<string, LessonStatusValue>> {
    if (user.kind !== 'STUDENT') return new Map();
    const rows = await this.prisma.lessonProgress.findMany({
      where: { userId: user.id },
      select: { lessonId: true, status: true },
    });
    return new Map(rows.map((row) => [row.lessonId, row.status]));
  }

  async overview(user: AuthUser, language: string): Promise<LearningOverviewDto> {
    const isStudent = user.kind === 'STUDENT';
    const [tracks, statuses, premium] = await Promise.all([
      this.prisma.track.findMany({
        where: activeContent,
        orderBy: { sortOrder: 'asc' },
        include: {
          modules: {
            where: { ...activeContent, publishedAt: { not: null } },
            orderBy: { sortOrder: 'asc' },
            include: {
              lessons: {
                where: activeContent,
                orderBy: { sortOrder: 'asc' },
                include: {
                  translations: true,
                  _count: {
                    select: {
                      challenges: { where: activeContent },
                      quizzes: { where: activeContent },
                    },
                  },
                },
              },
              projectBrief: { include: { translations: true } },
            },
          },
        },
      }),
      this.statuses(user),
      isStudent ? this.entitlements.status(user.id) : null,
    ]);
    // Premium lessons and projects are locked for students without premium.
    const locked = (isPremium: boolean) => isPremium && premium !== null && !premium.active;
    const projects =
      user.kind === 'STUDENT'
        ? new Map(
            (
              await this.prisma.project.findMany({
                where: { userId: user.id },
                select: { briefId: true, status: true },
              })
            ).map((project) => [project.briefId, project.status]),
          )
        : new Map<string, 'DRAFT' | 'SHIPPED'>();

    let nextLessonId: string | null = null;
    let lessonsCompleted = 0;
    const result: TrackDto[] = tracks.map((track) => ({
      id: track.id,
      title: pick(track.titles, language),
      modules: track.modules.map((mod) => ({
        id: mod.id,
        title: pick(mod.titles, language),
        description: pick(mod.descriptions, language),
        lessons: mod.lessons.map((lesson) => {
          const text = pickTranslation(lesson.translations, language);
          const status = statuses.get(lesson.id) ?? 'NOT_STARTED';
          if (status === 'COMPLETED') lessonsCompleted++;
          else nextLessonId ??= lesson.id;
          return {
            id: lesson.id,
            title: text?.title ?? lesson.id,
            summary: text?.summary ?? '',
            xp: lesson.xp,
            isPremium: lesson.isPremium,
            locked: locked(lesson.isPremium),
            challengeCount: lesson._count.challenges,
            quizCount: lesson._count.quizzes,
            status,
          };
        }),
        project:
          mod.projectBrief?.isActive === true
            ? {
                id: mod.projectBrief.id,
                title: pickTranslation(mod.projectBrief.translations, language)?.title ?? '',
                summary: pickTranslation(mod.projectBrief.translations, language)?.summary ?? '',
                xp: mod.projectBrief.xp,
                isPremium: mod.projectBrief.isPremium,
                locked: locked(mod.projectBrief.isPremium),
                status: projects.get(mod.projectBrief.id) ?? 'NOT_STARTED',
              }
            : null,
      })),
    }));
    return {
      tracks: result,
      nextLessonId,
      lessonsCompleted,
      premium: premium
        ? {
            active: premium.active,
            source: premium.source,
            until: premium.until,
            trialEndsAt: premium.trialEndsAt,
          }
        : null,
    };
  }

  async lesson(id: string, user: AuthUser, language: string): Promise<LessonDto> {
    const lesson = await this.prisma.lesson.findFirst({
      where: { id, ...openLesson },
      include: {
        translations: true,
        module: {
          include: { lessons: { where: activeContent, select: { id: true, sortOrder: true } } },
        },
        challenges: {
          where: activeContent,
          orderBy: { sortOrder: 'asc' },
          include: { translations: true },
        },
      },
    });
    if (!lesson) throw new NotFoundException('Lesson not found.');
    await this.entitlements.assertAccess(user, lesson);

    const isStudent = user.kind === 'STUDENT';
    const challengeIds = lesson.challenges.map((c) => c.id);
    const [order, progress, drafts, passedRows] = await Promise.all([
      this.lessonOrder(),
      isStudent
        ? this.prisma.lessonProgress.findUnique({
            where: { userId_lessonId: { userId: user.id, lessonId: id } },
          })
        : null,
      isStudent
        ? this.prisma.challengeDraft.findMany({
            where: { userId: user.id, challengeId: { in: challengeIds } },
          })
        : [],
      isStudent
        ? this.prisma.submission.findMany({
            where: { userId: user.id, challengeId: { in: challengeIds }, passed: true },
            select: { challengeId: true },
            distinct: ['challengeId'],
          })
        : [],
    ]);
    const passed = new Set(passedRows.map((row) => row.challengeId));
    const draftBy = new Map(drafts.map((draft) => [draft.challengeId, draft.code as CodeFilesDto]));
    const position = order.indexOf(id);
    const siblings = lesson.module.lessons.toSorted((a, b) => a.sortOrder - b.sortOrder);
    const text = pickTranslation(lesson.translations, language);

    const challenges: ChallengeDto[] = lesson.challenges.map((challenge) => {
      const translation = pickTranslation(challenge.translations, language);
      const english = challenge.translations.find((t) => t.languageCode === FALLBACK_LANGUAGE);
      const starter = challenge.starter as CodeFilesDto;
      return {
        id: challenge.id,
        title: translation?.title ?? challenge.id,
        instructions: translation?.instructions ?? '',
        type: challenge.type,
        xp: challenge.xp,
        files: CODE_FILE_KEYS.filter((key) => typeof starter[key] === 'string'),
        starter,
        checks: challenge.checks as Record<string, unknown>[],
        hints: { ...(english?.hints as Texts), ...(translation?.hints as Texts) },
        checkLabels: {
          ...(english?.checkLabels as Texts),
          ...(translation?.checkLabels as Texts),
        },
        draft: draftBy.get(challenge.id) ?? null,
        passed: passed.has(challenge.id),
      };
    });

    return {
      id: lesson.id,
      trackId: lesson.module.trackId,
      moduleId: lesson.moduleId,
      moduleTitle: pick(lesson.module.titles, language),
      number: siblings.findIndex((s) => s.id === id) + 1,
      lessonCount: siblings.length,
      title: text?.title ?? lesson.id,
      summary: text?.summary ?? '',
      body: text?.body ?? '',
      language: text?.languageCode ?? FALLBACK_LANGUAGE,
      video:
        text?.videoProvider && text.videoId
          ? { provider: text.videoProvider, id: text.videoId }
          : null,
      xp: lesson.xp,
      isPremium: lesson.isPremium,
      status: progress?.status ?? 'NOT_STARTED',
      previousLessonId: position > 0 ? (order[position - 1] ?? null) : null,
      nextLessonId: position >= 0 ? (order[position + 1] ?? null) : null,
      challenges,
      quizzes: await this.quizzes.forLesson(lesson.id, user, language),
    };
  }

  // ── Students only ──────────────────────────────────────────────────────────

  /** Staff roles may pass the permission check ("manage all"), but only students learn. */
  private assertStudent(user: AuthUser) {
    if (user.kind !== 'STUDENT') {
      throw new ForbiddenException({
        error: 'STUDENTS_ONLY',
        message: 'Only student accounts save code and progress.',
      });
    }
  }

  private async limit(name: string, user: AuthUser, max: number, windowSeconds = 60) {
    const result = await this.limiter.consume(name, user.id, max, windowSeconds);
    if (!result.allowed) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'TOO_MANY_REQUESTS',
          message: 'Too many requests. Please wait a moment.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  /** An open lesson the student may use (premium lessons need premium). */
  private async activeLesson(id: string, user: AuthUser) {
    const lesson = await this.prisma.lesson.findFirst({
      where: { id, ...openLesson },
      select: {
        id: true,
        xp: true,
        isPremium: true,
        challenges: { where: activeContent, select: { id: true } },
      },
    });
    if (!lesson) throw new NotFoundException('Lesson not found.');
    await this.entitlements.assertAccess(user, lesson);
    return lesson;
  }

  private async activeChallenge(id: string, user: AuthUser) {
    const challenge = await this.prisma.challenge.findFirst({
      where: { id, ...activeContent, lesson: openLesson },
      include: {
        lesson: { include: { challenges: { where: activeContent, select: { id: true } } } },
      },
    });
    if (!challenge) throw new NotFoundException('Challenge not found.');
    await this.entitlements.assertAccess(user, challenge.lesson);
    return challenge;
  }

  /**
   * Marks the lesson completed once every one of its active challenges has a passing
   * submission (a lesson without challenges is completed by opening it).
   */
  private async completeIfDone(
    tx: Prisma.TransactionClient,
    userId: string,
    lessonId: string,
    challengeIds: string[],
  ): Promise<boolean> {
    if (challengeIds.length > 0) {
      const passed = await tx.submission.findMany({
        where: { userId, challengeId: { in: challengeIds }, passed: true },
        select: { challengeId: true },
        distinct: ['challengeId'],
      });
      if (passed.length < challengeIds.length) return false;
    }
    await tx.lessonProgress.update({
      where: { userId_lessonId: { userId, lessonId } },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });
    return true;
  }

  /**
   * The lesson's XP, if the student hasn't had it yet — for example because the daily
   * cap held it back when they finished the lesson.
   */
  private async lessonXpIfMissing(
    tx: Prisma.TransactionClient,
    userId: string,
    lessonId: string,
    xp: number,
    now: Date,
  ) {
    const given = await tx.xpEvent.findUnique({
      where: { userId_source_sourceId: { userId, source: 'LESSON', sourceId: lessonId } },
      select: { id: true },
    });
    return given ? null : this.progress.award(tx, userId, 'LESSON', lessonId, xp, now);
  }

  /** Opening a lesson. Also completes it if nothing is left to do (lessons can change). */
  async start(lessonId: string, user: AuthUser, now = new Date()): Promise<LessonProgressDto> {
    this.assertStudent(user);
    const lesson = await this.activeLesson(lessonId, user);
    const outcome = await this.prisma.$transaction(async (tx) => {
      const progress = await tx.lessonProgress.upsert({
        where: { userId_lessonId: { userId: user.id, lessonId } },
        create: { userId: user.id, lessonId },
        update: {},
      });
      if (progress.status === 'COMPLETED') {
        const award = await this.lessonXpIfMissing(tx, user.id, lessonId, lesson.xp, now);
        return { status: progress.status, award };
      }
      const ids = lesson.challenges.map((c) => c.id);
      const done = await this.completeIfDone(tx, user.id, lessonId, ids);
      const award = done
        ? await this.progress.award(tx, user.id, 'LESSON', lessonId, lesson.xp, now)
        : null;
      return { status: done ? ('COMPLETED' as const) : progress.status, award };
    });
    await this.progress.settle(user.id, [outcome.award]);
    return { status: outcome.status };
  }

  async saveDraft(challengeId: string, code: CodeFilesDto, user: AuthUser): Promise<void> {
    this.assertStudent(user);
    await this.limit('draft-user', user, DRAFTS_PER_MINUTE);
    const challenge = await this.activeChallenge(challengeId, user);
    const clean = cleanCode(code, challenge.starter);
    await this.prisma.challengeDraft.upsert({
      where: { userId_challengeId: { userId: user.id, challengeId } },
      create: { userId: user.id, challengeId, code: clean as Prisma.InputJsonObject },
      update: { code: clean as Prisma.InputJsonObject },
    });
  }

  async submit(
    challengeId: string,
    code: CodeFilesDto,
    reported: CheckResultDto[],
    user: AuthUser,
  ): Promise<SubmissionResultDto> {
    this.assertStudent(user);
    await this.limit('submission-user', user, SUBMISSIONS_PER_MINUTE);
    await this.limit('submission-user-day', user, SUBMISSIONS_PER_DAY, 24 * 60 * 60);
    const challenge = await this.activeChallenge(challengeId, user);

    // Only the challenge's own checks count, and every one of them must be reported.
    const byId = new Map(reported.map((result) => [result.id, result.passed]));
    const checks = challenge.checks as unknown as Check[];
    const cleanFiles = cleanCode(code, challenge.starter);
    const confirmed = await confirmResults(
      challengeId,
      cleanFiles,
      checks,
      byId,
      (message) => this.logger.warn(message),
      { scriptsMayChangePage: challenge.type === 'JS' },
    );
    const results = checks.map((check) => ({
      id: check.id,
      passed: confirmed.get(check.id) === true,
    }));
    // The starter never passes (content-import checks that), so unchanged code can't either.
    const unchanged = isUnchanged(cleanFiles, challenge.starter as CodeFiles);
    const passed = !unchanged && results.length > 0 && results.every((result) => result.passed);
    const clean = cleanFiles as Prisma.InputJsonObject;
    const lessonId = challenge.lessonId;
    const lessonChallenges = challenge.lesson.challenges.map((c) => c.id);

    const outcome = await this.prisma.$transaction(async (tx) => {
      await tx.submission.create({
        data: { userId: user.id, challengeId, code: clean, passed, results },
      });
      await this.pruneSubmissions(tx, user.id, challengeId);
      await tx.challengeDraft.upsert({
        where: { userId_challengeId: { userId: user.id, challengeId } },
        create: { userId: user.id, challengeId, code: clean },
        update: { code: clean },
      });
      const progress = await tx.lessonProgress.upsert({
        where: { userId_lessonId: { userId: user.id, lessonId } },
        create: { userId: user.id, lessonId },
        update: {},
      });
      // XP once per challenge (given the first time it passes under the daily cap).
      const awards: (XpAward | null)[] = passed
        ? [await this.progress.award(tx, user.id, 'CHALLENGE', challengeId, challenge.xp)]
        : [];
      if (!passed) return { lessonCompleted: false, awards };
      if (progress.status === 'COMPLETED') {
        awards.push(
          await this.lessonXpIfMissing(tx, user.id, lessonId, challenge.lesson.xp, new Date()),
        );
        return { lessonCompleted: false, awards };
      }
      const lessonCompleted = await this.completeIfDone(tx, user.id, lessonId, lessonChallenges);
      if (lessonCompleted) {
        awards.push(
          await this.progress.award(tx, user.id, 'LESSON', lessonId, challenge.lesson.xp),
        );
      }
      return { lessonCompleted, awards };
    });
    const badgesEarned = await this.progress.settle(user.id, outcome.awards);
    const { lessonCompleted, awards } = outcome;

    const order = await this.lessonOrder();
    const position = order.indexOf(lessonId);
    return {
      passed,
      results,
      lessonCompleted,
      nextLessonId: position >= 0 ? (order[position + 1] ?? null) : null,
      xpAwarded: awards.reduce((sum, award) => sum + (award?.amount ?? 0), 0),
      dailyCapReached: awards.some((award) => award?.capped),
      badgesEarned,
    };
  }

  /** Keeps the newest SUBMISSIONS_KEPT submissions and the first passing one. */
  private async pruneSubmissions(
    tx: Prisma.TransactionClient,
    userId: string,
    challengeId: string,
  ): Promise<void> {
    const older = await tx.submission.findMany({
      where: { userId, challengeId },
      orderBy: { createdAt: 'desc' },
      skip: SUBMISSIONS_KEPT,
      select: { id: true },
    });
    if (older.length === 0) return;
    const firstPass = await tx.submission.findFirst({
      where: { userId, challengeId, passed: true },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    await tx.submission.deleteMany({
      where: { id: { in: older.map((s) => s.id).filter((id) => id !== firstPass?.id) } },
    });
  }
}
