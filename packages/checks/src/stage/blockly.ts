import { PROGRAM_LIMITS } from './types.js';
import type {
  BlockKind,
  Condition,
  Direction,
  Program,
  Script,
  StageEvent,
  Statement,
} from './types.js';

/*
 * The Explorer blocks for Blockly, without importing Blockly: block definitions (JSON,
 * with the student's language), the toolbox, and conversion between programs and
 * Blockly's saved workspaces. The web app and the mobile app's bundle both use these.
 */

/** Block texts in the student's language. "%1" marks where a field or input goes. */
export interface BlockMessages {
  whenRun: string;
  /** "when %1 key pressed" */
  whenKey: string;
  whenStar: string;
  /** "move %1" */
  move: string;
  up: string;
  down: string;
  left: string;
  right: string;
  /** Arrow keys, for "when %1 key pressed". */
  keyUp: string;
  keyDown: string;
  keyLeft: string;
  keyRight: string;
  collect: string;
  /** "say %1" */
  say: string;
  sayDefault: string;
  /** "repeat %1 times" */
  repeat: string;
  untilGoal: string;
  /** "if %1" */
  if: string;
  else: string;
  gem: string;
  pathUp: string;
  pathDown: string;
  pathLeft: string;
  pathRight: string;
  /** "change score by %1" */
  score: string;
  star: string;
}

export const BLOCK_TYPES: Record<BlockKind, string> = {
  'when-run': 'kcp_when_run',
  'when-key': 'kcp_when_key',
  'when-star': 'kcp_when_star',
  move: 'kcp_move',
  collect: 'kcp_collect',
  say: 'kcp_say',
  repeat: 'kcp_repeat',
  'until-goal': 'kcp_until_goal',
  if: 'kcp_if',
  'if-else': 'kcp_if_else',
  score: 'kcp_score',
  star: 'kcp_star',
};

/** Block colours: dark enough for white text (4.5:1). */
export const BLOCK_COLOURS = {
  events: '#b3541e',
  motion: '#2563a8',
  looks: '#7b4bb5',
  control: '#1f7a5c',
  score: '#b0306a',
} as const;

type Json = Record<string, unknown>;

const statementBlock = { previousStatement: null, nextStatement: null };
const body = (name: string) => ({ type: 'input_statement', name });

/** Definitions for Blockly.common.defineBlocksWithJsonArray. */
export function blockDefinitions(m: BlockMessages): Json[] {
  const directions = [
    [m.up, 'up'],
    [m.down, 'down'],
    [m.left, 'left'],
    [m.right, 'right'],
  ];
  const conditions = [
    [m.gem, 'gem'],
    [m.pathUp, 'path-up'],
    [m.pathDown, 'path-down'],
    [m.pathLeft, 'path-left'],
    [m.pathRight, 'path-right'],
  ];
  const condition = { type: 'field_dropdown', name: 'COND', options: conditions };
  return [
    {
      type: BLOCK_TYPES['when-run'],
      message0: m.whenRun,
      nextStatement: null,
      colour: BLOCK_COLOURS.events,
    },
    {
      type: BLOCK_TYPES['when-key'],
      message0: m.whenKey,
      args0: [
        {
          type: 'field_dropdown',
          name: 'KEY',
          options: [
            [m.keyUp, 'up'],
            [m.keyDown, 'down'],
            [m.keyLeft, 'left'],
            [m.keyRight, 'right'],
          ],
        },
      ],
      nextStatement: null,
      colour: BLOCK_COLOURS.events,
    },
    {
      type: BLOCK_TYPES['when-star'],
      message0: m.whenStar,
      nextStatement: null,
      colour: BLOCK_COLOURS.events,
    },
    {
      type: BLOCK_TYPES.move,
      message0: m.move,
      args0: [{ type: 'field_dropdown', name: 'DIR', options: directions }],
      ...statementBlock,
      colour: BLOCK_COLOURS.motion,
    },
    {
      type: BLOCK_TYPES.collect,
      message0: m.collect,
      ...statementBlock,
      colour: BLOCK_COLOURS.motion,
    },
    {
      type: BLOCK_TYPES.say,
      message0: m.say,
      args0: [{ type: 'field_input', name: 'TEXT', text: m.sayDefault }],
      ...statementBlock,
      colour: BLOCK_COLOURS.looks,
    },
    {
      type: BLOCK_TYPES.repeat,
      message0: m.repeat,
      args0: [
        {
          type: 'field_number',
          name: 'TIMES',
          value: 3,
          min: 0,
          max: PROGRAM_LIMITS.repeatMax,
          precision: 1,
        },
      ],
      message1: '%1',
      args1: [body('DO')],
      ...statementBlock,
      colour: BLOCK_COLOURS.control,
    },
    {
      type: BLOCK_TYPES['until-goal'],
      message0: m.untilGoal,
      message1: '%1',
      args1: [body('DO')],
      ...statementBlock,
      colour: BLOCK_COLOURS.control,
    },
    {
      type: BLOCK_TYPES.if,
      message0: m.if,
      args0: [condition],
      message1: '%1',
      args1: [body('DO')],
      ...statementBlock,
      colour: BLOCK_COLOURS.control,
    },
    {
      type: BLOCK_TYPES['if-else'],
      message0: m.if,
      args0: [condition],
      message1: '%1',
      args1: [body('DO')],
      message2: m.else,
      message3: '%1',
      args3: [body('ELSE')],
      ...statementBlock,
      colour: BLOCK_COLOURS.control,
    },
    {
      type: BLOCK_TYPES.score,
      message0: m.score,
      args0: [
        {
          type: 'field_number',
          name: 'AMOUNT',
          value: 1,
          min: -PROGRAM_LIMITS.scoreMax,
          max: PROGRAM_LIMITS.scoreMax,
          precision: 1,
        },
      ],
      ...statementBlock,
      colour: BLOCK_COLOURS.score,
    },
    {
      type: BLOCK_TYPES.star,
      message0: m.star,
      ...statementBlock,
      colour: BLOCK_COLOURS.score,
    },
  ];
}

/**
 * The toolbox (a flyout): the level's blocks in order. "move" comes once per
 * direction, ready to drag, so the youngest students don't need the dropdown.
 */
export function toolbox(kinds: BlockKind[]): Json {
  const contents: Json[] = [];
  for (const kind of kinds) {
    const type = BLOCK_TYPES[kind];
    if (kind === 'move') {
      for (const dir of ['up', 'down', 'left', 'right']) {
        contents.push({ kind: 'block', type, fields: { DIR: dir } });
      }
    } else if (kind === 'when-key') {
      contents.push({ kind: 'block', type, fields: { KEY: 'right' } });
    } else {
      contents.push({ kind: 'block', type });
    }
  }
  return { kind: 'flyoutToolbox', contents };
}

// ── Programs ↔ Blockly's saved workspaces ────────────────────────────────────

/** Where a stack goes when the program doesn't say. */
const defaultAt = (index: number): [number, number] => [24, 24 + index * 140];

function statementState(item: Statement): Json {
  if (item === 'collect') return { type: BLOCK_TYPES.collect };
  if (item === 'star') return { type: BLOCK_TYPES.star };
  if ('move' in item) return { type: BLOCK_TYPES.move, fields: { DIR: item.move } };
  if ('say' in item) return { type: BLOCK_TYPES.say, fields: { TEXT: item.say } };
  if ('score' in item) return { type: BLOCK_TYPES.score, fields: { AMOUNT: item.score } };
  const inputs = (lists: [string, Statement[] | undefined][]) => {
    const result: Json = {};
    for (const [name, list] of lists) {
      const first = chainState(list ?? []);
      if (first) result[name] = { block: first };
    }
    return result;
  };
  if ('repeat' in item) {
    return {
      type: BLOCK_TYPES.repeat,
      fields: { TIMES: item.repeat },
      inputs: inputs([['DO', item.do]]),
    };
  }
  if ('until' in item) {
    return { type: BLOCK_TYPES['until-goal'], inputs: inputs([['DO', item.do]]) };
  }
  if (item.else) {
    return {
      type: BLOCK_TYPES['if-else'],
      fields: { COND: item.if },
      inputs: inputs([
        ['DO', item.do],
        ['ELSE', item.else],
      ]),
    };
  }
  return { type: BLOCK_TYPES.if, fields: { COND: item.if }, inputs: inputs([['DO', item.do]]) };
}

function chainState(list: Statement[]): Json | null {
  let next: Json | null = null;
  for (let index = list.length - 1; index >= 0; index--) {
    const block = statementState(list[index]!);
    if (next) block['next'] = { block: next };
    next = block;
  }
  return next;
}

const HATS: Record<string, (key: unknown) => StageEvent | null> = {
  [BLOCK_TYPES['when-run']]: () => 'run',
  [BLOCK_TYPES['when-star']]: () => 'star',
  [BLOCK_TYPES['when-key']]: (key) =>
    key === 'up' || key === 'down' || key === 'left' || key === 'right' ? `key-${key}` : null,
};

/** A program as Blockly's saved workspace (Blockly.serialization.workspaces.load). */
export function programToState(program: Program): Json {
  const blocks: Json[] = [];
  program.forEach((script, index) => {
    const [x, y] = script.at ?? defaultAt(index);
    const first = chainState(script.do);
    if (script.when) {
      const key = script.when.startsWith('key-') ? script.when.slice(4) : null;
      const type =
        script.when === 'run'
          ? BLOCK_TYPES['when-run']
          : script.when === 'star'
            ? BLOCK_TYPES['when-star']
            : BLOCK_TYPES['when-key'];
      const hat: Json = { type, x, y };
      if (key) hat['fields'] = { KEY: key };
      if (first) hat['next'] = { block: first };
      blocks.push(hat);
    } else if (first) {
      blocks.push({ ...first, x, y });
    }
  });
  return { blocks: { languageVersion: 0, blocks } };
}

const asObject = (value: unknown): Json | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Json) : null;

const clampInt = (value: unknown, min: number, max: number, fallback: number) => {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback;
};

const DIRECTION_SET = new Set(['up', 'down', 'left', 'right']);
const CONDITION_SET = new Set(['gem', 'path-up', 'path-down', 'path-left', 'path-right']);

function inputChain(block: Json, name: string, depth: number): Statement[] {
  const input = asObject(asObject(block['inputs'])?.[name]);
  return chain(asObject(input?.['block']), depth + 1);
}

function stateStatement(block: Json, depth: number): Statement | null {
  const fields = asObject(block['fields']) ?? {};
  switch (block['type']) {
    case BLOCK_TYPES.collect:
      return 'collect';
    case BLOCK_TYPES.star:
      return 'star';
    case BLOCK_TYPES.move: {
      const dir = String(fields['DIR']);
      return DIRECTION_SET.has(dir) ? { move: dir as Direction } : null;
    }
    case BLOCK_TYPES.say:
      return { say: String(fields['TEXT'] ?? '').slice(0, PROGRAM_LIMITS.sayLength) };
    case BLOCK_TYPES.score: {
      const max = PROGRAM_LIMITS.scoreMax;
      return { score: clampInt(fields['AMOUNT'], -max, max, 1) };
    }
    case BLOCK_TYPES.repeat:
      return {
        repeat: clampInt(fields['TIMES'], 0, PROGRAM_LIMITS.repeatMax, 3),
        do: inputChain(block, 'DO', depth),
      };
    case BLOCK_TYPES['until-goal']:
      return { until: 'goal', do: inputChain(block, 'DO', depth) };
    case BLOCK_TYPES.if:
    case BLOCK_TYPES['if-else']: {
      const cond = String(fields['COND']);
      if (!CONDITION_SET.has(cond)) return null;
      const result: Statement = { if: cond as Condition, do: inputChain(block, 'DO', depth) };
      if (block['type'] === BLOCK_TYPES['if-else']) result.else = inputChain(block, 'ELSE', depth);
      return result;
    }
    default:
      return null;
  }
}

function chain(first: Json | null, depth: number): Statement[] {
  const list: Statement[] = [];
  if (depth > PROGRAM_LIMITS.depth + 1) return list;
  let block = first;
  let guard = 0;
  while (block && guard++ <= PROGRAM_LIMITS.blocks) {
    const item = stateStatement(block, depth);
    if (item) list.push(item);
    block = asObject(asObject(block['next'])?.['block']);
  }
  return list;
}

/**
 * A program from Blockly's saved workspace (Blockly.serialization.workspaces.save).
 * Unknown blocks are left out. The result can still be over the limits (a huge
 * workspace): check it with toProgram before saving.
 */
export function stateToProgram(state: unknown): Program {
  const top = asObject(asObject(state)?.['blocks'])?.['blocks'];
  if (!Array.isArray(top)) return [];
  const program: Program = [];
  for (const value of top.slice(0, PROGRAM_LIMITS.scripts)) {
    const block = asObject(value);
    if (!block) continue;
    const at: [number, number] = [
      clampInt(block['x'], -100_000, 100_000, 0),
      clampInt(block['y'], -100_000, 100_000, 0),
    ];
    const hat = HATS[String(block['type'])];
    const fields = asObject(block['fields']) ?? {};
    if (hat) {
      const when = hat(fields['KEY']);
      if (!when) continue;
      const script: Script = {
        when,
        do: chain(asObject(asObject(block['next'])?.['block']), 1),
        at,
      };
      program.push(script);
    } else {
      const list = chain(block, 1);
      if (list.length) program.push({ do: list, at });
    }
  }
  return program;
}
