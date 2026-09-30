import path from 'node:path';
import { createPrismaClient } from '@kcp/database';
import { config as loadEnv } from 'dotenv';
import { importContent } from './import.js';
import { loadContent } from './load.js';

loadEnv({ path: path.resolve(import.meta.dirname, '../../../.env'), quiet: true });

const CONTENT = path.resolve(import.meta.dirname, '../../../content');
const prisma = createPrismaClient();

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
      tracks[0]?.modules[0]?.lessons[0]?.challenges[0]?.data.checks,
    );

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
    const real = tracks[0]!;
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
      const summary = await importContent(prisma, [extra, ...tracks.slice(1)], { holdNew: true });
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
