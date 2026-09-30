/**
 * Runs inside the preview page, before the student's code. It stops endless loops,
 * collects console output and errors, keeps links inside the preview, runs the
 * checks once the page has loaded, and reports to the runner (window.parent).
 */
import {
  type Check,
  type CheckResult,
  type CodeError,
  type ConsoleLine,
  evaluateChecks,
  installLoopGuard,
  LOOP_LIMIT_ERROR,
  type PreviewLabels,
  type TestRunner,
} from '@kcp/checks';

export interface AgentConfig {
  runId: string;
  checks: Check[] | null;
  /** Line of the composed page where the student's JavaScript starts (0 = none). */
  jsLine: number;
  labels: PreviewLabels;
}

/** Messages from the preview to the runner. */
export type AgentMessage =
  | {
      type: 'kcp:agent-result';
      runId: string;
      results: CheckResult[] | null;
      errors: CodeError[];
      console: ConsoleLine[];
    }
  | { type: 'kcp:agent-console'; runId: string; errors: CodeError[]; console: ConsoleLine[] };

const MAX_LINES = 100;
const MAX_TEXT = 500;
/** Lets timers and "load" handlers in the student's code run before the checks. */
const SETTLE_MS = 150;
/**
 * Pictures from other sites can keep "load" waiting on a slow connection; the checks
 * start anyway this long after the page itself is ready (well within the runner's limit).
 */
const MAX_LOAD_WAIT_MS = 2500;

declare global {
  interface Window {
    kcpAgentConfig?: AgentConfig;
    /** Test checks by ID, written by the runner as an inline script. */
    kcpTests?: Record<string, () => Promise<unknown>>;
  }
}

/** Runs a test check's function (the sandbox forbids building functions from strings). */
function testRunner(checks: Check[]): TestRunner {
  const byCode = new Map<string, (() => Promise<unknown>) | undefined>();
  for (const check of checks) {
    if (check.expect === 'test') byCode.set(check.code, window.kcpTests?.[check.id]);
  }
  return async (code) => {
    const test = byCode.get(code);
    if (!test) throw new Error('Test not found');
    return test();
  };
}

const post = (message: AgentMessage) => window.parent.postMessage(message, '*');
// Taken before the student's code runs, which could replace it.
const later = window.setTimeout.bind(window);

const show = (value: unknown): string => {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
};

// alert() would block the page (and is switched off in the sandbox): show a note instead.
const note = (text: string) => {
  const box = document.createElement('div');
  box.textContent = text;
  box.setAttribute('role', 'status');
  box.style.cssText =
    'position:fixed;inset-inline:12px;bottom:12px;z-index:2147483647;padding:10px 14px;border-radius:10px;' +
    'background:#1d1d27;color:#fff;font:14px/1.4 system-ui,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.25)';
  document.body?.append(box);
  later(() => box.remove(), 4000);
};

function start(config: AgentConfig) {
  let lines: ConsoleLine[] = [];
  let errors: CodeError[] = [];
  let reported = false;
  let flushTimer: number | undefined;
  let total = 0;

  // After the first report, later output (a click, a timer) is sent in small batches.
  const flushLater = () => {
    if (!reported || flushTimer) return;
    flushTimer = later(() => {
      flushTimer = undefined;
      post({ type: 'kcp:agent-console', runId: config.runId, errors, console: lines });
      lines = [];
      errors = [];
    }, 100);
  };

  for (const level of ['log', 'warn', 'error'] as const) {
    const original = console[level].bind(console);
    console[level] = (...args: unknown[]) => {
      original(...args);
      if (total++ >= MAX_LINES) return;
      lines.push({ level, text: args.map(show).join(' ').slice(0, MAX_TEXT) });
      flushLater();
    };
  }

  const toStudentLine = (line: number | undefined) =>
    line && config.jsLine && line >= config.jsLine ? line - config.jsLine + 1 : undefined;

  window.addEventListener('error', (event) => {
    const message = String(event.message ?? event.error ?? 'Error');
    const isLoop = message.includes(LOOP_LIMIT_ERROR);
    if (errors.length < 20) {
      errors.push({
        kind: isLoop ? 'loop' : 'runtime',
        message: isLoop
          ? 'A loop ran for too long and was stopped.'
          : message.replace(/^Uncaught /, ''),
        line: toStudentLine(event.lineno),
      });
    }
    flushLater();
  });
  window.addEventListener('unhandledrejection', (event) => {
    if (errors.length < 20) errors.push({ kind: 'runtime', message: show(event.reason) });
    flushLater();
  });

  window.alert = (message?: unknown) => note(show(message ?? ''));

  // Links stay in the preview; the page would otherwise be replaced by another site.
  document.addEventListener(
    'click',
    (event) => {
      const link = (event.target as Element | null)?.closest?.('a[href]');
      if (!link || (link.getAttribute('href') ?? '').startsWith('#')) return;
      event.preventDefault();
      note(
        `${config.labels.linkNotice ?? 'Links open on your real website.'} → ${link.getAttribute('href')}`,
      );
    },
    true,
  );

  const report = async () => {
    const results = config.checks
      ? await evaluateChecks(document, config.checks, testRunner(config.checks))
      : null;
    post({ type: 'kcp:agent-result', runId: config.runId, results, errors, console: lines });
    lines = [];
    errors = [];
    reported = true;
  };
  let started = false;
  const reportSoon = () => {
    if (started) return;
    started = true;
    later(() => void report(), SETTLE_MS);
  };
  window.addEventListener('load', reportSoon);
  document.addEventListener('DOMContentLoaded', () => later(reportSoon, MAX_LOAD_WAIT_MS));
}

installLoopGuard(window);
if (window.kcpAgentConfig) start(window.kcpAgentConfig);
