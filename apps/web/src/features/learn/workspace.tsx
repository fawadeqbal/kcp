'use client';

import type { CodeError, CodeFileKey, CodeFiles, PreviewLabels } from '@kcp/checks';
import { clsx } from 'clsx';
import { useFormatter, useTranslations } from 'next-intl';
import { type ReactNode, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Alert, Button, Icon, textareaClass } from '@/components/ui';
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
    <div className="flex flex-col gap-3">
      {load.status === 'loading' ? (
        <div role="status" className="flex flex-col gap-1.5 text-sm">
          <label htmlFor={`${id}-progress`} className="font-semibold">
            {t('pythonDownloading')}
          </label>
          <progress
            id={`${id}-progress`}
            className="h-3 w-full overflow-hidden rounded-full accent-brand"
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
          <Button variant="secondary" size="sm" className="mt-2" onClick={() => loadPython(true)}>
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
          className={clsx(textareaClass(), 'min-h-0 font-mono text-sm')}
        />
        <p id={`${id}-stdin-help`} className="text-xs text-muted">
          {t('pythonInputHelp')}
        </p>
      </div>
      <div>
        <Button
          variant="sage"
          onClick={() => canRun && onRun(stdin)}
          aria-disabled={!canRun}
          className={clsx(!canRun && 'cursor-not-allowed opacity-45')}
        >
          <Icon name="play" className="text-sm" />
          {t('run')}
        </Button>
      </div>
    </div>
  );
}

/** Mistakes the page or program made (with a friendly note for Python's errors). */
export function ProblemList({ errors }: { errors: CodeError[] }) {
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
  if (errors.length === 0) return null;
  return (
    <div className="flex flex-col gap-2 text-sm">
      <h4 className="flex items-center gap-2 font-sans font-bold text-danger">
        <Icon name="alert" />
        {t('problems')}
      </h4>
      <ul className="flex flex-col gap-1.5">
        {errors.map((error, index) => (
          <li key={index} className="rounded-row bg-danger-soft px-3.5 py-2 text-danger-text">
            <bdi dir={error.name ? 'ltr' : undefined}>{describe(error)}</bdi>
            {explain(error) ? <p className="mt-1 text-ink">{explain(error)}</p> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** What the page wrote to the console (console.log and friends). */
export function ConsoleOutput({ lines }: { lines: { level: string; text: string }[] }) {
  const t = useTranslations('lesson');
  return lines.length ? (
    <pre
      dir="ltr"
      className="h-full overflow-auto rounded-well bg-code-bg p-4 text-start font-mono text-xs leading-relaxed text-ink"
    >
      {lines
        .map((line) => `${line.level === 'log' ? '' : `[${line.level}] `}${line.text}`)
        .join('\n')}
    </pre>
  ) : (
    <p className="grid h-full place-items-center rounded-well bg-code-bg p-4 text-center text-sm text-muted">
      {t('consoleEmpty')}
    </p>
  );
}

/** The files as pill tabs, with a code editor for the selected one and the actions below. */
export function FilesEditor({
  fileKeys,
  labelFor,
  fileNameFor,
  files,
  onChange,
  actions,
  className,
}: {
  fileKeys: CodeFileKey[];
  labelFor: (key: CodeFileKey) => string;
  /** The file's real name, shown beside the tabs ("style.css"). */
  fileNameFor?: (key: CodeFileKey) => string;
  files: CodeFiles;
  onChange: (key: CodeFileKey, value: string) => void;
  /** "Start again" and "Check my code", under the editor. */
  actions?: ReactNode;
  className?: string;
}) {
  const t = useTranslations('lesson');
  const baseId = useId();
  const helpId = `${baseId}-help`;
  const panelId = `${baseId}-panel`;
  const tabId = (file: string) => `${baseId}-tab-${file}`;
  const [active, setActive] = useState<CodeFileKey>(fileKeys[0] ?? 'html');
  const handle = useCallback((next: string) => onChange(active, next), [active, onChange]);

  return (
    <div
      className={clsx(
        'elev-sm flex min-w-0 flex-col overflow-hidden rounded-panel bg-code-bg',
        className,
      )}
    >
      <div className="flex items-center gap-2 px-3 pt-3 pb-1.5">
        <div role="tablist" aria-label={t('files')} className="flex flex-wrap gap-1">
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
                'font-latin min-h-9 rounded-full px-3.5 text-sm transition-colors',
                active === file
                  ? 'bg-brand-100 font-bold text-brand-800'
                  : 'font-semibold text-muted hover:bg-ink/7 hover:text-ink',
              )}
            >
              <bdi>{labelFor(file)}</bdi>
            </button>
          ))}
        </div>
        {fileNameFor ? (
          <span className="font-latin ms-auto truncate text-xs text-muted" dir="ltr">
            {fileNameFor(active)}
          </span>
        ) : null}
      </div>
      <div
        id={panelId}
        role="tabpanel"
        aria-labelledby={tabId(active)}
        className="min-h-72 flex-1 overflow-auto"
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
      {actions ? <div className="flex flex-wrap items-center gap-2.5 p-3.5">{actions}</div> : null}
      <p id={helpId} className="sr-only">
        {t('editorHelp')}
      </p>
    </div>
  );
}

/**
 * The student's page (or, for Python, what the program printed) in the sandbox, with a
 * second tab for the console. The frame stays on the page while the console shows, so
 * the page keeps running.
 */
export function PreviewPane({
  sandbox,
  title,
  python = false,
  console: lines = [],
  footer,
  className,
}: {
  sandbox: ReturnType<typeof useSandbox>;
  title: string;
  python?: boolean;
  /** Console lines (web pages only). */
  console?: { level: string; text: string }[];
  /** Python's controls, under the output. */
  footer?: ReactNode;
  className?: string;
}) {
  const t = useTranslations('lesson');
  const baseId = useId();
  const [tab, setTab] = useState<'preview' | 'console'>('preview');
  const tabs = python ? (['preview'] as const) : (['preview', 'console'] as const);
  const label = (key: 'preview' | 'console') =>
    key === 'console' ? t('console') : python ? t('output') : t('preview');
  return (
    <div
      className={clsx(
        'flex min-w-0 flex-col gap-3 overflow-hidden rounded-panel bg-surface p-3',
        className,
      )}
    >
      <div role="tablist" aria-label={title} className="flex gap-1">
        {tabs.map((key, index) => (
          <button
            key={key}
            id={`${baseId}-${key}`}
            type="button"
            role="tab"
            aria-selected={tab === key}
            aria-controls={`${baseId}-panel`}
            tabIndex={tab === key ? 0 : -1}
            onClick={() => setTab(key)}
            onKeyDown={(event) => onTabKeyDown(event, tabs.length, index, (i) => setTab(tabs[i]!))}
            className={clsx(
              'flex min-h-9 items-center gap-1.5 rounded-full px-3.5 text-sm transition-colors',
              tab === key
                ? 'elev-sm bg-canvas font-bold'
                : 'font-semibold text-muted hover:text-ink',
            )}
          >
            <Icon name={key === 'console' ? 'terminal' : python ? 'terminal' : 'eye'} />
            {label(key)}
            {key === 'console' && lines.length ? (
              <span className="size-2 rounded-full bg-brand" aria-hidden="true" />
            ) : null}
          </button>
        ))}
      </div>
      <div
        id={`${baseId}-panel`}
        role="tabpanel"
        aria-labelledby={`${baseId}-${tab}`}
        className="relative min-h-72 flex-1"
      >
        <iframe
          key={sandbox.frameKey}
          ref={sandbox.frame}
          src={`${SANDBOX_URL}/`}
          sandbox="allow-scripts"
          title={title}
          className="absolute inset-0 size-full rounded-well bg-white"
        />
        {tab === 'console' ? (
          <div className="absolute inset-0 bg-surface">
            <ConsoleOutput lines={lines} />
          </div>
        ) : null}
      </div>
      {footer}
    </div>
  );
}

/** "Saving…" / "Saved" / "Couldn't save" for a save state. */
export function useSaveText(state: SaveState) {
  const t = useTranslations('lesson');
  return { idle: '', saving: t('saving'), saved: t('saved'), failed: t('saveFailed') }[state];
}

/** The checklist beside the editor: each check with its label, ticked once it passes. */
export function CheckList({
  checks,
  labels,
  hints,
  passed,
  title,
  help,
}: {
  checks: { id: string; hint?: string }[];
  labels: Record<string, string>;
  hints: Record<string, string>;
  /** The IDs that passed on the last check (null before the first). */
  passed: ReadonlySet<string> | null;
  title: string;
  help?: string;
}) {
  const t = useTranslations('project');
  return (
    <div className="flex flex-col gap-2">
      <h4 className="font-sans text-sm font-bold text-muted">{title}</h4>
      {help ? <p className="-mt-1 text-xs text-muted">{help}</p> : null}
      <ul className="flex flex-col gap-2">
        {checks.map((check) => {
          const met = passed?.has(check.id) ?? false;
          const text = labels[check.id] || (check.hint && hints[check.hint]) || check.id;
          return (
            <li key={check.id} className="flex items-start gap-2.5 text-sm">
              <span
                aria-hidden="true"
                className={clsx(
                  'mt-px grid size-5.5 shrink-0 place-items-center rounded-full text-xs',
                  met ? 'bg-sage text-on-primary' : 'border-2 border-dashed border-brand-400',
                )}
              >
                {met ? <Icon name="check" /> : null}
              </span>
              <span className={clsx(met && 'text-muted')}>
                <span className="sr-only">{met ? `${t('requirementMet')}: ` : ''}</span>
                <bdi>{text}</bdi>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
