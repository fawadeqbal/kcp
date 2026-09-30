import { createHash, createHmac, randomInt } from 'node:crypto';

/**
 * The rules of quizzes: short questions that work on a phone, graded here so the
 * answer never reaches the app. Pure functions, tested on their own.
 */

export type QuizKindValue = 'ORDER' | 'BUG' | 'OUTPUT' | 'CHOICE';

export interface StoredQuiz {
  id: string;
  kind: QuizKindValue;
  /** For ORDER quizzes, in the right order. */
  code: string[];
  optionIds: string[];
  /** BUG: { line } from 1; OUTPUT and CHOICE: { option }. */
  answer: { line?: number; option?: string };
}

export interface QuizAnswer {
  /** ORDER: the line IDs in the order the student put them. */
  order?: string[];
  /** BUG: the number of the line with the mistake (from 1). */
  line?: number;
  /** OUTPUT and CHOICE: the chosen option's ID. */
  option?: string;
}

export interface QuizLine {
  id: string;
  text: string;
}

/**
 * The ID of an ORDER quiz's line. Made with a server secret, so the app (or a
 * student reading the network) can't work out the right order from the IDs.
 */
export function lineId(key: Buffer, quizId: string, index: number): string {
  return createHmac('sha256', key)
    .update(`quiz-line:${quizId}:${index}`)
    .digest('hex')
    .slice(0, 12);
}

export function lineIds(key: Buffer, quiz: Pick<StoredQuiz, 'id' | 'code'>): string[] {
  return quiz.code.map((_, index) => lineId(key, quiz.id, index));
}

/** Lines match when they read the same; indentation counts (Python), trailing spaces don't. */
const sameText = (a: string[], b: string[]) =>
  a.length === b.length && a.every((line, i) => line.trimEnd() === b[i]?.trimEnd());

/**
 * The lines of an ORDER quiz, shuffled so they are never already in order (lines
 * with the same text count as the same line).
 */
export function shuffledLines(
  lines: string[],
  ids: string[],
  random: (max: number) => number = randomInt,
): QuizLine[] {
  const items = lines.map((text, i) => ({ id: ids[i]!, text }));
  for (let attempt = 0; attempt < 20; attempt++) {
    for (let i = items.length - 1; i > 0; i--) {
      const j = random(i + 1);
      [items[i], items[j]] = [items[j]!, items[i]!];
    }
    if (
      !sameText(
        items.map((item) => item.text),
        lines,
      )
    )
      return items;
  }
  // Every shuffle came out in order (tiny quizzes): move the first line to the end.
  const rotated = [...lines.slice(1), lines[0]!].map((text, i) => ({
    id: ids[(i + 1) % ids.length]!,
    text,
  }));
  return rotated;
}

export type Grade = 'correct' | 'wrong' | 'invalid';

/** Grades an answer; "invalid" when it doesn't fit the quiz (a bad request). */
export function grade(quiz: StoredQuiz, answer: QuizAnswer, ids: string[]): Grade {
  switch (quiz.kind) {
    case 'ORDER': {
      const order = answer.order;
      if (!order || order.length !== ids.length || new Set(order).size !== order.length) {
        return 'invalid';
      }
      const indexes = order.map((id) => ids.indexOf(id));
      if (indexes.some((index) => index < 0)) return 'invalid';
      return sameText(
        indexes.map((index) => quiz.code[index]!),
        quiz.code,
      )
        ? 'correct'
        : 'wrong';
    }
    case 'BUG': {
      const line = answer.line;
      if (!Number.isInteger(line) || line! < 1 || line! > quiz.code.length) return 'invalid';
      return line === quiz.answer.line ? 'correct' : 'wrong';
    }
    case 'OUTPUT':
    case 'CHOICE': {
      if (!answer.option || !quiz.optionIds.includes(answer.option)) return 'invalid';
      return answer.option === quiz.answer.option ? 'correct' : 'wrong';
    }
  }
}

/** The right answer, shown after a few wrong tries so the student can learn from it. */
export function rightAnswer(quiz: StoredQuiz, ids: string[]): QuizAnswer {
  switch (quiz.kind) {
    case 'ORDER':
      return { order: ids };
    case 'BUG':
      return { line: quiz.answer.line };
    default:
      return { option: quiz.answer.option };
  }
}

/** Wrong tries before the right answer is shown. */
export const REVEAL_AFTER_WRONG = 2;

/** A repeatable random number generator (mulberry32) from a text seed. */
export function seededRandom(seed: string): (max: number) => number {
  let state = createHash('sha256').update(seed).digest().readUInt32LE(0);
  return (max: number) => {
    state = (state + 0x6d2b79f5) | 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    return Math.floor(value * max);
  };
}

function seededShuffle<T>(items: T[], random: (max: number) => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = random(i + 1);
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

/**
 * Today's practice: `size` quizzes from the candidates (already in the order the
 * student meets them), quizzes not solved yet first. The same seed gives the same
 * pick, so the day's practice doesn't change when the app asks again.
 */
export function pickPractice(
  candidates: { id: string; solved: boolean }[],
  size: number,
  seed: string,
): string[] {
  const random = seededRandom(seed);
  const unsolved = seededShuffle(
    candidates.filter((c) => !c.solved),
    random,
  );
  const solved = seededShuffle(
    candidates.filter((c) => c.solved),
    random,
  );
  return [...unsolved, ...solved].slice(0, size).map((c) => c.id);
}
