import {
  allPassed,
  type Check,
  type CheckResult,
  type CodeFiles,
  composeDocument,
  evaluateChecks,
  evaluateGitChecks,
  evaluateStageChecks,
  type GitSetup,
  isPythonCheck,
  type PyodideLike,
  runPythonChecks,
  runPythonProgram,
  type StageLevel,
  windowTestRunner,
} from '@kcp/checks';
import { runInNewContext } from 'node:vm';
import { Window } from 'happy-dom';
import type { Issue, LoadedQuiz, LoadedTrack } from './load.js';

let pyodide: Promise<PyodideLike> | null = null;

/** Pyodide, the same Python the sandbox runs (loaded once, only for Python content). */
function python(): Promise<PyodideLike> {
  pyodide ??= import('pyodide').then(
    async ({ loadPyodide }) => (await loadPyodide()) as unknown as PyodideLike,
  );
  return pyodide;
}

/**
 * Renders code in a headless DOM and runs the checks, like the browser sandbox does.
 * (happy-dom doesn't run scripts added with document.write, so the JavaScript runs
 * directly in the page's window.)
 */
export async function runChecks(
  files: CodeFiles,
  checks: Check[],
  { scripts = true, stage, repo }: { scripts?: boolean; stage?: StageLevel; repo?: GitSetup } = {},
): Promise<CheckResult[]> {
  if (files.git !== undefined) {
    // Git steps: the same simulator as the browser and the API.
    if (!repo) throw new Error('git steps need a repo');
    return evaluateGitChecks(repo, files.git, checks);
  }
  if (files.blocks !== undefined) {
    // Block programs: the same interpreter as the browser and the API.
    if (!stage) throw new Error('a block program needs a stage');
    return evaluateStageChecks(stage, files.blocks, checks);
  }
  if (files.py !== undefined) {
    return runPythonChecks(await python(), files.py, checks.filter(isPythonCheck)).results;
  }
  // scripts: false checks the page as the server does (no script at all, inline ones
  // included).
  const window = new Window({ settings: { disableJavaScriptEvaluation: !scripts } });
  try {
    window.document.write(composeDocument({ ...files, js: '' }));
    if (scripts && files.js?.trim()) window.eval(files.js);
    await window.happyDOM.waitUntilComplete();
    return await evaluateChecks(
      window.document as unknown as Document,
      checks,
      windowTestRunner(window as unknown as globalThis.Window),
    );
  } finally {
    await window.happyDOM.close();
  }
}

function invalidSelectors(checks: Check[]): string[] {
  const window = new Window();
  const bad: string[] = [];
  for (const check of checks) {
    if (!('selector' in check)) continue;
    try {
      window.document.querySelector(check.selector);
    } catch {
      bad.push(check.selector);
    }
  }
  void window.happyDOM.close();
  return bad;
}

/** Checks the server re-runs on its own, with scripts off (apps/api learning/server-checks.ts). */
const STATIC_CHECKS = new Set(['exists', 'text', 'attribute', 'css']);

/**
 * Checks one piece of work: the solution passes, and the starter doesn't already.
 * Except in JavaScript lessons, the solution must also pass the HTML and CSS checks
 * with its script off, as the server checks them; and it may only use the files the
 * starter has (the editor's tabs; the API drops any other file).
 */
async function verifyWork(
  data: {
    solution: CodeFiles;
    starter: CodeFiles;
    checks: unknown[];
    type?: string;
    stage?: unknown;
    repo?: unknown;
  },
  file: string,
  issues: Issue[],
) {
  const checks = data.checks as Check[];
  for (const selector of invalidSelectors(checks)) {
    issues.push({ level: 'error', file, message: `invalid CSS selector "${selector}"` });
  }
  for (const key of Object.keys(data.solution)) {
    if (data.starter[key as keyof CodeFiles] === undefined) {
      issues.push({
        level: 'error',
        file,
        message: `the solution has a "${key}" file, but the starter (the editor's tabs) doesn't`,
      });
    }
  }
  const stage = data.stage as StageLevel | undefined;
  const repo = data.repo as GitSetup | undefined;
  try {
    const solved = await runChecks(data.solution, checks, { stage, repo });
    for (const result of solved.filter((r) => !r.passed)) {
      issues.push({ level: 'error', file, message: `the solution fails check "${result.id}"` });
    }
    if (data.type !== 'js' && data.solution.py === undefined && !stage && !repo) {
      const readable = checks.filter((check) => STATIC_CHECKS.has(check.expect));
      const withoutScript = await runChecks({ ...data.solution, js: '' }, readable, {
        scripts: false,
      });
      const failed = new Set(solved.filter((r) => !r.passed).map((r) => r.id));
      for (const result of withoutScript.filter((r) => !r.passed && !failed.has(r.id))) {
        issues.push({
          level: 'error',
          file,
          message: `the solution only passes check "${result.id}" with its script running (outside JavaScript lessons, the server checks HTML and CSS with scripts off)`,
        });
      }
    }
    const started = await runChecks(data.starter, checks, { stage, repo });
    if (allPassed(started)) {
      issues.push({ level: 'error', file, message: 'the starter code already passes every check' });
    }
  } catch (error) {
    issues.push({
      level: 'error',
      file,
      message: `could not run the checks: ${(error as Error).message}`,
    });
  }
}

/** What a JavaScript program prints with console.log (our own content, not students'). */
export function runJavaScript(code: string): string {
  const lines: string[] = [];
  const log = (...values: unknown[]) => lines.push(values.map(String).join(' '));
  runInNewContext(code, { console: { log, info: log } }, { timeout: 1000 });
  return lines.join('\n');
}

const normalise = (text: string) => text.trim().replace(/\s+/g, ' ').toLowerCase();

/**
 * "What does this print?" quizzes in Python or JavaScript: run the code and prove the
 * answer is the output, and that no other option is.
 */
async function verifyQuiz(quiz: LoadedQuiz, file: string, issues: Issue[]) {
  const q = quiz.data;
  if (q.kind !== 'output' || (q.language !== 'python' && q.language !== 'js')) return;
  const program = (q.code ?? []).join('\n');
  let printed: string;
  try {
    printed = q.language === 'js' ? runJavaScript(program) : await pythonOutput(program);
  } catch (error) {
    issues.push({
      level: 'error',
      file,
      message: `the code doesn't run: ${(error as Error).message}`,
    });
    return;
  }
  for (const option of q.options ?? []) {
    if (option.code === undefined) continue;
    const matches = normalise(option.code) === normalise(printed);
    if (option.id === q.answer && !matches) {
      issues.push({
        level: 'error',
        file,
        message: `the answer "${option.id}" isn't what the code prints (${JSON.stringify(printed)})`,
      });
    }
    if (option.id !== q.answer && matches) {
      issues.push({
        level: 'error',
        file,
        message: `option "${option.id}" is also what the code prints`,
      });
    }
  }
}

/** The output of a Python program, with the same Pyodide the sandbox runs. */
async function pythonOutput(program: string): Promise<string> {
  const { run } = runPythonProgram(await python(), program);
  if (run.error) throw new Error(run.error.message);
  return run.output;
}

/**
 * Proves every challenge and project works: its solution passes all checks, and its
 * starter code does not (otherwise students would pass without doing anything).
 */
export async function verifyContent(tracks: LoadedTrack[], root: string): Promise<Issue[]> {
  const issues: Issue[] = [];
  const rel = (file: string) =>
    file
      .slice(root.length + 1)
      .split('\\')
      .join('/');
  for (const track of tracks) {
    for (const mod of track.modules) {
      for (const lesson of mod.lessons) {
        for (const challenge of lesson.challenges) {
          await verifyWork(challenge.data, rel(challenge.file), issues);
        }
        for (const quiz of lesson.quizzes) await verifyQuiz(quiz, rel(quiz.file), issues);
      }
      if (mod.project) await verifyWork(mod.project.data, rel(mod.project.file), issues);
    }
  }
  return issues;
}
