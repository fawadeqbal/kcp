import type { Check } from '../types.js';
import { programToState, stateToProgram, toolbox } from './blockly.js';
import { evaluateStageChecks } from './checks.js';
import { programToJs } from './code.js';
import { StageMachine } from './machine.js';
import { parseProgram, programProblem, readGrid, runningBlocks } from './program.js';
import type { Program, StageLevel } from './types.js';

const corridor: StageLevel = {
  mode: 'maze',
  map: ['#######', '#S.*.G#', '#######'],
  toolbox: ['when-run', 'move', 'collect', 'repeat'],
};

const game: StageLevel = {
  mode: 'game',
  map: ['.....', '.S..T', '.....'],
  toolbox: ['when-key', 'move', 'when-star', 'score', 'star'],
};

const walk: Program = [
  {
    when: 'run',
    do: [{ move: 'right' }, { move: 'right' }, 'collect', { move: 'right' }, { move: 'right' }],
  },
];

describe('StageMachine', () => {
  it('moves Bit, collects gems and reaches the flag', () => {
    const machine = new StageMachine(corridor, walk);
    const actions = machine.start();
    expect(machine.atGoal).toBe(true);
    expect(machine.gemsLeft).toBe(0);
    expect(machine.bumps).toBe(0);
    expect(actions.map((a) => a.type)).toEqual(['move', 'move', 'collect', 'move', 'move', 'goal']);
  });

  it('bumps into walls without moving', () => {
    const machine = new StageMachine(corridor, [{ when: 'run', do: [{ move: 'up' }] }]);
    expect(machine.start()).toEqual([{ type: 'bump', dir: 'up' }]);
    expect(machine.bumps).toBe(1);
    expect([machine.x, machine.y]).toEqual([1, 1]);
  });

  it('runs loops, conditions and "repeat until"', () => {
    const program: Program = [
      {
        when: 'run',
        do: [{ until: 'goal', do: [{ if: 'gem', do: ['collect'] }, { move: 'right' }] }],
      },
    ];
    const machine = new StageMachine(corridor, program);
    machine.start();
    expect(machine.atGoal).toBe(true);
    expect(machine.gemsLeft).toBe(0);
  });

  it('stops a loop that never ends', () => {
    const machine = new StageMachine(corridor, [
      { when: 'run', do: [{ until: 'goal', do: [{ move: 'up' }] }] },
    ]);
    const actions = machine.start();
    expect(machine.stopped).toBe(true);
    expect(actions.at(-1)).toEqual({ type: 'loop' });
    // Nothing runs once stopped.
    expect(machine.start()).toEqual([]);
  });

  it('ignores loose stacks (no "when" block)', () => {
    const machine = new StageMachine(corridor, [{ do: [{ move: 'right' }] }]);
    expect(machine.start()).toEqual([]);
  });

  it('plays a game: keys move Bit, touching the star runs its script', () => {
    const program: Program = [
      { when: 'key-right', do: [{ move: 'right' }] },
      { when: 'key-left', do: [{ move: 'left' }] },
      { when: 'star', do: [{ score: 1 }, 'star'] },
    ];
    const machine = new StageMachine(game, program, 7);
    machine.start();
    for (let i = 0; i < 3; i++) machine.press('right');
    expect(machine.score).toBe(1);
    expect(machine.star).not.toEqual({ x: 4, y: 1 });
    // The same seed moves the star the same way.
    const again = new StageMachine(game, program, 7);
    for (let i = 0; i < 3; i++) again.press('right');
    expect(again.star).toEqual(machine.star);
  });
});

describe('evaluateStageChecks', () => {
  const checks: Check[] = [
    { id: 'goal', expect: 'stage', atGoal: true, noBump: true },
    { id: 'gems', expect: 'stage', gemsLeft: 0 },
    { id: 'loop', expect: 'blocks', uses: ['repeat'], hint: 'use_repeat' },
    { id: 'short', expect: 'blocks', maxBlocks: 5 },
  ];

  it('passes what the program does', () => {
    const results = evaluateStageChecks(corridor, JSON.stringify(walk), checks);
    expect(results.map((r) => [r.id, r.passed])).toEqual([
      ['goal', true],
      ['gems', true],
      ['loop', false],
      ['short', false],
    ]);
    expect(results[2]?.hint).toBe('use_repeat');
  });

  it('rewards a loop', () => {
    const loop: Program = [
      {
        when: 'run',
        do: [{ repeat: 4, do: [{ if: 'gem', do: ['collect'] }, { move: 'right' }] }],
      },
    ];
    const results = evaluateStageChecks(corridor, JSON.stringify(loop), checks);
    expect(results.every((r) => r.passed)).toBe(true);
  });

  it('fails everything for a file that is not a program', () => {
    for (const text of [
      undefined,
      '',
      'not json',
      '{"a":1}',
      '[{"when":"run","do":[{"eval":1}]}]',
    ]) {
      expect(evaluateStageChecks(corridor, text, checks).some((r) => r.passed)).toBe(false);
    }
  });

  it('checks games with keys and a score', () => {
    const program: Program = [
      { when: 'key-right', do: [{ move: 'right' }] },
      { when: 'star', do: [{ score: 1 }, 'star'] },
    ];
    const results = evaluateStageChecks(game, JSON.stringify(program), [
      { id: 'catch', expect: 'stage', keys: ['right', 'right', 'right'], minScore: 1 },
      { id: 'keys', expect: 'blocks', uses: ['when-key', 'when-star', 'score'] },
      { id: 'at', expect: 'stage', keys: ['right'], endsAt: [2, 1] },
    ]);
    expect(results.every((r) => r.passed)).toBe(true);
  });

  it('checks what Bit said', () => {
    const program: Program = [{ when: 'run', do: [{ say: 'Hello, World!' }] }];
    const [result] = evaluateStageChecks(corridor, JSON.stringify(program), [
      { id: 'hi', expect: 'stage', said: 'hello' },
    ]);
    expect(result?.passed).toBe(true);
  });
});

describe('programs', () => {
  it('refuses unknown blocks, deep nesting and long texts', () => {
    expect(programProblem([{ when: 'run', do: [{ move: 'north' }] }])).toMatch(/direction/);
    expect(programProblem([{ when: 'run', do: [{ say: 'x'.repeat(41) }] }])).toMatch(/text/);
    expect(programProblem([{ when: 'boot', do: [] }])).toMatch(/event/);
    let deep: unknown = [];
    for (let i = 0; i < 12; i++) deep = [{ repeat: 2, do: deep }];
    expect(programProblem([{ when: 'run', do: deep }])).toMatch(/deep/);
    expect(programProblem(walk)).toBeNull();
    expect(parseProgram(JSON.stringify(walk))).toEqual(walk);
  });

  it('counts the blocks that run', () => {
    expect(runningBlocks(walk)).toEqual(['when-run', 'move', 'move', 'collect', 'move', 'move']);
  });

  it('reads maps and reports mistakes', () => {
    expect(readGrid(corridor).gems).toEqual([{ x: 3, y: 1 }]);
    expect(() => readGrid({ ...corridor, map: ['#S#', '##'] })).toThrow(/same length/);
    expect(() => readGrid({ ...corridor, map: ['S..', '...'] })).toThrow(/flag/);
    expect(() => readGrid({ ...corridor, map: ['S.X', '..G'] })).toThrow(/unknown/);
  });
});

describe('Blockly workspaces', () => {
  const program: Program = [
    {
      when: 'run',
      at: [10, 20],
      do: [
        { repeat: 3, do: [{ move: 'right' }, { if: 'path-up', do: [{ move: 'up' }], else: [] }] },
        { until: 'goal', do: ['collect'] },
        { say: 'Hi' },
      ],
    },
    { when: 'key-left', at: [300, 20], do: [{ move: 'left' }] },
    { when: 'star', at: [300, 200], do: [{ score: -2 }, 'star'] },
    { at: [40, 400], do: [{ move: 'down' }] },
  ];

  it('round-trips a program', () => {
    expect(stateToProgram(programToState(program))).toEqual(program);
  });

  it('leaves out unknown blocks and clamps numbers', () => {
    const state = {
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: 'kcp_when_run',
            x: 0,
            y: 0,
            next: {
              block: {
                type: 'controls_whileUntil',
                next: { block: { type: 'kcp_repeat', fields: { TIMES: 999 } } },
              },
            },
          },
        ],
      },
    };
    expect(stateToProgram(state)).toEqual([
      { when: 'run', at: [0, 0], do: [{ repeat: 20, do: [] }] },
    ]);
    expect(stateToProgram('nonsense')).toEqual([]);
  });

  it('builds the toolbox with one "move" per direction', () => {
    const box = toolbox(['move', 'repeat']) as { contents: unknown[] };
    expect(box.contents).toHaveLength(5);
  });
});

describe('programToJs', () => {
  it('shows the JavaScript a program stands for', () => {
    const code = programToJs([
      { when: 'run', do: [{ repeat: 2, do: [{ move: 'right' }] }, { say: 'Hi "you"' }] },
      { when: 'key-up', do: [{ move: 'up' }, { score: -1 }] },
      { do: ['collect'] },
    ]);
    expect(code).toContain('for (let i = 0; i < 2; i++) {');
    expect(code).toContain('say("Hi \\"you\\"");');
    expect(code).toContain("onKey('ArrowUp', () => {");
    expect(code).toContain('score -= 1;');
    expect(code).toContain('// collectGem();');
  });
});
