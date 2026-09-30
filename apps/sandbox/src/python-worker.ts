/**
 * Runs Python programs with Pyodide, in a Web Worker the runner starts from a Blob
 * (the runner's page has an opaque origin, so a worker from a URL isn't allowed).
 * Pyodide's files arrive as Blobs from the runner, which got them from the web app.
 * A program that runs too long is stopped by the runner ending this worker.
 */
import {
  type CheckResult,
  type CodeError,
  type OutputCheck,
  type PyodideLike,
  type PythonCheck,
  type PythonRun,
  type PythonRuntimeFiles,
  runPythonChecks,
  runPythonProgram,
  type TranscriptPart,
} from '@kcp/checks';
import { loadPyodide } from 'pyodide';

export type WorkerRequest =
  | { type: 'init'; files: PythonRuntimeFiles }
  | {
      type: 'run';
      runId: string;
      source: string;
      stdin: string;
      checks: (OutputCheck | PythonCheck)[] | null;
    };

export type WorkerMessage =
  | { type: 'ready' }
  | { type: 'failed'; message: string }
  | { type: 'part'; runId: string; part: TranscriptPart }
  | {
      type: 'done';
      runId: string;
      /** The run shown in the terminal: the Run button's, or the first check's. */
      run: Pick<PythonRun, 'transcript' | 'error' | 'truncated'>;
      results: CheckResult[] | null;
      errors: CodeError[];
    };

type Pyodide = Awaited<ReturnType<typeof loadPyodide>>;
type CreateModule = NonNullable<Parameters<typeof loadPyodide>[0]>['createPyodideModule'];

/** Set by scripts/build.mjs: the global pyodide.asm.js defines. */
declare const PYODIDE_ASM_GLOBAL: string;

/** The worker's global scope (a dedicated worker: postMessage goes to the runner). */
const scope = self as unknown as {
  importScripts(...urls: string[]): void;
  postMessage(message: WorkerMessage): void;
  addEventListener(type: 'message', listener: (event: MessageEvent<WorkerRequest>) => void): void;
  fetch: typeof fetch;
};
// oxlint-disable-next-line unicorn/require-post-message-target-origin -- a worker's postMessage has no target origin
const post = (message: WorkerMessage) => scope.postMessage(message);

/** Pyodide's globals are a PyProxy (a dict at runtime), which its types don't show. */
let pyodide: PyodideLike | null = null;

async function start(files: PythonRuntimeFiles) {
  // Pyodide fetches its WebAssembly by URL; answer from the Blob instead.
  const realFetch = scope.fetch.bind(scope);
  scope.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (url.endsWith('pyodide.asm.wasm')) {
      return Promise.resolve(
        new Response(files.wasm, { headers: { 'Content-Type': 'application/wasm' } }),
      );
    }
    return realFetch(input, init);
  };
  const asmUrl = URL.createObjectURL(new Blob([files.asm], { type: 'text/javascript' }));
  const stdLibURL = URL.createObjectURL(files.stdlib);
  try {
    // A classic script (built from pyodide.asm.mjs by scripts/build.mjs).
    scope.importScripts(asmUrl);
    const asm = (self as unknown as Record<string, { default: CreateModule } | undefined>)[
      PYODIDE_ASM_GLOBAL
    ];
    if (!asm) throw new Error('Pyodide did not load.');
    const loaded: Pyodide = await loadPyodide({
      // Only used to name files, which all come from the Blobs above.
      indexURL: 'https://pyodide.invalid/',
      createPyodideModule: asm.default,
      stdLibURL,
      lockFileContents: await files.lock.text(),
      env: { HOME: '/home/student' },
    });
    pyodide = loaded as unknown as PyodideLike;
    post({ type: 'ready' });
  } catch (error) {
    post({ type: 'failed', message: (error as Error).message });
  } finally {
    URL.revokeObjectURL(asmUrl);
    URL.revokeObjectURL(stdLibURL);
  }
}

function run(request: Extract<WorkerRequest, { type: 'run' }>) {
  if (!pyodide) return;
  const { runId, source, stdin, checks } = request;
  if (!checks) {
    const { run: result, globals } = runPythonProgram(pyodide, source, stdin, (part) =>
      post({ type: 'part', runId, part }),
    );
    globals.destroy?.();
    post({
      type: 'done',
      runId,
      run: { transcript: result.transcript, error: result.error, truncated: result.truncated },
      results: null,
      errors: result.error ? [result.error] : [],
    });
    return;
  }
  // Show what the checker typed in and what the program printed (the first check's run).
  const first = runPythonProgram(pyodide, source, checks[0]?.stdin ?? '', (part) =>
    post({ type: 'part', runId, part }),
  );
  first.globals.destroy?.();
  const { results, errors } = runPythonChecks(pyodide, source, checks);
  post({
    type: 'done',
    runId,
    run: {
      transcript: first.run.transcript,
      error: first.run.error,
      truncated: first.run.truncated,
    },
    results,
    errors,
  });
}

scope.addEventListener('message', (event) => {
  const request = event.data;
  if (request.type === 'init') void start(request.files);
  else if (request.type === 'run') run(request);
});
