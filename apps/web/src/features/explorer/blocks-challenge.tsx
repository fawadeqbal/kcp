'use client';

import type { components } from '@kcp/api-client-ts';
import { type Check, type CodeFiles, evaluateStageChecks, type StageLevel } from '@kcp/checks';
import { useTranslations } from 'next-intl';
import { type ReactNode, useCallback, useEffect, useId, useRef, useState } from 'react';
import { Button, Icon } from '@/components/ui';
import { BadgeCelebration } from '../badges/badge-celebration';
import {
  type Challenge,
  CheckFeedback,
  ResetDialog,
  saveDraft,
  useChallengeSubmission,
} from '../learn/challenge-workspace';
import { Markdown } from '../learn/markdown';
import { CheckList, type SaveState, useCodeFiles, WORKSPACE_PANE_CLASS } from '../learn/workspace';
import { BlocksEditor } from './blocks-editor';
import { CodeDialog } from './code-view';
import { Mascot } from './mascot';
import { STAGE_PANE_CLASS, StagePane, type StageHandle } from './stage-pane';

type SubmissionResult = components['schemas']['SubmissionResultDto'];

/**
 * An Explorer step: what to do, the block editor, and Bit's world. "Check my blocks"
 * plays the program for the student to watch while the same checks run here and, for
 * the record, on the server (programs are data, so the server re-runs them itself).
 */
export function BlocksChallenge({
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
  const te = useTranslations('explorer');
  const level = challenge.stage as StageLevel;
  const [confirmReset, setConfirmReset] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const submission = useChallengeSubmission({ challenge, isStudent, onPassed });
  const { checking, feedback, setFeedback, passedIds, newBadges } = submission;
  const stage = useRef<StageHandle>(null);
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
  const program = code.files.blocks ?? '[]';

  useEffect(() => {
    onSaveState(code.saveState);
  }, [code.saveState, onSaveState]);

  useEffect(() => {
    if (focusTitle) title.current?.focus();
  }, [focusTitle]);

  async function onCheck() {
    if (checking) return;
    // Mazes play while the result comes in; games wait for the student to play them.
    if (level.mode === 'maze') void stage.current?.run();
    const files = code.files;
    await submission.submit(
      files,
      async () => evaluateStageChecks(level, files.blocks, challenge.checks as unknown as Check[]),
      code.markSaved,
    );
  }

  return (
    <div
      data-mood="explorer"
      className="grid min-h-0 flex-1 gap-3.5 px-4 pb-4 sm:px-6 sm:pb-6 md:grid-cols-2 xl:grid-cols-[20rem_minmax(0,1.5fr)_minmax(0,1fr)]"
    >
      <aside
        aria-labelledby={titleId}
        tabIndex={0}
        className="relative flex flex-col gap-3.5 rounded-panel bg-surface p-6 md:col-span-2 xl:col-span-1 xl:min-h-0 xl:overflow-y-auto"
      >
        <div className="flex items-center gap-3">
          <Mascot className="size-12" />
          <p className="text-xs font-bold tracking-[0.1em] text-brand-text uppercase">{kicker}</p>
        </div>
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

      <BlocksEditor
        level={level}
        value={program}
        onChange={(value) => code.update('blocks', value)}
        className={WORKSPACE_PANE_CLASS}
        actions={
          <>
            <Button variant="ghost" onClick={() => setConfirmReset(true)} className="text-muted">
              <Icon name="undo" />
              {t('reset')}
            </Button>
            <Button variant="secondary" onClick={() => setShowCode(true)}>
              <Icon name="code" />
              {te('showCode')}
            </Button>
            <Button
              size="lg"
              onClick={() => void onCheck()}
              aria-disabled={checking}
              aria-busy={checking || undefined}
              className="ms-auto"
            >
              <Icon name="check" />
              {checking ? t('checking') : te('checkBlocks')}
            </Button>
          </>
        }
      />
      <StagePane
        ref={stage}
        level={level}
        program={program}
        title={te('stageTitle')}
        className={STAGE_PANE_CLASS}
      />

      <CodeDialog open={showCode} onClose={() => setShowCode(false)} program={program} />
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
