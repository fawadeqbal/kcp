import {
  type BlockKind,
  CONDITIONS,
  type Condition,
  DIRECTIONS,
  type Direction,
  EVENTS,
  MAP_CHARS,
  PROGRAM_LIMITS,
  type Program,
  type Script,
  type StageEvent,
  type StageLevel,
  type Statement,
} from './types.js';

/*
 * Reading programs and levels safely: everything here treats its input as untrusted
 * (a student's saved code, or a request typed by hand).
 */

const isObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const isInt = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;

const oneOf = <T extends string>(list: readonly T[], value: unknown): value is T =>
  typeof value === 'string' && (list as readonly string[]).includes(value);

class Invalid extends Error {}

function statements(value: unknown, depth: number, count: { blocks: number }): Statement[] {
  if (!Array.isArray(value)) throw new Invalid('a list of blocks');
  if (depth > PROGRAM_LIMITS.depth) throw new Invalid('blocks nested too deep');
  return value.map((item) => statement(item, depth, count));
}

function statement(value: unknown, depth: number, count: { blocks: number }): Statement {
  count.blocks += 1;
  if (count.blocks > PROGRAM_LIMITS.blocks) throw new Invalid('too many blocks');
  if (value === 'collect' || value === 'star') return value;
  if (!isObject(value)) throw new Invalid('an unknown block');
  const keys = Object.keys(value);
  const only = (...allowed: string[]) => {
    if (keys.some((key) => !allowed.includes(key))) throw new Invalid('an unknown block field');
  };
  if ('move' in value) {
    only('move');
    if (!oneOf(DIRECTIONS, value['move'])) throw new Invalid('a direction');
    return { move: value['move'] };
  }
  if ('say' in value) {
    only('say');
    const text = value['say'];
    if (typeof text !== 'string' || text.length > PROGRAM_LIMITS.sayLength) {
      throw new Invalid('a short text to say');
    }
    return { say: text };
  }
  if ('repeat' in value) {
    only('repeat', 'do');
    if (!isInt(value['repeat'], 0, PROGRAM_LIMITS.repeatMax)) throw new Invalid('a repeat count');
    return { repeat: value['repeat'], do: statements(value['do'], depth + 1, count) };
  }
  if ('until' in value) {
    only('until', 'do');
    if (value['until'] !== 'goal') throw new Invalid('an "until" condition');
    return { until: 'goal', do: statements(value['do'], depth + 1, count) };
  }
  if ('if' in value) {
    only('if', 'do', 'else');
    if (!oneOf(CONDITIONS, value['if'])) throw new Invalid('an "if" condition');
    const result: Statement = { if: value['if'], do: statements(value['do'], depth + 1, count) };
    if (value['else'] !== undefined) result.else = statements(value['else'], depth + 1, count);
    return result;
  }
  if ('score' in value) {
    only('score');
    const max = PROGRAM_LIMITS.scoreMax;
    if (!isInt(value['score'], -max, max)) throw new Invalid('a score change');
    return { score: value['score'] };
  }
  throw new Invalid('an unknown block');
}

function script(value: unknown, count: { blocks: number }): Script {
  if (!isObject(value)) throw new Invalid('a script');
  if (Object.keys(value).some((key) => !['when', 'do', 'at'].includes(key))) {
    throw new Invalid('an unknown script field');
  }
  const result: Script = { do: [] };
  if (value['when'] !== undefined) {
    if (!oneOf(EVENTS, value['when'])) throw new Invalid('an event');
    result.when = value['when'];
    count.blocks += 1;
  }
  result.do = statements(value['do'], 1, count);
  const at = value['at'];
  if (at !== undefined) {
    if (!Array.isArray(at) || at.length !== 2 || !at.every((n) => isInt(n, -100_000, 100_000))) {
      throw new Invalid('a workspace position');
    }
    result.at = [at[0] as number, at[1] as number];
  }
  return result;
}

/** A program from untrusted data, or throws with what's wrong. */
export function toProgram(value: unknown): Program {
  if (!Array.isArray(value)) throw new Invalid('a list of scripts');
  if (value.length > PROGRAM_LIMITS.scripts) throw new Invalid('too many scripts');
  const count = { blocks: 0 };
  return value.map((item) => script(item, count));
}

/** The program in a student's `blocks` file (JSON), or null when it isn't one. */
export function parseProgram(text: string | undefined): Program | null {
  if (typeof text !== 'string') return null;
  try {
    return toProgram(JSON.parse(text));
  } catch {
    return null;
  }
}

/** Why a program (from a content file) isn't valid, or null. */
export function programProblem(value: unknown): string | null {
  try {
    toProgram(value);
    return null;
  } catch (error) {
    return error instanceof Invalid ? `expected ${error.message}` : String(error);
  }
}

/** The `blocks` file for a program. */
export const programText = (program: Program): string => JSON.stringify(program);

/** The block a statement is. */
export function kindOf(item: Statement): BlockKind {
  if (item === 'collect' || item === 'star') return item;
  if ('move' in item) return 'move';
  if ('say' in item) return 'say';
  if ('repeat' in item) return 'repeat';
  if ('until' in item) return 'until-goal';
  if ('if' in item) return item.else ? 'if-else' : 'if';
  return 'score';
}

export function hatKind(event: StageEvent): BlockKind {
  if (event === 'run') return 'when-run';
  return event === 'star' ? 'when-star' : 'when-key';
}

/** Blocks inside a statement (for nested blocks). */
export function childLists(item: Statement): Statement[][] {
  if (typeof item === 'string') return [];
  if ('do' in item) return 'else' in item && item.else ? [item.do, item.else] : [item.do];
  return [];
}

/**
 * Every block in the scripts that run (loose stacks don't count), hats included:
 * what "uses" and "at most N blocks" look at.
 */
export function runningBlocks(program: Program): BlockKind[] {
  const kinds: BlockKind[] = [];
  const walk = (list: Statement[]) => {
    for (const item of list) {
      kinds.push(kindOf(item));
      for (const child of childLists(item)) walk(child);
    }
  };
  for (const entry of program) {
    if (!entry.when) continue;
    kinds.push(hatKind(entry.when));
    walk(entry.do);
  }
  return kinds;
}

export const keyOf = (event: StageEvent): Direction | null =>
  event.startsWith('key-') ? (event.slice(4) as Direction) : null;

export const isCondition = (value: unknown): value is Condition => oneOf(CONDITIONS, value);

// ── Levels ─────────────────────────────────────────────────────────────────

export interface Cell {
  x: number;
  y: number;
}

/** A level's map, read once. */
export interface Grid {
  width: number;
  height: number;
  walls: Set<string>;
  start: Cell;
  goal: Cell | null;
  gems: Cell[];
  star: Cell | null;
}

export const cellKey = (x: number, y: number) => `${x},${y}`;

/** The level's map, or throws with what's wrong (content-import reports it). */
export function readGrid(level: StageLevel): Grid {
  const rows = level.map;
  if (!Array.isArray(rows) || rows.length < 2 || rows.length > 12) {
    throw new Error('the map needs 2 to 12 rows');
  }
  const width = rows[0]?.length ?? 0;
  if (width < 2 || width > 16) throw new Error('map rows need 2 to 16 characters');
  const grid: Grid = {
    width,
    height: rows.length,
    walls: new Set(),
    start: { x: -1, y: -1 },
    goal: null,
    gems: [],
    star: null,
  };
  const known = new Set<string>(Object.values(MAP_CHARS));
  rows.forEach((row, y) => {
    if (typeof row !== 'string' || row.length !== width) {
      throw new Error('every map row must have the same length');
    }
    [...row].forEach((char, x) => {
      if (!known.has(char)) throw new Error(`unknown map character "${char}"`);
      if (char === MAP_CHARS.wall) grid.walls.add(cellKey(x, y));
      if (char === MAP_CHARS.start) {
        if (grid.start.x >= 0) throw new Error('the map has more than one start (S)');
        grid.start = { x, y };
      }
      if (char === MAP_CHARS.goal) {
        if (grid.goal) throw new Error('the map has more than one flag (G)');
        grid.goal = { x, y };
      }
      if (char === MAP_CHARS.gem) grid.gems.push({ x, y });
      if (char === MAP_CHARS.star) {
        if (grid.star) throw new Error('the map has more than one star (T)');
        grid.star = { x, y };
      }
    });
  });
  if (grid.start.x < 0) throw new Error('the map needs a start (S)');
  if (level.mode === 'maze' && !grid.goal) throw new Error('a maze needs a flag (G)');
  if (level.mode === 'game' && !grid.star) throw new Error('a game needs a star (T)');
  return grid;
}
