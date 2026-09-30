'use client';

import type { components } from '@kcp/api-client-ts';
import type { Check, CheckResult, CodeFileKey, CodeFiles } from '@kcp/checks';
import { clsx } from 'clsx';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Badge, Button, buttonClass, Icon, PageSpinner } from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { api, errorCode } from '@/lib/api';
import { useAccount } from '@/lib/use-account';
import { BadgeCelebration } from '../badges/badge-celebration';
import { hintsFor, ResetDialog } from '../learn/challenge-workspace';
import { Markdown } from '../learn/markdown';
import { PremiumLocked } from '../learn/premium-locked';
import {
  CheckList,
  FilesEditor,
  PreviewPane,
  ProblemList,
  PythonControls,
  useCodeFiles,
  useLivePreview,
  useSaveText,
} from '../learn/workspace';
import { useStreak, WorkspaceHeader } from '../learn/workspace-header';
import { refreshNotifications } from '@/components/notification-bell';

type Project = components['schemas']['ProjectDto'];
type ShipResult = components['schemas']['ShipResultDto'];

/** What students see on the tabs: real file names. */
export const PROJECT_FILE_NAMES: Record<CodeFileKey, string> = {
  html: 'index.html',
  css: 'style.css',
  js: 'script.js',
  py: 'main.py',
};

async function saveDraft(briefId: string, code: CodeFiles): Promise<boolean> {
  try {
    const { response } = await api.PUT('/v1/projects/{id}/draft', {
      params: { path: { id: briefId } },
      body: { code },
    });
    return response.ok;
  } catch {
    return false;
  }
}

type Outcome =
  | { kind: 'checked'; results: CheckResult[] }
  | { kind: 'shipped'; result: ShipResult }
  | { kind: 'error'; message: string };

/** A module project: the brief, the requirements, a three-file editor and "Ship it". */
export function ProjectPage({ briefId }: { briefId: string }) {
  const t = useTranslations('project');
  const tl = useTranslations('lesson');
  const locale = useLocale();
  const user = useAccount('STUDENT');
  const signedIn = user !== null;
  const [project, setProject] = useState<Project | null>(null);
  const [failure, setFailure] = useState<'notFound' | 'loadFailed' | 'premium' | null>(null);

  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    setProject(null);
    setFailure(null);
    api
      .GET('/v1/projects/{id}', { params: { path: { id: briefId }, query: { lang: locale } } })
      .then(({ data, error, response }) => {
        if (cancelled) return;
        if (data) setProject(data);
        else if (errorCode(error) === 'PREMIUM_REQUIRED') setFailure('premium');
        else setFailure(response.status === 404 ? 'notFound' : 'loadFailed');
      })
      .catch(() => {
        if (!cancelled) setFailure('loadFailed');
      });
    return () => {
      cancelled = true;
    };
  }, [signedIn, briefId, locale]);

  if (failure === 'premium') return <PremiumLocked kind="project" />;
  if (failure) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-16">
        <Alert tone={failure === 'notFound' ? 'info' : 'error'}>{t(failure)}</Alert>
        <Link href="/learn" className={clsx(buttonClass('secondary'), 'self-start')}>
          {tl('backToMap')}
        </Link>
      </div>
    );
  }
  if (!user || !project) return <PageSpinner />;
  return <ProjectWorkspace key={project.id} project={project} />;
}

function ProjectWorkspace({ project }: { project: Project }) {
  const t = useTranslations('project');
  const tl = useTranslations('lesson');
  const tp = useTranslations('progress');
  const locale = useLocale();
  const [busy, setBusy] = useState<'checking' | 'shipping' | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [lastCheck, setLastCheck] = useState<{ files: CodeFiles; results: CheckResult[] } | null>(
    null,
  );
  const [confirmReset, setConfirmReset] = useState(false);
  const [newBadges, setNewBadges] = useState<string[]>([]);
  const [status, setStatus] = useState(project.status);
  const { streak, refresh: refreshStreak } = useStreak();
  const shippedHeading = useRef<HTMLHeadingElement>(null);
  const save = useCallback((code: CodeFiles) => saveDraft(project.id, code), [project.id]);
  const code = useCodeFiles({
    initialCode: project.draft ?? project.starter,
    save,
    saveKey: project.id,
    onChange: () => setOutcome((current) => (current?.kind === 'shipped' ? current : null)),
  });
  const { files } = code;
  const python = project.files.includes('py');
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
  const checks = project.checks as unknown as Check[];
  const results = lastCheck?.files === files ? lastCheck.results : null;
  const ready = Boolean(results?.length && results.every((r) => r.passed));

  useEffect(() => {
    if (outcome?.kind === 'shipped') shippedHeading.current?.focus();
  }, [outcome]);

  async function runChecks(): Promise<CheckResult[] | null> {
    const run = await check(files, checks);
    if (run.status === 'timeout' || !run.results) {
      setOutcome({ kind: 'error', message: tl('timeout') });
      return null;
    }
    setLastCheck({ files, results: run.results });
    return run.results;
  }

  async function onCheck() {
    if (busy || !canRun) return;
    setBusy('checking');
    setOutcome(null);
    const found = await runChecks();
    setBusy(null);
    if (found) setOutcome({ kind: 'checked', results: found });
  }

  async function onShip() {
    if (busy || !canRun || !ready || !results) return;
    setBusy('shipping');
    try {
      const { data } = await api.POST('/v1/projects/{id}/ship', {
        params: { path: { id: project.id } },
        body: { code: files, results: results.map(({ id, passed }) => ({ id, passed })) },
      });
      if (!data) throw new Error('ship failed');
      code.markSaved(files);
      if (data.shipped) {
        setStatus('SHIPPED');
        refreshStreak();
        setOutcome({ kind: 'shipped', result: data });
        if (data.badgesEarned.length) {
          setNewBadges(data.badgesEarned);
          refreshNotifications();
        }
      } else {
        setOutcome({ kind: 'checked', results: data.results });
      }
    } catch {
      setOutcome({ kind: 'error', message: t('shipFailed') });
    } finally {
      setBusy(null);
    }
  }

  const checkedResults = outcome?.kind === 'checked' ? outcome.results : results;
  const passedIds = checkedResults
    ? new Set(checkedResults.filter((r) => r.passed).map((r) => r.id))
    : status === 'SHIPPED'
      ? new Set(checks.map((c) => c.id))
      : null;
  const failing = checkedResults?.filter((r) => !r.passed) ?? [];
  const cannotCheck = busy !== null || !canRun;
  const cannotShip = cannotCheck || !ready;

  return (
    <article className="flex min-h-dvh flex-1 flex-col xl:h-dvh">
      <WorkspaceHeader
        context={`${t('label')} · ${project.moduleTitle}`}
        title={project.title}
        badge={
          status === 'SHIPPED' ? (
            <Badge tone="success">{t('statusShipped')}</Badge>
          ) : (
            <Badge tone="brand">{tp('xpGained', { xp: String(project.xp) })}</Badge>
          )
        }
        saveText={saveText}
        saveState={code.saveState}
        streak={streak}
      />

      <div className="grid min-h-0 flex-1 gap-3.5 px-4 pb-4 sm:px-6 sm:pb-6 md:grid-cols-2 xl:grid-cols-[24rem_minmax(0,1fr)_minmax(0,1fr)]">
        <aside className="flex flex-col gap-4 rounded-panel bg-surface p-6 md:col-span-2 xl:col-span-1 xl:min-h-0 xl:overflow-y-auto">
          <section aria-labelledby="project-brief" className="flex flex-col gap-2">
            <h2
              id="project-brief"
              className="font-sans text-xs font-bold tracking-[0.1em] text-brand-text uppercase"
            >
              {t('brief')}
            </h2>
            <p className="font-semibold">{project.summary}</p>
            <div
              className="text-[0.95rem]"
              lang={project.language !== locale ? project.language : undefined}
            >
              <Markdown>{project.body}</Markdown>
            </div>
          </section>
          <section aria-label={t('requirements')}>
            <CheckList
              checks={checks as { id: string; hint?: string }[]}
              labels={project.checkLabels}
              hints={project.hints}
              passed={passedIds}
              title={t('requirements')}
              help={t('requirementsHelp')}
            />
          </section>
          <ProblemList errors={sandbox.output.errors} />

          <div aria-live="polite" aria-atomic="true" className="mt-auto flex flex-col gap-3">
            {outcome?.kind === 'checked' && failing.length === 0 ? (
              <p className="flex items-center gap-2 rounded-row bg-sage-100 px-4 py-3.5 font-bold text-sage-800">
                <Icon name="check" />
                {t('allMet')}
              </p>
            ) : null}
            {outcome?.kind === 'checked' && failing.length > 0 ? (
              <div className="flex flex-col gap-1 rounded-row bg-warn-soft px-4 py-3.5 text-sm text-warn-text">
                <p className="font-bold">
                  {t('notReady', {
                    passed: String(outcome.results.length - failing.length),
                    total: String(outcome.results.length),
                  })}
                </p>
                <ul className="list-disc ps-5">
                  {hintsFor(outcome.results, project.hints, tl('checkFailedNoHint')).map((hint) => (
                    <li key={hint}>
                      <bdi>{hint}</bdi>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {outcome?.kind === 'error' ? (
              <Alert tone="error" live={false}>
                {outcome.message}
              </Alert>
            ) : null}
          </div>

          {outcome?.kind === 'shipped' ? (
            <section className="flex flex-col gap-2.5 rounded-row bg-sage-100 p-5 text-sage-900 motion-safe:animate-[kcp-pop_300ms_ease-out]">
              <h2
                ref={shippedHeading}
                tabIndex={-1}
                className="flex flex-wrap items-center gap-2.5 text-2xl outline-none"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-sage text-base text-on-primary">
                  <Icon name="rocket" />
                </span>
                {t('shipped')}
                {outcome.result.xpAwarded > 0 ? (
                  <span className="rounded-full bg-brand-100 px-2.5 py-0.5 font-sans text-sm font-bold text-brand-800">
                    {tp('xpGained', { xp: String(outcome.result.xpAwarded) })}
                  </span>
                ) : null}
              </h2>
              <p className="text-sm text-sage-800">
                {outcome.result.version && outcome.result.version > 1
                  ? t('shippedVersion', { version: String(outcome.result.version) })
                  : t('shippedBody')}
              </p>
              {outcome.result.dailyCapReached ? (
                <p className="text-sm text-sage-800">{tp('capReached')}</p>
              ) : null}
              <p className="text-sm text-sage-800">{t('reshipHint')}</p>
              <div className="flex flex-wrap gap-2.5">
                <Link href="/learn/portfolio" className={buttonClass('primary')}>
                  {t('openPortfolio')}
                </Link>
                <Link href="/learn" className={buttonClass('secondary')}>
                  {tl('backToMap')}
                </Link>
              </div>
            </section>
          ) : null}
        </aside>

        <FilesEditor
          fileKeys={project.files as CodeFileKey[]}
          labelFor={(key) => PROJECT_FILE_NAMES[key]}
          files={files}
          onChange={code.update}
          className="min-h-[26rem] xl:min-h-0"
          actions={
            <>
              <Button variant="ghost" onClick={() => setConfirmReset(true)} className="text-muted">
                <Icon name="undo" />
                {tl('reset')}
              </Button>
              <span className="ms-auto flex flex-wrap gap-2.5">
                <Button
                  variant={ready ? 'secondary' : 'primary'}
                  size="lg"
                  onClick={() => void onCheck()}
                  aria-disabled={cannotCheck}
                  aria-busy={busy === 'checking' || undefined}
                >
                  <Icon name="check" />
                  {busy === 'checking' ? t('checking') : t('check')}
                </Button>
                <Button
                  size="lg"
                  onClick={() => void onShip()}
                  aria-disabled={cannotShip}
                  aria-busy={busy === 'shipping' || undefined}
                >
                  <Icon name="rocket" />
                  {busy === 'shipping' ? t('shipping') : t('ship')}
                </Button>
              </span>
            </>
          }
        />
        <PreviewPane
          sandbox={sandbox}
          title={python ? tl('outputTitle') : tl('previewTitle')}
          python={python}
          console={python ? [] : sandbox.output.console}
          className="min-h-[26rem] xl:min-h-0"
          footer={
            python ? <PythonControls load={pythonLoad} canRun={canRun} onRun={runProgram} /> : null
          }
        />
      </div>

      <BadgeCelebration keys={newBadges} />
      <ResetDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={() => {
          code.replace({ ...project.starter });
          setConfirmReset(false);
        }}
      />
    </article>
  );
}
