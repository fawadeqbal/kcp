import { StageMachine, type StageAction } from './machine.js';
import { cellKey, readGrid } from './program.js';
import type { Direction, Program, StageLevel, StageTheme } from './types.js';

/*
 * The stage on screen: the level as an SVG picture with Bit, animated from what the
 * machine did. Plain DOM, so the web app, the public portfolio (sandbox) and the
 * mobile app's bundle all show the same thing. Texts come from the caller, in the
 * student's language; "{name}" in a text is replaced by a value.
 */

export interface StageLabels {
  /** Name of the stage for screen readers ("Bit's world"). */
  stage: string;
  /** "Score: {score}" */
  score: string;
  /** "Gems left: {count}" */
  gems: string;
  /** "Time: {seconds}" */
  time: string;
  /** "Bit says: {text}" */
  says: string;
  bumped: string;
  collected: string;
  nothingHere: string;
  reachedGoal: string;
  loop: string;
  /** "Time's up! Score: {score}" */
  timeUp: string;
  /** Shown in games while they run: how to play. */
  howToPlay: string;
  up: string;
  down: string;
  left: string;
  right: string;
}

export interface StageOutcome {
  atGoal: boolean;
  gemsLeft: number;
  score: number;
  stopped: boolean;
}

export interface StagePlayer {
  /** Back to how the level starts. */
  reset(): void;
  /**
   * Runs the program on the stage. A maze resolves when Bit has done everything; a
   * game once its time is up (or stop() is called).
   */
  play(program: Program): Promise<StageOutcome>;
  stop(): void;
  destroy(): void;
}

export interface StageOptions {
  labels: StageLabels;
  /** Milliseconds per step (default 380); with reduced motion, steps don't glide. */
  stepMs?: number;
  reducedMotion?: boolean;
}

const CELL = 10;
const SVG = 'http://www.w3.org/2000/svg';

const THEMES: Record<StageTheme, { bg: string; floor: string; wall: string; line: string }> = {
  meadow: { bg: '#dcebc9', floor: '#f6faec', wall: '#5f8446', line: '#c9dcb3' },
  space: { bg: '#1c2140', floor: '#2d3560', wall: '#0e1128', line: '#3b4476' },
  sea: { bg: '#d3ebf3', floor: '#f2fafc', wall: '#35738b', line: '#bfdde8' },
};

const STYLE_ID = 'kcp-stage-style';
const STYLE = `
.kcp-stage{display:flex;flex-direction:column;gap:.5rem;height:100%;min-height:0;outline:none}
.kcp-stage:focus-visible{box-shadow:0 0 0 3px #2563a8;border-radius:12px}
.kcp-stage-hud{display:flex;flex-wrap:wrap;gap:.5rem 1rem;font-weight:700;font-size:.95rem}
.kcp-stage-hud:empty{display:none}
.kcp-stage-view{position:relative;flex:1;min-height:0;display:flex;align-items:center;justify-content:center}
.kcp-stage svg{width:100%;height:100%;max-height:100%;display:block}
.kcp-stage .bit{transition:transform var(--kcp-step,380ms) ease-in-out}
.kcp-stage .star{transition:transform var(--kcp-step,380ms) ease-in-out}
.kcp-stage .gem.gone{opacity:0;transition:opacity .3s}
.kcp-stage .goal.won .flag{fill:#f2a93b}
.kcp-stage-say{position:absolute;inset-inline:.5rem;top:.5rem;margin:0 auto;max-width:18rem;
  background:#fff;color:#1d2433;border:2px solid #1d2433;border-radius:14px;padding:.35rem .75rem;
  font-weight:700;text-align:center;box-shadow:0 2px 0 #1d2433}
.kcp-stage-say:empty{display:none}
.kcp-stage-note{margin:0;font-size:.9rem}
.kcp-stage-pad{display:grid;grid-template-columns:repeat(3,3rem);grid-template-rows:repeat(2,3rem);
  gap:.35rem;justify-content:center;direction:ltr}
.kcp-stage-pad button{font:inherit;font-size:1.3rem;border-radius:12px;border:2px solid currentColor;
  background:transparent;color:inherit;cursor:pointer;padding:0;min-height:0;align-self:stretch}
.kcp-stage-pad button:disabled{opacity:.4;cursor:default}
.kcp-stage-pad .up{grid-column:2;grid-row:1}.kcp-stage-pad .left{grid-column:1;grid-row:2}
.kcp-stage-pad .down{grid-column:2;grid-row:2}.kcp-stage-pad .right{grid-column:3;grid-row:2}
.kcp-stage .sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
`;

const fill = (text: string, values: Record<string, string | number>) =>
  text.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in values ? String(values[name]) : match,
  );

function el<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attributes: Record<string, string | number>,
  parent?: Element,
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG, tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, String(value));
  parent?.append(node);
  return node;
}

function drawBit(parent: Element): SVGGElement {
  const outer = el('g', { class: 'bit' }, parent);
  const body = el('g', { class: 'bit-body' }, outer);
  const ink = '#1d3b4f';
  el('line', { x1: 5, y1: 1.6, x2: 5, y2: 2.8, stroke: ink, 'stroke-width': 0.45 }, body);
  el(
    'circle',
    { cx: 5, cy: 1.4, r: 0.7, fill: '#f2a93b', stroke: ink, 'stroke-width': 0.35 },
    body,
  );
  el(
    'rect',
    {
      x: 2,
      y: 2.8,
      width: 6,
      height: 5,
      rx: 1.5,
      fill: '#2fa39a',
      stroke: ink,
      'stroke-width': 0.45,
    },
    body,
  );
  el('rect', { x: 2.9, y: 3.7, width: 4.2, height: 2.4, rx: 0.9, fill: '#e9fbf7' }, body);
  el('circle', { cx: 4.4, cy: 4.9, r: 0.5, fill: ink }, body);
  el('circle', { cx: 6.2, cy: 4.9, r: 0.5, fill: ink }, body);
  el(
    'path',
    {
      d: 'M4.2 6.9 Q5 7.4 5.8 6.9',
      fill: 'none',
      stroke: ink,
      'stroke-width': 0.4,
      'stroke-linecap': 'round',
    },
    body,
  );
  el('rect', { x: 2.4, y: 7.8, width: 1.8, height: 1.2, rx: 0.5, fill: ink }, body);
  el('rect', { x: 5.8, y: 7.8, width: 1.8, height: 1.2, rx: 0.5, fill: ink }, body);
  return outer;
}

function drawGem(parent: Element, x: number, y: number): SVGGElement {
  const g = el('g', { class: 'gem', transform: `translate(${x * CELL} ${y * CELL})` }, parent);
  el(
    'polygon',
    { points: '5,2 8,5 5,8.4 2,5', fill: '#3aa0e8', stroke: '#16517e', 'stroke-width': 0.45 },
    g,
  );
  el('polygon', { points: '5,2 6.3,5 5,8.4 3.7,5', fill: '#8fd0ff', opacity: 0.7 }, g);
  return g;
}

function drawGoal(parent: Element, x: number, y: number): SVGGElement {
  const g = el('g', { class: 'goal', transform: `translate(${x * CELL} ${y * CELL})` }, parent);
  el('rect', { x: 3, y: 1.5, width: 0.7, height: 7.5, rx: 0.3, fill: '#1d3b4f' }, g);
  el(
    'path',
    {
      class: 'flag',
      d: 'M3.7 1.8 L8.2 3.4 L3.7 5 Z',
      fill: '#d9463b',
      stroke: '#1d3b4f',
      'stroke-width': 0.3,
    },
    g,
  );
  return g;
}

function starPoints(): string {
  const points: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 3.6 : 1.6;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    points.push(
      `${(5 + r * Math.cos(angle)).toFixed(2)},${(5.3 + r * Math.sin(angle)).toFixed(2)}`,
    );
  }
  return points.join(' ');
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Puts a stage in `root` (emptied first). */
export function mountStage(
  root: HTMLElement,
  level: StageLevel,
  options: StageOptions,
): StagePlayer {
  const { labels } = options;
  const reduced = options.reducedMotion ?? false;
  const stepMs = options.stepMs ?? 380;
  const grid = readGrid(level);
  const theme = THEMES[level.theme ?? (level.mode === 'game' ? 'space' : 'meadow')];
  const game = level.mode === 'game';

  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = STYLE;
    document.head.append(style);
  }

  root.replaceChildren();
  const wrap = document.createElement('div');
  wrap.className = 'kcp-stage';
  wrap.style.setProperty('--kcp-step', `${reduced ? 0 : stepMs}ms`);
  root.append(wrap);

  const hud = document.createElement('div');
  hud.className = 'kcp-stage-hud';
  const scoreText = document.createElement('span');
  const gemsText = document.createElement('span');
  const timeText = document.createElement('span');
  if (game) hud.append(scoreText, timeText);
  if (grid.gems.length) hud.append(gemsText);

  const view = document.createElement('div');
  view.className = 'kcp-stage-view';
  const svg = el('svg', {
    viewBox: `0 0 ${grid.width * CELL} ${grid.height * CELL}`,
    role: 'img',
    'aria-label': labels.stage,
  });
  const say = document.createElement('p');
  say.className = 'kcp-stage-say';
  say.setAttribute('aria-hidden', 'true');
  view.append(svg, say);

  const live = document.createElement('p');
  live.className = 'sr';
  live.setAttribute('aria-live', 'polite');

  wrap.append(hud, view, live);

  // The level.
  el('rect', { width: grid.width * CELL, height: grid.height * CELL, rx: 2, fill: theme.bg }, svg);
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      const wall = grid.walls.has(cellKey(x, y));
      el(
        'rect',
        {
          x: x * CELL + 0.4,
          y: y * CELL + 0.4,
          width: CELL - 0.8,
          height: CELL - 0.8,
          rx: 1.6,
          fill: wall ? theme.wall : theme.floor,
          stroke: wall ? 'none' : theme.line,
          'stroke-width': 0.3,
        },
        svg,
      );
    }
  }
  const goal = grid.goal ? drawGoal(svg, grid.goal.x, grid.goal.y) : null;
  const gemLayer = el('g', {}, svg);
  let gems = new Map<string, SVGGElement>();
  const star = grid.star ? el('g', { class: 'star' }, svg) : null;
  if (star)
    el(
      'polygon',
      { points: starPoints(), fill: '#ffd23f', stroke: '#8a5a00', 'stroke-width': 0.4 },
      star,
    );
  const bit = drawBit(svg);

  let pad: HTMLDivElement | null = null;
  const note = document.createElement('p');
  note.className = 'kcp-stage-note';
  if (game) {
    pad = document.createElement('div');
    pad.className = 'kcp-stage-pad';
    for (const dir of ['up', 'left', 'down', 'right'] as const) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = dir;
      button.disabled = true;
      button.setAttribute('aria-label', labels[dir]);
      button.textContent = { up: '↑', down: '↓', left: '←', right: '→' }[dir];
      button.addEventListener('click', () => press(dir));
      pad.append(button);
    }
    wrap.append(note, pad);
  }

  let machine: StageMachine | null = null;
  let running = false;
  let finish: (() => void) | null = null;
  let generation = 0;
  let queue: StageAction[] = [];
  let draining = false;
  let timer: ReturnType<typeof setInterval> | null = null;
  let seconds = 0;

  const place = (node: SVGGElement, x: number, y: number) => {
    node.style.transform = `translate(${x * CELL}px, ${y * CELL}px)`;
  };
  const face = (side: 'left' | 'right') => {
    bit.firstElementChild?.setAttribute(
      'transform',
      side === 'left' ? `translate(${CELL} 0) scale(-1 1)` : '',
    );
  };
  const announce = (text: string) => {
    live.textContent = text;
  };
  const showScore = (score: number) => {
    scoreText.textContent = fill(labels.score, { score });
  };
  const showGems = (count: number) => {
    gemsText.textContent = fill(labels.gems, { count });
  };
  const showTime = () => {
    timeText.textContent = fill(labels.time, { seconds });
  };
  const setPad = (enabled: boolean) => {
    pad?.querySelectorAll('button').forEach((button) => {
      button.disabled = !enabled;
    });
    note.textContent = enabled ? labels.howToPlay : '';
  };

  function reset() {
    generation += 1;
    running = false;
    queue = [];
    if (timer) clearInterval(timer);
    timer = null;
    setPad(false);
    // Jump without gliding.
    bit.style.transition = 'none';
    star?.style.setProperty('transition', 'none');
    place(bit, grid.start.x, grid.start.y);
    face('right');
    if (star && grid.star) place(star, grid.star.x, grid.star.y);
    void svg.getBoundingClientRect();
    bit.style.transition = '';
    star?.style.setProperty('transition', '');
    gemLayer.replaceChildren();
    gems = new Map(
      grid.gems.map((gem) => [cellKey(gem.x, gem.y), drawGem(gemLayer, gem.x, gem.y)]),
    );
    goal?.classList.remove('won');
    say.textContent = '';
    showScore(0);
    showGems(grid.gems.length);
    seconds = level.seconds ?? 30;
    showTime();
    announce('');
    const done = finish;
    finish = null;
    done?.();
  }

  const wait = (ms: number, run: number) =>
    sleep(reduced ? Math.min(ms, 120) : ms).then(() => run === generation);

  async function apply(action: StageAction, run: number, fast: boolean): Promise<boolean> {
    const step = fast ? Math.min(stepMs, 160) : stepMs;
    switch (action.type) {
      case 'move':
        if (action.dir === 'left' || action.dir === 'right') face(action.dir);
        place(bit, action.x, action.y);
        return wait(step, run);
      case 'bump': {
        if (action.dir === 'left' || action.dir === 'right') face(action.dir);
        if (!reduced && typeof bit.animate === 'function') {
          const dx = { up: 0, down: 0, left: -1.5, right: 1.5 }[action.dir];
          const dy = { up: -1.5, down: 1.5, left: 0, right: 0 }[action.dir];
          const base = bit.style.transform;
          bit.animate(
            [
              { transform: base },
              { transform: `${base} translate(${dx}px, ${dy}px)` },
              { transform: base },
            ],
            { duration: 260 },
          );
        }
        announce(labels.bumped);
        return wait(step, run);
      }
      case 'collect': {
        const gem = gems.get(cellKey(action.x, action.y));
        gem?.classList.add('gone');
        gems.delete(cellKey(action.x, action.y));
        showGems(gems.size);
        announce(labels.collected);
        return wait(step / 2, run);
      }
      case 'miss':
        announce(labels.nothingHere);
        return wait(step / 2, run);
      case 'say':
        say.textContent = action.text;
        announce(fill(labels.says, { text: action.text }));
        return wait(fast ? 500 : 1100, run);
      case 'score':
        showScore(action.score);
        return wait(fast ? 0 : step / 2, run);
      case 'star':
        if (star) place(star, action.x, action.y);
        return wait(fast ? 0 : step / 2, run);
      case 'goal':
        goal?.classList.add('won');
        announce(labels.reachedGoal);
        return wait(step, run);
      case 'loop':
        announce(labels.loop);
        return run === generation;
    }
  }

  async function drain(run: number) {
    if (draining) return;
    draining = true;
    for (let action = queue.shift(); action; action = queue.shift()) {
      // A long queue in a game plays at speed, so Bit keeps up with the keys.
      if (!(await apply(action, run, game && queue.length > 2))) break;
    }
    draining = false;
  }

  function press(dir: Direction) {
    if (!running || !machine || !game) return;
    queue.push(...machine.press(dir));
    void drain(generation);
  }

  const onKey = (event: KeyboardEvent) => {
    const dir = (
      { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' } as const
    )[event.key as 'ArrowUp'];
    if (!dir || !running || !game) return;
    event.preventDefault();
    press(dir);
  };
  wrap.tabIndex = game ? 0 : -1;
  wrap.addEventListener('keydown', onKey);

  const outcome = (): StageOutcome => ({
    atGoal: machine?.atGoal ?? false,
    gemsLeft: machine?.gemsLeft ?? grid.gems.length,
    score: machine?.score ?? 0,
    stopped: machine?.stopped ?? false,
  });

  async function play(program: Program): Promise<StageOutcome> {
    reset();
    const run = generation;
    machine = new StageMachine(level, program);
    running = true;
    queue.push(...machine.start());
    await drain(run);
    if (run !== generation) return outcome();
    if (!game || machine.stopped) {
      running = false;
      return outcome();
    }
    setPad(true);
    wrap.focus({ preventScroll: true });
    await new Promise<void>((resolve) => {
      finish = resolve;
      timer = setInterval(() => {
        seconds -= 1;
        showTime();
        if (seconds <= 0) {
          if (timer) clearInterval(timer);
          timer = null;
          running = false;
          setPad(false);
          announce(fill(labels.timeUp, { score: machine?.score ?? 0 }));
          note.textContent = fill(labels.timeUp, { score: machine?.score ?? 0 });
          finish = null;
          resolve();
        }
      }, 1000);
    });
    return outcome();
  }

  reset();
  return {
    reset,
    play,
    stop() {
      if (!running) return;
      const result = machine;
      reset();
      machine = result;
    },
    destroy() {
      reset();
      wrap.removeEventListener('keydown', onKey);
      root.replaceChildren();
    },
  };
}
