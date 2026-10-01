import { cp, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createPrismaClient } from '@kcp/database';
import { config as loadEnv } from 'dotenv';
import { exportStudioTexts } from './export.js';
import { importContent } from './import.js';
import { loadContent } from './load.js';

loadEnv({ path: path.resolve(import.meta.dirname, '../../../.env'), quiet: true });

const CONTENT = path.resolve(import.meta.dirname, '../../../content');
const prisma = createPrismaClient();

type Tracks = Awaited<ReturnType<typeof loadContent>>['tracks'];
/** The Builder track (the tests edit its first lesson). */
const builderOf = (tracks: Tracks) => tracks.find((track) => track.data.id === 'builder')!;

afterAll(async () => {
  // Leave the database with the full content, as `pnpm content:import` would.
  await importContent(prisma, (await loadContent(CONTENT)).tracks);
  await prisma.$disconnect();
});

describe('content import (e2e)', () => {
  it('writes the real content, and running it again changes nothing', async () => {
    const { tracks, issues } = await loadContent(CONTENT);
    expect(issues.filter((i) => i.level === 'error')).toEqual([]);

    const first = await importContent(prisma, tracks);
    const second = await importContent(prisma, tracks);
    expect(second).toEqual({ ...first, deactivated: 0 });
    expect(first.lessons).toBeGreaterThanOrEqual(5);

    const lesson = await prisma.lesson.findUniqueOrThrow({
      where: { id: 'builder-m01-l01' },
      include: {
        translations: true,
        challenges: { include: { translations: true }, orderBy: { sortOrder: 'asc' } },
      },
    });
    expect(lesson.isActive).toBe(true);
    expect(lesson.translations.map((t) => t.languageCode).toSorted()).toEqual(['ar', 'en', 'ur']);
    expect(lesson.challenges[0]?.type).toBe('HTML');
    expect(lesson.challenges[0]?.checks).toEqual(
      builderOf(tracks).modules[0]?.lessons[0]?.challenges[0]?.data.checks,
    );

    // Explorer: block challenges keep their level, and their program is stored as JSON.
    const blocks = await prisma.challenge.findUniqueOrThrow({
      where: { id: 'explorer-m01-l01-c1' },
    });
    expect(blocks.type).toBe('BLOCKS');
    expect(blocks.stage).toMatchObject({ mode: 'maze', toolbox: ['when-run', 'move'] });
    expect(JSON.parse((blocks.starter as { blocks: string }).blocks)).toEqual([
      { when: 'run', do: [] },
    ]);
    expect(await prisma.track.findUniqueOrThrow({ where: { id: 'explorer' } })).toMatchObject({
      ageFrom: 9,
      ageTo: 12,
    });

    expect(first.projects).toBeGreaterThanOrEqual(1);
    const brief = await prisma.projectBrief.findUniqueOrThrow({
      where: { id: 'builder-m01-project' },
      include: { translations: true },
    });
    expect(brief).toMatchObject({ moduleId: 'builder-m01', isActive: true });
    expect(brief.translations.map((t) => t.languageCode).toSorted()).toEqual(['ar', 'en', 'ur']);
    // The solution is never stored: students only ever get the starter.
    expect(JSON.stringify(brief)).not.toContain('nasa.gov');
  });

  it('keeps texts published in the content studio until their file changes', async () => {
    const { tracks } = await loadContent(CONTENT);
    await importContent(prisma, tracks);
    const where = { lessonId_languageCode: { lessonId: 'builder-m01-l01', languageCode: 'ur' } };
    const french = { lessonId_languageCode: { lessonId: 'builder-m01-l01', languageCode: 'fr' } };
    try {
      // Published in the studio: a better Urdu title, and a French translation no file has.
      await prisma.lessonTranslation.update({
        where,
        data: { title: 'Studio title', source: 'STUDIO' },
      });
      await prisma.lessonTranslation.create({
        data: {
          lessonId: 'builder-m01-l01',
          languageCode: 'fr',
          title: 'Ta première balise',
          summary: 'Résumé',
          body: 'Texte',
          source: 'STUDIO',
        },
      });
      const again = await importContent(prisma, tracks);
      expect(again.studioTexts).toBe(1);
      expect((await prisma.lessonTranslation.findUniqueOrThrow({ where })).title).toBe(
        'Studio title',
      );
      expect(await prisma.lessonTranslation.findUnique({ where: french })).not.toBeNull();

      // Someone edits the Urdu file: the file wins, and both texts are in the history.
      const edited = structuredClone(tracks);
      const lesson = builderOf(edited).modules[0]!.lessons[0]!;
      lesson.texts['ur'] = { ...lesson.texts['ur']!, title: 'Edited in the file' };
      await importContent(prisma, edited);
      const live = await prisma.lessonTranslation.findUniqueOrThrow({ where });
      expect(live).toMatchObject({ title: 'Edited in the file', source: 'IMPORT' });
      const history = await prisma.contentVersion.findMany({
        where: { entityType: 'LESSON', entityId: 'builder-m01-l01', languageCode: 'ur' },
        orderBy: { createdAt: 'asc' },
      });
      expect(history.at(-1)).toMatchObject({ action: 'IMPORT' });
      expect((history.at(-1)!.data as { title: string }).title).toBe('Edited in the file');
    } finally {
      await prisma.lessonTranslation.deleteMany({
        where: { lessonId: 'builder-m01-l01', languageCode: 'fr' },
      });
      await importContent(prisma, tracks);
    }
    expect((await prisma.lessonTranslation.findUniqueOrThrow({ where })).title).not.toBe(
      'Edited in the file',
    );
  });

  it('exports studio texts into the files, and the next import only records that', async () => {
    const copy = await mkdtemp(path.join(tmpdir(), 'kcp-content-'));
    await cp(CONTENT, copy, { recursive: true });
    const { tracks } = await loadContent(copy);
    await importContent(prisma, tracks);
    const where = {
      challengeId_languageCode: { challengeId: 'builder-m01-l01-c1', languageCode: 'ar' },
    };
    const quizWhere = { id: 'builder-m01-l01-q1' };
    try {
      const live = await prisma.challengeTranslation.findUniqueOrThrow({ where });
      await prisma.challengeTranslation.update({
        where,
        data: { title: 'عنوان من الاستوديو', source: 'STUDIO' },
      });
      const quiz = await prisma.quiz.findUniqueOrThrow({ where: quizWhere });
      const texts = quiz.texts as Record<string, Record<string, unknown>>;
      await prisma.quiz.update({
        where: quizWhere,
        data: {
          texts: { ...texts, ur: { ...texts['ur'], prompt: 'اسٹوڈیو سے سوال' } },
          textSources: {
            ...(quiz.textSources as object),
            ur: { source: 'STUDIO', importHash: null },
          },
        },
      });

      const summary = await exportStudioTexts(prisma, tracks, copy);
      expect(summary.files).toEqual([
        'builder/m01-first-website/l01-hello-html/challenges/c1.ar.md',
        'builder/m01-first-website/l01-hello-html/quizzes/q1.yaml',
      ]);
      const reloaded = await loadContent(copy);
      expect(reloaded.issues.filter((i) => i.level === 'error')).toEqual([]);
      const challenge = builderOf(reloaded.tracks).modules[0]!.lessons[0]!.challenges[0]!;
      expect(challenge.texts['ar']).toMatchObject({
        title: 'عنوان من الاستوديو',
        hints: live.hints,
        checkLabels: live.checkLabels,
      });
      expect(builderOf(reloaded.tracks).modules[0]!.lessons[0]!.quizzes[0]!.data.prompt['ur']).toBe(
        'اسٹوڈیو سے سوال',
      );

      // The files now say what's live: the import takes them over without a new version.
      const versionsBefore = await prisma.contentVersion.count({
        where: { entityId: 'builder-m01-l01-c1', languageCode: 'ar' },
      });
      await importContent(prisma, reloaded.tracks);
      expect(await prisma.challengeTranslation.findUniqueOrThrow({ where })).toMatchObject({
        title: 'عنوان من الاستوديو',
        source: 'IMPORT',
      });
      expect(
        await prisma.contentVersion.count({
          where: { entityId: 'builder-m01-l01-c1', languageCode: 'ar' },
        }),
      ).toBe(versionsBefore);
      const sources = (await prisma.quiz.findUniqueOrThrow({ where: quizWhere }))
        .textSources as Record<string, { source: string }>;
      expect(sources['ur']?.source).toBe('IMPORT');
    } finally {
      await rm(copy, { recursive: true, force: true });
      await importContent(prisma, tracks);
    }
  });

  it('switches off content that was removed, and back on when it returns', async () => {
    const { tracks } = await loadContent(CONTENT);
    const firstLessonOnly = tracks.map((track) => ({
      ...track,
      modules: track.modules.map((mod) => ({ ...mod, lessons: mod.lessons.slice(0, 1) })),
    }));
    const partial = await importContent(prisma, firstLessonOnly);
    expect(partial.deactivated).toBeGreaterThan(0);
    expect(
      (await prisma.lesson.findUniqueOrThrow({ where: { id: 'builder-m01-l02' } })).isActive,
    ).toBe(false);
    expect(
      (await prisma.challenge.findUniqueOrThrow({ where: { id: 'builder-m01-l02-c1' } })).isActive,
    ).toBe(false);

    await importContent(prisma, tracks);
    expect(
      (await prisma.lesson.findUniqueOrThrow({ where: { id: 'builder-m01-l02' } })).isActive,
    ).toBe(true);
  });

  it('holds new modules for staff to publish (staging, production), and keeps their choice', async () => {
    const { tracks } = await loadContent(CONTENT);
    const real = builderOf(tracks);
    const extra = {
      ...real,
      modules: [
        ...real.modules,
        {
          ...real.modules[0]!,
          slug: 'm99-held',
          data: { ...real.modules[0]!.data, id: 'e2e-held-m99', order: 99 },
          lessons: [],
          project: null,
        },
      ],
    };
    try {
      // Staff unpublished Module 1: importing again doesn't publish it back.
      await prisma.module.update({ where: { id: 'builder-m01' }, data: { publishedAt: null } });
      const others = tracks.filter((track) => track !== real);
      const summary = await importContent(prisma, [extra, ...others], { holdNew: true });
      expect(summary.newModules).toEqual(['e2e-held-m99']);
      const held = await prisma.module.findUniqueOrThrow({ where: { id: 'e2e-held-m99' } });
      expect(held).toMatchObject({ isActive: true, publishedAt: null });
      const first = await prisma.module.findUniqueOrThrow({ where: { id: 'builder-m01' } });
      expect(first.publishedAt).toBeNull();
    } finally {
      await prisma.module.deleteMany({ where: { id: 'e2e-held-m99' } });
      await prisma.module.update({
        where: { id: 'builder-m01' },
        data: { publishedAt: new Date() },
      });
    }
  });
});
