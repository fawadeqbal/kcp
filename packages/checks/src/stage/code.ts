import type { Program, StageEvent, Statement } from './types.js';

/** Comments in the generated code, in the student's language. */
export interface CodeLabels {
  /** "When ▶ Run is clicked" */
  whenRun: string;
  /** "When Bit touches the star" */
  whenStar: string;
  /** "These blocks aren't under a "when" block, so they don't run." */
  loose: string;
}

const ENGLISH: CodeLabels = {
  whenRun: 'When ▶ Run is clicked',
  whenStar: 'When Bit touches the star',
  loose: 'These blocks are not under a "when" block, so they do not run.',
};

const KEYS: Record<string, string> = {
  'key-up': 'ArrowUp',
  'key-down': 'ArrowDown',
  'key-left': 'ArrowLeft',
  'key-right': 'ArrowRight',
};

const MOVES = { up: 'moveUp', down: 'moveDown', left: 'moveLeft', right: 'moveRight' } as const;
const LOOP_VARIABLES = ['i', 'j', 'k', 'm', 'n', 'p', 'q', 'r'];

function condition(item: Extract<Statement, { if: unknown }>): string {
  if (item.if === 'gem') return 'gemHere()';
  return `canMove('${item.if.slice(5)}')`;
}

function lines(list: Statement[], indent: string, depth: number, out: string[]) {
  const inner = `${indent}  `;
  for (const item of list) {
    if (item === 'collect') out.push(`${indent}collectGem();`);
    else if (item === 'star') out.push(`${indent}moveStarSomewhere();`);
    else if ('move' in item) out.push(`${indent}${MOVES[item.move]}();`);
    else if ('say' in item) out.push(`${indent}say(${JSON.stringify(item.say)});`);
    else if ('score' in item) {
      out.push(`${indent}score ${item.score < 0 ? '-' : '+'}= ${Math.abs(item.score)};`);
    } else if ('repeat' in item) {
      const v = LOOP_VARIABLES[depth] ?? `i${depth}`;
      out.push(`${indent}for (let ${v} = 0; ${v} < ${item.repeat}; ${v}++) {`);
      lines(item.do, inner, depth + 1, out);
      out.push(`${indent}}`);
    } else if ('until' in item) {
      out.push(`${indent}while (!atFlag()) {`);
      lines(item.do, inner, depth + 1, out);
      out.push(`${indent}}`);
    } else {
      out.push(`${indent}if (${condition(item)}) {`);
      lines(item.do, inner, depth + 1, out);
      if (item.else) {
        out.push(`${indent}} else {`);
        lines(item.else, inner, depth + 1, out);
      }
      out.push(`${indent}}`);
    }
  }
}

function header(event: StageEvent, labels: CodeLabels): { open: string; close: string } {
  if (event === 'run') return { open: `// ${labels.whenRun}`, close: '' };
  if (event === 'star') return { open: 'onTouchStar(() => {', close: '});' };
  return { open: `onKey('${KEYS[event]}', () => {`, close: '});' };
}

/**
 * The JavaScript a block program stands for ("Show the code"). It is for reading:
 * nothing runs it, and it names the robot's actions the way a game library would.
 */
export function programToJs(program: Program, labels: CodeLabels = ENGLISH): string {
  const out: string[] = [];
  const running = program.filter((script) => script.when);
  const loose = program.filter((script) => !script.when && script.do.length > 0);
  for (const script of running) {
    if (out.length) out.push('');
    const { open, close } = header(script.when!, labels);
    out.push(open);
    const indent = close ? '  ' : '';
    if (script.when === 'star') out.push(`  // ${labels.whenStar}`);
    lines(script.do, indent, 0, out);
    if (close) out.push(close);
  }
  if (loose.length) {
    if (out.length) out.push('');
    out.push(`// ${labels.loose}`);
    for (const script of loose) {
      const part: string[] = [];
      lines(script.do, '', 0, part);
      out.push(...part.map((line) => `// ${line}`));
    }
  }
  return out.join('\n');
}
