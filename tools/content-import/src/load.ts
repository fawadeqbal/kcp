import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { LAUNCH_LANGUAGES } from '@kcp/database';
import { parse as parseYaml } from 'yaml';
import type { z } from 'zod';
import {
  type ChallengeFile,
  challengeFrontMatter,
  challengeSchema,
  explainFrontMatter,
  type LessonFile,
  lessonSchema,
  type ModuleFile,
  moduleSchema,
  type ProjectFile,
  projectFrontMatter,
  type QuizFile,
  quizSchema,
  projectSchema,
  type SkillsFile,
  skillsSchema,
  type TrackFile,
  trackSchema,
} from './schema.js';

export interface Issue {
  level: 'error' | 'warning';
  /** Path relative to the content folder. */
  file: string;
  message: string;
}

export interface LessonText {
  title: string;
  summary: string;
  body: string;
}

export interface ChallengeText {
  title: string;
  instructions: string;
  hints: Record<string, string>;
  /** What each check looks at, by check ID (the "checks" of the front matter). */
  checkLabels: Record<string, string>;
}

export interface LoadedChallenge {
  file: string;
  data: ChallengeFile;
  texts: Record<string, ChallengeText>;
}

export interface LoadedQuiz {
  file: string;
  data: QuizFile;
}

export interface LoadedLesson {
  dir: string;
  slug: string;
  data: LessonFile;
  texts: Record<string, LessonText>;
  challenges: LoadedChallenge[];
  /** Short questions for phones (and the web lesson page); optional. */
  quizzes: LoadedQuiz[];
}

export interface ProjectText {
  title: string;
  summary: string;
  body: string;
  hints: Record<string, string>;
  checkLabels: Record<string, string>;
}

export interface LoadedProject {
  file: string;
  data: ProjectFile;
  texts: Record<string, ProjectText>;
}

export interface LoadedModule {
  dir: string;
  slug: string;
  data: ModuleFile;
  lessons: LoadedLesson[];
  /** The project that ends the module, if it has one yet. */
  project: LoadedProject | null;
}

export interface LoadedTrack {
  dir: string;
  data: TrackFile;
  modules: LoadedModule[];
}

export interface LoadResult {
  tracks: LoadedTrack[];
  /** content/skills.yaml, when there is one. */
  skills: SkillsFile['skills'] | null;
  issues: Issue[];
}

const byOrder = <T extends { data: { order: number } }>(items: T[]) =>
  items.toSorted((a, b) => a.data.order - b.data.order);

async function subfolders(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => entry.name)
    .toSorted();
}

async function files(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .toSorted();
  } catch {
    return [];
  }
}

/** "---\nyaml\n---\nbody" → { front, body } */
export function splitFrontMatter(text: string): { front: unknown; body: string } | null {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text);
  if (!match) return null;
  return { front: parseYaml(match[1] ?? ''), body: (match[2] ?? '').trim() };
}

/** Markdown that has HTML tags outside `code`: the web app leaves raw HTML out. */
export function hasBareHtml(markdown: string): boolean {
  const withoutCode = markdown.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
  return /<\/?[a-z!][^>]*>/i.test(withoutCode);
}

class Loader {
  readonly issues: Issue[] = [];
  private readonly ids = new Map<string, string>();

  constructor(private readonly root: string) {}

  private rel(file: string) {
    return path.relative(this.root, file).split(path.sep).join('/');
  }

  error(file: string, message: string) {
    this.issues.push({ level: 'error', file: this.rel(file), message });
  }

  warn(file: string, message: string) {
    this.issues.push({ level: 'warning', file: this.rel(file), message });
  }

  private async yaml<T>(file: string, schema: z.ZodType<T>): Promise<T | null> {
    let raw: unknown;
    try {
      raw = parseYaml(await readFile(file, 'utf8'));
    } catch (error) {
      this.error(file, `can't read YAML: ${(error as Error).message}`);
      return null;
    }
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        this.error(file, `${issue.path.join('.') || '(file)'}: ${issue.message}`);
      }
      return null;
    }
    return parsed.data;
  }

  private claimId(id: string, file: string, parentId?: string) {
    if (parentId && !id.startsWith(`${parentId}-`)) {
      this.error(file, `id "${id}" must start with "${parentId}-"`);
    }
    const existing = this.ids.get(id);
    if (existing) this.error(file, `id "${id}" is already used by ${existing}`);
    else this.ids.set(id, this.rel(file));
  }

  private checkOrder(items: { data: { order: number } }[], file: string, what: string) {
    const orders = items.map((item) => item.data.order);
    if (new Set(orders).size !== orders.length) this.error(file, `two ${what} have the same order`);
  }

  private checkLanguages(found: string[], file: string, what: string) {
    for (const language of LAUNCH_LANGUAGES) {
      if (!found.includes(language)) {
        this.warn(file, `no ${language} ${what} yet — students see the English one`);
      }
    }
  }

  /** Markdown files named "<base>.<lang>.md" in `dir`, by language. */
  private async markdownByLanguage(dir: string, base: string) {
    const byLanguage = new Map<string, string>();
    for (const name of await files(dir)) {
      const match = new RegExp(`^${base}\\.([a-z]{2})\\.md$`).exec(name);
      if (match?.[1]) byLanguage.set(match[1], path.join(dir, name));
    }
    return byLanguage;
  }

  /** content/skills.yaml, and that every lesson's skills are in it. */
  async loadSkills(tracks: LoadedTrack[]): Promise<SkillsFile['skills'] | null> {
    const file = path.join(this.root, 'skills.yaml');
    const lessons = tracks.flatMap((t) => t.modules.flatMap((m) => m.lessons));
    if (!(await files(this.root)).includes('skills.yaml')) {
      if (lessons.some((l) => l.data.skills.length)) {
        this.error(file, 'lessons name skills, but there is no skills.yaml');
      }
      return null;
    }
    const data = await this.yaml(file, skillsSchema);
    if (!data) return null;
    const known = new Set(data.skills.map((skill) => skill.key));
    for (const lesson of lessons) {
      for (const key of lesson.data.skills) {
        if (!known.has(key)) {
          this.error(
            path.join(lesson.dir, 'lesson.yaml'),
            `unknown skill "${key}" (not in skills.yaml)`,
          );
        }
      }
    }
    for (const skill of data.skills) {
      this.checkLanguages(Object.keys(skill.names), file, `name for skill "${skill.key}"`);
    }
    return data.skills;
  }

  async load(): Promise<LoadedTrack[]> {
    const tracks: LoadedTrack[] = [];
    for (const name of await subfolders(this.root)) {
      const dir = path.join(this.root, name);
      const file = path.join(dir, 'track.yaml');
      const data = await this.yaml(file, trackSchema);
      if (!data) continue;
      this.claimId(data.id, file);
      const modules: LoadedModule[] = [];
      for (const slug of await subfolders(dir)) {
        const loaded = await this.loadModule(path.join(dir, slug), slug, data.id);
        if (loaded) modules.push(loaded);
      }
      this.checkOrder(modules, file, 'modules');
      tracks.push({ dir, data, modules: byOrder(modules) });
    }
    this.checkOrder(tracks, this.root, 'tracks');
    if (tracks.length === 0) this.error(this.root, 'no tracks found (expected <track>/track.yaml)');
    return byOrder(tracks);
  }

  private async loadModule(dir: string, slug: string, trackId: string) {
    const file = path.join(dir, 'module.yaml');
    const data = await this.yaml(file, moduleSchema);
    if (!data) return null;
    this.claimId(data.id, file, trackId);
    const lessons: LoadedLesson[] = [];
    for (const lessonSlug of await subfolders(dir)) {
      const loaded = await this.loadLesson(path.join(dir, lessonSlug), lessonSlug, data.id);
      if (loaded) lessons.push(loaded);
    }
    this.checkOrder(lessons, file, 'lessons');
    const project = (await files(dir)).includes('project.yaml')
      ? await this.loadProject(dir, data.id)
      : null;
    if (!project) this.warn(file, 'this module has no project yet (project.yaml)');
    return { dir, slug, data, lessons: byOrder(lessons), project };
  }

  private async loadProject(dir: string, moduleId: string): Promise<LoadedProject | null> {
    const file = path.join(dir, 'project.yaml');
    const data = await this.yaml(file, projectSchema);
    if (!data) return null;
    this.claimId(data.id, file, moduleId);

    const texts: Record<string, ProjectText> = {};
    for (const [language, mdFile] of await this.markdownByLanguage(dir, 'project')) {
      const split = splitFrontMatter(await readFile(mdFile, 'utf8'));
      const front = split ? projectFrontMatter.safeParse(split.front) : null;
      if (!split || !front?.success) {
        this.error(
          mdFile,
          'needs front matter with "title", "summary" (and "hints") between --- lines',
        );
        continue;
      }
      if (!split.body) this.error(mdFile, 'the brief is empty');
      if (hasBareHtml(split.body)) {
        this.warn(
          mdFile,
          "HTML tags outside `code` don't show on the page — wrap them in backticks",
        );
      }
      const { checks, ...words } = front.data;
      texts[language] = { ...words, checkLabels: checks, body: split.body };
    }
    if (!texts['en']) this.error(file, 'needs project.en.md');
    this.checkLanguages(Object.keys(texts), file, 'project brief');
    this.checkHints(data.checks, texts, file, 'project');
    this.checkLabels(data.checks, texts, file, 'project');
    this.checkFiles(data, file);
    return { file, data, texts };
  }

  /** Every hint a check uses must exist in English; other languages fall back to it. */
  private checkHints(
    checks: { hint?: string }[],
    texts: Record<string, { hints: Record<string, string> }>,
    file: string,
    base: string,
  ) {
    const hintKeys = checks.flatMap((check) => (check.hint ? [check.hint] : []));
    for (const [language, text] of Object.entries(texts)) {
      for (const key of hintKeys) {
        if (text.hints[key]) continue;
        if (language === 'en') this.error(file, `hint "${key}" is missing from ${base}.en.md`);
        else this.warn(file, `hint "${key}" is missing in ${language} — the English hint is shown`);
      }
    }
  }

  /**
   * Every check needs a label in English (the checklist beside the editor), and labels
   * must belong to real checks. Other languages fall back to English.
   */
  private checkLabels(
    checks: { id: string }[],
    texts: Record<string, { checkLabels: Record<string, string> }>,
    file: string,
    base: string,
  ) {
    const ids = new Set(checks.map((check) => check.id));
    for (const [language, text] of Object.entries(texts)) {
      for (const key of Object.keys(text.checkLabels)) {
        if (!ids.has(key))
          this.error(file, `"checks" in ${base}.${language}.md names no check "${key}"`);
      }
      for (const id of ids) {
        if (text.checkLabels[id]) continue;
        if (language === 'en')
          this.error(file, `check "${id}" has no label in ${base}.en.md ("checks")`);
        else this.warn(file, `check "${id}" has no ${language} label — the English one is shown`);
      }
    }
  }

  /** The starter and the solution must have the same files (editor tabs). */
  private checkFiles(
    data: { starter: Record<string, unknown>; solution: Record<string, unknown> },
    file: string,
  ) {
    for (const key of ['html', 'css', 'js', 'py'] as const) {
      if ((data.starter[key] === undefined) !== (data.solution[key] === undefined)) {
        this.error(file, `starter and solution must have the same files (${key})`);
      }
    }
  }

  private async loadLesson(dir: string, slug: string, moduleId: string) {
    const file = path.join(dir, 'lesson.yaml');
    const data = await this.yaml(file, lessonSchema);
    if (!data) return null;
    this.claimId(data.id, file, moduleId);

    const texts: Record<string, LessonText> = {};
    for (const [language, mdFile] of await this.markdownByLanguage(dir, 'explain')) {
      const split = splitFrontMatter(await readFile(mdFile, 'utf8'));
      const front = split ? explainFrontMatter.safeParse(split.front) : null;
      if (!split || !front?.success) {
        this.error(mdFile, 'needs front matter with "title" and "summary" between --- lines');
        continue;
      }
      if (!split.body) this.error(mdFile, 'the explainer is empty');
      if (hasBareHtml(split.body)) {
        this.warn(
          mdFile,
          "HTML tags outside `code` don't show on the page — wrap them in backticks",
        );
      }
      texts[language] = { ...front.data, body: split.body };
    }
    if (!texts['en']) this.error(file, 'needs explain.en.md');
    this.checkLanguages(Object.keys(texts), file, 'explainer');

    const challenges: LoadedChallenge[] = [];
    const challengeDir = path.join(dir, 'challenges');
    for (const name of await files(challengeDir)) {
      if (!name.endsWith('.yaml')) continue;
      const loaded = await this.loadChallenge(challengeDir, name.replace(/\.yaml$/, ''), data.id);
      if (loaded) challenges.push(loaded);
    }
    this.checkOrder(challenges, file, 'challenges');
    if (challenges.length === 0)
      this.error(file, 'a lesson needs at least one challenge (a "try it" step)');

    const quizzes: LoadedQuiz[] = [];
    const quizDir = path.join(dir, 'quizzes');
    for (const name of await files(quizDir)) {
      if (!name.endsWith('.yaml')) continue;
      const quizFile = path.join(quizDir, name);
      const quiz = await this.yaml(quizFile, quizSchema);
      if (!quiz) continue;
      this.claimId(quiz.id, quizFile, data.id);
      this.checkQuizLanguages(quiz, quizFile);
      quizzes.push({ file: quizFile, data: quiz });
    }
    this.checkOrder(quizzes, file, 'quizzes');
    if (quizzes.length === 0)
      this.warn(file, 'no quizzes yet (quizzes/*.yaml): the app has nothing to practise');
    return { dir, slug, data, texts, challenges: byOrder(challenges), quizzes: byOrder(quizzes) };
  }

  /** Every text of a quiz in every launch language (English is required by the schema). */
  private checkQuizLanguages(quiz: QuizFile, file: string) {
    const texts: [string, Record<string, string>][] = [
      ['prompt', quiz.prompt],
      ['explanation', quiz.explanation],
      ...(quiz.options ?? []).flatMap((o): [string, Record<string, string>][] =>
        o.text ? [[`option ${o.id}`, o.text]] : [],
      ),
    ];
    for (const [what, byLanguage] of texts) {
      for (const language of LAUNCH_LANGUAGES) {
        if (!byLanguage[language]) {
          this.warn(file, `no ${language} ${what} yet — students see the English one`);
        }
      }
    }
  }

  private async loadChallenge(dir: string, base: string, lessonId: string) {
    const file = path.join(dir, `${base}.yaml`);
    const data = await this.yaml(file, challengeSchema);
    if (!data) return null;
    this.claimId(data.id, file, lessonId);

    const texts: Record<string, ChallengeText> = {};
    for (const [language, mdFile] of await this.markdownByLanguage(dir, base)) {
      const split = splitFrontMatter(await readFile(mdFile, 'utf8'));
      const front = split ? challengeFrontMatter.safeParse(split.front) : null;
      if (!split || !front?.success) {
        this.error(mdFile, 'needs front matter with "title" (and "hints") between --- lines');
        continue;
      }
      if (!split.body) this.error(mdFile, 'the instructions are empty');
      if (hasBareHtml(split.body)) {
        this.warn(
          mdFile,
          "HTML tags outside `code` don't show on the page — wrap them in backticks",
        );
      }
      texts[language] = {
        title: front.data.title,
        hints: front.data.hints,
        checkLabels: front.data.checks,
        instructions: split.body,
      };
    }
    if (!texts['en']) this.error(file, `needs ${base}.en.md`);
    this.checkLanguages(Object.keys(texts), file, 'instructions');

    this.checkHints(data.checks, texts, file, base);
    this.checkLabels(data.checks, texts, file, base);
    this.checkFiles(data, file);
    return { file, data, texts };
  }
}

/** Reads and validates the whole content folder. Never throws for content problems. */
export async function loadContent(root: string): Promise<LoadResult> {
  const loader = new Loader(path.resolve(root));
  const tracks = await loader.load();
  const skills = await loader.loadSkills(tracks);
  return { tracks, skills, issues: loader.issues };
}
