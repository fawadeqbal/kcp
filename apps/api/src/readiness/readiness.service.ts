import type { Prisma, ReadinessCheck } from '@kcp/database';
import { REVIEW_CRITERIA, REVIEW_SCORE_MAX } from '@kcp/shared';
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import type { Redis } from 'ioredis';
import { EntitlementsService } from '../billing/entitlements.service.js';
import { PrismaService } from '../database/prisma.service.js';
import type { CodeFilesDto } from '../learning/dto/learning.dto.js';
import type { AuthUser } from '../permissions/auth-user.js';
import { REDIS } from '../redis/redis.constants.js';
import {
  READINESS_GRACE_MINUTES,
  READINESS_MIN_AGE,
  READINESS_MINUTES,
  READINESS_RETRY_DAYS,
  READINESS_STARTER,
  READINESS_TRACK,
  readinessBrief,
} from './brief.js';
import type {
  ReadinessBlocker,
  ReadinessCheckDto,
  ReadinessDto,
  ReadinessSavedDto,
} from './readiness.dto.js';

const MINUTE = 60_000;
const DAY = 86_400_000;
const MAX_SCORE = REVIEW_CRITERIA.READINESS.length * REVIEW_SCORE_MAX;
const WEB_FILES = ['html', 'css', 'js'] as const;

/** Only the page's three files, as strings. */
function pageFiles(value: unknown): { html: string; css: string; js: string } {
  const files = (value ?? {}) as Record<string, unknown>;
  const text = (key: string) => (typeof files[key] === 'string' ? (files[key] as string) : '');
  return { html: text('html'), css: text('css'), js: text('js') };
}

/** Anything written beyond the starter. */
function hasWork(files: { html: string; css: string; js: string }): boolean {
  return WEB_FILES.some((key) => files[key].trim() !== READINESS_STARTER[key].trim());
}

/**
 * The hub readiness check: a student who finished the Pro track starts a timed brief,
 * builds it (saved as they type), and hands it in; a mentor grades it in the mentor
 * console (a review of kind READINESS). Passing records readiness, nothing more.
 */
@Injectable()
export class ReadinessService {
  private readonly logger = new Logger(ReadinessService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  private assertStudent(user: AuthUser) {
    if (user.kind !== 'STUDENT') {
      throw new ForbiddenException({ error: 'STUDENTS_ONLY', message: 'For students only.' });
    }
  }

  private dto(check: ReadinessCheck, withFiles: boolean): ReadinessCheckDto {
    return {
      id: check.id,
      status: check.status,
      startedAt: check.startedAt,
      dueAt: check.dueAt,
      submittedAt: check.submittedAt,
      files: withFiles ? pageFiles(check.files) : {},
      reviewId: check.reviewId,
      score: check.score,
      maxScore: MAX_SCORE,
      decidedAt: check.decidedAt,
      passedAt: check.passedAt,
    };
  }

  private late(check: ReadinessCheck, now: Date) {
    return now.getTime() > check.dueAt.getTime() + READINESS_GRACE_MINUTES * MINUTE;
  }

  /**
   * Hands the work to a mentor: a review of kind READINESS. Only an attempt still
   * going on is handed in, once (two tabs, or a save and a page load at the end of the
   * time, can't make two reviews).
   */
  private async handIn(
    check: ReadinessCheck,
    files: { html: string; css: string; js: string },
    now: Date,
  ): Promise<ReadinessCheck> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: check.studentId },
      select: { languageCode: true },
    });
    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.readinessCheck.updateMany({
        where: { id: check.id, status: 'STARTED' },
        data: { status: 'SUBMITTED', submittedAt: now, files: files as Prisma.InputJsonObject },
      });
      if (claimed.count === 0) {
        return tx.readinessCheck.findUniqueOrThrow({ where: { id: check.id } });
      }
      const review = await tx.review.create({
        data: {
          kind: 'READINESS',
          studentId: check.studentId,
          version: 1,
          files: files as Prisma.InputJsonObject,
          languageCode: user.languageCode,
        },
      });
      return tx.readinessCheck.update({ where: { id: check.id }, data: { reviewId: review.id } });
    });
  }

  /** The time ran out: what was saved is handed in, or the attempt ends empty. */
  private async settle(check: ReadinessCheck, now: Date): Promise<ReadinessCheck> {
    if (check.status !== 'STARTED' || !this.late(check, now)) return check;
    const files = pageFiles(check.files);
    if (hasWork(files)) return this.handIn(check, files, now);
    await this.prisma.readinessCheck.updateMany({
      where: { id: check.id, status: 'STARTED' },
      data: { status: 'EXPIRED', decidedAt: check.dueAt },
    });
    return this.prisma.readinessCheck.findUniqueOrThrow({ where: { id: check.id } });
  }

  /** Attempts whose time ran out while nobody had the page open (hourly). */
  async settleLate(now = new Date()): Promise<number> {
    const late = await this.prisma.readinessCheck.findMany({
      where: {
        status: 'STARTED',
        dueAt: { lt: new Date(now.getTime() - READINESS_GRACE_MINUTES * MINUTE) },
      },
      take: 500,
    });
    for (const check of late) await this.settle(check, now);
    return late.length;
  }

  @Cron('41 * * * *', { name: 'readiness-settle', timeZone: 'UTC' })
  async settleScheduled() {
    try {
      if (this.redis.status === 'wait') await this.redis.connect();
      if (!(await this.redis.set('readinessjob:settle', '1', 'EX', 600, 'NX'))) return;
      try {
        const count = await this.settleLate();
        if (count) this.logger.log(`${count} readiness checks closed after their time`);
      } finally {
        await this.redis.del('readinessjob:settle');
      }
    } catch (error) {
      this.logger.error(`Readiness job failed: ${(error as Error).message}`);
    }
  }

  private async proLessons(userId: string) {
    const lessons = await this.prisma.lesson.findMany({
      where: {
        isActive: true,
        module: { trackId: READINESS_TRACK, isActive: true, publishedAt: { not: null } },
      },
      select: { id: true },
    });
    const done = lessons.length
      ? await this.prisma.lessonProgress.count({
          where: { userId, status: 'COMPLETED', lessonId: { in: lessons.map((l) => l.id) } },
        })
      : 0;
    return { total: lessons.length, done };
  }

  async overview(user: AuthUser, now = new Date()): Promise<ReadinessDto> {
    this.assertStudent(user);
    const [account, rows, pro, premium] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({
        where: { id: user.id },
        select: { languageCode: true, studentProfile: { select: { birthYear: true } } },
      }),
      this.prisma.readinessCheck.findMany({
        where: { studentId: user.id },
        orderBy: { startedAt: 'desc' },
        take: 20,
      }),
      this.proLessons(user.id),
      this.entitlements.status(user.id, now),
    ]);
    const checks = await Promise.all(rows.map((row) => this.settle(row, now)));
    const current = checks.find((c) => c.status === 'STARTED' || c.status === 'SUBMITTED');
    const finished = checks.filter((c) => c !== current);
    const lastMiss = finished.find((c) => c.status === 'NOT_PASSED' || c.status === 'EXPIRED');
    const retryAt =
      lastMiss && lastMiss.decidedAt
        ? new Date(
            lastMiss.decidedAt.getTime() +
              READINESS_RETRY_DAYS[lastMiss.status as 'NOT_PASSED' | 'EXPIRED'] * DAY,
          )
        : null;
    const age = now.getUTCFullYear() - (account.studentProfile?.birthYear ?? now.getUTCFullYear());
    const blockers: ReadinessBlocker[] = [];
    if (age < READINESS_MIN_AGE) blockers.push('AGE');
    if (pro.total === 0 || pro.done < pro.total) blockers.push('PRO_TRACK');
    if (!premium.active) blockers.push('PREMIUM');
    if (checks.some((c) => c.status === 'PASSED')) blockers.push('PASSED');
    if (current) blockers.push('OPEN');
    if (retryAt && retryAt > now && !blockers.includes('PASSED')) blockers.push('WAIT');
    return {
      canStart: blockers.length === 0,
      blockers,
      retryAt: retryAt && retryAt > now ? retryAt : null,
      minutes: READINESS_MINUTES,
      brief: readinessBrief(account.languageCode),
      current: current ? this.dto(current, current.status === 'STARTED') : null,
      history: finished.map((c) => this.dto(c, false)),
      proLessonsDone: pro.done,
      proLessons: pro.total,
    };
  }

  async start(user: AuthUser, now = new Date()): Promise<ReadinessCheckDto> {
    const overview = await this.overview(user, now);
    if (!overview.canStart) {
      throw new ConflictException({
        error: 'READINESS_NOT_AVAILABLE',
        message: 'You can’t start the readiness check now.',
        details: { blockers: overview.blockers.join(',') },
      });
    }
    try {
      const check = await this.prisma.readinessCheck.create({
        data: {
          studentId: user.id,
          startedAt: now,
          dueAt: new Date(now.getTime() + READINESS_MINUTES * MINUTE),
          files: { ...READINESS_STARTER },
        },
      });
      return this.dto(check, true);
    } catch (error) {
      // Started at the same moment in another tab: one attempt at a time.
      if ((error as { code?: string }).code === 'P2002') {
        throw new ConflictException({
          error: 'READINESS_NOT_AVAILABLE',
          message: 'You can’t start the readiness check now.',
          details: { blockers: 'OPEN' },
        });
      }
      throw error;
    }
  }

  private async open(user: AuthUser, now: Date): Promise<ReadinessCheck> {
    this.assertStudent(user);
    const check = await this.prisma.readinessCheck.findFirst({
      where: { studentId: user.id, status: 'STARTED' },
      orderBy: { startedAt: 'desc' },
    });
    if (!check) {
      throw new NotFoundException({
        error: 'READINESS_NOT_STARTED',
        message: 'No readiness check is going on.',
      });
    }
    if (this.late(check, now)) {
      await this.settle(check, now);
      throw new ConflictException({
        error: 'TIME_UP',
        message: 'The time is up: what you saved was handed in.',
      });
    }
    return check;
  }

  async save(user: AuthUser, files: CodeFilesDto, now = new Date()): Promise<ReadinessSavedDto> {
    const check = await this.open(user, now);
    await this.prisma.readinessCheck.update({
      where: { id: check.id },
      data: { files: pageFiles(files) as Prisma.InputJsonObject },
    });
    return { savedAt: now };
  }

  async submit(user: AuthUser, files: CodeFilesDto, now = new Date()): Promise<ReadinessCheckDto> {
    const check = await this.open(user, now);
    const handed = await this.handIn(check, pageFiles(files), now);
    return this.dto(handed, false);
  }
}
