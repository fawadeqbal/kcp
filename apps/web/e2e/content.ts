import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { CodeFiles } from '@kcp/checks';
import { parse } from 'yaml';

/** The lessons in content/, read the same way the importer reads them (just less checked). */
const CONTENT = path.resolve(import.meta.dirname, '../../../content');

export interface ContentChallenge {
  id: string;
  starter: CodeFiles;
  solution: CodeFiles;
  /** Hint texts by language, then by key. */
  hints: Record<string, Record<string, string>>;
}

export interface ContentLesson {
  id: string;
  challenges: ContentChallenge[];
}

const readYaml = <T>(file: string) => parse(readFileSync(file, 'utf8')) as T;
const byOrder = <T extends { order: number }>(a: T, b: T) => a.order - b.order;

function readFrontMatter(file: string): { title?: string; hints?: Record<string, string> } {
  const front = /^---\n([\s\S]*?)\n---/.exec(readFileSync(file, 'utf8'))?.[1] ?? '';
  return parse(front) as { title?: string; hints?: Record<string, string> };
}

const readHints = (file: string) => readFrontMatter(file).hints ?? {};

/** The lessons of one module, e.g. "builder/m01-first-website", in order. */
export function loadModule(modulePath: string): ContentLesson[] {
  const moduleDir = path.join(CONTENT, modulePath);
  const lessons = readdirSync(moduleDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const dir = path.join(moduleDir, entry.name);
      const lesson = readYaml<{ id: string; order: number }>(path.join(dir, 'lesson.yaml'));
      const challengeDir = path.join(dir, 'challenges');
      const challenges = readdirSync(challengeDir)
        .filter((name) => name.endsWith('.yaml'))
        .map((name) => {
          const data = readYaml<ContentChallenge & { order: number }>(
            path.join(challengeDir, name),
          );
          const base = name.replace(/\.yaml$/, '');
          const hints: ContentChallenge['hints'] = {};
          for (const file of readdirSync(challengeDir)) {
            const language = new RegExp(`^${base}\\.([a-z]{2})\\.md$`).exec(file)?.[1];
            if (language) hints[language] = readHints(path.join(challengeDir, file));
          }
          return { ...data, hints };
        })
        .toSorted(byOrder);
      return { id: lesson.id, order: lesson.order, challenges };
    })
    .toSorted(byOrder);
  return lessons.map(({ id, challenges }) => ({ id, challenges }));
}

export interface ContentProject {
  id: string;
  xp: number;
  starter: CodeFiles;
  solution: CodeFiles;
  /** The requirement ids, in order. */
  checks: string[];
  /** Hint texts by language, then by key. */
  hints: Record<string, Record<string, string>>;
  /** The title by language. */
  titles: Record<string, string>;
}

/** The project of one module, e.g. "builder/m01-first-website". */
export function loadProject(modulePath: string): ContentProject {
  const moduleDir = path.join(CONTENT, modulePath);
  const data = readYaml<
    Omit<ContentProject, 'checks' | 'hints' | 'titles'> & { checks: { id: string }[] }
  >(path.join(moduleDir, 'project.yaml'));
  const hints: ContentProject['hints'] = {};
  const titles: ContentProject['titles'] = {};
  for (const file of readdirSync(moduleDir)) {
    const language = /^project\.([a-z]{2})\.md$/.exec(file)?.[1];
    if (!language) continue;
    const front = readFrontMatter(path.join(moduleDir, file));
    hints[language] = front.hints ?? {};
    titles[language] = front.title ?? '';
  }
  return { ...data, checks: data.checks.map((check) => check.id), hints, titles };
}
