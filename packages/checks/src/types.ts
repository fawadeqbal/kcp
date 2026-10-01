import type { BlockKind, Direction } from './stage/types.js';

/**
 * Challenge checks. Authors write them in content/…/challenges/*.yaml; the API
 * serves them with the challenge; the sandbox runs them against the student's page.
 */

/** The student's code, one entry per file. */
export interface CodeFiles {
  html?: string;
  css?: string;
  js?: string;
  /** A Python program (Python lessons): runs with Pyodide instead of as a page. */
  py?: string;
  /** A block program (Explorer lessons): JSON, see stage/types.ts. Never runs as code. */
  blocks?: string;
  /** Git lessons: the steps taken in the practice repository (JSON, see git/types.ts). */
  git?: string;
}

export { CODE_FILE_KEYS, type CodeFileKey, MAX_CODE_FILE_LENGTH } from '@kcp/shared';

interface CheckBase {
  /** Stable within the challenge, e.g. "has-link". */
  id: string;
  /** Key of the hint to show when the check fails (translated per language). */
  hint?: string;
}

/** At least `min` (default 1) and at most `max` elements match the selector. */
export interface ExistsCheck extends CheckBase {
  expect: 'exists';
  selector: string;
  min?: number;
  max?: number;
}

/** Text content of matching elements. `all` = every match must pass, otherwise any. */
export interface TextCheck extends CheckBase {
  expect: 'text';
  selector: string;
  notEmpty?: boolean;
  /** Case-insensitive. */
  includes?: string;
  equals?: string;
  all?: boolean;
}

/** An attribute on matching elements (any match, or every match with `all`). */
export interface AttributeCheck extends CheckBase {
  expect: 'attribute';
  selector: string;
  name: string;
  notEmpty?: boolean;
  /** Case-insensitive substring. */
  includes?: string;
  all?: boolean;
}

/**
 * The student's CSS has a rule for `selector` that sets `property`. Checks what
 * they wrote rather than computed styles, so it works the same in every browser.
 */
export interface CssCheck extends CheckBase {
  expect: 'css';
  selector: string;
  property: string;
  /** Case-insensitive substring of the value, e.g. "px". */
  includes?: string;
}

/**
 * JavaScript that runs after the page loaded, as the body of an async function.
 * Return a truthy value to pass; throwing fails the check.
 */
export interface TestCheck extends CheckBase {
  expect: 'test';
  code: string;
}

/**
 * Python: what the program prints. It runs with `stdin` typed in (one answer per
 * line, for input()). Text is compared case-insensitively, ignoring extra spaces.
 */
export interface OutputCheck extends CheckBase {
  expect: 'output';
  /** Answers typed in when the program calls input(), one per line. */
  stdin?: string;
  notEmpty?: boolean;
  includes?: string;
  /** The whole output. */
  equals?: string;
  /** At least this many lines that aren't empty. */
  minLines?: number;
}

/**
 * Python code that runs after the student's program, with the program's variables
 * and functions, plus `__source__` (the program's text) and `__output__` (what it
 * printed). Passes unless it raises, so write it with `assert`.
 */
export interface PythonCheck extends CheckBase {
  expect: 'python';
  stdin?: string;
  code: string;
}

/**
 * Explorer: where Bit ends up after the program runs on the level. In games, `keys`
 * are pressed one after another once the program started (the star moves the same
 * way every time for a given `seed`). Every condition given must hold, and a program
 * stopped for looping too long fails.
 */
export interface StageCheck extends CheckBase {
  expect: 'stage';
  keys?: Direction[];
  seed?: number;
  /** Bit ends on the flag. */
  atGoal?: boolean;
  /** Bit ends on this square: [column, row], counting from 0 at the top left. */
  endsAt?: [number, number];
  /** Gems still on the map at the end (0: all collected). */
  gemsLeft?: number;
  /** The score is at least this. */
  minScore?: number;
  /** Bit said this (case-insensitive, part of what was said). */
  said?: string;
  /** Bit never bumped into a wall. */
  noBump?: boolean;
}

/**
 * Explorer: which blocks the program uses, counting the scripts that run (a stack
 * with a "when" block on top), hats included.
 */
export interface BlocksCheck extends CheckBase {
  expect: 'blocks';
  uses?: BlockKind[];
  /** At most this many blocks: rewards using a loop instead of copies. */
  maxBlocks?: number;
  minBlocks?: number;
}

/**
 * Git lessons: the practice repository after the student's steps. Every condition
 * given must hold.
 */
export interface GitCheck extends CheckBase {
  expect: 'git';
  /** `git init` was run (or not). */
  initialized?: boolean;
  /** At least this many commits in the current branch's history. */
  commits?: number;
  /** These branches exist (with at least one commit). */
  branches?: string[];
  /** The current branch. */
  onBranch?: string;
  /** These files are in the latest commit. */
  committed?: string[];
  /** A file in the latest commit contains this text (case-insensitive). */
  contains?: { path: string; text: string };
  /** Nothing left to commit: the folder and the staging area match the latest commit. */
  clean?: boolean;
  /** These files have changes staged for the next commit. */
  staged?: string[];
  /** This branch's commits are part of the current branch (it was merged). */
  merged?: string;
  /** The history has a merge commit. */
  mergeCommit?: boolean;
  /** No merge in progress, and no conflict markers left in the latest commit. */
  resolved?: boolean;
}

export type Check =
  | ExistsCheck
  | TextCheck
  | AttributeCheck
  | CssCheck
  | TestCheck
  | OutputCheck
  | PythonCheck
  | StageCheck
  | BlocksCheck
  | GitCheck;
export type CheckKind = Check['expect'];

/** Checks for Python programs; the others check web pages. */
export const PYTHON_CHECK_KINDS = ['output', 'python'] as const satisfies readonly CheckKind[];
export const isPythonCheck = (check: Check): check is OutputCheck | PythonCheck =>
  check.expect === 'output' || check.expect === 'python';

/** Checks for block programs (Explorer). */
export const STAGE_CHECK_KINDS = ['stage', 'blocks'] as const satisfies readonly CheckKind[];
export const isStageCheck = (check: Check): check is StageCheck | BlocksCheck =>
  check.expect === 'stage' || check.expect === 'blocks';

/** Checks for git lessons. */
export const GIT_CHECK_KINDS = ['git'] as const satisfies readonly CheckKind[];
export const isGitCheck = (check: Check): check is GitCheck => check.expect === 'git';

export interface CheckResult {
  id: string;
  passed: boolean;
  hint?: string;
}

/** A mistake in the student's code, for the problems panel. */
export interface CodeError {
  message: string;
  line?: number;
  /**
   * "loop": stopped for running too long. "input": a Python program asked for more
   * input() answers than were typed in.
   */
  kind: 'syntax' | 'runtime' | 'loop' | 'input';
  /** Python's name for the error, e.g. "NameError" (Python programs only). */
  name?: string;
}

export interface ConsoleLine {
  level: 'log' | 'warn' | 'error';
  text: string;
}

// ── Messages between the web app, the sandbox runner and the preview ──────────

/** Texts the preview shows itself, in the student's language. */
export interface PreviewLabels {
  /** Shown when a link in the preview is clicked (links don't leave the preview). */
  linkNotice?: string;
  /** Python: shown while Python starts. */
  pythonWaiting?: string;
  /** Python: shown while the program runs. */
  pythonRunning?: string;
  /** Python: the program printed nothing. */
  pythonNoOutput?: string;
  /** Python: the program ran too long and was stopped. */
  pythonStopped?: string;
  /** Python: Pyodide couldn't start. */
  pythonFailed?: string;
}

/** Web app → runner: show this code, and run the checks if given. */
export interface RunRequest {
  type: 'kcp:run';
  runId: string;
  files: CodeFiles;
  checks: Check[] | null;
  labels?: PreviewLabels;
  /** Python: answers for input(), one per line (the Run button's input box). */
  stdin?: string;
}

/**
 * Web app → runner: the Python runtime (Pyodide). The web app downloads it, so the
 * browser can cache it: the sandboxed runner has an opaque origin, and browsers
 * don't cache what such a page downloads.
 */
export interface PythonRuntimeMessage {
  type: 'kcp:python-runtime';
  version: string;
  files: PythonRuntimeFiles;
}

export interface PythonRuntimeFiles {
  /** pyodide.asm.mjs */
  asm: Blob;
  /** pyodide.asm.wasm */
  wasm: Blob;
  /** python_stdlib.zip */
  stdlib: Blob;
  /** pyodide-lock.json */
  lock: Blob;
}

/** What the sandbox publishes at /pyodide/manifest.json. */
export interface PythonManifest {
  version: string;
  /** Paths relative to the sandbox, with their sizes in bytes. */
  files: Record<keyof PythonRuntimeFiles, { path: string; size: number }>;
}

/** Runner → web app: the runner is loaded and listening. */
export interface ReadyMessage {
  type: 'kcp:ready';
}

/** Runner → web app: the outcome of one run. */
export interface RunResult {
  type: 'kcp:result';
  runId: string;
  /** "timeout": the page didn't finish in time (for example a very long loop). */
  status: 'done' | 'timeout';
  /** Present when checks were requested. */
  results: CheckResult[] | null;
  errors: CodeError[];
  console: ConsoleLine[];
}

/** Runner → web app: console lines and errors that came after the result (e.g. a button click). */
export interface ConsoleMessage {
  type: 'kcp:console';
  runId: string;
  errors: CodeError[];
  console: ConsoleLine[];
}

/** Runner → web app: Python is starting ("starting"), ready, or couldn't start ("failed"). */
export interface PythonStatusMessage {
  type: 'kcp:python-status';
  status: 'starting' | 'ready' | 'failed';
}

export type RunnerMessage = ReadyMessage | RunResult | ConsoleMessage | PythonStatusMessage;

export function isRunRequest(value: unknown): value is RunRequest {
  if (!value || typeof value !== 'object') return false;
  const message = value as Partial<RunRequest>;
  return (
    message.type === 'kcp:run' &&
    typeof message.runId === 'string' &&
    !!message.files &&
    typeof message.files === 'object' &&
    (message.checks === null || Array.isArray(message.checks)) &&
    (message.stdin === undefined || typeof message.stdin === 'string')
  );
}

export function isPythonRuntimeMessage(value: unknown): value is PythonRuntimeMessage {
  if (!value || typeof value !== 'object') return false;
  const message = value as Partial<PythonRuntimeMessage>;
  if (message.type !== 'kcp:python-runtime' || typeof message.version !== 'string') return false;
  const files = message.files as Partial<PythonRuntimeFiles> | undefined;
  return (
    !!files &&
    [files.asm, files.wasm, files.stdlib, files.lock].every((file) => file instanceof Blob)
  );
}

export function isRunnerMessage(value: unknown): value is RunnerMessage {
  if (!value || typeof value !== 'object') return false;
  const type = (value as { type?: unknown }).type;
  return (
    type === 'kcp:ready' ||
    type === 'kcp:result' ||
    type === 'kcp:console' ||
    type === 'kcp:python-status'
  );
}
