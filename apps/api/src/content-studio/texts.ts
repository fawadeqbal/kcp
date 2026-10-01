import { BadRequestException } from '@nestjs/common';
import {
  challengeText,
  type ContentEntityKey,
  type ContentText,
  lessonText,
  type Prisma,
  projectText,
  quizText,
  type QuizTextSources,
  type TextMap,
} from '@kcp/database';
import { describeCheck } from '../content-admin/content-admin.service.js';
import type { PrismaService } from '../database/prisma.service.js';
import { pick } from '../learning/content.js';

/*
 * The translatable texts of each kind of content: where they live, what a translator
 * must fill in, how a draft is checked, and how a reviewer's publish writes them to the
 * tables students read.
 */

type Tx = Prisma.TransactionClient;
type Json = Record<string, unknown>;

export interface TextContext {
  entityType: ContentEntityKey;
  entityId: string;
  trackId: string;
  moduleId: string;
  lessonId: string | null;
  /** The text's name in English, for lists ("Lesson 2: Headings"). */
  title: string;
  isActive: boolean;
  /** Hint keys the checks use (challenges and projects). */
  hintKeys: string[];
  /** Checks, each with a readable description, whose labels need translating. */
  checks: { id: string; description: string }[];
  /** Quiz options that are text (others are code and aren't translated). */
  options: { id: string }[];
  /** The live text in each language. */
  live: Map<string, ContentText>;
  /** Quizzes: where each language's live text came from. */
  quizSources?: QuizTextSources;
}

const checksOf = (value: unknown) =>
  (Array.isArray(value) ? (value as Json[]) : []).map((check) => ({
    id: String(check['id'] ?? ''),
    hint: typeof check['hint'] === 'string' ? check['hint'] : null,
    description: describeCheck(check),
  }));

/** Loads a text's context, or null when there is no such content. */
export async function loadContext(
  prisma: PrismaService,
  entityType: ContentEntityKey,
  entityId: string,
): Promise<TextContext | null> {
  switch (entityType) {
    case 'LESSON': {
      const lesson = await prisma.lesson.findUnique({
        where: { id: entityId },
        include: { translations: true, module: { select: { trackId: true } } },
      });
      if (!lesson) return null;
      const english = lesson.translations.find((t) => t.languageCode === 'en');
      return {
        entityType,
        entityId,
        trackId: lesson.module.trackId,
        moduleId: lesson.moduleId,
        lessonId: lesson.id,
        title: english?.title ?? lesson.id,
        isActive: lesson.isActive,
        hintKeys: [],
        checks: [],
        options: [],
        live: new Map(lesson.translations.map((t) => [t.languageCode, lessonText(t)])),
      };
    }
    case 'CHALLENGE': {
      const challenge = await prisma.challenge.findUnique({
        where: { id: entityId },
        include: {
          translations: true,
          lesson: { select: { id: true, moduleId: true, module: { select: { trackId: true } } } },
        },
      });
      if (!challenge) return null;
      const checks = checksOf(challenge.checks);
      const english = challenge.translations.find((t) => t.languageCode === 'en');
      return {
        entityType,
        entityId,
        trackId: challenge.lesson.module.trackId,
        moduleId: challenge.lesson.moduleId,
        lessonId: challenge.lesson.id,
        title: english?.title ?? challenge.id,
        isActive: challenge.isActive,
        hintKeys: [...new Set(checks.flatMap((c) => (c.hint ? [c.hint] : [])))],
        checks: checks.map(({ id, description }) => ({ id, description })),
        options: [],
        live: new Map(challenge.translations.map((t) => [t.languageCode, challengeText(t)])),
      };
    }
    case 'PROJECT': {
      const brief = await prisma.projectBrief.findUnique({
        where: { id: entityId },
        include: { translations: true, module: { select: { trackId: true } } },
      });
      if (!brief) return null;
      const checks = checksOf(brief.checks);
      const english = brief.translations.find((t) => t.languageCode === 'en');
      return {
        entityType,
        entityId,
        trackId: brief.module.trackId,
        moduleId: brief.moduleId,
        lessonId: null,
        title: english?.title ?? brief.id,
        isActive: brief.isActive,
        hintKeys: [...new Set(checks.flatMap((c) => (c.hint ? [c.hint] : [])))],
        checks: checks.map(({ id, description }) => ({ id, description })),
        options: [],
        live: new Map(brief.translations.map((t) => [t.languageCode, projectText(t)])),
      };
    }
    case 'QUIZ': {
      const quiz = await prisma.quiz.findUnique({
        where: { id: entityId },
        include: { lesson: { select: { moduleId: true, module: { select: { trackId: true } } } } },
      });
      if (!quiz) return null;
      const texts = (quiz.texts ?? {}) as Json;
      const english = quizText(texts['en']);
      return {
        entityType,
        entityId,
        trackId: quiz.lesson.module.trackId,
        moduleId: quiz.lesson.moduleId,
        lessonId: quiz.lessonId,
        title: english.prompt ?? quiz.id,
        isActive: quiz.isActive,
        hintKeys: [],
        checks: [],
        // Options shown as code aren't translated; text options are.
        options: (Array.isArray(quiz.options) ? (quiz.options as Json[]) : [])
          .filter((option) => option['code'] === undefined)
          .map((option) => ({ id: String(option['id']) })),
        live: new Map(
          Object.entries(texts).map(([language, value]) => [language, quizText(value)]),
        ),
        quizSources: (quiz.textSources ?? {}) as QuizTextSources,
      };
    }
  }
}

const LIMITS = { title: 150, summary: 400, body: 40_000, hint: 500, label: 200, option: 200 };

function text(data: Json, key: string, max: number, required = true): string | undefined {
  const value = data[key];
  if (value === undefined || value === null || (typeof value === 'string' && !value.trim())) {
    if (required) throw invalid(`"${key}" is needed.`);
    return undefined;
  }
  if (typeof value !== 'string') throw invalid(`"${key}" must be text.`);
  if (value.length > max) throw invalid(`"${key}" is longer than ${max} characters.`);
  return value.trim();
}

function textMap(data: Json, key: string, allowed: string[], max: number): TextMap {
  const value = data[key] ?? {};
  if (typeof value !== 'object' || Array.isArray(value) || value === null) {
    throw invalid(`"${key}" must be a list of texts by key.`);
  }
  const result: TextMap = {};
  for (const [name, item] of Object.entries(value as Json)) {
    if (!allowed.includes(name)) throw invalid(`"${key}" has no "${name}" to translate.`);
    if (item === undefined || item === null || item === '') continue;
    if (typeof item !== 'string') throw invalid(`"${key}.${name}" must be text.`);
    if (item.length > max) throw invalid(`"${key}.${name}" is longer than ${max} characters.`);
    if (item.trim()) result[name] = item.trim();
  }
  return result;
}

function invalid(message: string) {
  return new BadRequestException({ error: 'INVALID_TEXT', message });
}

/** A draft's texts, checked and trimmed. Throws 400 with a readable message. */
export function cleanText(context: TextContext, raw: unknown): ContentText {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw invalid('No texts sent.');
  const data = raw as Json;
  switch (context.entityType) {
    case 'LESSON': {
      const provider = text(data, 'videoProvider', 20, false) ?? null;
      const videoId = text(data, 'videoId', 64, false) ?? null;
      if (Boolean(provider) !== Boolean(videoId)) {
        throw invalid('A video needs both its provider and its ID.');
      }
      if (provider && !['youtube', 'cloudflare'].includes(provider)) {
        throw invalid('The video provider is youtube or cloudflare.');
      }
      if (videoId && !/^[\w-]+$/.test(videoId)) throw invalid('That video ID looks wrong.');
      return {
        title: text(data, 'title', LIMITS.title)!,
        summary: text(data, 'summary', LIMITS.summary)!,
        body: text(data, 'body', LIMITS.body)!,
        videoProvider: provider,
        videoId,
      };
    }
    case 'CHALLENGE':
      return {
        title: text(data, 'title', LIMITS.title)!,
        instructions: text(data, 'instructions', LIMITS.body)!,
        hints: textMap(data, 'hints', context.hintKeys, LIMITS.hint),
        checkLabels: textMap(
          data,
          'checkLabels',
          context.checks.map((c) => c.id),
          LIMITS.label,
        ),
      };
    case 'PROJECT':
      return {
        title: text(data, 'title', LIMITS.title)!,
        summary: text(data, 'summary', LIMITS.summary)!,
        body: text(data, 'body', LIMITS.body)!,
        hints: textMap(data, 'hints', context.hintKeys, LIMITS.hint),
        checkLabels: textMap(
          data,
          'checkLabels',
          context.checks.map((c) => c.id),
          LIMITS.label,
        ),
      };
    case 'QUIZ': {
      const explanation = text(data, 'explanation', 1000, false);
      return {
        prompt: text(data, 'prompt', 500)!,
        ...(explanation ? { explanation } : {}),
        options: textMap(
          data,
          'options',
          context.options.map((o) => o.id),
          LIMITS.option,
        ),
      };
    }
  }
}

/** Makes a published text live: the table students read, marked as the studio's. */
export async function writeLive(
  tx: Tx,
  context: TextContext,
  languageCode: string,
  data: ContentText,
): Promise<void> {
  const id = context.entityId;
  switch (context.entityType) {
    case 'LESSON': {
      const value = data as ReturnType<typeof lessonText>;
      await tx.lessonTranslation.upsert({
        where: { lessonId_languageCode: { lessonId: id, languageCode } },
        create: { lessonId: id, languageCode, ...value, source: 'STUDIO' },
        update: { ...value, source: 'STUDIO' },
      });
      return;
    }
    case 'CHALLENGE': {
      const value = data as ReturnType<typeof challengeText>;
      await tx.challengeTranslation.upsert({
        where: { challengeId_languageCode: { challengeId: id, languageCode } },
        create: { challengeId: id, languageCode, ...value, source: 'STUDIO' },
        update: { ...value, source: 'STUDIO' },
      });
      return;
    }
    case 'PROJECT': {
      const value = data as ReturnType<typeof projectText>;
      await tx.projectBriefTranslation.upsert({
        where: { briefId_languageCode: { briefId: id, languageCode } },
        create: { briefId: id, languageCode, ...value, source: 'STUDIO' },
        update: { ...value, source: 'STUDIO' },
      });
      return;
    }
    case 'QUIZ': {
      // Read inside the transaction, so two publishes of one quiz can't lose a language.
      const quiz = await tx.quiz.findUniqueOrThrow({
        where: { id },
        select: { texts: true, textSources: true },
      });
      const sources = (quiz.textSources ?? {}) as QuizTextSources;
      await tx.quiz.update({
        where: { id },
        data: {
          texts: { ...(quiz.texts as Json), [languageCode]: data } as object,
          textSources: {
            ...sources,
            [languageCode]: {
              source: 'STUDIO',
              importHash: sources[languageCode]?.importHash ?? null,
            },
          } as object,
        },
      });
      return;
    }
  }
}

/** The name of a module in English, for lists. */
export const moduleTitle = (titles: Prisma.JsonValue) => pick(titles, 'en');
