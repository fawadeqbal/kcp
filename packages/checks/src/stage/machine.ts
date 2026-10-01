import { type Cell, cellKey, type Grid, keyOf, readGrid } from './program.js';
import type { Condition, Direction, Program, StageLevel, Statement } from './types.js';

/** What happened, step by step: the player animates these. */
export type StageAction =
  | { type: 'move'; dir: Direction; x: number; y: number }
  | { type: 'bump'; dir: Direction }
  | { type: 'collect'; x: number; y: number }
  | { type: 'miss' }
  | { type: 'say'; text: string }
  | { type: 'score'; score: number }
  | { type: 'star'; x: number; y: number }
  | { type: 'goal' }
  | { type: 'loop' };

/** Most blocks one event may run (a loop that never ends stops here). */
export const MAX_STAGE_STEPS = 2000;

const STEP: Record<Direction, [number, number]> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};

/** A small seeded random generator, so a game plays the same way in every check. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

class StepLimit extends Error {}

/**
 * Runs a program on a level. `start()` runs the "when ▶ Run" scripts; in games,
 * `press(key)` runs the scripts for an arrow key (and "when Bit touches the star"
 * after a move lands on the star). Each returns what happened, for the player.
 */
export class StageMachine {
  readonly grid: Grid;
  x: number;
  y: number;
  score = 0;
  collected = 0;
  bumps = 0;
  said: string[] = [];
  /** Stopped because a loop ran too long. */
  stopped = false;
  facing: 'left' | 'right' = 'right';
  readonly gems: Set<string>;
  star: Cell | null;
  private readonly random: () => number;
  private actions: StageAction[] = [];
  private steps = 0;
  private inStarScript = false;

  constructor(
    readonly level: StageLevel,
    readonly program: Program,
    seed = 1,
  ) {
    this.grid = readGrid(level);
    this.x = this.grid.start.x;
    this.y = this.grid.start.y;
    this.gems = new Set(this.grid.gems.map((gem) => cellKey(gem.x, gem.y)));
    this.star = this.grid.star ? { ...this.grid.star } : null;
    this.random = mulberry32(seed);
  }

  get atGoal(): boolean {
    const goal = this.grid.goal;
    return !!goal && goal.x === this.x && goal.y === this.y;
  }

  get gemsLeft(): number {
    return this.gems.size;
  }

  start(): StageAction[] {
    return this.handle((script) => script.when === 'run');
  }

  press(key: Direction): StageAction[] {
    return this.handle((script) => !!script.when && keyOf(script.when) === key);
  }

  private handle(pick: (script: Program[number]) => boolean): StageAction[] {
    this.actions = [];
    if (this.stopped) return this.actions;
    this.steps = 0;
    try {
      for (const script of this.program) if (pick(script)) this.block(script.do);
    } catch (error) {
      if (!(error instanceof StepLimit)) throw error;
      this.stopped = true;
      this.actions.push({ type: 'loop' });
    }
    return this.actions;
  }

  private tick() {
    this.steps += 1;
    if (this.steps > MAX_STAGE_STEPS) throw new StepLimit();
  }

  private open(x: number, y: number): boolean {
    const { width, height, walls } = this.grid;
    return x >= 0 && y >= 0 && x < width && y < height && !walls.has(cellKey(x, y));
  }

  private test(condition: Condition): boolean {
    if (condition === 'gem') return this.gems.has(cellKey(this.x, this.y));
    const [dx, dy] = STEP[condition.slice(5) as Direction];
    return this.open(this.x + dx, this.y + dy);
  }

  private block(list: Statement[]) {
    for (const item of list) this.statement(item);
  }

  private statement(item: Statement) {
    this.tick();
    if (item === 'collect') return this.collect();
    if (item === 'star') return this.moveStar();
    if ('move' in item) return this.move(item.move);
    if ('say' in item) {
      this.said.push(item.say);
      this.actions.push({ type: 'say', text: item.say });
      return;
    }
    if ('repeat' in item) {
      for (let i = 0; i < item.repeat; i++) {
        this.tick();
        this.block(item.do);
      }
      return;
    }
    if ('until' in item) {
      while (!this.atGoal) {
        this.tick();
        this.block(item.do);
      }
      return;
    }
    if ('if' in item) {
      if (this.test(item.if)) this.block(item.do);
      else if (item.else) this.block(item.else);
      return;
    }
    this.score += item.score;
    this.actions.push({ type: 'score', score: this.score });
  }

  private move(dir: Direction) {
    const [dx, dy] = STEP[dir];
    if (dx) this.facing = dx < 0 ? 'left' : 'right';
    if (!this.open(this.x + dx, this.y + dy)) {
      this.bumps += 1;
      this.actions.push({ type: 'bump', dir });
      return;
    }
    this.x += dx;
    this.y += dy;
    this.actions.push({ type: 'move', dir, x: this.x, y: this.y });
    if (this.atGoal && this.level.mode === 'maze') this.actions.push({ type: 'goal' });
    if (this.star && this.star.x === this.x && this.star.y === this.y && !this.inStarScript) {
      this.inStarScript = true;
      try {
        for (const script of this.program) if (script.when === 'star') this.block(script.do);
      } finally {
        this.inStarScript = false;
      }
    }
  }

  private collect() {
    const key = cellKey(this.x, this.y);
    if (!this.gems.has(key)) {
      this.actions.push({ type: 'miss' });
      return;
    }
    this.gems.delete(key);
    this.collected += 1;
    this.actions.push({ type: 'collect', x: this.x, y: this.y });
  }

  /** The star jumps to a random floor cell away from Bit and from where it was. */
  private moveStar() {
    if (!this.star) return;
    const free: Cell[] = [];
    for (let y = 0; y < this.grid.height; y++) {
      for (let x = 0; x < this.grid.width; x++) {
        const here = x === this.x && y === this.y;
        const same = x === this.star.x && y === this.star.y;
        if (this.open(x, y) && !here && !same) free.push({ x, y });
      }
    }
    const next = free[Math.floor(this.random() * free.length)];
    if (!next) return;
    this.star = next;
    this.actions.push({ type: 'star', x: next.x, y: next.y });
  }
}
