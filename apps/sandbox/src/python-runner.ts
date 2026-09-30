/**
 * Python in the runner: a terminal-like view of what the program printed, and the
 * Web Worker that runs it (see python-worker.ts). Programs that run too long are
 * stopped by ending the worker; a new one starts from the same files.
 */
import {
  type CodeError,
  isPythonCheck,
  type PreviewLabels,
  type PythonRuntimeFiles,
  type RunRequest,
  type RunResult,
  type TranscriptPart,
} from '@kcp/checks';
import type { WorkerMessage, WorkerRequest } from './python-worker.js';

/** The worker's code, inlined at build time (scripts/build.mjs). */
declare const PYTHON_WORKER_SOURCE: string;

/** How long a program (with all its checks) may run once Python is ready. */
export const PYTHON_RUN_TIMEOUT_MS = 5000;

type Status = 'starting' | 'ready' | 'failed';

const DEFAULT_LABELS = {
  pythonWaiting: 'Getting Python ready…',
  pythonRunning: 'Running your program…',
  pythonNoOutput: 'Your program finished without printing anything.',
  pythonStopped: 'Your program ran for too long, so it was stopped.',
  pythonFailed: 'Python could not start. Reload the page to try again.',
};

export class PythonRunner {
  private worker: Worker | null = null;
  private files: PythonRuntimeFiles | null = null;
  private status: Status | null = null;
  private pending: RunRequest | null = null;
  private current: { runId: string; timer: ReturnType<typeof setTimeout> } | null = null;
  private view: HTMLElement | null = null;
  private screen: HTMLPreElement | null = null;
  private note: HTMLParagraphElement | null = null;
  private labels: PreviewLabels = {};

  constructor(
    private readonly report: (result: RunResult) => void,
    private readonly onStatus: (status: Status) => void,
  ) {}

  /** The web app sent Pyodide's files: start a worker (again, for a new version). */
  setRuntime(files: PythonRuntimeFiles) {
    this.files = files;
    this.startWorker();
  }

  /** Shows the terminal (Python programs replace the page preview). */
  show(container: HTMLElement) {
    if (this.view?.isConnected) return;
    this.view = document.createElement('main');
    this.view.setAttribute(
      'style',
      'box-sizing:border-box;height:100%;overflow:auto;margin:0;padding:12px;background:#111827;color:#f9fafb;font:14px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace',
    );
    this.note = document.createElement('p');
    this.note.setAttribute(
      'style',
      'margin:0 0 8px;color:#9ca3af;font-family:system-ui,sans-serif',
    );
    this.note.setAttribute('role', 'status');
    this.screen = document.createElement('pre');
    this.screen.setAttribute('dir', 'ltr');
    this.screen.setAttribute('style', 'margin:0;white-space:pre-wrap;word-break:break-word');
    this.screen.setAttribute('aria-live', 'polite');
    this.view.append(this.note, this.screen);
    container.append(this.view);
  }

  hide() {
    this.view?.remove();
    this.view = null;
  }

  private label(key: keyof typeof DEFAULT_LABELS) {
    return this.labels[key] ?? DEFAULT_LABELS[key];
  }

  private setNote(text: string) {
    if (this.note) this.note.textContent = text;
  }

  private clearScreen() {
    if (this.screen) this.screen.textContent = '';
  }

  private write(part: TranscriptPart) {
    if (!this.screen) return;
    const span = document.createElement('span');
    span.textContent = part.text;
    if (part.kind === 'err') span.setAttribute('style', 'color:#fca5a5');
    if (part.kind === 'in') span.setAttribute('style', 'color:#86efac;font-weight:600');
    this.screen.append(span);
    if (this.view) this.view.scrollTop = this.view.scrollHeight;
  }

  private startWorker() {
    this.worker?.terminate();
    this.worker = null;
    if (!this.files) return;
    const url = URL.createObjectURL(new Blob([PYTHON_WORKER_SOURCE], { type: 'text/javascript' }));
    // A classic worker: a sandboxed page can't start module workers from blob: URLs.
    const worker = new Worker(url, { name: 'python' });
    // The worker loads its script after this returns; the URL goes once it answers.
    const revoke = () => URL.revokeObjectURL(url);
    worker.addEventListener('message', (event: MessageEvent<WorkerMessage>) => {
      revoke();
      this.onWorkerMessage(event.data);
    });
    worker.addEventListener('error', (event) => {
      revoke();
      // oxlint-disable-next-line no-console -- the only trace of why Python didn't start
      console.warn('Python worker error:', event.message);
      this.setStatus('failed');
    });
    this.worker = worker;
    this.setStatus('starting');
    this.send({ type: 'init', files: this.files });
  }

  private send(request: WorkerRequest) {
    this.worker?.postMessage(request);
  }

  private setStatus(status: Status) {
    this.status = status;
    this.onStatus(status);
    if (status === 'failed') {
      this.setNote(this.label('pythonFailed'));
      if (this.pending) {
        const request = this.pending;
        this.pending = null;
        this.report(this.result(request.runId, 'done', null, []));
      }
    } else if (status === 'ready' && this.pending) {
      const request = this.pending;
      this.pending = null;
      this.run(request);
    }
  }

  private result(
    runId: string,
    status: RunResult['status'],
    results: RunResult['results'],
    errors: CodeError[],
  ): RunResult {
    return { type: 'kcp:result', runId, status, results, errors, console: [] };
  }

  /** Runs a program (and its checks). Waits for Python if it isn't ready yet. */
  run(request: RunRequest) {
    this.labels = request.labels ?? {};
    if (this.current) clearTimeout(this.current.timer);
    this.current = null;
    this.clearScreen();
    if (this.status !== 'ready' || !this.worker) {
      this.pending = request;
      this.setNote(
        this.status === 'failed' ? this.label('pythonFailed') : this.label('pythonWaiting'),
      );
      if (this.status === 'failed') {
        this.pending = null;
        this.report(this.result(request.runId, 'done', null, []));
      }
      return;
    }
    this.setNote(this.label('pythonRunning'));
    const checks = request.checks?.filter(isPythonCheck) ?? null;
    const runId = request.runId;
    this.current = {
      runId,
      timer: setTimeout(() => {
        if (this.current?.runId !== runId) return;
        this.current = null;
        this.setNote(this.label('pythonStopped'));
        this.report(
          this.result(runId, 'timeout', null, [
            { kind: 'loop', message: this.label('pythonStopped') },
          ]),
        );
        // The only way to stop Python mid-run: end the worker and start a new one.
        this.startWorker();
      }, PYTHON_RUN_TIMEOUT_MS),
    };
    this.send({
      type: 'run',
      runId,
      source: request.files.py ?? '',
      stdin: request.stdin ?? '',
      checks: request.checks ? (checks ?? []) : null,
    });
  }

  private onWorkerMessage(message: WorkerMessage) {
    switch (message.type) {
      case 'ready':
        this.setStatus('ready');
        return;
      case 'failed':
        // oxlint-disable-next-line no-console -- the only trace of why Python didn't start
        console.warn('Python could not start:', message.message);
        this.setStatus('failed');
        return;
      case 'part':
        if (message.runId === this.current?.runId) this.write(message.part);
        return;
      case 'done': {
        if (message.runId !== this.current?.runId) return;
        clearTimeout(this.current.timer);
        this.current = null;
        const printed = message.run.transcript.some((part) => part.text.trim());
        this.setNote(printed ? '' : this.label('pythonNoOutput'));
        this.report({
          type: 'kcp:result',
          runId: message.runId,
          status: 'done',
          results: message.results,
          errors: message.errors,
          console: message.run.transcript
            .filter((part) => part.kind !== 'in')
            .flatMap((part) =>
              part.text
                .replace(/\n$/, '')
                .split('\n')
                .map((text) => ({
                  level: part.kind === 'err' ? ('error' as const) : ('log' as const),
                  text,
                })),
            ),
        });
      }
    }
  }
}
