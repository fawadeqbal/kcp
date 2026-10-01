'use client';

import type { components } from '@kcp/api-client-ts';
import type { Check, CheckResult, CodeFileKey, CodeFiles } from '@kcp/checks';
import { clsx } from 'clsx';
import { useTranslations } from 'next-intl';
import { type ReactNode, useCallback, useEffect, useId, useRef, useState } from 'react';
import { Alert, Button, Dialog, Icon } from '@/components/ui';
import { api } from '@/lib/api';
import { BadgeCelebration } from '../badges/badge-celebration';
import { Markdown } from './markdown';
import {
  CheckList,
  FilesEditor,
  PreviewPane,
  ProblemList,
  PythonControls,
  type SaveState,
  useCodeFiles,
  useLivePreview,
  WORKSPACE_PANE_CLASS,
} from './workspace';
import { refreshNotifications } from '@/components/notification-bell';

export type Challenge = components['schemas']['ChallengeDto'];
type SubmissionResult = components['schemas']['SubmissionResultDto'];

const FILE_LABELS = {
  html: 'fileHtml',
  css: 'fileCss',
  js: 'fileJs',
  py: 'filePy',
  blocks: 'fileBlocks',
  git: 'fileGit',
} as const;
/** The file each tab edits, shown beside the tabs. */
export const FILE_NAMES: Record<CodeFileKey, string> = {
  html: 'index.html',
  css: 'style.css',
  js: 'script.js',
  py: 'main.py',
  blocks: 'program.blocks.json',
  git: 'steps.git.json',
};

export async function saveDraft(challengeId: string, code: CodeFiles): Promise<boolean> {
  try {
    const { response } = await api.PUT('/v1/learning/challenges/{id}/draft', {
      params: { path: { id: challengeId } },
      body: { code },
    });
    return response.ok;
  } catch {
    return false;
  }
}

/** Hint texts for the checks that failed (each once), or a general note. */
export function hintsFor(
  results: CheckResult[],
  hints: Record<string, string>,
  fallback: string,
): string[] {
  return [
    ...new Set(results.filter((r) => !r.passed).map((r) => (r.hint && hints[r.hint]) || fallback)),
  ];
}

/**
 * One "try it" step, in three panes: what to do (the instructions and the checklist),
 * the code editor, and the live preview from the sandbox. The student's code is saved
 * as they type; the lesson keeps the latest version (`onCodeChange`) for when they
 * come back to a step.
 */
export function ChallengeWorkspace({
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
  /** "Step 3 · Try it". */
  kicker: string;
  /** The code to start from: what the student wrote last, or the starter. */
  initialCode: CodeFiles;
  isStudent: boolean;
  /** Move focus to the step's title when it opens (after "Next step"). */
  focusTitle?: boolean;
  /** What comes after a pass: "Next step", or the finished lesson. */
  after?: ReactNode;
  onCodeChange: (challengeId: string, code: CodeFiles) => void;
  onSaveState: (state: SaveState) => void;
  onPassed: (result: SubmissionResult) => void;
}) {
  const t = useTranslations('lesson');
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
  const { files } = code;
  const python = challenge.type === 'PYTHON';
  const {
    sandbox,
    check,
    run: runProgram,
    canRun,
    pythonLoad,
  } = useLivePreview(files, {
    python,
  });

  useEffect(() => {
    onSaveState(code.saveState);
  }, [code.saveState, onSaveState]);

  useEffect(() => {
    if (focusTitle) title.current?.focus();
  }, [focusTitle]);

  async function onCheck() {
    if (checking || !canRun) return;
    await submission.submit(
      files,
      async () => {
        const run = await check(files, challenge.checks as unknown as Check[]);
        return run.status === 'timeout' || !run.results ? null : run.results;
      },
      code.markSaved,
    );
  }

  function reset() {
    code.replace({ ...challenge.starter });
    setConfirmReset(false);
  }

  const cannotCheck = checking || !canRun;
  const labelFor = (key: CodeFileKey) => t(FILE_LABELS[key]);

  return (
    <div className="grid min-h-0 flex-1 gap-3.5 px-4 pb-4 sm:px-6 sm:pb-6 md:grid-cols-2 xl:grid-cols-[22rem_minmax(0,1fr)_minmax(0,1fr)]">
      {/* Scrolls on its own on wide screens, so it can take focus (keyboards scroll it too). */}
      <aside
        aria-labelledby={titleId}
        tabIndex={0}
        className="relative flex flex-col gap-3.5 rounded-panel bg-surface p-6 md:col-span-2 xl:col-span-1 xl:min-h-0 xl:overflow-y-auto"
      >
        <p className="text-xs font-bold tracking-[0.1em] text-brand-text uppercase">{kicker}</p>
        <h3 id={titleId} ref={title} tabIndex={-1} className="text-2xl outline-none">
          {challenge.title}
        </h3>
        <div className="text-[0.95rem]">
          <Markdown>{challenge.instructions}</Markdown>
        </div>
        <CheckList
          checks={challenge.checks as unknown as { id: string; hint?: string }[]}
          labels={challenge.checkLabels}
          hints={challenge.hints}
          passed={passedIds}
          title={t('checks')}
        />
        <ProblemList errors={sandbox.output.errors} />

        <CheckFeedback feedback={feedback} />
        {after}
      </aside>

      <FilesEditor
        fileKeys={challenge.files as CodeFileKey[]}
        labelFor={labelFor}
        fileNameFor={(key) => FILE_NAMES[key]}
        files={files}
        onChange={code.update}
        className={WORKSPACE_PANE_CLASS}
        actions={
          <>
            <Button variant="ghost" onClick={() => setConfirmReset(true)} className="text-muted">
              <Icon name="undo" />
              {t('reset')}
            </Button>
            {/* aria-disabled rather than disabled, so keyboard focus stays on the button. */}
            <Button
              size="lg"
              onClick={() => void onCheck()}
              aria-disabled={cannotCheck}
              aria-busy={checking || undefined}
              className="ms-auto"
            >
              <Icon name="check" />
              {checking ? t('checking') : t('check')}
            </Button>
          </>
        }
      />
      <PreviewPane
        sandbox={sandbox}
        title={python ? t('outputTitle') : t('previewTitle')}
        python={python}
        console={python ? [] : sandbox.output.console}
        className={WORKSPACE_PANE_CLASS}
        footer={
          python ? <PythonControls load={pythonLoad} canRun={canRun} onRun={runProgram} /> : null
        }
      />

      <ResetDialog open={confirmReset} onClose={() => setConfirmReset(false)} onConfirm={reset} />
      <BadgeCelebration keys={newBadges} />
    </div>
  );
}

export type Feedback =
  | { kind: 'passed'; xp: number; capReached: boolean }
  | { kind: 'failed'; passed: number; total: number; hints: string[] }
  | { kind: 'error'; message: string };

/**
 * "Check my code" for a lesson step: shows the checks' results, sends them with the
 * code to the API (students), and reports the outcome. The checks themselves run
 * elsewhere (the sandbox, or the stage for block programs).
 */
export function useChallengeSubmission({
  challenge,
  isStudent,
  onPassed,
}: {
  challenge: Challenge;
  isStudent: boolean;
  onPassed: (result: SubmissionResult) => void;
}) {
  const t = useTranslations('lesson');
  const [checking, setChecking] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [passedIds, setPassedIds] = useState<ReadonlySet<string> | null>(
    challenge.passed ? new Set(challenge.checks.map((c) => String(c['id']))) : null,
  );
  const [newBadges, setNewBadges] = useState<string[]>([]);

  /** `run` returns the checks' results, or null when they couldn't run in time. */
  async function submit(
    files: CodeFiles,
    run: () => Promise<CheckResult[] | null>,
    markSaved: (code: CodeFiles) => void,
  ) {
    setChecking(true);
    setFeedback(null);
    const local = await run();
    if (!local) {
      setChecking(false);
      setFeedback({ kind: 'error', message: t('timeout') });
      return;
    }
    setPassedIds(new Set(local.filter((r) => r.passed).map((r) => r.id)));
    let result: SubmissionResult | undefined;
    if (isStudent) {
      try {
        const { data } = await api.POST('/v1/learning/challenges/{id}/submissions', {
          params: { path: { id: challenge.id } },
          body: { code: files, results: local.map(({ id, passed }) => ({ id, passed })) },
        });
        result = data;
      } catch {
        result = undefined;
      }
      if (!result) {
        setChecking(false);
        setFeedback({ kind: 'error', message: t('checkFailed') });
        return;
      }
      // The server keeps the checked code as the draft too.
      markSaved(files);
    }
    setChecking(false);
    const passed = result ? result.passed : local.every((r) => r.passed);
    if (passed) {
      setFeedback({
        kind: 'passed',
        xp: result?.xpAwarded ?? 0,
        capReached: result?.dailyCapReached ?? false,
      });
      if (result) {
        if (result.badgesEarned.length) {
          setNewBadges(result.badgesEarned);
          refreshNotifications();
        }
        onPassed(result);
      }
      return;
    }
    const failing = local.filter((r) => !r.passed);
    setFeedback({
      kind: 'failed',
      passed: local.length - failing.length,
      total: local.length,
      hints: hintsFor(local, challenge.hints, t('checkFailedNoHint')),
    });
  }

  return { checking, feedback, setFeedback, passedIds, newBadges, submit };
}

/** The outcome of a check, announced to screen readers. */
export function CheckFeedback({ feedback }: { feedback: Feedback | null }) {
  const t = useTranslations('lesson');
  const tp = useTranslations('progress');
  return (
    // Always on the page, so screen readers announce each new result.
    <div aria-live="polite" aria-atomic="true" className="mt-auto flex flex-col gap-3">
      {feedback?.kind === 'passed' ? (
        <div className="flex flex-col gap-1 rounded-row bg-sage-100 px-4 py-3.5 text-sage-800">
          <p className="flex flex-wrap items-center gap-2 font-bold">
            <Icon name="check" />
            {t('allPassed')}
            {feedback.xp > 0 ? (
              <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-sm text-brand-800">
                {tp('xpGained', { xp: String(feedback.xp) })}
              </span>
            ) : null}
          </p>
          {feedback.capReached ? <p className="text-sm">{tp('capReached')}</p> : null}
        </div>
      ) : null}
      {feedback?.kind === 'failed' ? (
        <div className="flex flex-col gap-1 rounded-row bg-warn-soft px-4 py-3.5 text-sm text-warn-text">
          <p className="font-bold">
            {t('someFailed', {
              passed: String(feedback.passed),
              total: String(feedback.total),
            })}
          </p>
          <ul className={clsx(feedback.hints.length > 1 && 'list-disc ps-5')}>
            {feedback.hints.map((hint) => (
              <li key={hint}>
                <bdi>{hint}</bdi>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {feedback?.kind === 'error' ? (
        <Alert tone="error" live={false}>
          {feedback.message}
        </Alert>
      ) : null}
    </div>
  );
}

/** "Start again?" — the code goes back to the starter. */
export function ResetDialog({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const t = useTranslations('lesson');
  return (
    <Dialog open={open} onClose={onClose} title={t('resetTitle')}>
      <p className="text-muted">{t('resetBody')}</p>
      <div className="flex flex-wrap justify-end gap-3">
        <Button variant="secondary" onClick={onClose}>
          {t('cancel')}
        </Button>
        <Button onClick={onConfirm}>{t('resetConfirm')}</Button>
      </div>
    </Dialog>
  );
}
