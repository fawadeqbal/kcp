import type { PrismaClient } from '@kcp/database';
import type { LoadedTrack } from './load.js';

export interface ImportSummary {
  tracks: number;
  modules: number;
  lessons: number;
  challenges: number;
  projects: number;
  /** Items in the database that are no longer in content/ and were switched off. */
  deactivated: number;
  /** Modules imported for the first time (published, or waiting with --hold-new). */
  newModules: string[];
}

const upper = (type: 'html' | 'css' | 'js' | 'python') =>
  type.toUpperCase() as 'HTML' | 'CSS' | 'JS' | 'PYTHON';

export interface ImportOptions {
  /**
   * New modules wait unpublished until staff publish them in the admin panel
   * (staging and production: the migrate image passes --hold-new). Without it
   * (development, CI), new modules are published straight away. Modules that exist
   * already keep whatever staff chose.
   */
  holdNew?: boolean;
}

/**
 * Writes the content into the database in one transaction. Safe to run again:
 * everything is an upsert, and content that disappeared is switched off, never
 * deleted (students' progress points at it).
 */
export async function importContent(
  prisma: PrismaClient,
  tracks: LoadedTrack[],
  options: ImportOptions = {},
): Promise<ImportSummary> {
  const languages = new Set(
    (await prisma.language.findMany({ select: { code: true } })).map((l) => l.code),
  );
  const unknown = new Set<string>();
  for (const track of tracks) {
    for (const mod of track.modules) {
      for (const code of Object.keys(mod.project?.texts ?? {})) {
        if (!languages.has(code)) unknown.add(code);
      }
      for (const lesson of mod.lessons) {
        for (const code of Object.keys(lesson.texts)) if (!languages.has(code)) unknown.add(code);
        for (const challenge of lesson.challenges) {
          for (const code of Object.keys(challenge.texts))
            if (!languages.has(code)) unknown.add(code);
        }
      }
    }
  }
  if (unknown.size) {
    throw new Error(`Unknown language codes: ${[...unknown].join(', ')} (run pnpm db:seed?)`);
  }

  const summary: ImportSummary = {
    tracks: 0,
    modules: 0,
    lessons: 0,
    challenges: 0,
    projects: 0,
    deactivated: 0,
    newModules: [],
  };
  const seen = {
    tracks: [] as string[],
    modules: [] as string[],
    lessons: [] as string[],
    challenges: [] as string[],
    projects: [] as string[],
  };

  await prisma.$transaction(
    async (tx) => {
      for (const track of tracks) {
        const t = track.data;
        await tx.track.upsert({
          where: { id: t.id },
          create: { id: t.id, titles: t.titles, sortOrder: t.order },
          update: { titles: t.titles, sortOrder: t.order, isActive: true },
        });
        seen.tracks.push(t.id);

        for (const mod of track.modules) {
          const m = mod.data;
          const moduleData = {
            trackId: t.id,
            slug: mod.slug,
            titles: m.titles,
            descriptions: m.descriptions,
            sortOrder: m.order,
            isActive: true,
          };
          const created = await tx.module.findUnique({ where: { id: m.id }, select: { id: true } });
          await tx.module.upsert({
            where: { id: m.id },
            create: { id: m.id, ...moduleData, publishedAt: options.holdNew ? null : new Date() },
            update: moduleData,
          });
          if (!created) summary.newModules.push(m.id);
          seen.modules.push(m.id);

          if (mod.project) {
            const p = mod.project.data;
            const briefData = {
              moduleId: m.id,
              xp: p.xp,
              isPremium: p.isPremium,
              starter: p.starter,
              checks: p.checks,
              isActive: true,
            };
            await tx.projectBrief.upsert({
              where: { id: p.id },
              create: { id: p.id, ...briefData },
              update: briefData,
            });
            seen.projects.push(p.id);
            await tx.projectBriefTranslation.deleteMany({
              where: { briefId: p.id, languageCode: { notIn: Object.keys(mod.project.texts) } },
            });
            for (const [languageCode, text] of Object.entries(mod.project.texts)) {
              await tx.projectBriefTranslation.upsert({
                where: { briefId_languageCode: { briefId: p.id, languageCode } },
                create: { briefId: p.id, languageCode, ...text },
                update: text,
              });
            }
          }

          for (const lesson of mod.lessons) {
            const l = lesson.data;
            const lessonData = {
              moduleId: m.id,
              slug: lesson.slug,
              sortOrder: l.order,
              xp: l.xp,
              isPremium: l.isPremium,
              isActive: true,
            };
            await tx.lesson.upsert({
              where: { id: l.id },
              create: { id: l.id, ...lessonData },
              update: lessonData,
            });
            seen.lessons.push(l.id);
            await tx.lessonTranslation.deleteMany({
              where: { lessonId: l.id, languageCode: { notIn: Object.keys(lesson.texts) } },
            });
            for (const [languageCode, text] of Object.entries(lesson.texts)) {
              const video = l.video?.[languageCode];
              const translation = {
                title: text.title,
                summary: text.summary,
                body: text.body,
                videoProvider: video?.provider ?? null,
                videoId: video?.id ?? null,
              };
              await tx.lessonTranslation.upsert({
                where: { lessonId_languageCode: { lessonId: l.id, languageCode } },
                create: { lessonId: l.id, languageCode, ...translation },
                update: translation,
              });
            }

            for (const challenge of lesson.challenges) {
              const c = challenge.data;
              const challengeData = {
                lessonId: l.id,
                sortOrder: c.order,
                type: upper(c.type),
                xp: c.xp,
                starter: c.starter,
                checks: c.checks,
                isActive: true,
              };
              await tx.challenge.upsert({
                where: { id: c.id },
                create: { id: c.id, ...challengeData },
                update: challengeData,
              });
              seen.challenges.push(c.id);
              await tx.challengeTranslation.deleteMany({
                where: { challengeId: c.id, languageCode: { notIn: Object.keys(challenge.texts) } },
              });
              for (const [languageCode, text] of Object.entries(challenge.texts)) {
                await tx.challengeTranslation.upsert({
                  where: { challengeId_languageCode: { challengeId: c.id, languageCode } },
                  create: { challengeId: c.id, languageCode, ...text },
                  update: text,
                });
              }
            }
          }
        }
      }

      const off = { isActive: false };
      const results = await Promise.all([
        tx.challenge.updateMany({
          where: { id: { notIn: seen.challenges }, isActive: true },
          data: off,
        }),
        tx.projectBrief.updateMany({
          where: { id: { notIn: seen.projects }, isActive: true },
          data: off,
        }),
        tx.lesson.updateMany({ where: { id: { notIn: seen.lessons }, isActive: true }, data: off }),
        tx.module.updateMany({ where: { id: { notIn: seen.modules }, isActive: true }, data: off }),
        tx.track.updateMany({ where: { id: { notIn: seen.tracks }, isActive: true }, data: off }),
      ]);
      summary.deactivated = results.reduce((sum, r) => sum + r.count, 0);
    },
    { timeout: 120_000 },
  );

  summary.tracks = seen.tracks.length;
  summary.modules = seen.modules.length;
  summary.lessons = seen.lessons.length;
  summary.challenges = seen.challenges.length;
  summary.projects = seen.projects.length;
  return summary;
}
