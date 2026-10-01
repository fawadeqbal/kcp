import type { Check, CodeFiles, StageLevel } from '@kcp/checks';
import { randomBytes } from 'node:crypto';
import { Prisma } from '@kcp/database';
import { CODE_FILE_KEYS, type CodeFileKey } from '@kcp/shared';
import {
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import type { Redis } from 'ioredis';
import { AuditService } from '../audit/audit.service.js';
import { EntitlementsService } from '../billing/entitlements.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { RateLimiterService } from '../common/rate-limit/rate-limiter.service.js';
import type { RequestContext } from '../common/request-context.js';
import { PrismaService } from '../database/prisma.service.js';
import {
  cleanCode,
  FALLBACK_LANGUAGE,
  pick,
  pickTranslation,
  publishedModule,
  type Texts,
} from '../learning/content.js';
import type { CheckResultDto, CodeFilesDto, StageDto } from '../learning/dto/learning.dto.js';
import type { AuthUser } from '../permissions/auth-user.js';
import { ProgressService } from '../progress/progress.service.js';
import { REDIS } from '../redis/redis.constants.js';
import { requestProjectReview } from '../reviews/review-request.js';
import { ReviewsService } from '../reviews/reviews.service.js';
import { StorageService } from '../storage/storage.service.js';
import type {
  ChildPortfolioDto,
  PortfolioItemDto,
  ProjectDto,
  ProjectStatusValue,
  SharedPortfolioDto,
  ShipResultDto,
  HubPortfolioItemDto,
} from './dto/projects.dto.js';
import { confirmResults, isUnchanged } from '../learning/server-checks.js';
import { ReferralsService } from '../referrals/referrals.service.js';

/** The file names students see (and that the portfolio stores). */
export const PROJECT_FILE_NAMES: Record<CodeFileKey, string> = {
  html: 'index.html',
  css: 'style.css',
  js: 'script.js',
  py: 'main.py',
  blocks: 'program.blocks.json',
  // Git steps belong to lessons, never to projects.
  git: 'steps.git.json',
};
const CONTENT_TYPES: Record<CodeFileKey, string> = {
  html: 'text/html; charset=utf-8',
  css: 'text/css; charset=utf-8',
  js: 'text/javascript; charset=utf-8',
  py: 'text/x-python; charset=utf-8',
  blocks: 'application/json; charset=utf-8',
  git: 'application/json; charset=utf-8',
};

const DRAFTS_PER_MINUTE = 120;
const SHIPS_PER_MINUTE = 10;
const SHIPS_PER_DAY = 100;

const activeBrief = {
  isActive: true,
  module: publishedModule,
} as const;

/** Storage folder of one project, and of one shipped version of it. */
const projectFolder = (userId: string, projectId: string) => `projects/${userId}/${projectId}/`;
const versionFolder = (userId: string, projectId: string, version: number) =>
  `${projectFolder(userId, projectId)}v${version}/`;

/** One ship at a time per project; long enough for three uploads and a transaction. */
const SHIP_LOCK_SECONDS = 60;
/** Deleted students whose files the nightly sweep removes again (a week of retries). */
const SWEEP_DAYS = 8;
const DAY_MS = 24 * 60 * 60 * 1000;
const RELEASE_LOCK = `if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) end return 0`;

/**
 * Module projects: a student builds one in three files, and ships it once every
 * requirement is met. Shipping stores the files in file storage (R2) and puts the
 * project on the student's portfolio; the family decides who else sees it.
 */
@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly progress: ProgressService,
    private readonly limiter: RateLimiterService,
    private readonly audit: AuditService,
    private readonly entitlements: EntitlementsService,
    private readonly notifications: NotificationsService,
    private readonly reviews: ReviewsService,
    private readonly referrals: ReferralsService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  /** Runs `ship` while holding this project's ship lock; a second ship at once gets 409. */
  private async withShipLock<T>(userId: string, briefId: string, ship: () => Promise<T>) {
    if (this.redis.status === 'wait') await this.redis.connect();
    const key = `ship:${userId}:${briefId}`;
    const token = randomBytes(12).toString('hex');
    if (!(await this.redis.set(key, token, 'EX', SHIP_LOCK_SECONDS, 'NX'))) {
      throw new ConflictException({
        error: 'SHIP_IN_PROGRESS',
        message: 'This project is being shipped already. Try again in a moment.',
      });
    }
    try {
      return await ship();
    } finally {
      await this.redis.eval(RELEASE_LOCK, 1, key, token).catch(() => undefined);
    }
  }

  private assertStudent(user: AuthUser) {
    if (user.kind !== 'STUDENT') {
      throw new ForbiddenException({
        error: 'STUDENTS_ONLY',
        message: 'Only student accounts build projects.',
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

  /** An active project brief the student may use (premium ones need premium). */
  private async brief(id: string, user: AuthUser) {
    const brief = await this.prisma.projectBrief.findFirst({
      where: { id, ...activeBrief },
      include: { translations: true, module: { select: { titles: true } } },
    });
    if (!brief) throw new NotFoundException('Project not found.');
    await this.entitlements.assertAccess(user, brief);
    return brief;
  }

  /** The brief, with the student's draft and whether it has shipped. */
  async get(briefId: string, user: AuthUser, language: string): Promise<ProjectDto> {
    this.assertStudent(user);
    const brief = await this.brief(briefId, user);
    const project = await this.prisma.project.findUnique({
      where: { userId_briefId: { userId: user.id, briefId } },
      include: { portfolioItem: { select: { version: true } } },
    });
    const review = project
      ? (await this.reviews.summaries([project.id])).get(project.id)
      : undefined;
    const text = pickTranslation(brief.translations, language);
    const english = brief.translations.find((t) => t.languageCode === FALLBACK_LANGUAGE);
    const starter = brief.starter as CodeFilesDto;
    const status: ProjectStatusValue = project
      ? project.status === 'SHIPPED'
        ? 'SHIPPED'
        : 'DRAFT'
      : 'NOT_STARTED';
    return {
      id: brief.id,
      moduleId: brief.moduleId,
      moduleTitle: pick(brief.module.titles, language),
      title: text?.title ?? brief.id,
      summary: text?.summary ?? '',
      body: text?.body ?? '',
      language: text?.languageCode ?? FALLBACK_LANGUAGE,
      xp: brief.xp,
      files: CODE_FILE_KEYS.filter((key) => typeof starter[key] === 'string'),
      starter,
      stage: (brief.stage as StageDto | null) ?? null,
      checks: brief.checks as Record<string, unknown>[],
      hints: { ...(english?.hints as Texts), ...(text?.hints as Texts) },
      checkLabels: { ...(english?.checkLabels as Texts), ...(text?.checkLabels as Texts) },
      draft: (project?.files as CodeFilesDto | undefined) ?? null,
      status,
      shippedAt: project?.shippedAt ?? null,
      version: project?.portfolioItem?.version ?? null,
      review: review ?? null,
    };
  }

  async saveDraft(briefId: string, code: CodeFilesDto, user: AuthUser): Promise<void> {
    this.assertStudent(user);
    await this.limit('project-draft-user', user, DRAFTS_PER_MINUTE);
    const brief = await this.brief(briefId, user);
    await this.saveFiles(
      user.id,
      briefId,
      cleanCode(code, brief.starter) as Prisma.InputJsonObject,
    );
  }

  /**
   * Stores the student's files, creating the project the first time. Two requests at
   * once (an autosave and "Ship it") can both try to create it; the second updates.
   */
  private async saveFiles(userId: string, briefId: string, files: Prisma.InputJsonObject) {
    const where = { userId_briefId: { userId, briefId } };
    try {
      return await this.prisma.project.upsert({
        where,
        create: { userId, briefId, files },
        update: { files },
      });
    } catch (error) {
      const created =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
      if (!created) throw error;
      return this.prisma.project.update({ where, data: { files } });
    }
  }

  /**
   * Ships the project when every requirement passed in the sandbox: the files go to
   * storage as a new version, the portfolio shows it, and the first ship earns XP.
   */
  async ship(
    briefId: string,
    code: CodeFilesDto,
    reported: CheckResultDto[],
    user: AuthUser,
  ): Promise<ShipResultDto> {
    this.assertStudent(user);
    await this.limit('project-ship-user', user, SHIPS_PER_MINUTE);
    await this.limit('project-ship-user-day', user, SHIPS_PER_DAY, 24 * 60 * 60);
    const brief = await this.brief(briefId, user);

    // Only the brief's own requirements count, and every one must be reported; the
    // HTML and CSS ones are confirmed on the server (learning/server-checks.ts).
    const byId = new Map(reported.map((result) => [result.id, result.passed]));
    const files = cleanCode(code, brief.starter);
    const checks = brief.checks as unknown as Check[];
    const confirmed = await confirmResults(
      briefId,
      files,
      checks,
      byId,
      (message) => this.logger.warn(message),
      { stage: brief.stage as StageLevel | null },
    );
    const results = checks.map((check) => ({
      id: check.id,
      passed: confirmed.get(check.id) === true,
    }));
    const ready =
      !isUnchanged(files, brief.starter as CodeFiles) &&
      results.length > 0 &&
      results.every((result) => result.passed);
    const project = await this.saveFiles(user.id, briefId, files as Prisma.InputJsonObject);
    if (!ready) {
      const item = await this.prisma.portfolioItem.findUnique({
        where: { projectId: project.id },
        select: { id: true, version: true },
      });
      return {
        shipped: false,
        results,
        xpAwarded: 0,
        dailyCapReached: false,
        portfolioItemId: item?.id ?? null,
        version: item?.version ?? null,
        badgesEarned: [],
      };
    }

    return this.withShipLock(user.id, briefId, async () => {
      // Files first, in a new folder: if the database step fails, it is simply unused
      // (and removed by the next ship).
      const current = await this.prisma.portfolioItem.findUnique({
        where: { projectId: project.id },
        select: { version: true },
      });
      const version = (current?.version ?? 0) + 1;
      const folder = versionFolder(user.id, project.id, version);
      const keys: Partial<Record<CodeFileKey, string>> = {};
      for (const key of CODE_FILE_KEYS) {
        const text = files[key];
        if (typeof text !== 'string') continue;
        keys[key] = `${folder}${PROJECT_FILE_NAMES[key]}`;
        await this.storage.putText(keys[key], text, CONTENT_TYPES[key]);
      }

      const now = new Date();
      const outcome = await this.prisma.$transaction(async (tx) => {
        await tx.project.update({
          where: { id: project.id },
          data: { status: 'SHIPPED', shippedAt: now },
        });
        const item = await tx.portfolioItem.upsert({
          where: { projectId: project.id },
          create: {
            userId: user.id,
            projectId: project.id,
            moduleId: brief.moduleId,
            version,
            files: keys,
            publishedAt: now,
          },
          update: { version, files: keys, publishedAt: now },
        });
        const award = await this.progress.award(tx, user.id, 'PROJECT', brief.id, brief.xp, now);
        return { item, award };
      });
      const badgesEarned = await this.progress.settle(user.id, [outcome.award]);
      // Premium students' projects go to a mentor for review.
      if ((await this.entitlements.status(user.id, now)).active) {
        const student = await this.prisma.user.findUnique({
          where: { id: user.id },
          select: { languageCode: true },
        });
        await requestProjectReview(this.prisma, {
          studentId: user.id,
          projectId: project.id,
          version,
          files: files as Prisma.InputJsonObject,
          languageCode: student?.languageCode ?? 'en',
        });
      }
      if (version === 1) {
        // A family that signed up with an invite link: the inviting family's reward.
        await this.referrals.childShipped(user.id, now);
        // The family hears about a project the first time it ships.
        const profile = await this.prisma.studentProfile.findUnique({
          where: { userId: user.id },
          select: { nickname: true },
        });
        await this.notifications.notify(
          await this.notifications.parentsOf(user.id),
          'child_shipped',
          {
            childId: user.id,
            nickname: profile?.nickname ?? '',
            titles: Object.fromEntries(brief.translations.map((t) => [t.languageCode, t.title])),
          },
        );
      }

      // Only the latest version is kept: older ones, and any left over from failed ships.
      try {
        await this.storage.deletePrefix(projectFolder(user.id, project.id), { keep: folder });
      } catch (error) {
        this.logger.warn(`Could not remove old project versions: ${(error as Error).message}`);
      }
      return {
        shipped: true,
        results,
        xpAwarded: outcome.award?.amount ?? 0,
        dailyCapReached: outcome.award?.capped ?? false,
        portfolioItemId: outcome.item.id,
        version,
        badgesEarned,
      };
    });
  }

  /**
   * Removes the files of students deleted in the last week, again. Deleting an account
   * removes them straight away; this catches deletions that failed while storage was
   * down, and files from a ship that was still running at the time.
   */
  async sweepDeletedStudents(now = new Date()): Promise<number> {
    const deleted = await this.prisma.user.findMany({
      where: {
        kind: 'STUDENT',
        status: 'DELETED',
        deletedAt: { gte: new Date(now.getTime() - SWEEP_DAYS * DAY_MS) },
      },
      select: { id: true },
    });
    let removed = 0;
    for (const { id } of deleted) {
      try {
        removed += await this.storage.deletePrefix(`projects/${id}/`);
      } catch (error) {
        this.logger.warn(`Could not remove a deleted student's files: ${(error as Error).message}`);
      }
    }
    return removed;
  }

  /** Every night at 00:45 UTC (once, even with several servers). */
  @Cron('45 0 * * *', { name: 'deleted-files-sweep', timeZone: 'UTC' })
  async nightlySweep(): Promise<void> {
    try {
      if (this.redis.status === 'wait') await this.redis.connect();
      const day = new Date().toISOString().slice(0, 10);
      if (!(await this.redis.set(`sweep:${day}`, '1', 'EX', 6 * 60 * 60, 'NX'))) return;
      const removed = await this.sweepDeletedStudents();
      if (removed) this.logger.log(`Removed ${removed} file(s) of deleted students`);
    } catch (error) {
      this.logger.error(`Sweeping deleted students' files failed: ${(error as Error).message}`);
    }
  }

  /** Shipped projects with their files, newest module last. */
  private async items(
    userId: string,
    language: string,
    { withReviews = true }: { withReviews?: boolean } = {},
  ): Promise<PortfolioItemDto[]> {
    const items = await this.prisma.portfolioItem.findMany({
      where: { userId },
      orderBy: [{ module: { sortOrder: 'asc' } }, { publishedAt: 'asc' }],
      include: {
        module: { select: { titles: true } },
        project: { select: { brief: { select: { translations: true, stage: true } } } },
      },
    });
    // Reviews are for the family; the public page never shows them.
    const reviews = withReviews
      ? await this.reviews.summaries(items.map((item) => item.projectId))
      : new Map();
    return Promise.all(
      items.map(async (item) => {
        const keys = item.files as Partial<Record<CodeFileKey, string>>;
        const files: CodeFilesDto = {};
        for (const key of CODE_FILE_KEYS) {
          const storageKey = keys[key];
          if (storageKey) files[key] = (await this.storage.getText(storageKey)) ?? '';
        }
        const text = pickTranslation(item.project.brief.translations, language);
        return {
          id: item.id,
          title: text?.title ?? '',
          moduleTitle: pick(item.module.titles, language),
          version: item.version,
          publishedAt: item.publishedAt,
          files,
          stage: (item.project.brief.stage as StageDto | null) ?? null,
          review: reviews.get(item.projectId) ?? null,
        };
      }),
    );
  }

  /** The student's own portfolio. */
  async portfolio(user: AuthUser, language: string) {
    this.assertStudent(user);
    return { items: await this.items(user.id, language), hubWork: await this.hubWork(user.id) };
  }

  /** A child's portfolio for their parent (the caller has been checked as the parent). */
  async childPortfolio(childId: string, language: string): Promise<ChildPortfolioDto> {
    const profile = await this.prisma.studentProfile.findUniqueOrThrow({
      where: { userId: childId },
      select: { publicPortfolio: true, portfolioShareToken: true },
    });
    return {
      items: await this.items(childId, language),
      hubWork: await this.hubWork(childId),
      share: {
        allowed: profile.publicPortfolio,
        token: profile.publicPortfolio ? profile.portfolioShareToken : null,
      },
    };
  }

  /**
   * Makes a new share link for a child's portfolio (the old one stops working). Only
   * while "Public projects" is on, which is what the parent consented to.
   */
  async createShareLink(childId: string, parent: AuthUser, ctx: RequestContext) {
    // Public portfolios are part of premium.
    if (!(await this.entitlements.status(childId)).active) {
      throw new ForbiddenException({
        error: 'PREMIUM_REQUIRED',
        message: 'Sharing a portfolio is part of premium.',
      });
    }
    const token = randomBytes(18).toString('base64url');
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT user_id FROM student_profiles WHERE user_id = ${childId}::uuid FOR UPDATE`;
      const profile = await tx.studentProfile.findUniqueOrThrow({ where: { userId: childId } });
      if (!profile.publicPortfolio) {
        throw new ConflictException({
          error: 'PORTFOLIO_NOT_PUBLIC',
          message: 'Switch on "Public projects" first.',
        });
      }
      await tx.studentProfile.update({
        where: { userId: childId },
        data: { portfolioShareToken: token },
      });
      await this.audit.record(
        {
          actor: { id: parent.id, roleKey: parent.roleKey },
          action: 'child.portfolio_link_create',
          entityType: 'User',
          entityId: childId,
          context: ctx,
        },
        tx,
      );
    });
    return { allowed: true, token };
  }

  async removeShareLink(childId: string, parent: AuthUser, ctx: RequestContext) {
    await this.prisma.$transaction(async (tx) => {
      await tx.studentProfile.update({
        where: { userId: childId },
        data: { portfolioShareToken: null },
      });
      await this.audit.record(
        {
          actor: { id: parent.id, roleKey: parent.roleKey },
          action: 'child.portfolio_link_remove',
          entityType: 'User',
          entityId: childId,
          context: ctx,
        },
        tx,
      );
    });
  }

  /**
   * Client projects the student worked on, once the client accepted the work and
   * allowed portfolios: the project's title and the student's finished tasks. Never
   * the client's name, the money, or the files (they're the client's).
   */
  async hubWork(studentId: string): Promise<HubPortfolioItemDto[]> {
    const projects = await this.prisma.hubProject.findMany({
      where: {
        portfolioAllowed: true,
        status: { in: ['DELIVERED', 'COMPLETED'] },
        tasks: { some: { assigneeId: studentId, status: 'DONE' } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        title: true,
        completedAt: true,
        quotes: { where: { kind: 'MAIN', status: 'APPROVED' }, select: { acceptedAt: true } },
        tasks: {
          where: { assigneeId: studentId, status: 'DONE' },
          orderBy: { number: 'asc' },
          select: { title: true, skillTags: true },
        },
      },
    });
    return projects.map((project) => ({
      projectId: project.id,
      title: project.title,
      finishedAt: project.quotes[0]?.acceptedAt ?? project.completedAt,
      tasks: project.tasks.map((task) => task.title),
      skills: [...new Set(project.tasks.flatMap((task) => task.skillTags))],
    }));
  }

  /**
   * A portfolio opened with its share link: nickname, avatar and shipped projects,
   * nothing else (no hub work). Works only while "Public projects" is on and the link
   * is current.
   */
  async shared(token: string, language: string): Promise<SharedPortfolioDto> {
    const profile = await this.prisma.studentProfile.findFirst({
      where: { portfolioShareToken: token, publicPortfolio: true, user: { status: 'ACTIVE' } },
      select: { userId: true, nickname: true, avatarKey: true },
    });
    // Public portfolios are part of premium: the link rests while premium is off.
    if (!profile || !(await this.entitlements.status(profile.userId)).active) {
      throw new NotFoundException('This link doesn’t work any more.');
    }
    return {
      nickname: profile.nickname,
      avatarKey: profile.avatarKey,
      items: await this.items(profile.userId, language, { withReviews: false }),
    };
  }
}
