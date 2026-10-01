import {
  type Check,
  type CodeFiles,
  composeDocument,
  evaluateChecks,
  evaluateGitChecks,
  evaluateStageChecks,
  type GitSetup,
  type StageLevel,
} from '@kcp/checks';
import { Window } from 'happy-dom';

/** Checks that only read the page (no script needs to run to answer them). */
const STATIC_CHECKS = new Set(['exists', 'text', 'attribute', 'css']);

const blocked = () => {
  throw new Error('Network access is off while checking code');
};

/** Whether a script has any code in it (not only comments and blank lines). */
export function hasScript(js: string | undefined): boolean {
  if (!js) return false;
  const withoutComments = js
    .replaceAll(/\/\*[\s\S]*?\*\//g, '')
    // Line comments, but not the "//" in "https://".
    .replaceAll(/(^|[^:])\/\/.*$/gm, '$1');
  return withoutComments.trim().length > 0;
}

export interface VerifyOptions {
  /**
   * JavaScript lessons: the student's script is meant to build or change the page,
   * so the page can't be judged without running it (the browser's results stand).
   * Everywhere else (HTML and CSS lessons, projects) the requirements are about the
   * HTML and CSS themselves, and they are checked with scripts off.
   */
  scriptsMayChangePage?: boolean;
  /**
   * Block programs (Explorer): the level. Programs are data, so the server works out
   * every result itself with the same interpreter as the browser.
   */
  stage?: StageLevel | null;
  /** Git lessons: the practice repository. The steps are data too: the server replays them. */
  repo?: GitSetup | null;
}

/**
 * The browser runs a student's code and reports which checks passed. For HTML and
 * CSS the server can check the same thing on its own, so a result typed by hand
 * (instead of earned) doesn't count: this re-runs the checks that only read HTML and
 * CSS in a headless DOM. It never runs the student's scripts and never loads anything
 * from the network.
 *
 * `files` must already be limited to the files the challenge has (`cleanCode(code,
 * starter)`), so adding a Python or JavaScript file by hand can't switch this off.
 *
 * Returns check ID → passed for the checks it verified, or null when it can't verify
 * any (Python, a JavaScript lesson with a script, or no static checks). Checks it
 * can't verify (tests, program output) stay as the browser reported them.
 */
export async function verifyStaticChecks(
  files: CodeFiles,
  checks: Check[],
  options: VerifyOptions = {},
): Promise<Map<string, boolean> | null> {
  if (files.py !== undefined || files.blocks !== undefined || files.git !== undefined) return null;
  if (options.scriptsMayChangePage && hasScript(files.js)) return null;
  const readable = checks.filter((check) => STATIC_CHECKS.has(check.expect));
  if (readable.length === 0) return null;

  const window = new Window({
    settings: {
      disableJavaScriptEvaluation: true,
      disableJavaScriptFileLoading: true,
      disableCSSFileLoading: true,
      disableIframePageLoading: true,
      disableComputedStyleRendering: true,
      handleDisabledFileLoadingAsSuccess: true,
      enableImageFileLoading: false,
      navigation: {
        disableMainFrameNavigation: true,
        disableChildFrameNavigation: true,
        disableChildPageNavigation: true,
        disableFallbackToSetURL: true,
      },
      fetch: { interceptor: { beforeAsyncRequest: blocked, beforeSyncRequest: blocked } },
    },
  });
  try {
    window.document.write(composeDocument({ ...files, js: '' }));
    const results = await evaluateChecks(
      window.document as unknown as Parameters<typeof evaluateChecks>[0],
      readable,
    );
    return new Map(results.map((result) => [result.id, result.passed]));
  } finally {
    // Closing can fail on pathological pages (thousands of nested elements); the
    // results are already read by then.
    await window.happyDOM.close().catch(() => undefined);
  }
}

/** Whether the code is exactly what the student started with (nothing done yet). */
export function isUnchanged(files: CodeFiles, starter: CodeFiles): boolean {
  const keys = new Set([...Object.keys(files), ...Object.keys(starter)]) as Set<keyof CodeFiles>;
  return [...keys].every((key) => (files[key] ?? '').trim() === (starter[key] ?? '').trim());
}

/**
 * The browser's results, with the HTML and CSS checks confirmed on the server. A pass
 * the server can't reproduce counts as a fail and is reported through `warn`: either
 * a result typed by hand, or a check that behaves differently here than in browsers
 * (the warning is how we'd find out).
 */
export async function confirmResults(
  label: string,
  files: CodeFiles,
  checks: Check[],
  reported: Map<string, boolean>,
  warn: (message: string) => void,
  options: VerifyOptions = {},
): Promise<Map<string, boolean>> {
  if (files.blocks !== undefined || files.git !== undefined) {
    // No stage (or repo) means a file sent to something that isn't a block (or git)
    // challenge (cleanCode drops it first); nothing passes then.
    const results =
      files.blocks !== undefined
        ? options.stage
          ? evaluateStageChecks(options.stage, files.blocks, checks)
          : []
        : options.repo
          ? evaluateGitChecks(options.repo, files.git, checks)
          : [];
    const byId = new Map(results.map((result) => [result.id, result.passed]));
    for (const check of checks) {
      if (reported.get(check.id) === true && byId.get(check.id) !== true) {
        warn(`Check ${label}/${check.id} passed in the browser but not on the server`);
      }
    }
    return new Map(checks.map((check) => [check.id, byId.get(check.id) === true]));
  }
  const confirmed = new Map(checks.map((check) => [check.id, reported.get(check.id) === true]));
  let verified: Map<string, boolean> | null = null;
  try {
    verified = await verifyStaticChecks(files, checks, options);
  } catch (error) {
    // A page the server can't read at all (for example thousands of nested elements)
    // doesn't pass the checks it should have confirmed.
    warn(`Couldn't verify ${label} on the server: ${(error as Error).message}`);
    verified = new Map(
      checks.filter((check) => STATIC_CHECKS.has(check.expect)).map((check) => [check.id, false]),
    );
  }
  for (const [id, passed] of verified ?? []) {
    if (confirmed.get(id) && !passed) {
      warn(`Check ${label}/${id} passed in the browser but not on the server`);
      confirmed.set(id, false);
    }
  }
  return confirmed;
}
