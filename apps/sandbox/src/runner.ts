/**
 * The sandbox runner. The web app embeds this page in an iframe with
 * sandbox="allow-scripts" (so it has no access to the app, its cookies or storage)
 * and sends it the student's code. The runner adds loop guards, builds the page,
 * shows it in a nested iframe with the agent, and reports what happened.
 */
import {
  type CodeError,
  composeDocument,
  guardHtmlScripts,
  guardLoops,
  isPythonRuntimeMessage,
  isRunRequest,
  type RunnerMessage,
  type RunRequest,
} from '@kcp/checks';
import type { AgentConfig, AgentMessage } from './agent.js';
import { PythonRunner } from './python-runner.js';

/** The agent's code, inlined at build time (scripts/build.mjs). */
declare const AGENT_SOURCE: string;

/** How long a page may take to load and run its checks before we give up. */
const RUN_TIMEOUT_MS = 5000;
/** Filled in after the page is built (it sits on one line, so no line numbers move). */
const LINE_PLACEHOLDER = '"__KCP_JS_LINE__"';

// Only talk to the page that embeds us. The referrer is its origin (the web app
// sends "strict-origin-when-cross-origin"); frame-ancestors limits who that can be.
const parentOrigin = (() => {
  try {
    return document.referrer ? new URL(document.referrer).origin : '*';
  } catch {
    return '*';
  }
})();

const post = (message: RunnerMessage) => window.parent.postMessage(message, parentOrigin);

let preview: HTMLIFrameElement | null = null;
let current: { runId: string; errors: CodeError[]; timer: ReturnType<typeof setTimeout> } | null =
  null;
/** Python programs run in a worker and show in a terminal view (python-runner.ts). */
const python = new PythonRunner(post, (status) => post({ type: 'kcp:python-status', status }));
let pythonVersion: string | null = null;

/** The line (1-based) of a position in `text`. */
const lineOf = (text: string, index: number) => text.slice(0, index).split('\n').length;

function build(request: RunRequest): { html: string; errors: CodeError[] } {
  const errors: CodeError[] = [];
  let js = request.files.js ?? '';
  if (js.trim()) {
    const guarded = guardLoops(js);
    if (guarded.ok) {
      js = guarded.code;
    } else {
      // Show the HTML and CSS anyway, and explain the JavaScript mistake.
      errors.push(guarded.error);
      js = '';
    }
  }
  const config: Omit<AgentConfig, 'jsLine'> & { jsLine: string } = {
    runId: request.runId,
    checks: request.checks,
    labels: request.labels ?? {},
    jsLine: '__KCP_JS_LINE__',
  };
  // Test checks become functions in an inline script: the sandbox's CSP allows inline
  // scripts but not eval(), so the agent can't build them from strings itself.
  const tests = (request.checks ?? [])
    .filter((check) => check.expect === 'test')
    .map((check) => `${JSON.stringify(check.id)}:async function(){\n${check.code}\n}`);
  const headScript = [
    `window.kcpAgentConfig=${JSON.stringify(config)};`,
    `window.kcpTests={${tests.join(',')}};`,
    AGENT_SOURCE,
  ].join('\n');
  // Scripts typed into the HTML tab get loop guards too.
  const files = { ...request.files, html: guardHtmlScripts(request.files.html ?? '') };
  let html = composeDocument(files, { headScript, js });

  // Tell the agent where the student's script starts, to report errors by their line.
  // (It is the last script in the page: composeDocument puts it at the end of <body>.)
  let jsLine = 0;
  if (js.trim()) {
    const start = html.lastIndexOf('<script>\n');
    if (start >= 0) jsLine = lineOf(html, start) + 1;
  }
  html = html.replace(LINE_PLACEHOLDER, String(jsLine));
  return { html, errors };
}

function run(request: RunRequest) {
  if (current) clearTimeout(current.timer);
  current = null;
  if (request.files.py !== undefined) {
    preview?.remove();
    preview = null;
    python.show(document.body);
    python.run(request);
    return;
  }
  python.hide();
  const { html, errors } = build(request);

  // A fresh iframe for every run: no timers or globals left over from the last one.
  preview?.remove();
  preview = document.createElement('iframe');
  preview.setAttribute('sandbox', 'allow-scripts');
  preview.setAttribute('title', 'Preview');
  preview.srcdoc = html;
  document.body.append(preview);

  const runId = request.runId;
  current = {
    runId,
    errors,
    timer: setTimeout(() => {
      if (current?.runId !== runId) return;
      post({ type: 'kcp:result', runId, status: 'timeout', results: null, errors, console: [] });
      current = null;
    }, RUN_TIMEOUT_MS),
  };
}

function isAgentMessage(value: unknown): value is AgentMessage {
  const type = (value as { type?: unknown } | null)?.type;
  return type === 'kcp:agent-result' || type === 'kcp:agent-console';
}

window.addEventListener('message', (event) => {
  if (event.source === window.parent) {
    if (parentOrigin !== '*' && event.origin !== parentOrigin) return;
    if (isRunRequest(event.data)) run(event.data);
    else if (isPythonRuntimeMessage(event.data) && event.data.version !== pythonVersion) {
      pythonVersion = event.data.version;
      python.setRuntime(event.data.files);
    }
    return;
  }
  if (!preview || event.source !== preview.contentWindow || !isAgentMessage(event.data)) return;
  const message = event.data;
  if (message.type === 'kcp:agent-result') {
    if (!current || message.runId !== current.runId) return;
    clearTimeout(current.timer);
    post({
      type: 'kcp:result',
      runId: message.runId,
      status: 'done',
      results: message.results,
      errors: [...current.errors, ...message.errors],
      console: message.console,
    });
  } else {
    post({
      type: 'kcp:console',
      runId: message.runId,
      errors: message.errors,
      console: message.console,
    });
  }
});

post({ type: 'kcp:ready' });
