import {
  type GitAction,
  type GitCommit,
  GIT_LIMITS,
  type GitOutput,
  type GitSetup,
  type GitState,
} from './types.js';

const NOT_A_REPO = 'fatal: not a git repository (or any of the parent directories): .git';
const PATH = /^[\w.-]+(?:\/[\w.-]+){0,3}$/;
const BRANCH = /^[a-z0-9][\w./-]{0,39}$/i;

type Tree = Record<string, string>;

const ok = (output = ''): GitOutput => ({ output, ok: true });
const fail = (output: string): GitOutput => ({ output, ok: false });

/** FNV-1a, 32 bits: stable commit IDs in the browser and on the server alike. */
function fnv(text: string, seed = 0x811c9dc5): number {
  let hash = seed;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/** A 40-character ID made from the commit's content (like git's, not the same). */
function commitId(parents: string[], tree: Tree, message: string, seq: number): string {
  const text = JSON.stringify([parents, Object.entries(tree).toSorted(), message, seq]);
  let oid = '';
  let seed = 0x811c9dc5;
  while (oid.length < 40) {
    seed = fnv(text, seed);
    oid += seed.toString(16).padStart(8, '0');
  }
  return oid.slice(0, 40);
}

export const shortId = (oid: string) => oid.slice(0, 7);

export function emptyState(files: Tree = {}): GitState {
  return {
    initialized: false,
    files: { ...files },
    index: {},
    commits: {},
    branches: {},
    head: 'main',
    merging: null,
    seq: 0,
  };
}

const sameTree = (a: Tree, b: Tree) => {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...keys].every((key) => a[key] === b[key]);
};

export function headOid(state: GitState): string | null {
  return state.branches[state.head] ?? null;
}

export function headTree(state: GitState): Tree {
  const oid = headOid(state);
  return oid ? (state.commits[oid]?.tree ?? {}) : {};
}

/** Every commit reachable from `oid`, newest first by creation. */
export function ancestors(state: GitState, oid: string | null): GitCommit[] {
  if (!oid) return [];
  const seen = new Set<string>();
  const stack = [oid];
  while (stack.length) {
    const next = stack.pop()!;
    if (seen.has(next)) continue;
    seen.add(next);
    stack.push(...(state.commits[next]?.parents ?? []));
  }
  return [...seen]
    .map((id) => state.commits[id]!)
    .filter(Boolean)
    .toSorted((a, b) => b.seq - a.seq);
}

const isAncestor = (state: GitState, maybe: string, of: string | null) =>
  ancestors(state, of).some((entry) => entry.oid === maybe);

function mergeBase(state: GitState, a: string, b: string): string | null {
  const ofA = new Set(ancestors(state, a).map((c) => c.oid));
  return ancestors(state, b).find((entry) => ofA.has(entry.oid))?.oid ?? null;
}

/** What `git status` sorts files into. */
export function statusOf(state: GitState) {
  const head = headTree(state);
  const staged: { path: string; change: 'new file' | 'modified' | 'deleted' }[] = [];
  const unstaged: { path: string; change: 'modified' | 'deleted' }[] = [];
  const untracked: string[] = [];
  const paths = new Set([
    ...Object.keys(head),
    ...Object.keys(state.index),
    ...Object.keys(state.files),
  ]);
  for (const path of [...paths].toSorted()) {
    const [h, i, w] = [head[path], state.index[path], state.files[path]];
    if (i !== h) {
      staged.push({
        path,
        change: h === undefined ? 'new file' : i === undefined ? 'deleted' : 'modified',
      });
    }
    if (i === undefined && h === undefined) {
      if (w !== undefined) untracked.push(path);
    } else if (w !== i) {
      unstaged.push({ path, change: w === undefined ? 'deleted' : 'modified' });
    }
  }
  return { staged, unstaged, untracked };
}

/** Splits a command line into words, keeping "quoted text" together. */
export function splitCommand(line: string): string[] {
  const words: string[] = [];
  let current = '';
  let quote: string | null = null;
  let hasWord = false;
  for (const char of line.trim()) {
    if (quote) {
      if (char === quote) quote = null;
      else current += char;
    } else if (char === '"' || char === "'") {
      quote = char;
      hasWord = true;
    } else if (/\s/.test(char)) {
      if (hasWord) words.push(current);
      current = '';
      hasWord = false;
    } else {
      current += char;
      hasWord = true;
    }
  }
  if (hasWord) words.push(current);
  return words;
}

// ── Line diff (small files) ───────────────────────────────────────────────────

function linesOf(text: string): string[] {
  const all = text === '' ? [] : text.split('\n');
  if (all.at(-1) === '') all.pop();
  return all;
}

function diffLines(before: string, after: string): string[] {
  const a = linesOf(before);
  const b = linesOf(after);
  const rows = a.length + 1;
  const cols = b.length + 1;
  const lcs: number[] = Array.from({ length: rows * cols }, () => 0);
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lcs[i * cols + j] =
        a[i] === b[j]
          ? lcs[(i + 1) * cols + j + 1]! + 1
          : Math.max(lcs[(i + 1) * cols + j]!, lcs[i * cols + j + 1]!);
    }
  }
  const out: string[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      out.push(` ${a[i]}`);
      i++;
      j++;
    } else if (
      i < a.length &&
      (j >= b.length || lcs[(i + 1) * cols + j]! >= lcs[i * cols + j + 1]!)
    ) {
      out.push(`-${a[i]}`);
      i++;
    } else {
      out.push(`+${b[j]}`);
      j++;
    }
  }
  return out;
}

function diffText(from: Tree, to: Tree, paths: string[]): string {
  const parts: string[] = [];
  for (const path of paths) {
    if (from[path] === to[path]) continue;
    parts.push(`diff --git a/${path} b/${path}`);
    if (from[path] === undefined) parts.push('new file');
    if (to[path] === undefined) parts.push('deleted file');
    parts.push(...diffLines(from[path] ?? '', to[path] ?? ''));
  }
  return parts.join('\n');
}

// ── Commands ──────────────────────────────────────────────────────────────────

const HELP = [
  'Commands you can use here:',
  '  git init                    start a repository in this folder',
  '  git status                  what changed, and what is staged',
  '  git add <file> | .          stage changes for the next commit',
  '  git commit -m "message"     save the staged changes as a commit',
  '  git log [--oneline]         the history',
  '  git diff [--staged]         the changes, line by line',
  '  git branch [name]           list branches, or make one',
  '  git switch <branch>         move to a branch (-c to make it first)',
  '  git checkout <branch>       the same (-b to make it first)',
  '  git merge <branch>          bring another branch’s commits in',
  '  git restore [--staged] <f>  undo changes to a file',
  '  ls, cat <file>, help, clear',
].join('\n');

function commit(state: GitState, message: string): GitOutput {
  const parents = [headOid(state), state.merging?.oid].filter((p): p is string => Boolean(p));
  state.seq += 1;
  const tree = { ...state.index };
  const oid = commitId(parents, tree, message, state.seq);
  state.commits[oid] = { oid, message, parents, tree, seq: state.seq };
  const root = parents.length === 0;
  state.branches[state.head] = oid;
  state.merging = null;
  const changed = new Set([
    ...Object.keys(tree),
    ...Object.keys(parents[0] ? state.commits[parents[0]]!.tree : {}),
  ]);
  const count = [...changed].filter(
    (path) => tree[path] !== (parents[0] ? state.commits[parents[0]]!.tree[path] : undefined),
  ).length;
  return ok(
    `[${state.head}${root ? ' (root-commit)' : ''} ${shortId(oid)}] ${message}\n ${count} file${count === 1 ? '' : 's'} changed`,
  );
}

function runCommit(state: GitState, args: string[]): GitOutput {
  let message: string | null = null;
  let all = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === '-m' || arg === '--message') {
      message = args[i + 1] ?? '';
      i++;
    } else if (arg === '-am') {
      all = true;
      message = args[i + 1] ?? '';
      i++;
    } else if (arg === '-a' || arg === '--all') {
      all = true;
    } else if (arg.startsWith('--message=')) {
      message = arg.slice('--message='.length);
    } else {
      return fail(`error: unknown option '${arg}'. Use: git commit -m "message"`);
    }
  }
  if (state.merging?.conflicts.length) {
    return fail(
      'error: Committing is not possible because you have unmerged files.\nhint: Fix them, then `git add` them and commit.',
    );
  }
  if (message === null) {
    return fail('Aborting commit: write a message with -m, e.g. git commit -m "Add my page"');
  }
  message = message.trim().slice(0, GIT_LIMITS.messageLength);
  if (!message) return fail('Aborting commit due to empty commit message.');
  if (all) {
    for (const path of Object.keys(state.index)) {
      if (state.files[path] === undefined) delete state.index[path];
      else state.index[path] = state.files[path]!;
    }
  }
  if (!state.merging && sameTree(state.index, headTree(state))) {
    const { unstaged, untracked } = statusOf(state);
    return fail(
      unstaged.length || untracked.length
        ? 'no changes added to commit (use "git add" first)'
        : 'nothing to commit, working tree clean',
    );
  }
  return commit(state, message);
}

function runStatus(state: GitState): GitOutput {
  const lines = [`On branch ${state.head}`];
  if (!headOid(state)) lines.push('', 'No commits yet');
  const { staged, unstaged, untracked } = statusOf(state);
  if (state.merging) {
    lines.push(
      '',
      state.merging.conflicts.length
        ? 'You have unmerged paths.\n  (fix conflicts and run "git commit")'
        : 'All conflicts fixed but you are still merging.\n  (use "git commit" to conclude merge)',
    );
    if (state.merging.conflicts.length) {
      lines.push(
        '',
        'Unmerged paths:',
        ...state.merging.conflicts.map((p) => `\tboth modified:   ${p}`),
      );
    }
  }
  const conflicts = new Set(state.merging?.conflicts ?? []);
  const stagedShown = staged.filter((s) => !conflicts.has(s.path));
  if (stagedShown.length) {
    lines.push(
      '',
      'Changes to be committed:',
      ...stagedShown.map((s) => `\t${`${s.change}:`.padEnd(12)}${s.path}`),
    );
  }
  const unstagedShown = unstaged.filter((s) => !conflicts.has(s.path));
  if (unstagedShown.length) {
    lines.push(
      '',
      'Changes not staged for commit:',
      ...unstagedShown.map((s) => `\t${`${s.change}:`.padEnd(12)}${s.path}`),
    );
  }
  if (untracked.length) lines.push('', 'Untracked files:', ...untracked.map((p) => `\t${p}`));
  if (!staged.length && !unstaged.length && !untracked.length && !state.merging) {
    lines.push(
      headOid(state)
        ? 'nothing to commit, working tree clean'
        : 'nothing to commit (create a file and use "git add")',
    );
  }
  return ok(lines.join('\n'));
}

function runAdd(state: GitState, args: string[]): GitOutput {
  if (args.length === 0) return fail('Nothing specified, nothing added. Try: git add .');
  const every = args.some((a) => a === '.' || a === '-A' || a === '--all');
  const paths = every
    ? [...new Set([...Object.keys(state.files), ...Object.keys(state.index)])]
    : args;
  for (const path of paths) {
    if (state.files[path] !== undefined) state.index[path] = state.files[path]!;
    else if (state.index[path] !== undefined) delete state.index[path];
    else return fail(`fatal: pathspec '${path}' did not match any files`);
    if (state.merging) state.merging.conflicts = state.merging.conflicts.filter((p) => p !== path);
  }
  return ok();
}

function decorations(state: GitState, oid: string): string {
  const names = Object.entries(state.branches)
    .filter(([, tip]) => tip === oid)
    .map(([name]) => name)
    .toSorted((a, b) => (a === state.head ? -1 : b === state.head ? 1 : a.localeCompare(b)));
  if (!names.length) return '';
  return ` (${names.map((name) => (name === state.head ? `HEAD -> ${name}` : name)).join(', ')})`;
}

function runLog(state: GitState, args: string[]): GitOutput {
  const named = args.find((arg) => !arg.startsWith('-'));
  if (named !== undefined && !state.branches[named]) {
    return fail(`fatal: ambiguous argument '${named}': unknown revision`);
  }
  const head = named ? state.branches[named]! : headOid(state);
  if (!head) {
    return fail(`fatal: your current branch '${state.head}' does not have any commits yet`);
  }
  const oneline = args.includes('--oneline');
  const commits = ancestors(state, head);
  return ok(
    commits
      .map((c) =>
        oneline
          ? `${shortId(c.oid)}${decorations(state, c.oid)} ${c.message}`
          : `commit ${c.oid}${decorations(state, c.oid)}${c.parents.length > 1 ? `\nMerge: ${c.parents.map(shortId).join(' ')}` : ''}\n\n    ${c.message}\n`,
      )
      .join('\n'),
  );
}

function runBranch(state: GitState, args: string[]): GitOutput {
  if (args.length === 0) {
    const names = Object.keys(state.branches).filter((n) => state.branches[n] || n === state.head);
    return ok(
      names
        .toSorted()
        .map((n) => `${n === state.head ? '*' : ' '} ${n}`)
        .join('\n'),
    );
  }
  if (args[0] === '-d' || args[0] === '-D' || args[0] === '--delete') {
    const name = args[1];
    if (!name || state.branches[name] === undefined) {
      return fail(`error: branch '${name ?? ''}' not found.`);
    }
    if (name === state.head) {
      return fail(`error: Cannot delete branch '${name}' checked out`);
    }
    if (args[0] !== '-D' && !isAncestor(state, state.branches[name]!, headOid(state))) {
      return fail(
        `error: The branch '${name}' is not fully merged.\nIf you are sure you want to delete it, run 'git branch -D ${name}'.`,
      );
    }
    delete state.branches[name];
    return ok(`Deleted branch ${name}.`);
  }
  return createBranch(state, args[0]!);
}

function createBranch(state: GitState, name: string): GitOutput {
  if (!BRANCH.test(name) || name.includes('..')) {
    return fail(`fatal: '${name}' is not a valid branch name.`);
  }
  if (state.branches[name] !== undefined && (state.branches[name] || name === state.head)) {
    return fail(`fatal: a branch named '${name}' already exists`);
  }
  const head = headOid(state);
  if (!head) return fail(`fatal: Not a valid object name: '${state.head}'. Commit first.`);
  if (Object.keys(state.branches).length >= 20) return fail('fatal: too many branches here');
  state.branches[name] = head;
  return ok();
}

function switchTo(state: GitState, name: string): GitOutput {
  if (state.merging) return fail('error: you need to resolve your current index first');
  if (state.branches[name] === undefined) {
    return fail(`error: pathspec '${name}' did not match any branch known to git`);
  }
  if (name === state.head) return ok(`Already on '${name}'`);
  const current = headTree(state);
  const target = state.branches[name] ? state.commits[state.branches[name]!]!.tree : {};
  const paths = new Set([
    ...Object.keys(current),
    ...Object.keys(target),
    ...Object.keys(state.files),
    ...Object.keys(state.index),
  ]);
  const dirty = [...paths].filter(
    (p) => state.files[p] !== current[p] || state.index[p] !== current[p],
  );
  const blocked = dirty.filter((p) => target[p] !== current[p]);
  if (blocked.length) {
    return fail(
      `error: Your local changes to the following files would be overwritten by checkout:\n${blocked.map((p) => `\t${p}`).join('\n')}\nPlease commit your changes before you switch branches.`,
    );
  }
  const files: Tree = { ...target };
  const index: Tree = { ...target };
  for (const path of dirty) {
    if (state.files[path] === undefined) delete files[path];
    else files[path] = state.files[path]!;
    if (state.index[path] === undefined) delete index[path];
    else index[path] = state.index[path]!;
  }
  state.files = files;
  state.index = index;
  state.head = name;
  return ok(`Switched to branch '${name}'`);
}

function runSwitch(state: GitState, command: 'switch' | 'checkout', args: string[]): GitOutput {
  const create = args[0] === (command === 'switch' ? '-c' : '-b') || args[0] === '--create';
  const name = create ? args[1] : args[0];
  if (!name) return fail(`usage: git ${command} <branch>`);
  if (create) {
    const made = createBranch(state, name);
    if (!made.ok) return made;
    const moved = switchTo(state, name);
    return moved.ok ? ok(`Switched to a new branch '${name}'`) : moved;
  }
  return switchTo(state, name);
}

/** Text that ends with a line break (conflict sections). */
const endLine = (text: string) => (text === '' || text.endsWith('\n') ? text : `${text}\n`);

function runMerge(state: GitState, args: string[]): GitOutput {
  if (args[0] === '--abort') {
    if (!state.merging) return fail('fatal: There is no merge to abort.');
    state.merging = null;
    state.files = { ...headTree(state) };
    state.index = { ...headTree(state) };
    return ok();
  }
  const name = args[0];
  if (!name) return fail('usage: git merge <branch>');
  if (state.merging) return fail('error: Merging is not possible because you have unmerged files.');
  const theirs = state.branches[name];
  if (!theirs) return fail(`merge: ${name} - not something we can merge`);
  const ours = headOid(state);
  const { staged, unstaged } = statusOf(state);
  if (staged.length || unstaged.length) {
    return fail(
      'error: Your local changes would be overwritten by merge.\nPlease commit your changes before you merge.',
    );
  }
  if (ours && isAncestor(state, theirs, ours)) return ok('Already up to date.');
  const theirTree = state.commits[theirs]!.tree;
  if (!ours || isAncestor(state, ours, theirs)) {
    state.branches[state.head] = theirs;
    state.files = {
      ...theirTree,
      ...Object.fromEntries(statusOf(state).untracked.map((p) => [p, state.files[p]!])),
    };
    state.index = { ...theirTree };
    return ok(`Updating ${ours ? shortId(ours) : '0000000'}..${shortId(theirs)}\nFast-forward`);
  }
  const base = mergeBase(state, ours, theirs);
  const baseTree = base ? state.commits[base]!.tree : {};
  const ourTree = headTree(state);
  const merged: Tree = {};
  const conflicts: string[] = [];
  const paths = new Set([
    ...Object.keys(baseTree),
    ...Object.keys(ourTree),
    ...Object.keys(theirTree),
  ]);
  for (const path of [...paths].toSorted()) {
    const [b, o, t] = [baseTree[path], ourTree[path], theirTree[path]];
    let result: string | undefined;
    if (o === t) result = o;
    else if (o === b) result = t;
    else if (t === b) result = o;
    else {
      conflicts.push(path);
      result = `<<<<<<< HEAD\n${endLine(o ?? '')}=======\n${endLine(t ?? '')}>>>>>>> ${name}\n`;
    }
    if (result !== undefined) merged[path] = result;
  }
  if (conflicts.length === 0) {
    state.index = { ...merged };
    state.files = {
      ...merged,
      ...Object.fromEntries(statusOf(state).untracked.map((p) => [p, state.files[p]!])),
    };
    state.merging = { branch: name, oid: theirs, conflicts: [] };
    const made = commit(state, `Merge branch '${name}'`);
    return ok(`Merge made by the 'ort' strategy.\n${made.output.split('\n').slice(1).join('\n')}`);
  }
  const index: Tree = {};
  for (const [path, content] of Object.entries(merged)) {
    if (!conflicts.includes(path)) index[path] = content;
    else if (ourTree[path] !== undefined) index[path] = ourTree[path]!;
  }
  state.index = index;
  state.files = { ...state.files, ...merged };
  for (const path of Object.keys(state.files)) {
    if (
      merged[path] === undefined &&
      (ourTree[path] !== undefined || theirTree[path] !== undefined)
    ) {
      delete state.files[path];
    }
  }
  state.merging = { branch: name, oid: theirs, conflicts };
  return fail(
    `${conflicts.map((p) => `CONFLICT (content): Merge conflict in ${p}`).join('\n')}\nAutomatic merge failed; fix conflicts and then commit the result.`,
  );
}

function runDiff(state: GitState, args: string[]): GitOutput {
  const stagedOnly = args.includes('--staged') || args.includes('--cached');
  const from = stagedOnly ? headTree(state) : state.index;
  const to = stagedOnly ? state.index : state.files;
  const tracked = new Set([...Object.keys(state.index), ...Object.keys(headTree(state))]);
  const paths = [...new Set([...Object.keys(from), ...Object.keys(to)])]
    .filter((p) => stagedOnly || tracked.has(p))
    .toSorted();
  return ok(diffText(from, to, paths));
}

function runRestore(state: GitState, args: string[]): GitOutput {
  const staged = args.includes('--staged');
  const paths = args.filter((a) => !a.startsWith('--'));
  if (!paths.length) return fail('fatal: you must specify path(s) to restore');
  const head = headTree(state);
  for (const path of paths) {
    const source = staged ? head[path] : state.index[path];
    if (source === undefined && (staged ? state.index[path] : state.files[path]) === undefined) {
      return fail(`error: pathspec '${path}' did not match any file(s) known to git`);
    }
    const target = staged ? state.index : state.files;
    if (source === undefined) delete target[path];
    else target[path] = source;
  }
  return ok();
}

function runRm(state: GitState, args: string[]): GitOutput {
  const paths = args.filter((a) => !a.startsWith('-'));
  if (!paths.length) return fail('usage: git rm <file>');
  for (const path of paths) {
    if (state.index[path] === undefined) {
      return fail(`fatal: pathspec '${path}' did not match any files`);
    }
    delete state.index[path];
    delete state.files[path];
  }
  return ok(paths.map((p) => `rm '${p}'`).join('\n'));
}

/** Runs one command line against the repository (changing it) and says what happened. */
export function runCommand(state: GitState, line: string): GitOutput {
  if (line.length > GIT_LIMITS.commandLength) return fail('That command is too long.');
  const words = splitCommand(line);
  const [program, command, ...args] = words;
  if (!program) return ok();
  if (program === 'help') return ok(HELP);
  if (program === 'clear') return ok();
  if (program === 'ls') {
    return ok(Object.keys(state.files).toSorted().join('\n'));
  }
  if (program === 'cat') {
    const path = command ?? '';
    return state.files[path] !== undefined
      ? ok(state.files[path])
      : fail(`cat: ${path}: No such file or directory`);
  }
  if (program !== 'git')
    return fail(`${program}: command not found. Type help to see what works here.`);
  if (!command || command === 'help' || command === '--help') return ok(HELP);
  if (command === 'init') {
    if (state.initialized) return ok('Reinitialized existing Git repository in ./.git/');
    state.initialized = true;
    state.branches = { main: null };
    state.head = 'main';
    state.index = {};
    return ok('Initialized empty Git repository in ./.git/');
  }
  if (!state.initialized) return fail(NOT_A_REPO);
  switch (command) {
    case 'status':
      return runStatus(state);
    case 'add':
      return runAdd(state, args);
    case 'commit':
      return runCommit(state, args);
    case 'log':
      return runLog(state, args);
    case 'branch':
      return runBranch(state, args);
    case 'switch':
    case 'checkout':
      return runSwitch(state, command, args);
    case 'merge':
      return runMerge(state, args);
    case 'diff':
      return runDiff(state, args);
    case 'restore':
      return runRestore(state, args);
    case 'rm':
      return runRm(state, args);
    default:
      return fail(`git: '${command}' is not a git command here. Type help to see what works.`);
  }
}

/** Applies one action: a command, or a file written or removed in the editor. */
export function applyAction(state: GitState, action: GitAction): GitOutput {
  if ('run' in action) return runCommand(state, String(action.run));
  if ('write' in action) {
    const path = String(action.write);
    if (!PATH.test(path) || path.split('/').some((part) => /^\.+$/.test(part))) {
      return fail(`Can't use '${path}' as a file name.`);
    }
    const content = String(action.content ?? '').slice(0, GIT_LIMITS.fileLength);
    if (state.files[path] === undefined && Object.keys(state.files).length >= GIT_LIMITS.files) {
      return fail('This folder has as many files as it can hold.');
    }
    state.files[path] = content;
    return ok();
  }
  if ('remove' in action) {
    delete state.files[String(action.remove)];
    return ok();
  }
  return fail('Unknown step.');
}

/** Reads the student's steps (JSON), keeping only well-formed ones, up to the limit. */
export function parseActions(session: string | undefined): GitAction[] {
  if (!session) return [];
  let raw: unknown;
  try {
    raw = JSON.parse(session);
  } catch {
    return [];
  }
  if (!Array.isArray(raw)) return [];
  const actions: GitAction[] = [];
  for (const item of raw.slice(0, GIT_LIMITS.actions)) {
    if (!item || typeof item !== 'object') continue;
    const value = item as Record<string, unknown>;
    if (typeof value.run === 'string') actions.push({ run: value.run });
    else if (typeof value.write === 'string' && typeof value.content === 'string') {
      actions.push({ write: value.write, content: value.content });
    } else if (typeof value.remove === 'string') actions.push({ remove: value.remove });
  }
  return actions;
}

/** The repository after the lesson's setup and the student's steps. */
export function replay(setup: GitSetup, actions: GitAction[]): GitState {
  const state = emptyState(setup.files);
  for (const action of setup.setup ?? []) applyAction(state, action);
  for (const action of actions.slice(0, GIT_LIMITS.actions)) applyAction(state, action);
  return state;
}
