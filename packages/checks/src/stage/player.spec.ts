// @vitest-environment happy-dom
import { mountStage, type StageLabels } from './player.js';
import type { StageLevel } from './types.js';

const labels: StageLabels = {
  stage: "Bit's world",
  score: 'Score: {score}',
  gems: 'Gems left: {count}',
  time: 'Time: {seconds}',
  says: 'Bit says: {text}',
  bumped: 'Bump!',
  collected: 'Got a gem',
  nothingHere: 'No gem here',
  reachedGoal: 'Bit reached the flag!',
  loop: 'Stopped',
  timeUp: "Time's up! Score: {score}",
  howToPlay: 'Use the arrows',
  up: 'Up',
  down: 'Down',
  left: 'Left',
  right: 'Right',
};

const maze: StageLevel = {
  mode: 'maze',
  map: ['#####', '#S*G#', '#####'],
  toolbox: ['when-run', 'move'],
};

describe('mountStage', () => {
  it('draws the level and plays a program', async () => {
    const root = document.createElement('div');
    document.body.append(root);
    const player = mountStage(root, maze, { labels, stepMs: 1, reducedMotion: true });
    expect(root.querySelector('svg')?.getAttribute('aria-label')).toBe("Bit's world");
    expect(root.querySelectorAll('.gem')).toHaveLength(1);
    expect(root.textContent).toContain('Gems left: 1');

    const outcome = await player.play([
      { when: 'run', do: [{ move: 'right' }, 'collect', { say: 'Hi <b>' }, { move: 'right' }] },
    ]);
    expect(outcome).toEqual({ atGoal: true, gemsLeft: 0, score: 0, stopped: false });
    expect(root.textContent).toContain('Gems left: 0');
    // Text is shown as text, never as HTML.
    expect(root.querySelector('.kcp-stage-say')?.textContent).toBe('Hi <b>');
    expect(root.querySelector('.kcp-stage-say b')).toBeNull();
    expect(root.querySelector('[aria-live]')?.textContent).toBe('Bit reached the flag!');

    player.reset();
    expect(root.querySelectorAll('.gem.gone')).toHaveLength(0);
    player.destroy();
    expect(root.childElementCount).toBe(0);
  });

  it('runs games from the arrow buttons until stopped', async () => {
    const root = document.createElement('div');
    const player = mountStage(
      root,
      { mode: 'game', map: ['S.T', '...'], toolbox: [], seconds: 30 },
      { labels, stepMs: 1, reducedMotion: true },
    );
    const done = player.play([
      { when: 'key-right', do: [{ move: 'right' }] },
      { when: 'star', do: [{ score: 5 }] },
    ]);
    await new Promise((resolve) => setTimeout(resolve, 5));
    const right = root.querySelector<HTMLButtonElement>('.kcp-stage-pad .right')!;
    expect(right.disabled).toBe(false);
    right.click();
    right.click();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(root.textContent).toContain('Score: 5');
    player.stop();
    const outcome = await done;
    expect(outcome.score).toBe(5);
    player.destroy();
  });
});
