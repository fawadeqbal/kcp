'use client';

import type { components } from '@kcp/api-client-ts';
import type { Check, CheckResult, CodeFileKey, CodeFiles } from '@kcp/checks';
import { clsx } from 'clsx';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Button, Dialog } from '@/components/ui';
import { api } from '@/lib/api';
import { BadgeCelebration } from '../badges/badge-celebration';
import { Markdown } from './markdown';
import {
  FilesEditor,
  PreviewPane,
  ProblemList,
  PythonControls,
  useCodeFiles,
  useLivePreview,
  useSaveText,
} from './workspace';
import { refreshNotifications } from '@/components/notification-bell';

export type Challenge = components['schemas']['ChallengeDto'];
type SubmissionResult = components['schemas']['SubmissionResultDto'];

const FILE_LABELS = { html: 'fileHtml', css: 'fileCss', js: 'fileJs', py: 'filePy' } as const;

type Feedback =
  | { kind: 'passed'; xp: number; capReached: boolean }
  | { kind: 'failed'; passed: number; total: number; hints: string[] }
  | { kind: 'error'; message: string };

async function saveDraft(challengeId: string, code: CodeFiles): Promise<boolean> {
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
 * One "try it" step: instructions, a code editor per file, a live preview from the
 * sandbox, and "Check my code". The student's code is saved as they type; the
 * lesson keeps the latest version (`onCodeChange`) for when they come back to a step.
 */
export function ChallengeWorkspace({
  challenge,
  initialCode,
  isStudent,
  focusTitle = false,
  onCodeChange,
  onPassed,
}: {
  challenge: Challenge;
  /** The code to start from: what the student wrote last, or the starter. */
  initialCode: CodeFiles;
  isStudent: boolean;
  /** Move focus to the step's title when it opens (after "Next step"). */
  focusTitle?: boolean;
  onCodeChange: (challengeId: string, code: CodeFiles) => void;
  onPassed: (result: SubmissionResult) => void;
}) {
  const t = useTranslations('lesson');
  const tp = useTranslations('progress');
  const [checking, setChecking] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [newBadges, setNewBadges] = useState<string[]>([]);
  const title = useRef<HTMLHeadingElement>(null);
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
  const saveText = useSaveText(code.saveState);

  useEffect(() => {
    if (focusTitle) title.current?.focus();
  }, [focusTitle]);

  async function onCheck() {
    if (checking || !canRun) return;
    setChecking(true);
    setFeedback(null);
    const run = await check(files, challenge.checks as unknown as Check[]);
    if (run.status === 'timeout' || !run.results) {
      setChecking(false);
      setFeedback({ kind: 'error', message: t('timeout') });
      return;
    }
    const local: CheckResult[] = run.results;
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
      code.markSaved(files);
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

  function reset() {
    code.replace({ ...challenge.starter });
    setConfirmReset(false);
  }

  const cannotCheck = checking || !canRun;
  const labelFor = (key: CodeFileKey) => t(FILE_LABELS[key]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 ref={title} tabIndex={-1} className="text-xl font-bold outline-none">
          {challenge.title}
        </h3>
        <div className="mt-2">
          <Markdown>{challenge.instructions}</Markdown>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <FilesEditor
          fileKeys={challenge.files as CodeFileKey[]}
          labelFor={labelFor}
          files={files}
          saveText={saveText}
          onChange={code.update}
        />
        <PreviewPane
          sandbox={sandbox}
          title={python ? t('outputTitle') : t('previewTitle')}
          python={python}
        />
      </div>

      {python ? <PythonControls load={pythonLoad} canRun={canRun} onRun={runProgram} /> : null}

      <ProblemList errors={sandbox.output.errors} console={python ? [] : sandbox.output.console} />

      {/* Always on the page, so screen readers announce each new result. */}
      <div aria-live="polite" aria-atomic="true">
        {feedback?.kind === 'passed' ? (
          <Alert tone="success" live={false}>
            <p>
              {t('allPassed')}
              {feedback.xp > 0 ? (
                <strong className="ms-2">{tp('xpGained', { xp: String(feedback.xp) })}</strong>
              ) : null}
            </p>
            {feedback.capReached ? <p className="mt-1 text-sm">{tp('capReached')}</p> : null}
          </Alert>
        ) : null}
        {feedback?.kind === 'failed' ? (
          <Alert tone="warning" live={false}>
            <p>
              {t('someFailed', {
                passed: String(feedback.passed),
                total: String(feedback.total),
              })}
            </p>
            <ul className="mt-2 list-disc ps-5">
              {feedback.hints.map((hint) => (
                <li key={hint}>
                  <bdi>{hint}</bdi>
                </li>
              ))}
            </ul>
          </Alert>
        ) : null}
        {feedback?.kind === 'error' ? (
          <Alert tone="error" live={false}>
            {feedback.message}
          </Alert>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* aria-disabled rather than disabled, so keyboard focus stays on the button. */}
        <Button
          onClick={() => void onCheck()}
          aria-disabled={cannotCheck}
          aria-busy={checking || undefined}
          className={clsx(cannotCheck && 'cursor-not-allowed opacity-60')}
        >
          {checking ? t('checking') : t('check')}
        </Button>
        <Button variant="secondary" onClick={() => setConfirmReset(true)}>
          {t('reset')}
        </Button>
      </div>

      <ResetDialog open={confirmReset} onClose={() => setConfirmReset(false)} onConfirm={reset} />
      <BadgeCelebration keys={newBadges} />
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
