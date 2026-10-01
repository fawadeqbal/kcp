/**
 * The Explorer track's stage: a small grid world where Bit (our robot) follows a
 * program made of blocks. Programs are data, never JavaScript: the same interpreter
 * animates them in the browser and checks them on the server, so no student code
 * runs anywhere. "Show the code" shows the JavaScript a program stands for.
 */

export const DIRECTIONS = ['up', 'down', 'left', 'right'] as const;
export type Direction = (typeof DIRECTIONS)[number];

/** maze: reach the flag (and collect gems). game: arrow keys move Bit to catch stars. */
export const STAGE_MODES = ['maze', 'game'] as const;
export type StageMode = (typeof STAGE_MODES)[number];

export const STAGE_THEMES = ['meadow', 'space', 'sea'] as const;
export type StageTheme = (typeof STAGE_THEMES)[number];

/** The blocks a student can use, as named in content files and checks. */
export const BLOCK_KINDS = [
  'when-run',
  'when-key',
  'when-star',
  'move',
  'collect',
  'say',
  'repeat',
  'until-goal',
  'if',
  'if-else',
  'score',
  'star',
] as const;
export type BlockKind = (typeof BLOCK_KINDS)[number];

/** Map characters: see StageLevel.map. */
export const MAP_CHARS = {
  wall: '#',
  floor: '.',
  start: 'S',
  goal: 'G',
  gem: '*',
  star: 'T',
} as const;

/** A level (Challenge.stage, ProjectBrief.stage), written in the content files. */
export interface StageLevel {
  mode: StageMode;
  /**
   * Rows, top to bottom, all the same length: "#" wall, "." floor, "S" where Bit
   * starts, "G" the flag (maze), "*" a gem, "T" the star (game).
   */
  map: string[];
  /** The blocks in the toolbox, in order. */
  toolbox: BlockKind[];
  theme?: StageTheme;
  /** Game: how long a round lasts in the player, in seconds (checks ignore it). */
  seconds?: number;
}

/** Conditions of "if" blocks. */
export const CONDITIONS = ['gem', 'path-up', 'path-down', 'path-left', 'path-right'] as const;
export type Condition = (typeof CONDITIONS)[number];

/** What starts a script (its hat block). */
export const EVENTS = ['run', 'key-up', 'key-down', 'key-left', 'key-right', 'star'] as const;
export type StageEvent = (typeof EVENTS)[number];

/**
 * One block in a script. Written the same way in content files (YAML) and stored as
 * JSON in the student's code (`blocks`).
 */
export type Statement =
  | 'collect'
  | 'star'
  | { move: Direction }
  | { say: string }
  | { repeat: number; do: Statement[] }
  | { until: 'goal'; do: Statement[] }
  | { if: Condition; do: Statement[]; else?: Statement[] }
  | { score: number };

/**
 * A stack of blocks. With `when` it runs (on ▶ Run, an arrow key, or touching the
 * star); without, it is a loose stack that stays on the workspace but never runs.
 * `at` is where it sits on the workspace.
 */
export interface Script {
  when?: StageEvent;
  do: Statement[];
  at?: [number, number];
}

export type Program = Script[];

/** Limits on a stored program (the API refuses bigger ones). */
export const PROGRAM_LIMITS = {
  scripts: 40,
  blocks: 300,
  depth: 8,
  sayLength: 40,
  repeatMax: 20,
  scoreMax: 100,
} as const;
