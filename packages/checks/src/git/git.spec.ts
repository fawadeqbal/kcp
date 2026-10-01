import { evaluateGitChecks } from './checks.js';
import { emptyState, headTree, replay, runCommand, splitCommand, statusOf } from './repo.js';
import type { GitCheck } from '../types.js';
import type { GitAction, GitSetup } from './types.js';

const run = (...lines: string[]): GitAction[] => lines.map((line) => ({ run: line }));
const write = (path: string, content: string): GitAction => ({ write: path, content });

describe('the practice git repository', () => {
  it('splits command lines like a shell, keeping quoted text together', () => {
    expect(splitCommand('git commit -m "Add my page"')).toEqual([
      'git',
      'commit',
      '-m',
      'Add my page',
    ]);
    expect(splitCommand("git commit -m 'it''s'")).toEqual(['git', 'commit', '-m', 'its']);
    expect(splitCommand('  git   status ')).toEqual(['git', 'status']);
    expect(splitCommand('git commit -m ""')).toEqual(['git', 'commit', '-m', '']);
  });

  it('needs git init first, then stages and commits', () => {
    const state = emptyState({ 'index.html': '<h1>Hi</h1>' });
    expect(runCommand(state, 'git status').output).toMatch(/not a git repository/);
    expect(runCommand(state, 'git init').ok).toBe(true);
    expect(runCommand(state, 'git status').output).toContain('Untracked files:\n\tindex.html');
    expect(runCommand(state, 'git commit -m "First"')).toEqual({
      ok: false,
      output: 'no changes added to commit (use "git add" first)',
    });
    expect(runCommand(state, 'git add index.htm').output).toMatch(/did not match any files/);
    runCommand(state, 'git add .');
    expect(statusOf(state).staged).toEqual([{ path: 'index.html', change: 'new file' }]);
    expect(runCommand(state, 'git commit').ok).toBe(false);
    const made = runCommand(state, 'git commit -m "My first page"');
    expect(made.output).toMatch(
      /^\[main \(root-commit\) [0-9a-f]{7}\] My first page\n 1 file changed$/,
    );
    expect(runCommand(state, 'git status').output).toContain(
      'nothing to commit, working tree clean',
    );
    expect(runCommand(state, 'git log --oneline').output).toMatch(
      /^[0-9a-f]{7} \(HEAD -> main\) My first page$/,
    );
  });

  it('switches branches, carrying changes that do not clash, and merges them back', () => {
    const setup: GitSetup = {
      files: { 'index.html': '<h1>Hi</h1>\n', 'style.css': 'h1 { color: red; }\n' },
      setup: run('git init', 'git add .', 'git commit -m "Start"'),
    };
    const state = replay(setup, [
      ...run('git switch -c colours'),
      write('style.css', 'h1 { color: blue; }\n'),
      ...run('git commit -am "Blue heading"', 'git switch main'),
    ]);
    expect(state.head).toBe('main');
    expect(runCommand(state, 'git log --oneline colours').output).toMatch(
      /^[0-9a-f]{7} \(colours\) Blue heading\n/,
    );
    expect(runCommand(state, 'git log --oneline').output).not.toContain('Blue heading');
    expect(state.files['style.css']).toBe('h1 { color: red; }\n');
    expect(runCommand(state, 'git merge colours').output).toMatch(/Fast-forward/);
    expect(headTree(state)['style.css']).toBe('h1 { color: blue; }\n');
    expect(runCommand(state, 'git log --oneline nope').ok).toBe(false);
    expect(runCommand(state, 'git merge colours').output).toBe('Already up to date.');
    expect(runCommand(state, 'git branch -d colours').output).toBe('Deleted branch colours.');
  });

  it('makes a merge commit, or stops at a conflict until it is fixed and committed', () => {
    const setup: GitSetup = {
      files: { 'index.html': '<h1>Hi</h1>\n', 'about.html': '<p>Me</p>\n' },
      setup: run('git init', 'git add .', 'git commit -m "Start"'),
    };
    const clean = replay(setup, [
      ...run('git branch about'),
      write('index.html', '<h1>Hello</h1>\n'),
      ...run('git commit -am "Hello"', 'git switch about'),
      write('about.html', '<p>Me and my cat</p>\n'),
      ...run('git commit -am "Cat"', 'git switch main', 'git merge about'),
    ]);
    expect(headTree(clean)).toEqual({
      'index.html': '<h1>Hello</h1>\n',
      'about.html': '<p>Me and my cat</p>\n',
    });
    expect(
      evaluateGitChecks(setup, undefined, [{ id: 'm', expect: 'git', mergeCommit: true }]),
    ).toEqual([{ id: 'm', passed: false }]);

    const steps: GitAction[] = [
      ...run('git switch -c blue'),
      write('index.html', '<h1 class="blue">Hi</h1>\n'),
      ...run('git commit -am "Blue"', 'git switch main'),
      write('index.html', '<h1 class="red">Hi</h1>\n'),
      ...run('git commit -am "Red"'),
    ];
    const conflicted = replay(setup, [...steps, ...run('git merge blue')]);
    expect(conflicted.merging?.conflicts).toEqual(['index.html']);
    expect(conflicted.files['index.html']).toBe(
      '<<<<<<< HEAD\n<h1 class="red">Hi</h1>\n=======\n<h1 class="blue">Hi</h1>\n>>>>>>> blue\n',
    );
    expect(runCommand(conflicted, 'git commit -m "Merge"').output).toMatch(/unmerged files/);
    expect(runCommand(conflicted, 'git switch blue').output).toMatch(/resolve your current index/);

    const session = JSON.stringify([
      ...steps,
      ...run('git merge blue'),
      write('index.html', '<h1 class="purple">Hi</h1>\n'),
      ...run('git add index.html', 'git commit -m "Purple it is"'),
    ]);
    const checks: GitCheck[] = [
      { id: 'merged', expect: 'git', merged: 'blue' },
      { id: 'resolved', expect: 'git', resolved: true, hint: 'fix' },
      { id: 'merge-commit', expect: 'git', mergeCommit: true },
      { id: 'purple', expect: 'git', contains: { path: 'index.html', text: 'PURPLE' } },
      { id: 'clean', expect: 'git', clean: true },
    ];
    expect(evaluateGitChecks(setup, session, checks).every((r) => r.passed)).toBe(true);
    // Committing the markers doesn't count as resolved.
    const lazy = JSON.stringify([
      ...steps,
      ...run('git merge blue', 'git add index.html', 'git commit -m "Done"'),
    ]);
    expect(evaluateGitChecks(setup, lazy, checks).find((r) => r.id === 'resolved')).toEqual({
      id: 'resolved',
      passed: false,
      hint: 'fix',
    });
  });

  it('refuses to switch when local changes would be lost, and restores files', () => {
    const state = replay(
      { files: { 'a.txt': 'one\n' }, setup: run('git init', 'git add .', 'git commit -m "A"') },
      [
        ...run('git switch -c other'),
        write('a.txt', 'two\n'),
        ...run('git commit -am "Two"', 'git switch main'),
      ],
    );
    state.files['a.txt'] = 'three\n';
    expect(runCommand(state, 'git switch other').output).toMatch(/would be overwritten/);
    expect(runCommand(state, 'git diff').output).toBe('diff --git a/a.txt b/a.txt\n-one\n+three');
    runCommand(state, 'git restore a.txt');
    expect(state.files['a.txt']).toBe('one\n');
    expect(runCommand(state, 'git switch other').ok).toBe(true);
  });

  it('ignores steps that are not well-formed, and anything past the limit', () => {
    const setup: GitSetup = { files: { 'a.txt': 'x' } };
    const junk = JSON.stringify([
      { run: 'git init' },
      { nope: 1 },
      'text',
      { write: '../x', content: 'y' },
    ]);
    const state = replay(
      setup,
      JSON.parse(junk).filter((a: unknown) => typeof a === 'object'),
    );
    expect(state.initialized).toBe(true);
    expect(Object.keys(state.files)).toEqual(['a.txt']);
    expect(
      evaluateGitChecks(setup, 'not json', [{ id: 'i', expect: 'git', initialized: true }]),
    ).toEqual([{ id: 'i', passed: false }]);
    const many = JSON.stringify(
      Array.from({ length: 500 }, (_, i) => ({ write: 'a.txt', content: String(i) })),
    );
    const results = evaluateGitChecks({ files: {}, setup: run('git init') }, many, [
      { id: 'n', expect: 'git', staged: ['a.txt'] },
    ]);
    expect(results[0]!.passed).toBe(false);
  });
});
