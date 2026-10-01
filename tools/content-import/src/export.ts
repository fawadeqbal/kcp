import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  challengeText,
  lessonText,
  type PrismaClient,
  projectText,
  quizText,
  type QuizTextSources,
} from '@kcp/database';
import { parseDocument, stringify } from 'yaml';
import type { LoadedTrack } from './load.js';

/**
 * Writes texts published in the content studio back into content/, so the files stay
 * the backup and the repository shows every change. After the files are committed, the
 * next import finds they say the same as the live texts and only records that.
 */
export interface ExportSummary {
  /** Files written, relative to the content folder. */
  files: string[];
  /** Studio texts that belong to content no longer in the files (not written). */
  skipped: string[];
}

const frontMatter = (front: Record<string, unknown>, body: string) =>
  `---\n${stringify(front, { lineWidth: 0 }).trimEnd()}\n---\n\n${body.trim()}\n`;

/** Leaves out empty hint and label maps, as the files do. */
const withMaps = (front: Record<string, unknown>, maps: Record<string, Record<string, string>>) => {
  const result = { ...front };
  for (const [key, value] of Object.entries(maps)) {
    if (Object.keys(value).length) result[key] = value;
  }
  return result;
};

export async function exportStudioTexts(
  prisma: PrismaClient,
  tracks: LoadedTrack[],
  root: string,
): Promise<ExportSummary> {
  const summary: ExportSummary = { files: [], skipped: [] };
  const rel = (file: string) => path.relative(root, file).split(path.sep).join('/');
  const write = async (file: string, text: string) => {
    await writeFile(file, text, 'utf8');
    summary.files.push(rel(file));
  };

  const lessons = new Map<string, { dir: string; file: string }>();
  const challenges = new Map<string, string>();
  const projects = new Map<string, string>();
  const quizzes = new Map<string, string>();
  for (const track of tracks) {
    for (const mod of track.modules) {
      if (mod.project) projects.set(mod.project.data.id, mod.project.file);
      for (const lesson of mod.lessons) {
        lessons.set(lesson.data.id, {
          dir: lesson.dir,
          file: path.join(lesson.dir, 'lesson.yaml'),
        });
        for (const challenge of lesson.challenges)
          challenges.set(challenge.data.id, challenge.file);
        for (const quiz of lesson.quizzes) quizzes.set(quiz.data.id, quiz.file);
      }
    }
  }

  for (const row of await prisma.lessonTranslation.findMany({ where: { source: 'STUDIO' } })) {
    const target = lessons.get(row.lessonId);
    if (!target) {
      summary.skipped.push(`${row.lessonId} (${row.languageCode})`);
      continue;
    }
    const text = lessonText(row);
    await write(
      path.join(target.dir, `explain.${row.languageCode}.md`),
      frontMatter({ title: text.title, summary: text.summary }, text.body),
    );
    // The video for this language lives in lesson.yaml.
    const doc = parseDocument(await readFile(target.file, 'utf8'));
    const had = doc.getIn(['video', row.languageCode]) !== undefined;
    if (text.videoProvider && text.videoId) {
      doc.setIn(['video', row.languageCode], { provider: text.videoProvider, id: text.videoId });
      await write(target.file, doc.toString({ lineWidth: 0 }));
    } else if (had) {
      doc.deleteIn(['video', row.languageCode]);
      await write(target.file, doc.toString({ lineWidth: 0 }));
    }
  }

  for (const row of await prisma.challengeTranslation.findMany({ where: { source: 'STUDIO' } })) {
    const file = challenges.get(row.challengeId);
    if (!file) {
      summary.skipped.push(`${row.challengeId} (${row.languageCode})`);
      continue;
    }
    const text = challengeText(row);
    await write(
      file.replace(/\.yaml$/, `.${row.languageCode}.md`),
      frontMatter(
        withMaps({ title: text.title }, { hints: text.hints, checks: text.checkLabels }),
        text.instructions,
      ),
    );
  }

  for (const row of await prisma.projectBriefTranslation.findMany({
    where: { source: 'STUDIO' },
  })) {
    const file = projects.get(row.briefId);
    if (!file) {
      summary.skipped.push(`${row.briefId} (${row.languageCode})`);
      continue;
    }
    const text = projectText(row);
    await write(
      path.join(path.dirname(file), `project.${row.languageCode}.md`),
      frontMatter(
        withMaps(
          { title: text.title, summary: text.summary },
          { hints: text.hints, checks: text.checkLabels },
        ),
        text.body,
      ),
    );
  }

  const quizRows = await prisma.quiz.findMany({
    select: { id: true, texts: true, textSources: true },
  });
  for (const quiz of quizRows) {
    const sources = quiz.textSources as QuizTextSources;
    const languages = Object.entries(sources)
      .filter(([, meta]) => meta.source === 'STUDIO')
      .map(([language]) => language);
    if (!languages.length) continue;
    const file = quizzes.get(quiz.id);
    if (!file) {
      summary.skipped.push(`${quiz.id} (${languages.join(', ')})`);
      continue;
    }
    const doc = parseDocument(await readFile(file, 'utf8'));
    const options = (doc.get('options') ?? null) as { items?: unknown[] } | null;
    for (const language of languages) {
      const text = quizText((quiz.texts as Record<string, unknown>)[language]);
      if (text.prompt) doc.setIn(['prompt', language], text.prompt);
      if (text.explanation) doc.setIn(['explanation', language], text.explanation);
      (options?.items ?? []).forEach((_, index) => {
        const id = doc.getIn(['options', index, 'id']);
        const optionText = typeof id === 'string' ? text.options[id] : undefined;
        if (optionText) doc.setIn(['options', index, 'text', language], optionText);
      });
    }
    await write(file, doc.toString({ lineWidth: 0 }));
  }
  summary.files = [...new Set(summary.files)].toSorted();
  return summary;
}
