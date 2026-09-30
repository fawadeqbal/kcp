import type { CheckResult, CodeError, OutputCheck, PythonCheck } from './types.js';

/*
 * Running a student's Python program with Pyodide, and checking it. Shared by the
 * sandbox (a Web Worker in the browser) and tools/content-import (Node), so a
 * lesson's example solution is checked exactly the way students' programs are.
 */

/** The file name Python shows in error messages ("line 3 in main.py"). */
export const PYTHON_FILENAME = 'main.py';
/** Output kept per run; a program printing forever is cut off here. */
export const MAX_PYTHON_OUTPUT = 20_000;

/** The parts of a Pyodide instance used here (so this package doesn't depend on it). */
export interface PyodideLike {
  runPython(code: string, options?: { globals?: unknown; filename?: string }): unknown;
  globals: { get(name: string): unknown };
  setStdout(options: { write: (buffer: Uint8Array) => number }): void;
  setStderr(options: { write: (buffer: Uint8Array) => number }): void;
  setStdin(options: { stdin: () => string | null }): void;
}

interface PyDict {
  set(key: string, value: unknown): void;
  destroy?(): void;
}

/** One piece of what the program showed: printed text, an error, or an answer typed in. */
export interface TranscriptPart {
  kind: 'out' | 'err' | 'in';
  text: string;
}

export interface PythonRun {
  /** What the program printed (standard output only, without the answers typed in). */
  output: string;
  /** Everything in order, for showing it like a terminal. */
  transcript: TranscriptPart[];
  error: CodeError | null;
  /** True when the output was too long and was cut off. */
  truncated: boolean;
}

const normalize = (text: string) => text.replace(/\s+/g, ' ').trim().toLowerCase();

/** Python's error ("NameError: name 'x' is not defined") and the line in main.py. */
export function parsePythonError(traceback: string, name?: string): CodeError {
  const lines = traceback.trimEnd().split('\n');
  const last = lines.at(-1)?.trim() ?? '';
  const errorName = name ?? /^([A-Za-z_][\w.]*)(?::|$)/.exec(last)?.[1] ?? 'Error';
  let line: number | undefined;
  const pattern = new RegExp(`File "${PYTHON_FILENAME}", line (\\d+)`, 'g');
  for (const match of traceback.matchAll(pattern)) line = Number(match[1]);
  const kind: CodeError['kind'] =
    errorName === 'EOFError'
      ? 'input'
      : ['SyntaxError', 'IndentationError', 'TabError'].includes(errorName)
        ? 'syntax'
        : 'runtime';
  return { kind, name: errorName, message: last || errorName, ...(line ? { line } : {}) };
}

const errorOf = (error: unknown): CodeError => {
  const { message, type } = (error ?? {}) as { message?: unknown; type?: unknown };
  return parsePythonError(
    typeof message === 'string' ? message : String(error),
    typeof type === 'string' ? type : undefined,
  );
};

/**
 * Runs the program with fresh variables, answering input() from `stdin` (one line
 * per call; running out raises EOFError). Returns the run and the program's
 * variables (for Python checks); the caller destroys them.
 */
export function runPythonProgram(
  py: PyodideLike,
  source: string,
  stdin = '',
  onPart?: (part: TranscriptPart) => void,
): { run: PythonRun; globals: PyDict } {
  const decoder = new TextDecoder();
  const answers = stdin === '' ? [] : stdin.replace(/\r\n?/g, '\n').split('\n');
  const run: PythonRun = { output: '', transcript: [], error: null, truncated: false };
  let size = 0;
  const add = (kind: TranscriptPart['kind'], text: string) => {
    if (!text) return;
    if (size + text.length > MAX_PYTHON_OUTPUT) {
      text = text.slice(0, Math.max(0, MAX_PYTHON_OUTPUT - size));
      run.truncated = true;
      if (!text) return;
    }
    size += text.length;
    if (kind === 'out') run.output += text;
    const previous = run.transcript.at(-1);
    if (previous?.kind === kind) previous.text += text;
    else run.transcript.push({ kind, text });
    onPart?.({ kind, text });
  };
  py.setStdout({
    write: (buffer) => {
      add('out', decoder.decode(buffer, { stream: true }));
      return buffer.length;
    },
  });
  py.setStderr({
    write: (buffer) => {
      add('err', new TextDecoder().decode(buffer));
      return buffer.length;
    },
  });
  py.setStdin({
    stdin: () => {
      const answer = answers.shift();
      if (answer === undefined) return null;
      // Shown after the question, as if typed in.
      add('in', `${answer}\n`);
      return answer;
    },
  });
  const globals = (py.globals.get('dict') as () => PyDict)();
  try {
    py.runPython(source, { globals, filename: PYTHON_FILENAME });
  } catch (error) {
    run.error = errorOf(error);
    add('err', `${run.error.message}\n`);
  }
  return { run, globals };
}

/** Whether printed output passes an output check. */
export function outputPasses(check: OutputCheck, output: string): boolean {
  const text = normalize(output);
  if (check.notEmpty && !text) return false;
  if (check.includes !== undefined && !text.includes(normalize(check.includes))) return false;
  if (check.equals !== undefined && text !== normalize(check.equals)) return false;
  if (check.minLines !== undefined) {
    const lines = output.split('\n').filter((line) => line.trim()).length;
    if (lines < check.minLines) return false;
  }
  return true;
}

/** Runs a Python check's code with the program's variables. Passes unless it raises. */
function pythonCheckPasses(
  py: PyodideLike,
  check: PythonCheck,
  source: string,
  run: PythonRun,
  globals: PyDict,
): boolean {
  const discard = { write: (buffer: Uint8Array) => buffer.length };
  py.setStdout(discard);
  py.setStderr(discard);
  py.setStdin({ stdin: () => null });
  globals.set('__source__', source);
  globals.set('__output__', run.output);
  try {
    py.runPython(check.code, { globals, filename: 'check.py' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Runs the checks: the program runs once for each different `stdin` the checks
 * give, with fresh variables. A program that stops with an error fails the checks
 * that ran it. Never throws.
 */
export function runPythonChecks(
  py: PyodideLike,
  source: string,
  checks: (OutputCheck | PythonCheck)[],
): { results: CheckResult[]; errors: CodeError[] } {
  const runs = new Map<string, { run: PythonRun; globals: PyDict }>();
  const errors: CodeError[] = [];
  const results: CheckResult[] = [];
  try {
    for (const check of checks) {
      const stdin = check.stdin ?? '';
      let entry = runs.get(stdin);
      if (!entry) {
        entry = runPythonProgram(py, source, stdin);
        runs.set(stdin, entry);
        const error = entry.run.error;
        if (error && !errors.some((e) => e.message === error.message)) errors.push(error);
      }
      let passed = false;
      if (!entry.run.error) {
        try {
          passed =
            check.expect === 'output'
              ? outputPasses(check, entry.run.output)
              : pythonCheckPasses(py, check, source, entry.run, entry.globals);
        } catch {
          passed = false;
        }
      }
      results.push({ id: check.id, passed, ...(check.hint ? { hint: check.hint } : {}) });
    }
  } finally {
    for (const { globals } of runs.values()) globals.destroy?.();
  }
  return { results, errors };
}
