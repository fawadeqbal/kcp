import { createHash } from 'node:crypto';

/*
 * The translatable texts of content, as the content studio and the importer see them.
 * Each kind of content has one shape; a draft, a published version and a file all
 * hold the same object, so they can be compared by hash.
 */

export const CONTENT_ENTITIES = ['LESSON', 'CHALLENGE', 'PROJECT', 'QUIZ'] as const;
export type ContentEntityKey = (typeof CONTENT_ENTITIES)[number];

export type TextMap = Record<string, string>;

export interface LessonText {
  title: string;
  summary: string;
  /** The explainer, in Markdown. */
  body: string;
  videoProvider: string | null;
  videoId: string | null;
}

export interface ChallengeText {
  title: string;
  /** What to do, in Markdown. */
  instructions: string;
  /** Hint texts by key (the keys come from the checks). */
  hints: TextMap;
  /** What each check looks at, by check ID. */
  checkLabels: TextMap;
}

export interface ProjectText {
  title: string;
  summary: string;
  /** The brief, in Markdown. */
  body: string;
  hints: TextMap;
  checkLabels: TextMap;
}

export interface QuizText {
  prompt?: string;
  explanation?: string;
  /** Text options by option ID. */
  options: TextMap;
}

export interface ContentTexts {
  LESSON: LessonText;
  CHALLENGE: ChallengeText;
  PROJECT: ProjectText;
  QUIZ: QuizText;
}

export type ContentText = ContentTexts[ContentEntityKey];

const sortKeys = (item: unknown): unknown => {
  if (Array.isArray(item)) return item.map(sortKeys);
  if (item && typeof item === 'object') {
    return Object.fromEntries(
      Object.keys(item as object)
        .toSorted()
        .filter((key) => (item as Record<string, unknown>)[key] !== undefined)
        .map((key) => [key, sortKeys((item as Record<string, unknown>)[key])]),
    );
  }
  return item;
};

/** JSON with keys sorted at every level, so equal texts give equal strings. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

/** A short, stable fingerprint of a text. */
export function textHash(value: unknown): string {
  return createHash('sha256').update(canonicalJson(value)).digest('hex').slice(0, 32);
}

export interface LiveText {
  source: 'IMPORT' | 'STUDIO';
  importHash: string | null;
  data: unknown;
}

/**
 * What an import does with one text:
 * - `create`: there is none yet;
 * - `keep`: the file hasn't changed since the last import (a newer text published in
 *   the content studio stays live);
 * - `rehash`: the file changed but says the same as the live text (only remember it);
 * - `update`: the file changed: its text goes live.
 */
export function importDecision(
  current: LiveText | null,
  fileData: unknown,
): 'create' | 'keep' | 'rehash' | 'update' {
  if (!current) return 'create';
  const fileHash = textHash(fileData);
  if (current.importHash === fileHash) return 'keep';
  return textHash(current.data) === fileHash ? 'rehash' : 'update';
}

/** The texts of a lesson translation row. */
export const lessonText = (row: {
  title: string;
  summary: string;
  body: string;
  videoProvider: string | null;
  videoId: string | null;
}): LessonText => ({
  title: row.title,
  summary: row.summary,
  body: row.body,
  videoProvider: row.videoProvider,
  videoId: row.videoId,
});

const textMap = (value: unknown): TextMap =>
  Object.fromEntries(
    Object.entries((value ?? {}) as Record<string, unknown>).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  );

/** The texts of a challenge translation row. */
export const challengeText = (row: {
  title: string;
  instructions: string;
  hints: unknown;
  checkLabels: unknown;
}): ChallengeText => ({
  title: row.title,
  instructions: row.instructions,
  hints: textMap(row.hints),
  checkLabels: textMap(row.checkLabels),
});

/** The texts of a project brief translation row. */
export const projectText = (row: {
  title: string;
  summary: string;
  body: string;
  hints: unknown;
  checkLabels: unknown;
}): ProjectText => ({
  title: row.title,
  summary: row.summary,
  body: row.body,
  hints: textMap(row.hints),
  checkLabels: textMap(row.checkLabels),
});

/** One language of a quiz's `texts`. */
export const quizText = (value: unknown): QuizText => {
  const item = (value ?? {}) as Record<string, unknown>;
  return {
    ...(typeof item['prompt'] === 'string' ? { prompt: item['prompt'] } : {}),
    ...(typeof item['explanation'] === 'string' ? { explanation: item['explanation'] } : {}),
    options: textMap(item['options']),
  };
};

/** A quiz's `textSources`: per language, where the live text came from. */
export type QuizTextSources = Record<
  string,
  { source: 'IMPORT' | 'STUDIO'; importHash: string | null }
>;
