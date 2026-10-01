'use client';

import type { components } from '@kcp/api-client-ts';
import {
  applyAction,
  type Check,
  type CodeFiles,
  emptyState,
  GIT_LIMITS,
  type GitAction,
  type GitSetup,
  gitCheckResults,
  MAX_CODE_FILE_LENGTH,
  parseActions,
} from '@kcp/checks';
import { clsx } from 'clsx';
import { useTranslations } from 'next-intl';
import {
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Button, Dialog, Icon, inputClass } from '@/components/ui';
import { BadgeCelebration } from '../badges/badge-celebration';
import {
  type Challenge,
  CheckFeedback,
  ResetDialog,
  saveDraft,
  useChallengeSubmission,
} from '../learn/challenge-workspace';
import { CodeEditor, type EditorLanguage } from '../learn/code-editor';
import { Markdown } from '../learn/markdown';
import { CheckList, type SaveState, useCodeFiles, WORKSPACE_PANE_CLASS } from '../learn/workspace';

type SubmissionResult = components['schemas']['SubmissionResultDto'];

/** Which highlighting a file gets, from its name. */
export function languageOf(path: string): EditorLanguage {
  if (path.endsWith('.html')) return 'html';
  if (path.endsWith('.css')) return 'css';
  if (path.endsWith('.js')) return 'js';
  return 'text';
}

/** Adds a step, merging typing into the same file with the step before it. */
function addStep(actions: GitAction[], step: GitAction): GitAction[] {
  const last = actions.at(-1);
  if (last && 'write' in last && 'write' in step && last.write === step.write) {
    return [...actions.slice(0, -1), step];
  }
  return [...actions, step];
}

interface Replayed {
  state: ReturnType<typeof emptyState>;
  /** Each command the student typed, with what it printed. */
  transcript: { command: string; output: string; ok: boolean }[];
}

function replayWithTranscript(setup: GitSetup, actions: GitAction[]): Replayed {
  const state = emptyState(setup.files);
  for (const action of setup.setup ?? []) applyAction(state, action);
  const transcript: Replayed['transcript'] = [];
  for (const action of actions.slice(0, GIT_LIMITS.actions)) {
    const result = applyAction(state, action);
    if ('run' in action) transcript.push({ command: action.run, ...result });
  }
  return { state, transcript };
}

/**
 * A git lesson step (Pro): the project's files on one side, a terminal on the other.
 * Every command and edit is kept as a step; the same simulator replays them here and
 * on the server, so checking works the same in both places.
 */
export function GitChallenge({
  challenge,
  kicker,
  initialCode,
  isStudent,
  focusTitle = false,
  after,
  onCodeChange,
  onSaveState,
  onPassed,
}: {
  challenge: Challenge;
  kicker: string;
  initialCode: CodeFiles;
  isStudent: boolean;
  focusTitle?: boolean;
  after?: ReactNode;
  onCodeChange: (challengeId: string, code: CodeFiles) => void;
  onSaveState: (state: SaveState) => void;
  onPassed: (result: SubmissionResult) => void;
}) {
  const t = useTranslations('lesson');
  const tg = useTranslations('gitLesson');
  const setup = (challenge.repo ?? { files: {} }) as GitSetup;
  const [confirmReset, setConfirmReset] = useState(false);
  const submission = useChallengeSubmission({ challenge, isStudent, onPassed });
  const { checking, feedback, setFeedback, passedIds, newBadges } = submission;
  const title = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  const save = useCallback((code: CodeFiles) => saveDraft(challenge.id, code), [challenge.id]);
  const code = useCodeFiles({
    initialCode,
    save: isStudent ? save : null,
    saveKey: challenge.id,
    onChange: (next) => {
      setFeedback(null);
      onCodeChange(challenge.id, next);
    },
  });
  const actions = useMemo(() => parseActions(code.files.git ?? '[]'), [code.files.git]);
  // The lesson's setup never changes while the step is open.
  // oxlint-disable-next-line react-hooks/exhaustive-deps
  const replayed = useMemo(() => replayWithTranscript(setup, actions), [actions, challenge.id]);
  const { state } = replayed;
  const files = Object.keys(state.files).toSorted();
  const [selected, setSelected] = useState<string | null>(files[0] ?? null);
  const current = selected && state.files[selected] !== undefined ? selected : (files[0] ?? null);
  const full = actions.length >= GIT_LIMITS.actions;
  const tooLong = (code.files.git ?? '').length > MAX_CODE_FILE_LENGTH - 2000;

  useEffect(() => {
    onSaveState(code.saveState);
  }, [code.saveState, onSaveState]);

  useEffect(() => {
    if (focusTitle) title.current?.focus();
  }, [focusTitle]);

  const push = (step: GitAction) => {
    if (full) return;
    code.update('git', JSON.stringify(addStep(actions, step)));
  };

  async function onCheck() {
    if (checking) return;
    await submission.submit(
      code.files,
      async () => gitCheckResults(state, challenge.checks as unknown as Check[]),
      code.markSaved,
    );
  }

  return (
    <div className="grid min-h-0 flex-1 gap-3.5 px-4 pb-4 sm:px-6 sm:pb-6 md:grid-cols-2 xl:grid-cols-[20rem_minmax(0,1.3fr)_minmax(0,1fr)]">
      <aside
        aria-labelledby={titleId}
        tabIndex={0}
        className="relative flex flex-col gap-3.5 rounded-panel bg-surface p-6 md:col-span-2 xl:col-span-1 xl:min-h-0 xl:overflow-y-auto"
      >
        <p className="text-xs font-bold tracking-[0.1em] text-brand-text uppercase">{kicker}</p>
        <h3 id={titleId} ref={title} tabIndex={-1} className="text-2xl outline-none">
          {challenge.title}
        </h3>
        <div className="text-[1.05rem]">
          <Markdown>{challenge.instructions}</Markdown>
        </div>
        <CheckList
          checks={challenge.checks as unknown as { id: string; hint?: string }[]}
          labels={challenge.checkLabels}
          hints={challenge.hints}
          passed={passedIds}
          title={t('checks')}
        />
        <CheckFeedback feedback={feedback} />
        {after}
      </aside>

      <FilesPane
        state={state}
        files={files}
        current={current}
        onSelect={setSelected}
        onWrite={(path, content) => push({ write: path, content })}
        onRemove={(path) => push({ remove: path })}
        disabled={full}
        actions={
          <>
            <Button variant="ghost" onClick={() => setConfirmReset(true)} className="text-muted">
              <Icon name="undo" />
              {t('reset')}
            </Button>
            <Button
              size="lg"
              onClick={() => void onCheck()}
              aria-disabled={checking}
              aria-busy={checking || undefined}
              className="ms-auto"
            >
              <Icon name="check" />
              {checking ? t('checking') : tg('check')}
            </Button>
          </>
        }
      />
      <Terminal
        transcript={replayed.transcript}
        branch={state.initialized ? state.head : null}
        conflicts={state.merging?.conflicts.length ?? 0}
        notice={full ? tg('full') : tooLong ? tg('almostFull') : null}
        disabled={full}
        onRun={(line) => push({ run: line })}
      />

      <ResetDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={() => {
          code.replace({ ...challenge.starter });
          setConfirmReset(false);
        }}
      />
      <BadgeCelebration keys={newBadges} />
    </div>
  );
}

function FilesPane({
  state,
  files,
  current,
  onSelect,
  onWrite,
  onRemove,
  disabled,
  actions,
}: {
  state: ReturnType<typeof emptyState>;
  files: string[];
  current: string | null;
  onSelect: (path: string) => void;
  onWrite: (path: string, content: string) => void;
  onRemove: (path: string) => void;
  disabled: boolean;
  actions: ReactNode;
}) {
  const t = useTranslations('gitLesson');
  const tl = useTranslations('lesson');
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [removing, setRemoving] = useState<string | null>(null);
  const valid =
    /^[\w.-]+(?:\/[\w.-]+){0,3}$/.test(name) && !name.split('/').some((p) => /^\.+$/.test(p));

  function create(event: FormEvent) {
    event.preventDefault();
    if (!valid || state.files[name] !== undefined) return;
    onWrite(name, '');
    onSelect(name);
    setName('');
    setCreating(false);
  }

  return (
    <section
      aria-label={t('filesLabel')}
      className={clsx(
        'flex min-h-0 flex-col overflow-hidden rounded-panel bg-code-bg',
        WORKSPACE_PANE_CLASS,
      )}
    >
      <div className="flex flex-wrap items-center gap-1.5 border-b border-line p-2.5">
        {files.map((path) => (
          <button
            key={path}
            type="button"
            aria-pressed={path === current}
            onClick={() => onSelect(path)}
            className={clsx(
              'font-latin min-h-9 rounded-full px-3.5 text-sm transition-colors',
              path === current
                ? 'bg-brand-100 font-bold text-brand-800'
                : 'font-semibold text-muted hover:bg-ink/7 hover:text-ink',
            )}
          >
            <bdi>{path}</bdi>
          </button>
        ))}
        <Button variant="ghost" size="sm" onClick={() => setCreating(true)} disabled={disabled}>
          <Icon name="plus" />
          {t('newFile')}
        </Button>
        {current ? (
          <Button
            variant="ghost"
            size="sm"
            className="ms-auto text-muted"
            onClick={() => setRemoving(current)}
            disabled={disabled}
          >
            <Icon name="trash" />
            <span className="sr-only">{t('deleteFile', { file: current })}</span>
          </Button>
        ) : null}
      </div>
      <div className="relative min-h-48 flex-1 overflow-auto">
        {current ? (
          <CodeEditor
            key={`${current}:${state.head}`}
            value={state.files[current] ?? ''}
            language={languageOf(current)}
            label={tl('editorLabel', { file: current })}
            onChange={(value) => onWrite(current, value)}
          />
        ) : (
          <p className="p-6 text-muted">{t('noFiles')}</p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2.5 p-3.5">{actions}</div>

      <Dialog open={creating} onClose={() => setCreating(false)} title={t('newFile')}>
        <form onSubmit={create} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="font-bold">{t('fileName')}</span>
            <input
              className={inputClass(name && !valid ? 'invalid' : undefined)}
              dir="ltr"
              value={name}
              autoComplete="off"
              spellCheck={false}
              placeholder="about.html"
              onChange={(event) => setName(event.target.value.trim())}
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setCreating(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={!valid || state.files[name] !== undefined}>
              {t('create')}
            </Button>
          </div>
        </form>
      </Dialog>
      <Dialog
        open={removing !== null}
        onClose={() => setRemoving(null)}
        title={t('deleteTitle', { file: removing ?? '' })}
      >
        <p className="text-muted">{t('deleteBody')}</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setRemoving(null)}>
            {t('cancel')}
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (removing) onRemove(removing);
              setRemoving(null);
            }}
          >
            {t('delete')}
          </Button>
        </div>
      </Dialog>
    </section>
  );
}

function Terminal({
  transcript,
  branch,
  conflicts,
  notice,
  disabled,
  onRun,
}: {
  transcript: Replayed['transcript'];
  branch: string | null;
  conflicts: number;
  notice: string | null;
  disabled: boolean;
  onRun: (line: string) => void;
}) {
  const t = useTranslations('gitLesson');
  const [line, setLine] = useState('');
  const [clearedAt, setClearedAt] = useState(0);
  const [recall, setRecall] = useState<number | null>(null);
  const log = useRef<HTMLDivElement>(null);
  const inputId = useId();
  const shown = transcript.slice(clearedAt);
  const typed = transcript.map((entry) => entry.command);

  useEffect(() => {
    const element = log.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [transcript.length, clearedAt]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const command = line.trim();
    setLine('');
    setRecall(null);
    if (!command) return;
    if (command === 'clear') {
      setClearedAt(transcript.length);
      return;
    }
    onRun(command);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    if (typed.length === 0) return;
    event.preventDefault();
    const next =
      event.key === 'ArrowUp'
        ? Math.max(0, (recall ?? typed.length) - 1)
        : Math.min(typed.length, (recall ?? typed.length) + 1);
    setRecall(next);
    setLine(typed[next] ?? '');
  }

  return (
    <section
      aria-label={t('terminal')}
      dir="ltr"
      className={clsx(
        'flex min-h-0 flex-col overflow-hidden rounded-panel bg-[#1d1b18] text-[#f3eee6]',
        WORKSPACE_PANE_CLASS,
      )}
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-white/15 px-4 py-2.5 text-sm">
        <Icon name="terminal" />
        <span className="font-bold">{t('terminal')}</span>
        {branch ? (
          <span className="ms-auto rounded-full bg-white/12 px-2.5 py-0.5 font-mono text-xs">
            <Icon name="share" className="inline text-xs" /> {branch}
          </span>
        ) : null}
        {conflicts ? (
          <span className="rounded-full bg-[#ffb4a0] px-2.5 py-0.5 text-xs font-bold text-[#3a1208]">
            {t('conflicts', { count: conflicts })}
          </span>
        ) : null}
      </div>
      <div
        ref={log}
        role="log"
        aria-label={t('output')}
        className="min-h-0 flex-1 overflow-y-auto px-4 py-3 font-mono text-[13px] leading-relaxed"
      >
        {shown.length === 0 ? <p className="text-white/60">{t('terminalHelp')}</p> : null}
        {shown.map((entry, index) => (
          <div key={clearedAt + index} className="mb-2">
            <p>
              <span aria-hidden="true" className="text-[#9fd49a]">
                ${' '}
              </span>
              {entry.command}
            </p>
            {entry.output ? (
              <pre
                className={clsx(
                  'whitespace-pre-wrap break-words',
                  entry.ok ? 'text-white/85' : 'text-[#ffb4a0]',
                )}
              >
                {entry.output}
              </pre>
            ) : null}
          </div>
        ))}
      </div>
      {notice ? <p className="bg-[#ffb4a0] px-4 py-2 text-sm text-[#3a1208]">{notice}</p> : null}
      <form
        onSubmit={submit}
        className="flex items-center gap-2 border-t border-white/15 px-4 py-2.5"
      >
        <label htmlFor={inputId} className="sr-only">
          {t('commandLabel')}
        </label>
        <span aria-hidden="true" className="font-mono text-[#9fd49a]">
          $
        </span>
        <input
          id={inputId}
          value={line}
          onChange={(event) => setLine(event.target.value)}
          onKeyDown={onKeyDown}
          disabled={disabled}
          maxLength={GIT_LIMITS.commandLength}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder={t('commandPlaceholder')}
          className="min-h-10 flex-1 bg-transparent font-mono text-sm text-inherit placeholder:text-white/45 focus-visible:outline-none"
        />
        <button
          type="submit"
          disabled={disabled}
          className="min-h-9 rounded-full bg-[#f3eee6] px-4 text-sm font-bold text-[#1d1b18] hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9fd49a] disabled:opacity-50"
        >
          {t('run')}
        </button>
      </form>
    </section>
  );
}
