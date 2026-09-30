import { BadRequestException, type PipeTransform } from '@nestjs/common';
import type { Prisma } from '@kcp/database';
import { CODE_FILE_KEYS } from '@kcp/shared';
import type { CodeFilesDto } from './dto/learning.dto.js';

/** Helpers for content (tracks, modules, lessons, challenges, projects) and code. */

export const FALLBACK_LANGUAGE = 'en';

export type Texts = Record<string, string>;

/** A text in the wanted language, else English, else any. */
export function pick(texts: Prisma.JsonValue, language: string): string {
  const map = (texts ?? {}) as Texts;
  return map[language] ?? map[FALLBACK_LANGUAGE] ?? Object.values(map)[0] ?? '';
}

/** The translation row in the wanted language, else English, else any. */
export function pickTranslation<T extends { languageCode: string }>(rows: T[], language: string) {
  return (
    rows.find((row) => row.languageCode === language) ??
    rows.find((row) => row.languageCode === FALLBACK_LANGUAGE) ??
    rows[0]
  );
}

/**
 * Keeps only the files the challenge or project has (the ones in its starter, which
 * are the editor's tabs), in editor order. A file added by hand, say a Python program
 * sent to an HTML lesson, is dropped, so it can't change how the code is checked.
 */
export function cleanCode(code: CodeFilesDto, starter: unknown): CodeFilesDto {
  const allowed = (starter ?? {}) as Record<string, unknown>;
  const clean: CodeFilesDto = {};
  for (const key of CODE_FILE_KEYS) {
    if (typeof code[key] === 'string' && typeof allowed[key] === 'string') clean[key] = code[key];
  }
  return clean;
}

export const activeContent = { isActive: true } as const;
/** A module students see: in content/, published by staff, and its track switched on. */
export const publishedModule = {
  ...activeContent,
  publishedAt: { not: null },
  track: activeContent,
} as const;
/** A lesson students can open: it is switched on and its module is published. */
export const openLesson = {
  ...activeContent,
  module: publishedModule,
} as const;

/** Content IDs look like "builder-m01-l03-c1". */
export class ContentIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!/^[a-z0-9-]{1,100}$/.test(value)) throw new BadRequestException('Invalid content ID.');
    return value;
  }
}
