import type { BlocksCheck, Check, CheckResult, StageCheck } from '../types.js';
import { StageMachine } from './machine.js';
import { parseProgram, runningBlocks } from './program.js';
import type { Program, StageLevel } from './types.js';

const normalize = (text: string) => text.replace(/\s+/g, ' ').trim().toLowerCase();

function stagePasses(level: StageLevel, program: Program, check: StageCheck): boolean {
  const machine = new StageMachine(level, program, check.seed ?? 1);
  machine.start();
  for (const key of check.keys ?? []) machine.press(key);
  if (machine.stopped) return false;
  if (check.atGoal !== undefined && machine.atGoal !== check.atGoal) return false;
  if (check.endsAt && (machine.x !== check.endsAt[0] || machine.y !== check.endsAt[1])) {
    return false;
  }
  if (check.gemsLeft !== undefined && machine.gemsLeft !== check.gemsLeft) return false;
  if (check.minScore !== undefined && machine.score < check.minScore) return false;
  if (check.noBump && machine.bumps > 0) return false;
  if (check.said !== undefined) {
    const wanted = normalize(check.said);
    if (!machine.said.some((text) => normalize(text).includes(wanted))) return false;
  }
  return true;
}

function blocksPass(program: Program, check: BlocksCheck): boolean {
  const kinds = runningBlocks(program);
  if (check.uses && !check.uses.every((kind) => kinds.includes(kind))) return false;
  if (check.maxBlocks !== undefined && kinds.length > check.maxBlocks) return false;
  if (check.minBlocks !== undefined && kinds.length < check.minBlocks) return false;
  return true;
}

/**
 * Explorer checks, for a block program (the student's `blocks` file, JSON). Pure and
 * the same everywhere: the browser shows these results and the API computes them
 * again itself. A file that isn't a valid program fails every check; checks of
 * other kinds fail too (content-import doesn't allow them on block challenges).
 */
export function evaluateStageChecks(
  level: StageLevel,
  blocks: string | undefined,
  checks: Check[],
): CheckResult[] {
  const program = parseProgram(blocks);
  return checks.map((check) => {
    let passed = false;
    if (program) {
      try {
        if (check.expect === 'stage') passed = stagePasses(level, program, check);
        if (check.expect === 'blocks') passed = blocksPass(program, check);
      } catch {
        passed = false;
      }
    }
    return { id: check.id, passed, ...(check.hint ? { hint: check.hint } : {}) };
  });
}
