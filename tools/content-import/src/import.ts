import {
  challengeText,
  type ContentEntityKey,
  importDecision,
  lessonText,
  Prisma,
  type PrismaClient,
  projectText,
  quizText,
  type QuizTextSources,
  textHash,
} from '@kcp/database';
import type { LoadedTrack } from './load.js';
import type { SkillsFile } from './schema.js';

type Tx = Prisma.TransactionClient;

export interface ImportSummary {
  tracks: number;
  modules: number;
  lessons: number;
  challenges: number;
  quizzes: number;
  projects: number;
  /** Items in the database that are no longer in content/ and were switched off. */
  deactivated: number;
  /** Modules imported for the first time (published, or waiting with --hold-new). */
  newModules: string[];
  /**
   * Texts published in the content studio that stayed live because their files didn't
   * change (`pnpm content:export` writes them back into content/).
   */
  studioTexts: number;
}

const upper = (type: 'html' | 'css' | 'js' | 'python' | 'blocks' | 'git') =>
  type.toUpperCase() as 'HTML' | 'CSS' | 'JS' | 'PYTHON' | 'BLOCKS' | 'GIT';

type QuizData = LoadedTrack['modules'][number]['lessons'][number]['quizzes'][number]['data'];

/** The quiz's texts by language: { en: { prompt, explanation, options: { a: … } } }. */
export function quizTexts(quiz: QuizData): Record<string, unknown> {
  const languages = new Set([
    ...Object.keys(quiz.prompt),
    ...Object.keys(quiz.explanation),
    ...(quiz.options ?? []).flatMap((o) => Object.keys(o.text ?? {})),
  ]);
  const texts: Record<string, unknown> = {};
  for (const language of languages) {
    const options: Record<string, string> = {};
    for (const option of quiz.options ?? []) {
      const text = option.text?.[language];
      if (text) options[option.id] = text;
    }
    texts[language] = {
      ...(quiz.prompt[language] ? { prompt: quiz.prompt[language] } : {}),
      ...(quiz.explanation[language] ? { explanation: quiz.explanation[language] } : {}),
      options,
    };
  }
  return texts;
}

/** What the server grades against; never sent to students. */
export function quizAnswer(quiz: QuizData): Record<string, unknown> {
  if (quiz.kind === 'bug') return { line: quiz.bugLine };
  if (quiz.kind === 'output' || quiz.kind === 'choice') return { option: quiz.answer };
  return {};
}

export interface ImportOptions {
  /**
   * New modules wait unpublished until staff publish them in the admin panel
   * (staging and production: the migrate image passes --hold-new). Without it
   * (development, CI), new modules are published straight away. Modules that exist
   * already keep whatever staff chose.
   */
  holdNew?: boolean;
  /** content/skills.yaml: written (and skills no longer listed switched off) when given. */
  skills?: SkillsFile['skills'] | null;
}

/** Keeps a live text in the history. */
function recordVersion(
  tx: Tx,
  entityType: ContentEntityKey,
  entityId: string,
  languageCode: string,
  data: unknown,
) {
  return tx.contentVersion.create({
    data: { entityType, entityId, languageCode, data: data as object, action: 'IMPORT' },
  });
}

/**
 * Writes one translated text the way the content studio expects: a file that didn't
 * change since the last import leaves the live text alone (it may have been published
 * in the studio since); a changed file goes live and into the history.
 */
async function syncText<T>(
  tx: Tx,
  entity: { type: ContentEntityKey; id: string; languageCode: string },
  current: { source: 'IMPORT' | 'STUDIO'; importHash: string | null; data: unknown } | null,
  data: T,
  write: (
    mode: 'create' | 'update' | 'rehash',
    meta: { source: 'IMPORT'; importHash: string },
  ) => Promise<unknown>,
): Promise<'kept-studio' | 'written' | 'same'> {
  const decision = importDecision(current, data);
  if (decision === 'keep') return current?.source === 'STUDIO' ? 'kept-studio' : 'same';
  await write(decision, { source: 'IMPORT', importHash: textHash(data) });
  if (decision === 'rehash') return 'same';
  await recordVersion(tx, entity.type, entity.id, entity.languageCode, data);
  return 'written';
}

/**
 * A quiz's texts after the import: each language from its file, unless the file didn't
 * change and the studio published a newer text; studio-only languages stay.
 */
async function mergeQuizTexts(
  tx: Tx,
  quizId: string,
  fileTexts: Record<string, unknown>,
  count: (result: 'kept-studio' | 'written' | 'same') => void,
) {
  const current = await tx.quiz.findUnique({
    where: { id: quizId },
    select: { texts: true, textSources: true },
  });
  const liveTexts = (current?.texts ?? {}) as Record<string, unknown>;
  const liveSources = (current?.textSources ?? {}) as QuizTextSources;
  const texts: Record<string, unknown> = {};
  const textSources: QuizTextSources = {};
  for (const [language, meta] of Object.entries(liveSources)) {
    if (meta.source === 'STUDIO' && !(language in fileTexts) && liveTexts[language]) {
      texts[language] = liveTexts[language];
      textSources[language] = meta;
      count('kept-studio');
    }
  }
  for (const [language, fileText] of Object.entries(fileTexts)) {
    const data = quizText(fileText);
    const live = liveTexts[language];
    const meta = liveSources[language];
    const result = await syncText(
      tx,
      { type: 'QUIZ', id: quizId, languageCode: language },
      live
        ? {
            source: meta?.source ?? 'IMPORT',
            importHash: meta?.importHash ?? null,
            data: quizText(live),
          }
        : null,
      data,
      async (mode, written) => {
        texts[language] = mode === 'rehash' ? live : data;
        textSources[language] = written;
      },
    );
    if (!(language in texts)) {
      // Kept: the live text stays, with where it came from.
      texts[language] = live;
      textSources[language] = meta ?? { source: 'IMPORT', importHash: null };
    }
    count(result);
  }
  return { texts, textSources };
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
        for (const quiz of lesson.quizzes) {
          for (const code of Object.keys(quizTexts(quiz.data)))
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
    quizzes: 0,
    projects: 0,
    deactivated: 0,
    newModules: [],
    studioTexts: 0,
  };
  const count = (result: 'kept-studio' | 'written' | 'same') => {
    if (result === 'kept-studio') summary.studioTexts += 1;
  };
  const seen = {
    tracks: [] as string[],
    modules: [] as string[],
    lessons: [] as string[],
    challenges: [] as string[],
    quizzes: [] as string[],
    projects: [] as string[],
  };

  await prisma.$transaction(
    async (tx) => {
      for (const track of tracks) {
        const t = track.data;
        await tx.track.upsert({
          where: { id: t.id },
          create: {
            id: t.id,
            titles: t.titles,
            sortOrder: t.order,
            ageFrom: t.ages?.[0] ?? null,
            ageTo: t.ages?.[1] ?? null,
          },
          update: {
            titles: t.titles,
            sortOrder: t.order,
            ageFrom: t.ages?.[0] ?? null,
            ageTo: t.ages?.[1] ?? null,
            isActive: true,
          },
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
              stage: p.stage ?? Prisma.DbNull,
              isActive: true,
            };
            await tx.projectBrief.upsert({
              where: { id: p.id },
              create: { id: p.id, ...briefData },
              update: briefData,
            });
            seen.projects.push(p.id);
            // Only imported texts go when their file goes: studio translations stay.
            await tx.projectBriefTranslation.deleteMany({
              where: {
                briefId: p.id,
                source: 'IMPORT',
                languageCode: { notIn: Object.keys(mod.project.texts) },
              },
            });
            const briefRows = await tx.projectBriefTranslation.findMany({
              where: { briefId: p.id },
            });
            for (const [languageCode, text] of Object.entries(mod.project.texts)) {
              const row = briefRows.find((r) => r.languageCode === languageCode);
              const data = projectText(text);
              count(
                await syncText(
                  tx,
                  { type: 'PROJECT', id: p.id, languageCode },
                  row
                    ? { source: row.source, importHash: row.importHash, data: projectText(row) }
                    : null,
                  data,
                  (mode, meta) =>
                    tx.projectBriefTranslation.upsert({
                      where: { briefId_languageCode: { briefId: p.id, languageCode } },
                      create: { briefId: p.id, languageCode, ...data, ...meta },
                      update: mode === 'rehash' ? meta : { ...data, ...meta },
                    }),
                ),
              );
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
              skills: l.skills,
              isActive: true,
            };
            await tx.lesson.upsert({
              where: { id: l.id },
              create: { id: l.id, ...lessonData },
              update: lessonData,
            });
            seen.lessons.push(l.id);
            await tx.lessonTranslation.deleteMany({
              where: {
                lessonId: l.id,
                source: 'IMPORT',
                languageCode: { notIn: Object.keys(lesson.texts) },
              },
            });
            const lessonRows = await tx.lessonTranslation.findMany({ where: { lessonId: l.id } });
            for (const [languageCode, text] of Object.entries(lesson.texts)) {
              const video = l.video?.[languageCode];
              const translation = lessonText({
                title: text.title,
                summary: text.summary,
                body: text.body,
                videoProvider: video?.provider ?? null,
                videoId: video?.id ?? null,
              });
              const row = lessonRows.find((r) => r.languageCode === languageCode);
              count(
                await syncText(
                  tx,
                  { type: 'LESSON', id: l.id, languageCode },
                  row
                    ? { source: row.source, importHash: row.importHash, data: lessonText(row) }
                    : null,
                  translation,
                  (mode, meta) =>
                    tx.lessonTranslation.upsert({
                      where: { lessonId_languageCode: { lessonId: l.id, languageCode } },
                      create: { lessonId: l.id, languageCode, ...translation, ...meta },
                      update: mode === 'rehash' ? meta : { ...translation, ...meta },
                    }),
                ),
              );
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
                stage: c.stage ?? Prisma.DbNull,
                repo: c.repo ?? Prisma.DbNull,
                isActive: true,
              };
              await tx.challenge.upsert({
                where: { id: c.id },
                create: { id: c.id, ...challengeData },
                update: challengeData,
              });
              seen.challenges.push(c.id);
              await tx.challengeTranslation.deleteMany({
                where: {
                  challengeId: c.id,
                  source: 'IMPORT',
                  languageCode: { notIn: Object.keys(challenge.texts) },
                },
              });
              const challengeRows = await tx.challengeTranslation.findMany({
                where: { challengeId: c.id },
              });
              for (const [languageCode, text] of Object.entries(challenge.texts)) {
                const data = challengeText(text);
                const row = challengeRows.find((r) => r.languageCode === languageCode);
                count(
                  await syncText(
                    tx,
                    { type: 'CHALLENGE', id: c.id, languageCode },
                    row
                      ? { source: row.source, importHash: row.importHash, data: challengeText(row) }
                      : null,
                    data,
                    (mode, meta) =>
                      tx.challengeTranslation.upsert({
                        where: { challengeId_languageCode: { challengeId: c.id, languageCode } },
                        create: { challengeId: c.id, languageCode, ...data, ...meta },
                        update: mode === 'rehash' ? meta : { ...data, ...meta },
                      }),
                  ),
                );
              }
            }

            for (const quiz of lesson.quizzes) {
              const q = quiz.data;
              const { texts, textSources } = await mergeQuizTexts(tx, q.id, quizTexts(q), count);
              const quizData = {
                lessonId: l.id,
                sortOrder: q.order,
                kind: q.kind.toUpperCase() as 'ORDER' | 'BUG' | 'OUTPUT' | 'CHOICE',
                xp: q.xp,
                codeLanguage: q.language ?? null,
                // A quiz edited to drop its code or options loses them here too.
                code: q.code ?? Prisma.DbNull,
                options:
                  q.options?.map((o) => (o.code === undefined ? { id: o.id } : o)) ?? Prisma.DbNull,
                answer: quizAnswer(q) as object,
                texts: texts as object,
                textSources: textSources as object,
                isActive: true,
              };
              await tx.quiz.upsert({
                where: { id: q.id },
                create: { id: q.id, ...quizData },
                update: quizData,
              });
              seen.quizzes.push(q.id);
            }
          }
        }
      }

      if (options.skills) {
        for (const [index, skill] of options.skills.entries()) {
          const data = {
            category: skill.category,
            names: skill.names,
            sortOrder: index,
            isActive: true,
          };
          await tx.skill.upsert({
            where: { key: skill.key },
            create: { key: skill.key, ...data },
            update: data,
          });
        }
        await tx.skill.updateMany({
          where: { key: { notIn: options.skills.map((skill) => skill.key) }, isActive: true },
          data: { isActive: false },
        });
      }

      const off = { isActive: false };
      const results = await Promise.all([
        tx.challenge.updateMany({
          where: { id: { notIn: seen.challenges }, isActive: true },
          data: off,
        }),
        tx.quiz.updateMany({ where: { id: { notIn: seen.quizzes }, isActive: true }, data: off }),
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
  summary.quizzes = seen.quizzes.length;
  summary.projects = seen.projects.length;
  return summary;
}
