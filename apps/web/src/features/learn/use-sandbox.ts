'use client';

import {
  type Check,
  type CodeError,
  type CodeFiles,
  type ConsoleLine,
  isRunnerMessage,
  type PreviewLabels,
  type PythonStatusMessage,
  type RunResult,
} from '@kcp/checks';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PythonRuntime } from './python-runtime';

/** The sandbox runs students' code on its own origin (apps/sandbox). */
export const SANDBOX_URL = process.env.NEXT_PUBLIC_SANDBOX_URL ?? 'http://localhost:3004';

/** If the sandbox doesn't answer in time, the page is stuck: reload the sandbox. */
const WATCHDOG_MS = 8000;
/** Python may still be starting (a few seconds on a slow tablet) before it runs. */
const PYTHON_WATCHDOG_MS = 20000;

type PythonStatus = PythonStatusMessage['status'] | null;

export interface SandboxOutput {
  errors: CodeError[];
  console: ConsoleLine[];
  timedOut: boolean;
}

const EMPTY: SandboxOutput = { errors: [], console: [], timedOut: false };

type Waiting = { resolve: (result: RunResult) => void; timer: ReturnType<typeof setTimeout> };
type Queued = { files: CodeFiles; stdin?: string };

/**
 * Talks to the sandbox iframe: sends code, and collects check results, errors and
 * console output. Only messages from our own iframe are accepted.
 *
 * One run at a time: the sandbox replaces the page on every run, so while a check
 * is running, previews wait and the latest one is shown afterwards.
 */
export function useSandbox(labels: PreviewLabels, python: PythonRuntime | null = null) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const [frameKey, setFrameKey] = useState(0);
  const [output, setOutput] = useState<SandboxOutput>(EMPTY);
  const [pythonStatus, setPythonStatus] = useState<PythonStatus>(null);
  const readyRef = useRef(false);
  const checking = useRef<(Waiting & { runId: string }) | null>(null);
  const latestRun = useRef<string | null>(null);
  const queued = useRef<Queued | null>(null);
  const labelsRef = useRef(labels);
  labelsRef.current = labels;

  const post = useCallback(
    (runId: string, files: CodeFiles, checks: Check[] | null, stdin?: string) => {
      latestRun.current = runId;
      frame.current?.contentWindow?.postMessage(
        { type: 'kcp:run', runId, files, checks, labels: labelsRef.current, stdin },
        // The sandboxed frame has an opaque origin, so it can't be named here; the
        // message only carries the student's own code.
        '*',
      );
    },
    [],
  );

  // Hands Python to the sandbox once both are ready (and again after a reload).
  useEffect(() => {
    if (!ready || !python) return;
    frame.current?.contentWindow?.postMessage(
      { type: 'kcp:python-runtime', version: python.version, files: python.files },
      '*',
    );
  }, [ready, python, frameKey]);

  /** Shows a preview that had to wait (for the sandbox to load, or for a check). */
  const flushQueued = useCallback(() => {
    if (!readyRef.current || checking.current || !queued.current) return;
    const { files, stdin } = queued.current;
    queued.current = null;
    post(crypto.randomUUID(), files, null, stdin);
  }, [post]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (!frame.current || event.source !== frame.current.contentWindow) return;
      if (!isRunnerMessage(event.data)) return;
      const message = event.data;
      if (message.type === 'kcp:ready') {
        readyRef.current = true;
        setReady(true);
        setPythonStatus(null);
        flushQueued();
        return;
      }
      if (message.type === 'kcp:python-status') {
        setPythonStatus(message.status);
        return;
      }
      if (message.runId !== latestRun.current) return;
      if (message.type === 'kcp:console') {
        setOutput((o) => ({
          ...o,
          errors: [...o.errors, ...message.errors].slice(-20),
          console: [...o.console, ...message.console].slice(-100),
        }));
        return;
      }
      setOutput({
        errors: message.errors,
        console: message.console,
        timedOut: message.status === 'timeout',
      });
      const waiting = checking.current;
      if (waiting?.runId === message.runId) {
        clearTimeout(waiting.timer);
        checking.current = null;
        waiting.resolve(message);
        flushQueued();
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [flushQueued]);

  // A check still waiting when the editor goes away is simply dropped.
  useEffect(
    () => () => {
      if (checking.current) clearTimeout(checking.current.timer);
    },
    [],
  );

  /** Shows the code in the preview (Python: runs the program, with `stdin` typed in). */
  const preview = useCallback(
    (files: CodeFiles, stdin?: string) => {
      queued.current = { files, stdin };
      flushQueued();
    },
    [flushQueued],
  );

  /** Shows the code and runs the checks; resolves with the results. */
  const check = useCallback(
    (files: CodeFiles, checks: Check[]) =>
      new Promise<RunResult>((resolve) => {
        const runId = crypto.randomUUID();
        // This run shows the same code, so an earlier preview no longer needs to.
        queued.current = null;
        const timer = setTimeout(
          () => {
            checking.current = null;
            // A page that never finishes (it shouldn't, with loop guards): start over,
            // and show the code again once the fresh sandbox is ready.
            queued.current = files.py === undefined ? { files } : null;
            readyRef.current = false;
            setReady(false);
            setFrameKey((k) => k + 1);
            setOutput({ ...EMPTY, timedOut: true });
            resolve({
              type: 'kcp:result',
              runId,
              status: 'timeout',
              results: null,
              errors: [],
              console: [],
            });
          },
          files.py === undefined ? WATCHDOG_MS : PYTHON_WATCHDOG_MS,
        );
        checking.current = { runId, resolve, timer };
        post(runId, files, checks);
      }),
    [post],
  );

  return { frame, frameKey, ready, output, pythonStatus, preview, check };
}
