'use client';

import type { PythonManifest, PythonRuntimeFiles } from '@kcp/checks';
import { useEffect, useState } from 'react';
import { SANDBOX_URL } from './use-sandbox';

/*
 * Python (Pyodide, about 13 MB) is downloaded only on Python lessons, by the web app
 * rather than by the sandbox: the sandbox's page has an opaque origin, and browsers
 * don't cache what such a page downloads. The files are versioned and cached for a
 * year, so the next visit starts from the browser's cache. The app never runs them:
 * it hands them to the sandbox (see apps/sandbox/src/python-runner.ts).
 */

export interface PythonRuntime {
  version: string;
  files: PythonRuntimeFiles;
}

export type PythonLoad =
  | { status: 'idle' }
  | { status: 'loading'; loaded: number; total: number }
  | { status: 'ready'; runtime: PythonRuntime }
  | { status: 'failed' };

const KEYS = ['asm', 'wasm', 'stdlib', 'lock'] as const;
const SAFE_PATH = /^pyodide\/[\w.-]+\/[\w.-]+$/;

let state: PythonLoad = { status: 'idle' };
const listeners = new Set<(load: PythonLoad) => void>();

function set(next: PythonLoad) {
  state = next;
  for (const listener of listeners) listener(next);
}

/** Reads a response in chunks, reporting bytes as they arrive. */
async function download(url: string, onBytes: (bytes: number) => void): Promise<Blob> {
  const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
  if (!response.ok || !response.body) throw new Error(`${url}: ${response.status}`);
  const reader = response.body.getReader();
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    onBytes(value.byteLength);
  }
  return new Blob(chunks);
}

async function load() {
  set({ status: 'loading', loaded: 0, total: 0 });
  try {
    const manifestResponse = await fetch(`${SANDBOX_URL}/pyodide/manifest.json`, {
      mode: 'cors',
      credentials: 'omit',
      cache: 'no-cache',
    });
    if (!manifestResponse.ok) throw new Error('No Python manifest');
    const manifest = (await manifestResponse.json()) as PythonManifest;
    for (const key of KEYS) {
      if (!SAFE_PATH.test(manifest.files[key]?.path ?? '')) throw new Error('Bad Python manifest');
    }
    const total = KEYS.reduce((sum, key) => sum + (manifest.files[key].size || 0), 0);
    let loaded = 0;
    let lastReport = 0;
    const onBytes = (bytes: number) => {
      loaded += bytes;
      // A few updates a second is plenty for a progress bar.
      if (Date.now() - lastReport > 150) {
        lastReport = Date.now();
        set({ status: 'loading', loaded: Math.min(loaded, total), total });
      }
    };
    const blobs = await Promise.all(
      KEYS.map((key) => download(`${SANDBOX_URL}/${manifest.files[key].path}`, onBytes)),
    );
    const files = Object.fromEntries(
      KEYS.map((key, i) => [key, blobs[i]]),
    ) as unknown as PythonRuntimeFiles;
    set({ status: 'ready', runtime: { version: manifest.version, files } });
  } catch {
    set({ status: 'failed' });
  }
}

/** Starts the download once (again after a failure, with `retry`). */
export function loadPython(retry = false) {
  if (state.status === 'idle' || (retry && state.status === 'failed')) void load();
}

/** Python's download, started when `enabled` (a Python lesson or project is open). */
export function usePythonRuntime(enabled: boolean) {
  const [current, setCurrent] = useState<PythonLoad>(state);
  useEffect(() => {
    if (!enabled) return;
    listeners.add(setCurrent);
    setCurrent(state);
    loadPython();
    return () => {
      listeners.delete(setCurrent);
    };
  }, [enabled]);
  return enabled ? current : ({ status: 'idle' } as const);
}
