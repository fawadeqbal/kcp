import type { Prisma } from '@kcp/database';
import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntitlementsService } from '../billing/entitlements.service.js';
import { RateLimiterService } from '../common/rate-limit/rate-limiter.service.js';
import { AppConfigService } from '../config/app-config.service.js';
import { PrismaService } from '../database/prisma.service.js';
import type { AuthUser } from '../permissions/auth-user.js';
import { ProgressService, type XpAward } from '../progress/progress.service.js';
import { localDay } from '../progress/xp-rules.js';
import { activeContent, FALLBACK_LANGUAGE, openLesson, pickTranslation } from './content.js';
import type {
  PracticeDto,
  PracticeProgressDto,
  PracticeQuizDto,
  QuizAnswerDto,
  QuizDto,
  QuizResultDto,
} from './dto/quiz.dto.js';
import {
  grade,
  lineIds,
  pickPractice,
  type QuizKindValue,
  REVEAL_AFTER_WRONG,
  rightAnswer,
  shuffledLines,
  type StoredQuiz,
} from './quiz-rules.js';

/** Quizzes in a day's practice. */
export const PRACTICE_SIZE = 5;
/** XP for finishing the day's practice: enough for the default daily goal, so a
 * student can keep a streak going from the phone. */
export const PRACTICE_XP = 20;
/** Answers per student per minute, and per day. */
const ANSWERS_PER_MINUTE = 60;
const ANSWERS_PER_DAY = 2000;

type QuizRow = Prisma.QuizGetPayload<Record<string, never>>;
interface QuizTexts {
  prompt?: string;
  explanation?: string;
  options?: Record<string, string>;
}

const asDate = (day: string) => new Date(`${day}T00:00:00Z`);

/**
 * Quizzes (short questions for phones and the lesson page) and the daily practice.
 * Answers are graded here, never in the app; the first right answer earns the
 * quiz's XP (unless the answer was shown after wrong tries), and finishing the
 * day's practice earns PRACTICE_XP once a day.
 */
@Injectable()
export class QuizService {
  private readonly lineKey: Buffer;

  constructor(
    private readonly prisma: PrismaService,
    private readonly limiter: RateLimiterService,
    private readonly progress: ProgressService,
    private readonly entitlements: EntitlementsService,
    config: AppConfigService,
  ) {
    // Line IDs are signed with a key of their own, derived from the server secret.
    this.lineKey = Buffer.from(`${config.get('ENCRYPTION_KEY')}:quiz-lines`, 'utf8');
  }

  // ── Showing quizzes ────────────────────────────────────────────────────────

  private stored(quiz: QuizRow): StoredQuiz {
    return {
      id: quiz.id,
      kind: quiz.kind as QuizKindValue,
      code: (quiz.code as string[] | null) ?? [],
      optionIds: ((quiz.options as { id: string }[] | null) ?? []).map((o) => o.id),
      answer: quiz.answer as StoredQuiz['answer'],
    };
  }

  private texts(quiz: QuizRow, language: string): Required<QuizTexts> {
    const all = quiz.texts as Record<string, QuizTexts>;
    const mine = all[language] ?? {};
    const english = all[FALLBACK_LANGUAGE] ?? {};
    return {
      prompt: mine.prompt ?? english.prompt ?? '',
      explanation: mine.explanation ?? english.explanation ?? '',
      options: { ...english.options, ...mine.options },
    };
  }

  toDto(quiz: QuizRow, language: string, solved: boolean): QuizDto {
    const stored = this.stored(quiz);
    const texts = this.texts(quiz, language);
    const lines =
      stored.kind === 'ORDER'
        ? shuffledLines(stored.code, lineIds(this.lineKey, stored))
        : stored.code.map((text, i) => ({ id: String(i + 1), text }));
    const options = ((quiz.options as { id: string; code?: string }[] | null) ?? []).map(
      (option) => ({
        id: option.id,
        code: option.code ?? null,
        text: option.code === undefined ? (texts.options[option.id] ?? option.id) : null,
      }),
    );
    return {
      id: quiz.id,
      lessonId: quiz.lessonId,
      kind: stored.kind,
      xp: quiz.xp,
      codeLanguage: quiz.codeLanguage,
      prompt: texts.prompt,
      lines,
      options,
      solved,
    };
  }

  private async solvedIds(userId: string, quizIds: string[]): Promise<Set<string>> {
    if (quizIds.length === 0) return new Set();
    const rows = await this.prisma.quizAttempt.findMany({
      where: { userId, quizId: { in: quizIds }, correct: true },
      select: { quizId: true },
      distinct: ['quizId'],
    });
    return new Set(rows.map((row) => row.quizId));
  }

  /** A lesson's quizzes for the lesson page (the lesson's access is checked by the caller). */
  async forLesson(lessonId: string, user: AuthUser, language: string): Promise<QuizDto[]> {
    const quizzes = await this.prisma.quiz.findMany({
      where: { lessonId, ...activeContent },
      orderBy: { sortOrder: 'asc' },
    });
    const solved =
      user.kind === 'STUDENT'
        ? await this.solvedIds(
            user.id,
            quizzes.map((q) => q.id),
          )
        : new Set<string>();
    return quizzes.map((quiz) => this.toDto(quiz, language, solved.has(quiz.id)));
  }

  // ── Answering ──────────────────────────────────────────────────────────────

  private assertStudent(user: AuthUser) {
    if (user.kind !== 'STUDENT') {
      throw new ForbiddenException({
        error: 'STUDENTS_ONLY',
        message: 'Only student accounts answer quizzes.',
      });
    }
  }

  private async limit(name: string, user: AuthUser, max: number, windowSeconds: number) {
    const result = await this.limiter.consume(name, user.id, max, windowSeconds);
    if (!result.allowed) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'TOO_MANY_REQUESTS',
          message: 'Too many answers. Please wait a moment.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private async today(userId: string, now: Date): Promise<string> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { country: { select: { timezone: true } } },
    });
    return localDay(now, user.country?.timezone ?? 'UTC');
  }

  async answer(
    quizId: string,
    dto: QuizAnswerDto,
    user: AuthUser,
    language: string,
    now = new Date(),
  ): Promise<QuizResultDto> {
    this.assertStudent(user);
    await this.limit('quiz-answer-user', user, ANSWERS_PER_MINUTE, 60);
    await this.limit('quiz-answer-user-day', user, ANSWERS_PER_DAY, 24 * 60 * 60);
    const quiz = await this.prisma.quiz.findFirst({
      where: { id: quizId, ...activeContent, lesson: openLesson },
      include: { lesson: { select: { id: true, isPremium: true } } },
    });
    if (!quiz) throw new NotFoundException('Quiz not found.');
    await this.entitlements.assertAccess(user, quiz.lesson);

    const stored = this.stored(quiz);
    const ids = lineIds(this.lineKey, stored);
    const result = grade(stored, dto, ids);
    if (result === 'invalid') {
      throw new BadRequestException({
        error: 'BAD_ANSWER',
        message: "That answer doesn't fit this quiz.",
      });
    }
    const correct = result === 'correct';
    const today = await this.today(user.id, now);
    const premium = await this.entitlements.canAccess(user, { isPremium: true });

    const outcome = await this.prisma.$transaction(async (tx) => {
      // Today's practice first (locked), then XP: always in this order, so two answers
      // at once can't deadlock, and the last one of the set finishes the practice.
      const session = await this.lockedSession(tx, user.id, today);
      const inPractice = session !== null && session.quizIds.includes(quizId);

      const wrongBefore = await tx.quizAttempt.count({
        where: { userId: user.id, quizId, correct: false },
      });
      // Once the right answer has been shown, the quiz earns no XP (it still counts
      // for today's practice: the student worked through it).
      const shownBefore = wrongBefore >= REVEAL_AFTER_WRONG;
      await tx.quizAttempt.create({
        data: { userId: user.id, quizId, correct, createdAt: now },
      });
      await tx.lessonProgress.upsert({
        where: { userId_lessonId: { userId: user.id, lessonId: quiz.lessonId } },
        create: { userId: user.id, lessonId: quiz.lessonId },
        update: {},
      });
      const awards: (XpAward | null)[] =
        correct && !shownBefore
          ? [await this.progress.award(tx, user.id, 'QUIZ', quizId, quiz.xp, now)]
          : [];
      let practice: PracticeProgressDto | null = null;
      if (session && inPractice) {
        const finished = await this.finishIfDone(tx, user.id, today, session, now, premium);
        awards.push(finished.award);
        practice = finished.progress;
      }
      return { awards, practice, reveal: !correct && wrongBefore + 1 >= REVEAL_AFTER_WRONG };
    });

    const badgesEarned = await this.progress.settle(user.id, outcome.awards);
    const texts = this.texts(quiz, language);
    const answer = outcome.reveal ? rightAnswer(stored, ids) : null;
    return {
      correct,
      explanation: correct || outcome.reveal ? texts.explanation : null,
      reveal: answer
        ? { order: answer.order ?? null, line: answer.line ?? null, option: answer.option ?? null }
        : null,
      xpAwarded: outcome.awards.reduce((sum, award) => sum + (award?.amount ?? 0), 0),
      dailyCapReached: outcome.awards.some((award) => award?.capped),
      badgesEarned,
      practice: outcome.practice,
    };
  }

  // ── Daily practice ─────────────────────────────────────────────────────────

  /** Lessons the student can open now: premium ones only with premium. */
  private openFor(premium: boolean) {
    return premium ? openLesson : { ...openLesson, isPremium: false };
  }

  private async lockedSession(
    tx: Prisma.TransactionClient,
    userId: string,
    day: string,
  ): Promise<{ quizIds: string[]; createdAt: Date; completedAt: Date | null } | null> {
    const rows = await tx.$queryRaw<
      { quiz_ids: unknown; created_at: Date; completed_at: Date | null }[]
    >`SELECT quiz_ids, created_at, completed_at FROM practice_sessions
      WHERE user_id = ${userId}::uuid AND day = ${asDate(day)}::date FOR UPDATE`;
    const row = rows[0];
    if (!row) return null;
    return {
      quizIds: row.quiz_ids as string[],
      createdAt: row.created_at,
      completedAt: row.completed_at,
    };
  }

  /** Quizzes of the session answered correctly since it started today. */
  private async answeredIds(
    client: Prisma.TransactionClient,
    userId: string,
    session: { quizIds: string[]; createdAt: Date },
  ): Promise<string[]> {
    if (session.quizIds.length === 0) return [];
    const rows = await client.quizAttempt.findMany({
      where: {
        userId,
        quizId: { in: session.quizIds },
        correct: true,
        createdAt: { gte: session.createdAt },
      },
      select: { quizId: true },
      distinct: ['quizId'],
    });
    return rows.map((row) => row.quizId);
  }

  /**
   * Finishes the day's practice when every quiz in it is answered: once, with its
   * XP. Quizzes the student can no longer open (taken out of the content, or premium
   * after premium ended during the day) don't count.
   */
  private async finishIfDone(
    tx: Prisma.TransactionClient,
    userId: string,
    day: string,
    session: { quizIds: string[]; createdAt: Date; completedAt: Date | null },
    now: Date,
    premium: boolean,
  ): Promise<{ award: XpAward | null; progress: PracticeProgressDto }> {
    const active = await tx.quiz.findMany({
      where: { id: { in: session.quizIds }, ...activeContent, lesson: this.openFor(premium) },
      select: { id: true },
    });
    const quizIds = active.map((quiz) => quiz.id);
    const answered = await this.answeredIds(tx, userId, { ...session, quizIds });
    const total = quizIds.length;
    const allAnswered = total > 0 && answered.length >= total;
    let award: XpAward | null = null;
    if (allAnswered && !session.completedAt) {
      await tx.practiceSession.update({
        where: { userId_day: { userId, day: asDate(day) } },
        data: { completedAt: now },
      });
      award = await this.progress.award(tx, userId, 'PRACTICE', day, PRACTICE_XP, now);
    }
    return {
      award,
      progress: {
        day,
        total,
        answered: Math.min(answered.length, total),
        done: allAnswered || session.completedAt !== null,
      },
    };
  }

  /**
   * The quizzes to pick from: those of the lessons the student has started, then the
   * next lessons in learning order until there are enough. Premium lessons only with
   * premium.
   */
  private async practiceCandidates(user: AuthUser) {
    const [lessons, progress, premium] = await Promise.all([
      this.prisma.lesson.findMany({
        where: openLesson,
        select: {
          id: true,
          isPremium: true,
          sortOrder: true,
          module: { select: { sortOrder: true, track: { select: { sortOrder: true } } } },
          quizzes: {
            where: activeContent,
            orderBy: { sortOrder: 'asc' },
            select: { id: true },
          },
        },
      }),
      this.prisma.lessonProgress.findMany({
        where: { userId: user.id },
        select: { lessonId: true },
      }),
      this.entitlements.canAccess(user, { isPremium: true }),
    ]);
    const started = new Set(progress.map((p) => p.lessonId));
    const ordered = lessons
      .filter((lesson) => premium || !lesson.isPremium)
      .toSorted(
        (a, b) =>
          a.module.track.sortOrder - b.module.track.sortOrder ||
          a.module.sortOrder - b.module.sortOrder ||
          a.sortOrder - b.sortOrder,
      );
    const ids = ordered.filter((l) => started.has(l.id)).flatMap((l) => l.quizzes.map((q) => q.id));
    for (const lesson of ordered) {
      if (ids.length >= PRACTICE_SIZE) break;
      if (!started.has(lesson.id)) ids.push(...lesson.quizzes.map((q) => q.id));
    }
    return ids;
  }

  /** Today's practice: picked once a day (the student's day), then the same all day. */
  async practice(user: AuthUser, language: string, now = new Date()): Promise<PracticeDto> {
    this.assertStudent(user);
    const today = await this.today(user.id, now);
    const key = { userId_day: { userId: user.id, day: asDate(today) } };
    let session = await this.prisma.practiceSession.findUnique({ where: key });
    if (!session) {
      const candidates = await this.practiceCandidates(user);
      const solved = await this.solvedIds(user.id, candidates);
      const quizIds = pickPractice(
        candidates.map((id) => ({ id, solved: solved.has(id) })),
        PRACTICE_SIZE,
        `${user.id}:${today}`,
      );
      if (quizIds.length > 0) {
        await this.prisma.practiceSession.createMany({
          data: [{ userId: user.id, day: asDate(today), quizIds, createdAt: now }],
          skipDuplicates: true,
        });
        session = await this.prisma.practiceSession.findUnique({ where: key });
      }
    }
    if (!session) {
      return {
        day: today,
        xp: PRACTICE_XP,
        total: 0,
        done: false,
        answeredQuizIds: [],
        quizzes: [],
      };
    }

    const quizIds = session.quizIds as string[];
    const premium = await this.entitlements.canAccess(user, { isPremium: true });
    const rows = await this.prisma.quiz.findMany({
      where: { id: { in: quizIds }, ...activeContent, lesson: this.openFor(premium) },
      include: { lesson: { include: { translations: true } } },
    });
    const byId = new Map(rows.map((row) => [row.id, row]));
    const [answered, solved] = await Promise.all([
      this.answeredIds(this.prisma, user.id, { quizIds, createdAt: session.createdAt }),
      this.solvedIds(user.id, quizIds),
    ]);
    const available = quizIds.filter((id) => byId.has(id));
    let done = session.completedAt !== null;
    // Two last answers at once can each miss the other: finish it here then.
    if (!done && available.length > 0 && available.every((id) => answered.includes(id))) {
      const outcome = await this.prisma.$transaction(async (tx) => {
        const locked = await this.lockedSession(tx, user.id, today);
        return locked ? this.finishIfDone(tx, user.id, today, locked, now, premium) : null;
      });
      if (outcome) {
        await this.progress.settle(user.id, [outcome.award]);
        done = outcome.progress.done;
      }
    }

    const quizzes: PracticeQuizDto[] = quizIds.flatMap((id) => {
      const row = byId.get(id);
      if (!row) return [];
      const title = pickTranslation(row.lesson.translations, language)?.title ?? row.lessonId;
      return [{ ...this.toDto(row, language, solved.has(id)), lessonTitle: title }];
    });
    return {
      day: today,
      xp: PRACTICE_XP,
      total: quizzes.length,
      done,
      answeredQuizIds: answered.filter((id) => byId.has(id)),
      quizzes,
    };
  }
}
