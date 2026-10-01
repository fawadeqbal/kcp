import type { Check, CheckResult, GitCheck } from '../types.js';
import { ancestors, headOid, headTree, parseActions, replay, statusOf } from './repo.js';
import type { GitSetup, GitState } from './types.js';

const CONFLICT_MARKER = /^(<{7}|={7}|>{7})/m;

function passes(state: GitState, check: GitCheck): boolean {
  if (check.initialized !== undefined && state.initialized !== check.initialized) return false;
  const head = headOid(state);
  const tree = headTree(state);
  const history = ancestors(state, head);
  if (check.commits !== undefined && history.length < check.commits) return false;
  if (check.branches?.some((name) => !state.branches[name])) return false;
  if (check.onBranch !== undefined && state.head !== check.onBranch) return false;
  if (check.committed?.some((path) => tree[path] === undefined)) return false;
  if (check.contains) {
    const content = tree[check.contains.path];
    if (content === undefined) return false;
    if (!content.toLowerCase().includes(check.contains.text.toLowerCase())) return false;
  }
  if (check.clean) {
    const { staged, unstaged, untracked } = statusOf(state);
    if (staged.length || unstaged.length || untracked.length || state.merging) return false;
  }
  if (check.staged) {
    const staged = new Set(statusOf(state).staged.map((s) => s.path));
    if (check.staged.some((path) => !staged.has(path))) return false;
  }
  if (check.merged !== undefined) {
    const tip = state.branches[check.merged];
    if (!tip || !history.some((commit) => commit.oid === tip)) return false;
  }
  if (check.mergeCommit && !history.some((commit) => commit.parents.length > 1)) return false;
  if (check.resolved) {
    if (state.merging) return false;
    if (Object.values(tree).some((content) => CONFLICT_MARKER.test(content))) return false;
  }
  return true;
}

/** Replays the lesson's setup and the student's steps (JSON), then runs the git checks. */
export function evaluateGitChecks(
  setup: GitSetup,
  session: string | undefined,
  checks: readonly Check[],
): CheckResult[] {
  const state = replay(setup, parseActions(session));
  return checks.map((check) => {
    const passed = check.expect === 'git' && passes(state, check);
    return { id: check.id, passed, ...(passed || !check.hint ? {} : { hint: check.hint }) };
  });
}

/** The same, for a repository already replayed (the browser keeps one). */
export function gitCheckResults(state: GitState, checks: readonly Check[]): CheckResult[] {
  return checks.map((check) => {
    const passed = check.expect === 'git' && passes(state, check);
    return { id: check.id, passed, ...(passed || !check.hint ? {} : { hint: check.hint }) };
  });
}
