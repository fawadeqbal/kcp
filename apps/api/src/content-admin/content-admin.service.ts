import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service.js';
import type { RequestContext } from '../common/request-context.js';
import { PrismaService } from '../database/prisma.service.js';
import { pick, pickTranslation } from '../learning/content.js';
import type { AuthUser } from '../permissions/auth-user.js';
import type {
  ContentTreeDto,
  ModulePreviewDto,
  PreviewChallengeDto,
  PreviewLessonDto,
} from './content-admin.dto.js';

type Json = Record<string, unknown>;
const str = (value: unknown) => (typeof value === 'string' ? value : '');

/** A check in words, for proofreading ("text of h1 includes “Hello”"). */
export function describeCheck(check: Json): string {
  const selector = str(check['selector']);
  const quoted = (value: unknown) => `“${str(value)}”`;
  const textRule = () =>
    check['equals'] !== undefined
      ? `is ${quoted(check['equals'])}`
      : check['includes'] !== undefined
        ? `includes ${quoted(check['includes'])}`
        : check['notEmpty']
          ? 'is not empty'
          : 'is there';
  switch (check['expect']) {
    case 'exists': {
      const min = typeof check['min'] === 'number' ? check['min'] : 1;
      const max = typeof check['max'] === 'number' ? ` and at most ${check['max']}` : '';
      return `at least ${min} ${selector}${max}`;
    }
    case 'text':
      return `text of ${selector} ${textRule()}`;
    case 'attribute':
      return `${selector} has ${str(check['name'])} that ${textRule()}`;
    case 'css':
      return `CSS for ${selector} sets ${str(check['property'])}${
        check['includes'] !== undefined ? ` to ${quoted(check['includes'])}` : ''
      }`;
    case 'test':
      return 'a JavaScript test runs in the page';
    case 'output':
      return `the program's output ${textRule()}${
        check['stdin'] !== undefined ? ` (typing ${quoted(check['stdin'])})` : ''
      }`;
    case 'python':
      return 'a Python test runs after the program';
    default:
      return String(check['expect'] ?? 'check');
  }
}

const describeChecks = (checks: unknown) =>
  (Array.isArray(checks) ? (checks as Json[]) : []).map(
    (check) => `${str(check['id'])}: ${describeCheck(check)}`,
  );

const codeFiles = (value: unknown): Record<string, string> =>
  Object.fromEntries(
    Object.entries((value ?? {}) as Json).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  );

/**
 * Content as staff see it: every module (published or waiting), a preview of its
 * lessons in any language, and publishing. Lessons themselves are edited as files in
 * content/ and imported on deploy.
 */
@Injectable()
export class ContentAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async tree(): Promise<ContentTreeDto> {
    const tracks = await this.prisma.track.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        modules: {
          orderBy: { sortOrder: 'asc' },
          include: {
            lessons: {
              where: { isActive: true },
              select: {
                isPremium: true,
                translations: { select: { languageCode: true } },
                _count: { select: { challenges: { where: { isActive: true } } } },
              },
            },
            projectBrief: {
              select: { isActive: true, translations: { select: { languageCode: true } } },
            },
          },
        },
      },
    });
    return {
      tracks: tracks.map((track) => ({
        id: track.id,
        titles: track.titles as Record<string, string>,
        isActive: track.isActive,
        modules: track.modules.map((module) => {
          const parts = [
            ...module.lessons.map((l) => l.translations.map((t) => t.languageCode)),
            ...(module.projectBrief?.isActive
              ? [module.projectBrief.translations.map((t) => t.languageCode)]
              : []),
          ];
          const languages = parts.length
            ? parts.reduce((common, codes) => common.filter((code) => codes.includes(code)))
            : [];
          return {
            id: module.id,
            slug: module.slug,
            titles: module.titles as Record<string, string>,
            sortOrder: module.sortOrder,
            isActive: module.isActive,
            publishedAt: module.publishedAt,
            lessons: module.lessons.length,
            premiumLessons: module.lessons.filter((l) => l.isPremium).length,
            challenges: module.lessons.reduce((sum, l) => sum + l._count.challenges, 0),
            hasProject: Boolean(module.projectBrief?.isActive),
            languages: languages.toSorted(),
          };
        }),
      })),
    };
  }

  /** A module's lessons, challenges and project, in one language (English fills gaps). */
  async preview(id: string, language: string): Promise<ModulePreviewDto> {
    const module = await this.prisma.module.findUnique({
      where: { id },
      include: {
        lessons: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
          include: {
            translations: true,
            challenges: {
              where: { isActive: true },
              orderBy: { sortOrder: 'asc' },
              include: { translations: true },
            },
          },
        },
        projectBrief: { include: { translations: true } },
      },
    });
    if (!module) throw new NotFoundException('Module not found.');
    const lessons: PreviewLessonDto[] = module.lessons.map((lesson) => {
      const text = pickTranslation(lesson.translations, language);
      return {
        id: lesson.id,
        slug: lesson.slug,
        xp: lesson.xp,
        isPremium: lesson.isPremium,
        isActive: lesson.isActive,
        title: text?.title ?? lesson.id,
        summary: text?.summary ?? '',
        body: text?.body ?? '',
        video:
          text?.videoProvider && text.videoId
            ? { provider: text.videoProvider, id: text.videoId }
            : null,
        translated: text?.languageCode === language,
        challenges: lesson.challenges.map((challenge): PreviewChallengeDto => {
          const words = pickTranslation(challenge.translations, language);
          return {
            id: challenge.id,
            type: challenge.type,
            xp: challenge.xp,
            title: words?.title ?? challenge.id,
            instructions: words?.instructions ?? '',
            starter: codeFiles(challenge.starter),
            checks: describeChecks(challenge.checks),
            hints: (words?.hints ?? {}) as Record<string, string>,
            translated: words?.languageCode === language,
          };
        }),
      };
    });
    const brief = module.projectBrief?.isActive ? module.projectBrief : null;
    const briefText = brief ? pickTranslation(brief.translations, language) : undefined;
    return {
      id: module.id,
      trackId: module.trackId,
      title: pick(module.titles, language),
      description: pick(module.descriptions, language),
      isActive: module.isActive,
      publishedAt: module.publishedAt,
      language,
      lessons,
      project: brief
        ? {
            id: brief.id,
            xp: brief.xp,
            isPremium: brief.isPremium,
            title: briefText?.title ?? brief.id,
            summary: briefText?.summary ?? '',
            body: briefText?.body ?? '',
            starter: codeFiles(brief.starter),
            checks: describeChecks(brief.checks),
            translated: briefText?.languageCode === language,
          }
        : null,
    };
  }

  /** Students see the module from now on. */
  async publish(id: string, staff: AuthUser, ctx: RequestContext): Promise<void> {
    await this.setPublished(id, true, staff, ctx);
  }

  /** Students no longer see it (their progress and projects stay). */
  async unpublish(id: string, reason: string | undefined, staff: AuthUser, ctx: RequestContext) {
    await this.setPublished(id, false, staff, ctx, reason);
  }

  private async setPublished(
    id: string,
    publish: boolean,
    staff: AuthUser,
    ctx: RequestContext,
    reason?: string,
  ): Promise<void> {
    const module = await this.prisma.module.findUnique({ where: { id } });
    if (!module) throw new NotFoundException('Module not found.');
    if (Boolean(module.publishedAt) === publish) return;
    await this.prisma.$transaction(async (tx) => {
      await tx.module.update({
        where: { id },
        data: { publishedAt: publish ? new Date() : null },
      });
      await this.audit.record(
        {
          actor: { id: staff.id, roleKey: staff.roleKey },
          action: publish ? 'content.publish' : 'content.unpublish',
          entityType: 'Module',
          entityId: id,
          before: { published: !publish },
          after: { published: publish, ...(reason ? { reason } : {}) },
          context: ctx,
        },
        tx,
      );
    });
  }
}
