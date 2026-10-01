import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { type ContentEntityKey, type Prisma, ROLE_KEYS } from '@kcp/database';
import { AuditService } from '../audit/audit.service.js';
import type { RequestContext } from '../common/request-context.js';
import { PrismaService } from '../database/prisma.service.js';
import type { AuthUser } from '../permissions/auth-user.js';
import type {
  EntityPath,
  StudioItemDto,
  StudioLanguagesDto,
  StudioModuleDto,
  StudioPersonDto,
  StudioReviewsDto,
  StudioTextDto,
  StudioVersionDetailDto,
} from './content-studio.dto.js';
import { cleanText, loadContext, moduleTitle, type TextContext, writeLive } from './texts.js';

const toEntity = (path: EntityPath) => path.toUpperCase() as ContentEntityKey;
const key = (type: string, id: string) => `${type}:${id}`;

/**
 * The content studio: translators write drafts, a second person reviews and publishes
 * them. Students keep reading the live texts until then, and every live text is kept
 * in the history (content_versions).
 */
@Injectable()
export class ContentStudioService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async languages(): Promise<StudioLanguagesDto> {
    const languages = await this.prisma.language.findMany({ orderBy: { sortOrder: 'asc' } });
    return {
      languages: languages.map(({ code, name, nativeName, direction, isActive }) => ({
        code,
        name,
        nativeName,
        direction,
        isActive,
      })),
    };
  }

  /** Every text of a module in one language, with where each one stands. */
  async module(moduleId: string, language: string): Promise<StudioModuleDto> {
    await this.assertLanguage(language);
    const mod = await this.prisma.module.findUnique({
      where: { id: moduleId },
      include: {
        lessons: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
          include: {
            translations: { select: { languageCode: true, title: true, source: true } },
            challenges: {
              where: { isActive: true },
              orderBy: { sortOrder: 'asc' },
              include: {
                translations: { select: { languageCode: true, title: true, source: true } },
              },
            },
            quizzes: {
              where: { isActive: true },
              orderBy: { sortOrder: 'asc' },
              select: { id: true, texts: true, textSources: true },
            },
          },
        },
        projectBrief: {
          include: { translations: { select: { languageCode: true, title: true, source: true } } },
        },
      },
    });
    if (!mod) throw new NotFoundException('Module not found.');

    interface Row {
      entityType: ContentEntityKey;
      entityId: string;
      lessonId: string | null;
      title: string;
      languages: Map<string, 'IMPORT' | 'STUDIO'>;
    }
    const rows: Row[] = [];
    const translationRow = (
      entityType: ContentEntityKey,
      entityId: string,
      lessonId: string | null,
      translations: { languageCode: string; title: string; source: 'IMPORT' | 'STUDIO' }[],
    ) =>
      rows.push({
        entityType,
        entityId,
        lessonId,
        title: translations.find((t) => t.languageCode === 'en')?.title ?? entityId,
        languages: new Map(translations.map((t) => [t.languageCode, t.source])),
      });
    for (const lesson of mod.lessons) {
      translationRow('LESSON', lesson.id, lesson.id, lesson.translations);
      for (const challenge of lesson.challenges) {
        translationRow('CHALLENGE', challenge.id, lesson.id, challenge.translations);
      }
      for (const quiz of lesson.quizzes) {
        const texts = (quiz.texts ?? {}) as Record<string, { prompt?: string }>;
        const sources = (quiz.textSources ?? {}) as Record<string, { source: 'IMPORT' | 'STUDIO' }>;
        rows.push({
          entityType: 'QUIZ',
          entityId: quiz.id,
          lessonId: lesson.id,
          title: texts['en']?.prompt ?? quiz.id,
          languages: new Map(
            Object.keys(texts).map((code) => [code, sources[code]?.source ?? 'IMPORT']),
          ),
        });
      }
    }
    if (mod.projectBrief?.isActive) {
      translationRow('PROJECT', mod.projectBrief.id, null, mod.projectBrief.translations);
    }

    const ids = rows.map((row) => row.entityId);
    const [drafts, versions] = await Promise.all([
      this.prisma.contentDraft.findMany({
        where: { entityId: { in: ids }, languageCode: language },
      }),
      this.prisma.contentVersion.groupBy({
        by: ['entityType', 'entityId', 'languageCode'],
        where: { entityId: { in: ids }, languageCode: { in: [...new Set(['en', language])] } },
        _max: { createdAt: true },
      }),
    ]);
    const people = await this.people(drafts.map((d) => d.editedById));
    const latest = new Map(
      versions.map((v) => [`${key(v.entityType, v.entityId)}:${v.languageCode}`, v._max.createdAt]),
    );
    const draftFor = new Map(drafts.map((d) => [key(d.entityType, d.entityId), d]));

    const items: StudioItemDto[] = rows.map((row) => {
      const draft = draftFor.get(key(row.entityType, row.entityId));
      const source = row.languages.get(language);
      const englishAt = latest.get(`${key(row.entityType, row.entityId)}:en`);
      const hereAt = latest.get(`${key(row.entityType, row.entityId)}:${language}`);
      return {
        entityType: row.entityType,
        entityId: row.entityId,
        lessonId: row.lessonId,
        title: row.title,
        status: draft ? draft.status : source ? 'LIVE' : 'MISSING',
        fromStudio: source === 'STUDIO',
        englishChanged: Boolean(
          language !== 'en' && source && englishAt && hereAt && englishAt > hereAt,
        ),
        draftUpdatedAt: draft?.updatedAt ?? null,
        editedBy: draft?.editedById ? (people.get(draft.editedById) ?? null) : null,
        reviewNote: draft?.reviewNote ?? null,
      };
    });
    return {
      id: mod.id,
      trackId: mod.trackId,
      title: moduleTitle(mod.titles),
      language,
      items,
      counts: {
        total: items.length,
        live: items.filter((i) => i.status === 'LIVE').length,
        missing: items.filter((i) => i.status === 'MISSING').length,
        draft: items.filter((i) => i.status === 'DRAFT').length,
        inReview: items.filter((i) => i.status === 'IN_REVIEW').length,
        englishChanged: items.filter((i) => i.englishChanged).length,
      },
    };
  }

  /** Drafts waiting for a reviewer, oldest first. */
  async reviews(): Promise<StudioReviewsDto> {
    const drafts = await this.prisma.contentDraft.findMany({
      where: { status: 'IN_REVIEW' },
      orderBy: { submittedAt: 'asc' },
      take: 200,
    });
    const people = await this.people(drafts.map((d) => d.editedById));
    const items = [];
    for (const draft of drafts) {
      const context = await loadContext(this.prisma, draft.entityType, draft.entityId);
      if (!context) continue;
      items.push({
        entityType: draft.entityType,
        entityId: draft.entityId,
        language: draft.languageCode,
        title: context.title,
        moduleId: context.moduleId,
        editedBy: draft.editedById ? (people.get(draft.editedById) ?? null) : null,
        submittedAt: draft.submittedAt,
      });
    }
    return { items };
  }

  async get(
    path: EntityPath,
    id: string,
    language: string,
    user: AuthUser,
  ): Promise<StudioTextDto> {
    const context = await this.context(path, id, language);
    const [draft, versions] = await Promise.all([
      this.draft(context, language),
      this.prisma.contentVersion.findMany({
        where: { entityType: context.entityType, entityId: id, languageCode: language },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);
    const englishLatest = await this.prisma.contentVersion.findFirst({
      where: { entityType: context.entityType, entityId: id, languageCode: 'en' },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    const people = await this.people([
      draft?.editedById ?? null,
      ...versions.flatMap((v) => [v.actorId, v.editedById]),
    ]);
    const person = (userId: string | null) => (userId ? (people.get(userId) ?? null) : null);
    const hereAt = versions[0]?.createdAt;
    return {
      entityType: context.entityType,
      entityId: id,
      language,
      trackId: context.trackId,
      moduleId: context.moduleId,
      lessonId: context.lessonId,
      title: context.title,
      isActive: context.isActive,
      english: (context.live.get('en') as Record<string, unknown> | undefined) ?? null,
      live: (context.live.get(language) as Record<string, unknown> | undefined) ?? null,
      draft: draft
        ? {
            data: draft.data as Record<string, unknown>,
            status: draft.status,
            editedBy: person(draft.editedById),
            updatedAt: draft.updatedAt,
            submittedAt: draft.submittedAt,
            reviewNote: draft.reviewNote,
          }
        : null,
      hintKeys: context.hintKeys,
      checks: context.checks,
      options: context.options.map((o) => o.id),
      versions: versions.map((v) => ({
        id: v.id,
        action: v.action,
        createdAt: v.createdAt,
        publishedBy: person(v.actorId),
        editedBy: person(v.editedById),
      })),
      englishChanged: Boolean(
        language !== 'en' &&
        context.live.has(language) &&
        englishLatest &&
        hereAt &&
        englishLatest.createdAt > hereAt,
      ),
      canPublish: Boolean(draft?.status === 'IN_REVIEW' && this.mayReview(user, draft.editedById)),
    };
  }

  /** Saves a draft (a new one, or changes to one: it goes back to DRAFT). */
  async save(
    path: EntityPath,
    id: string,
    language: string,
    raw: unknown,
    user: AuthUser,
    ctx: RequestContext,
  ): Promise<void> {
    const context = await this.context(path, id, language);
    const data = cleanText(context, raw);
    await this.prisma.$transaction(async (tx) => {
      await tx.contentDraft.upsert({
        where: {
          entityType_entityId_languageCode: {
            entityType: context.entityType,
            entityId: id,
            languageCode: language,
          },
        },
        create: {
          entityType: context.entityType,
          entityId: id,
          languageCode: language,
          data: data as object,
          editedById: user.id,
        },
        update: { data: data as object, status: 'DRAFT', editedById: user.id, submittedAt: null },
      });
      await this.record(tx, 'content.text.save', context, language, user, ctx);
    });
  }

  /** The translator is done: the draft waits for a reviewer. */
  async submit(
    path: EntityPath,
    id: string,
    language: string,
    user: AuthUser,
    ctx: RequestContext,
  ) {
    const context = await this.context(path, id, language);
    const draft = await this.draft(context, language);
    if (!draft) throw new NotFoundException('There is no draft to send for review.');
    if (draft.status === 'IN_REVIEW') return;
    await this.prisma.$transaction(async (tx) => {
      await tx.contentDraft.update({
        where: this.draftKey(context, language),
        data: { status: 'IN_REVIEW', submittedAt: new Date() },
      });
      await this.record(tx, 'content.text.submit', context, language, user, ctx);
    });
  }

  /** A reviewer (not the last editor) makes the draft live. */
  async publish(
    path: EntityPath,
    id: string,
    language: string,
    user: AuthUser,
    ctx: RequestContext,
  ) {
    const context = await this.context(path, id, language);
    const draft = await this.draft(context, language);
    if (!draft) throw new NotFoundException('There is no draft to publish.');
    if (draft.status !== 'IN_REVIEW') {
      throw new ConflictException({
        error: 'NOT_IN_REVIEW',
        message: 'Send the draft for review first.',
      });
    }
    if (!this.mayReview(user, draft.editedById)) {
      throw new ConflictException({
        error: 'OWN_DRAFT',
        message: 'Someone else needs to review and publish your translation.',
      });
    }
    // Checked again: the content may have changed since the draft was written.
    const data = cleanText(context, draft.data);
    await this.prisma.$transaction(async (tx) => {
      await writeLive(tx, context, language, data);
      const version = await tx.contentVersion.create({
        data: {
          entityType: context.entityType,
          entityId: id,
          languageCode: language,
          data: data as object,
          action: 'PUBLISH',
          actorId: user.id,
          editedById: draft.editedById,
        },
      });
      await tx.contentDraft.delete({ where: this.draftKey(context, language) });
      await this.record(tx, 'content.text.publish', context, language, user, ctx, {
        versionId: version.id,
        editedById: draft.editedById,
      });
    });
  }

  /** The reviewer asks for changes: back to the translator, with a note. */
  async returnDraft(
    path: EntityPath,
    id: string,
    language: string,
    note: string,
    user: AuthUser,
    ctx: RequestContext,
  ) {
    const context = await this.context(path, id, language);
    const draft = await this.draft(context, language);
    if (!draft || draft.status !== 'IN_REVIEW') {
      throw new ConflictException({
        error: 'NOT_IN_REVIEW',
        message: 'No draft waits for review.',
      });
    }
    if (!this.mayReview(user, draft.editedById)) {
      throw new ConflictException({ error: 'OWN_DRAFT', message: 'You wrote this draft.' });
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.contentDraft.update({
        where: this.draftKey(context, language),
        data: { status: 'DRAFT', reviewNote: note.trim(), submittedAt: null },
      });
      await this.record(tx, 'content.text.return', context, language, user, ctx, {
        note: note.trim(),
      });
    });
  }

  async discard(
    path: EntityPath,
    id: string,
    language: string,
    user: AuthUser,
    ctx: RequestContext,
  ) {
    const context = await this.context(path, id, language);
    const draft = await this.draft(context, language);
    if (!draft) return;
    await this.prisma.$transaction(async (tx) => {
      await tx.contentDraft.delete({ where: this.draftKey(context, language) });
      await this.record(tx, 'content.text.discard', context, language, user, ctx);
    });
  }

  async version(
    path: EntityPath,
    id: string,
    language: string,
    versionId: string,
  ): Promise<StudioVersionDetailDto> {
    const version = await this.findVersion(path, id, language, versionId);
    return {
      id: version.id,
      action: version.action,
      createdAt: version.createdAt,
      data: version.data as Record<string, unknown>,
    };
  }

  /** An older text becomes the draft again (it still needs a review to go live). */
  async restore(
    path: EntityPath,
    id: string,
    language: string,
    versionId: string,
    user: AuthUser,
    ctx: RequestContext,
  ) {
    const version = await this.findVersion(path, id, language, versionId);
    await this.save(path, id, language, version.data, user, ctx);
    await this.audit.record({
      actor: { id: user.id, roleKey: user.roleKey },
      action: 'content.text.restore',
      entityType: 'ContentText',
      entityId: `${toEntity(path)}:${id}:${language}`,
      after: { versionId },
      context: ctx,
    });
  }

  private async findVersion(path: EntityPath, id: string, language: string, versionId: string) {
    const version = await this.prisma.contentVersion.findUnique({ where: { id: versionId } });
    if (
      !version ||
      version.entityType !== toEntity(path) ||
      version.entityId !== id ||
      version.languageCode !== language
    ) {
      throw new NotFoundException('Version not found.');
    }
    return version;
  }

  /** Reviewers publish other people's drafts; super admins may publish their own. */
  private mayReview(user: AuthUser, editedById: string | null) {
    return user.roleKey === ROLE_KEYS.SUPER_ADMIN || editedById !== user.id;
  }

  private async context(path: EntityPath, id: string, language: string): Promise<TextContext> {
    await this.assertLanguage(language);
    const context = await loadContext(this.prisma, toEntity(path), id);
    if (!context) throw new NotFoundException('Content not found.');
    return context;
  }

  private async assertLanguage(code: string) {
    const language = await this.prisma.language.findUnique({ where: { code } });
    if (!language) throw new NotFoundException('Language not found.');
  }

  private draft(context: TextContext, language: string) {
    return this.prisma.contentDraft.findUnique({ where: this.draftKey(context, language) });
  }

  private draftKey(context: TextContext, language: string) {
    return {
      entityType_entityId_languageCode: {
        entityType: context.entityType,
        entityId: context.entityId,
        languageCode: language,
      },
    };
  }

  /** Staff names for the lists (display name, else email). */
  private async people(ids: (string | null)[]): Promise<Map<string, StudioPersonDto>> {
    const unique = [...new Set(ids.filter((id): id is string => Boolean(id)))];
    if (!unique.length) return new Map();
    const users = await this.prisma.user.findMany({
      where: { id: { in: unique } },
      select: { id: true, displayName: true, email: true },
    });
    return new Map(
      users.map((u) => [u.id, { id: u.id, name: u.displayName ?? u.email ?? 'Staff' }]),
    );
  }

  private record(
    tx: Parameters<AuditService['record']>[1],
    action: string,
    context: TextContext,
    language: string,
    user: AuthUser,
    ctx: RequestContext,
    after?: Prisma.InputJsonObject,
  ) {
    return this.audit.record(
      {
        actor: { id: user.id, roleKey: user.roleKey },
        action,
        entityType: 'ContentText',
        entityId: `${context.entityType}:${context.entityId}:${language}`,
        ...(after ? { after } : {}),
        context: ctx,
      },
      tx,
    );
  }
}
