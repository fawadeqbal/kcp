'use client';

import type { CodeError, CodeFileKey, CodeFiles, PreviewLabels } from '@kcp/checks';
import { clsx } from 'clsx';
import { useFormatter, useTranslations } from 'next-intl';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Alert, Button } from '@/components/ui';
import { CodeEditor } from './code-editor';
import { loadPython, type PythonLoad, usePythonRuntime } from './python-runtime';
import { onTabKeyDown } from './tabs';
import { SANDBOX_URL, useSandbox } from './use-sandbox';

/** Python errors with a friendly explanation (lesson.pythonErrors.*). */
const EXPLAINED_ERRORS = [
  'SyntaxError',
  'IndentationError',
  'NameError',
  'TypeError',
  'ValueError',
  'ZeroDivisionError',
  'IndexError',
  'KeyError',
] as const;

/** Texts the sandbox shows itself, in the student's language. */
export function usePreviewLabels(): PreviewLabels {
  const t = useTranslations('lesson');
  return useMemo(
    () => ({
      linkNotice: t('linkNotice'),
      pythonWaiting: t('pythonWaiting'),
      pythonRunning: t('pythonRunning'),
      pythonNoOutput: t('pythonNoOutput'),
      pythonStopped: t('pythonStopped'),
      pythonFailed: t('pythonFailed'),
    }),
    [t],
  );
}

/*
 * The pieces of a coding step, shared by lesson challenges and module projects:
 * the student's files (autosaved), the editor with a tab per file, and the preview.
 */

const PREVIEW_DELAY_MS = 400;
const AUTOSAVE_DELAY_MS = 1000;

export type SaveState = 'idle' | 'saving' | 'saved' | 'failed';

/**
 * The student's files: autosaved a moment after the last keystroke (when `save` is
 * given), and saved straight away when the editor goes away with unsaved changes.
 */
export function useCodeFiles({
  initialCode,
  save,
  saveKey,
  onChange,
}: {
  initialCode: CodeFiles;
  /** Stores a draft; resolves true when it worked. Null for accounts that don't save. */
  save: ((code: CodeFiles) => Promise<boolean>) | null;
  /** Changes when the files belong to something else (another step). */
  saveKey: string;
  onChange?: (code: CodeFiles) => void;
}) {
  const [files, setFiles] = useState<CodeFiles>(() => ({ ...initialCode }));
  const [saveState, setSaveState] = useState<SaveState>('idle');
  /** Code typed but not saved yet. */
  const unsaved = useRef<CodeFiles | null>(null);
  /** The latest code, for edits that arrive before React re-renders. */
  const latest = useRef(files);
  const saveRef = useRef(save);
  saveRef.current = save;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!unsaved.current || !saveRef.current) return;
    setSaveState('saving');
    const timer = setTimeout(async () => {
      const code = unsaved.current;
      if (!code || !saveRef.current) return;
      unsaved.current = null;
      setSaveState((await saveRef.current(code)) ? 'saved' : 'failed');
    }, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [files]);

  // Leaving (another step, another page) saves what's left straight away.
  useEffect(
    () => () => {
      if (unsaved.current && saveRef.current) void saveRef.current(unsaved.current);
      unsaved.current = null;
    },
    [saveKey],
  );

  const replace = useCallback((next: CodeFiles) => {
    latest.current = next;
    unsaved.current = next;
    setFiles(next);
    onChangeRef.current?.(next);
  }, []);

  const update = useCallback(
    (key: CodeFileKey, value: string) => replace({ ...latest.current, [key]: value }),
    [replace],
  );

  /** The server stored this code already (with a submission): no need to save it. */
  const markSaved = useCallback((code: CodeFiles) => {
    if (unsaved.current === code) unsaved.current = null;
    setSaveState('saved');
  }, []);

  return { files, update, replace, saveState, markSaved };
}

/**
 * The sandbox, showing the files as the student types (one run at a time). Python
 * programs only run when asked (`run`), since they may wait for input or loop: the
 * Python runtime is downloaded when a Python step opens.
 */
export function useLivePreview(files: CodeFiles, { python = false }: { python?: boolean } = {}) {
  const labels = usePreviewLabels();
  const pythonLoad = usePythonRuntime(python);
  const sandbox = useSandbox(labels, pythonLoad.status === 'ready' ? pythonLoad.runtime : null);
  const { preview } = sandbox;
  /** The code the sandbox was last asked to show. */
  const shown = useRef<CodeFiles | null>(null);

  useEffect(() => {
    if (python || files === shown.current) return;
    const timer = setTimeout(() => {
      if (files === shown.current) return;
      shown.current = files;
      preview(files);
    }, PREVIEW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [files, preview, python]);

  /** Python: runs the program, with `stdin` answering its input() calls. */
  const run = useCallback(
    (stdin: string) => {
      shown.current = files;
      preview(files, stdin);
    },
    [files, preview],
  );

  /** Runs the checks on these files (which the preview then shows). */
  const check = useCallback(
    (code: CodeFiles, checks: Parameters<typeof sandbox.check>[1]) => {
      shown.current = code;
      return sandbox.check(code, checks);
    },
    [sandbox],
  );

  /** Python: whether the program can run yet (the runtime downloaded). */
  const canRun = sandbox.ready && (!python || pythonLoad.status === 'ready');
  return { sandbox, check, run, canRun, pythonLoad };
}

/**
 * Python's controls: the download's progress (first time only), the answers for
 * input(), and Run.
 */
export function PythonControls({
  load,
  canRun,
  onRun,
}: {
  load: PythonLoad;
  canRun: boolean;
  onRun: (stdin: string) => void;
}) {
  const t = useTranslations('lesson');
  const format = useFormatter();
  const id = useId();
  const [stdin, setStdin] = useState('');
  const mb = (bytes: number) =>
    format.number(bytes / 1_000_000, { maximumFractionDigits: 1, minimumFractionDigits: 1 });
  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-4">
      {load.status === 'loading' ? (
        <div role="status" className="flex flex-col gap-1 text-sm">
          <label htmlFor={`${id}-progress`} className="font-semibold">
            {t('pythonDownloading')}
          </label>
          <progress
            id={`${id}-progress`}
            className="h-3 w-full accent-brand-600"
            value={load.total ? load.loaded : undefined}
            max={load.total || undefined}
          />
          {load.total ? (
            <span className="text-muted">
              {t('pythonDownloaded', { done: mb(load.loaded), total: mb(load.total) })}
            </span>
          ) : null}
        </div>
      ) : null}
      {load.status === 'failed' ? (
        <Alert tone="error">
          <p>{t('pythonDownloadFailed')}</p>
          <Button variant="secondary" className="mt-2" onClick={() => loadPython(true)}>
            {t('tryAgain')}
          </Button>
        </Alert>
      ) : null}
      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-stdin`} className="text-sm font-semibold">
          {t('pythonInput')}
        </label>
        <textarea
          id={`${id}-stdin`}
          aria-describedby={`${id}-stdin-help`}
          dir="auto"
          rows={2}
          value={stdin}
          onChange={(event) => setStdin(event.target.value)}
          className="rounded-lg border border-line bg-canvas px-3 py-2 font-mono text-sm"
        />
        <p id={`${id}-stdin-help`} className="text-xs text-muted">
          {t('pythonInputHelp')}
        </p>
      </div>
      <div>
        <Button
          variant="secondary"
          onClick={() => canRun && onRun(stdin)}
          aria-disabled={!canRun}
          className={clsx(!canRun && 'cursor-not-allowed opacity-60')}
        >
          {t('run')}
        </Button>
      </div>
    </div>
  );
}

export function ProblemList({
  errors,
  console: lines,
}: {
  errors: CodeError[];
  console: { level: string; text: string }[];
}) {
  const t = useTranslations('lesson');
  const describe = (error: CodeError) => {
    if (error.kind === 'loop') return t('loopError');
    if (error.kind === 'input') return t('inputNeeded');
    const message =
      error.kind === 'syntax' && !error.name
        ? `${t('syntaxError')}: ${error.message}`
        : error.message;
    return error.line ? t('errorOnLine', { line: String(error.line), message }) : message;
  };
  const explain = (error: CodeError) =>
    error.name && (EXPLAINED_ERRORS as readonly string[]).includes(error.name)
      ? t(`pythonErrors.${error.name as (typeof EXPLAINED_ERRORS)[number]}`)
      : null;
  if (errors.length === 0 && lines.length === 0) return null;
  return (
    <div className="flex flex-col gap-2 text-sm">
      {errors.length ? (
        <div>
          <h4 className="font-semibold text-danger">{t('problems')}</h4>
          <ul className="mt-1 flex flex-col gap-1">
            {errors.map((error, index) => (
              <li key={index} className="rounded-lg bg-danger/10 px-3 py-1.5 text-danger">
                <bdi dir={error.name ? 'ltr' : undefined}>{describe(error)}</bdi>
                {explain(error) ? <p className="mt-1 text-ink">{explain(error)}</p> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {lines.length ? (
        <div>
          <h4 className="font-semibold">{t('console')}</h4>
          <pre
            dir="ltr"
            className="mt-1 max-h-40 overflow-auto rounded-lg bg-ink p-3 text-start font-mono text-xs text-white"
          >
            {lines
              .map((line) => `${line.level === 'log' ? '' : `[${line.level}] `}${line.text}`)
              .join('\n')}
          </pre>
        </div>
      ) : null}
    </div>
  );
}

/** The files as tabs, with a code editor for the selected one. */
export function FilesEditor({
  fileKeys,
  labelFor,
  files,
  saveText,
  onChange,
}: {
  fileKeys: CodeFileKey[];
  labelFor: (key: CodeFileKey) => string;
  files: CodeFiles;
  /** "Saving…" / "Saved", announced politely. */
  saveText: string;
  onChange: (key: CodeFileKey, value: string) => void;
}) {
  const t = useTranslations('lesson');
  const baseId = useId();
  const helpId = `${baseId}-help`;
  const panelId = `${baseId}-panel`;
  const tabId = (file: string) => `${baseId}-tab-${file}`;
  const [active, setActive] = useState<CodeFileKey>(fileKeys[0] ?? 'html');
  const handle = useCallback((next: string) => onChange(active, next), [active, onChange]);

  return (
    <div className="flex min-w-0 flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
      <div className="flex items-center justify-between gap-2 border-b border-line px-2">
        <div role="tablist" aria-label={t('files')} className="flex">
          {fileKeys.map((file, index) => (
            <button
              key={file}
              id={tabId(file)}
              type="button"
              role="tab"
              aria-selected={active === file}
              aria-controls={panelId}
              tabIndex={active === file ? 0 : -1}
              onClick={() => setActive(file)}
              onKeyDown={(event) =>
                onTabKeyDown(event, fileKeys.length, index, (i) => setActive(fileKeys[i]!))
              }
              className={clsx(
                'font-latin -mb-px border-b-2 px-3 py-2 text-sm font-semibold',
                active === file
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-muted hover:text-ink',
              )}
            >
              <bdi>{labelFor(file)}</bdi>
            </button>
          ))}
        </div>
        <span className="text-xs text-muted" aria-live="polite">
          {saveText}
        </span>
      </div>
      <div
        id={panelId}
        role="tabpanel"
        aria-labelledby={tabId(active)}
        className="h-72 overflow-auto md:h-96"
      >
        <CodeEditor
          key={active}
          value={files[active] ?? ''}
          language={active}
          label={t('editorLabel', { file: labelFor(active) })}
          describedBy={helpId}
          onChange={handle}
        />
      </div>
      <p id={helpId} className="sr-only">
        {t('editorHelp')}
      </p>
    </div>
  );
}

/** The sandbox iframe showing the student's page (or, for Python, what the program printed). */
export function PreviewPane({
  sandbox,
  title,
  python = false,
}: {
  sandbox: ReturnType<typeof useSandbox>;
  title: string;
  python?: boolean;
}) {
  const t = useTranslations('lesson');
  return (
    <div className="flex min-w-0 flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
      <div className="border-b border-line px-3 py-2 text-sm font-semibold">
        {python ? t('output') : t('preview')}
      </div>
      <iframe
        key={sandbox.frameKey}
        ref={sandbox.frame}
        src={`${SANDBOX_URL}/`}
        sandbox="allow-scripts"
        title={title}
        className="h-72 w-full bg-white md:h-96"
      />
    </div>
  );
}

/** "Saving…" / "Saved" / "Couldn't save" for a save state. */
export function useSaveText(state: SaveState) {
  const t = useTranslations('lesson');
  return { idle: '', saving: t('saving'), saved: t('saved'), failed: t('saveFailed') }[state];
}
