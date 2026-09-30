'use client';

import type { components } from '@kcp/api-client-ts';
import type { Check, CheckResult, CodeFileKey, CodeFiles } from '@kcp/checks';
import { clsx } from 'clsx';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Badge, Button, buttonClass, Card, PageSpinner } from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { api, errorCode } from '@/lib/api';
import { useAccount } from '@/lib/use-account';
import { BadgeCelebration } from '../badges/badge-celebration';
import { hintsFor, ResetDialog } from '../learn/challenge-workspace';
import { Markdown } from '../learn/markdown';
import { PremiumLocked } from '../learn/premium-locked';
import {
  FilesEditor,
  PreviewPane,
  ProblemList,
  PythonControls,
  useCodeFiles,
  useLivePreview,
  useSaveText,
} from '../learn/workspace';
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
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
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
  const passedIds = new Set(checkedResults?.filter((r) => r.passed).map((r) => r.id));
  const failing = checkedResults?.filter((r) => !r.passed) ?? [];
  const cannotCheck = busy !== null || !canRun;
  const cannotShip = cannotCheck || !ready;

  return (
    <article className="mx-auto flex max-w-6xl flex-col gap-8">
      <header className="flex flex-col gap-2">
        <nav aria-label={tl('backToLearning')} className="text-sm">
          <ol className="flex flex-wrap items-center gap-2 text-muted">
            <li>
              <Link
                href="/learn"
                className="font-semibold text-brand-700 underline underline-offset-4"
              >
                {tl('backToLearning')}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>{project.moduleTitle}</li>
          </ol>
        </nav>
        <p className="text-sm font-semibold text-brand-700">{t('label')}</p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold">{project.title}</h1>
          {status === 'SHIPPED' ? <Badge tone="success">{t('statusShipped')}</Badge> : null}
          <Badge tone="brand">{tp('xp', { xp: String(project.xp) })}</Badge>
        </div>
        <p className="max-w-3xl text-lg text-muted">{project.summary}</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <Card title={t('brief')}>
          <div lang={project.language !== locale ? project.language : undefined}>
            <Markdown>{project.body}</Markdown>
          </div>
        </Card>
        <Card title={t('requirements')}>
          <p className="-mt-2 mb-3 text-sm text-muted">{t('requirementsHelp')}</p>
          <ul className="flex flex-col gap-2">
            {checks.map((requirement) => {
              const met = passedIds.has(requirement.id);
              const text = (requirement.hint && project.hints[requirement.hint]) || requirement.id;
              return (
                <li key={requirement.id} className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className={clsx(
                      'mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold',
                      met ? 'bg-success text-white' : 'border-2 border-line',
                    )}
                  >
                    {met ? '✓' : ''}
                  </span>
                  <span className={clsx(met && 'text-muted')}>
                    <span className="sr-only">{met ? `${t('requirementMet')}: ` : ''}</span>
                    <bdi>{text}</bdi>
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <section aria-label={t('title')} className="flex flex-col gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          <FilesEditor
            fileKeys={project.files as CodeFileKey[]}
            labelFor={(key) => PROJECT_FILE_NAMES[key]}
            files={files}
            saveText={saveText}
            onChange={code.update}
          />
          <PreviewPane
            sandbox={sandbox}
            title={python ? tl('outputTitle') : tl('previewTitle')}
            python={python}
          />
        </div>

        {python ? <PythonControls load={pythonLoad} canRun={canRun} onRun={runProgram} /> : null}

        <ProblemList
          errors={sandbox.output.errors}
          console={python ? [] : sandbox.output.console}
        />

        <div aria-live="polite" aria-atomic="true">
          {outcome?.kind === 'checked' && failing.length === 0 ? (
            <Alert tone="success" live={false}>
              {t('allMet')}
            </Alert>
          ) : null}
          {outcome?.kind === 'checked' && failing.length > 0 ? (
            <Alert tone="warning" live={false}>
              <p>
                {t('notReady', {
                  passed: String(outcome.results.length - failing.length),
                  total: String(outcome.results.length),
                })}
              </p>
              <ul className="mt-2 list-disc ps-5">
                {hintsFor(outcome.results, project.hints, tl('checkFailedNoHint')).map((hint) => (
                  <li key={hint}>
                    <bdi>{hint}</bdi>
                  </li>
                ))}
              </ul>
            </Alert>
          ) : null}
          {outcome?.kind === 'error' ? (
            <Alert tone="error" live={false}>
              {outcome.message}
            </Alert>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant={ready ? 'secondary' : 'primary'}
            onClick={() => void onCheck()}
            aria-disabled={cannotCheck}
            aria-busy={busy === 'checking' || undefined}
            className={clsx(cannotCheck && 'cursor-not-allowed opacity-60')}
          >
            {busy === 'checking' ? t('checking') : t('check')}
          </Button>
          <Button
            onClick={() => void onShip()}
            aria-disabled={cannotShip}
            aria-busy={busy === 'shipping' || undefined}
            className={clsx(cannotShip && 'cursor-not-allowed opacity-60')}
          >
            {busy === 'shipping' ? t('shipping') : t('ship')}
          </Button>
          <Button variant="ghost" onClick={() => setConfirmReset(true)}>
            {tl('reset')}
          </Button>
        </div>
      </section>

      {outcome?.kind === 'shipped' ? (
        <section className="motion-safe:animate-[kcp-pop_300ms_ease-out] rounded-[var(--radius-card)] border border-success/30 bg-success/10 p-5 sm:p-6">
          <h2 ref={shippedHeading} tabIndex={-1} className="text-2xl font-bold outline-none">
            {t('shipped')}
            {outcome.result.xpAwarded > 0 ? (
              <span className="ms-3 text-xl text-success">
                {tp('xpGained', { xp: String(outcome.result.xpAwarded) })}
              </span>
            ) : null}
          </h2>
          <p className="mt-2 text-muted">
            {outcome.result.version && outcome.result.version > 1
              ? t('shippedVersion', { version: String(outcome.result.version) })
              : t('shippedBody')}
          </p>
          {outcome.result.dailyCapReached ? (
            <p className="mt-1 text-sm text-muted">{tp('capReached')}</p>
          ) : null}
          <p className="mt-1 text-sm text-muted">{t('reshipHint')}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/learn/portfolio" className={buttonClass('primary')}>
              {t('openPortfolio')}
            </Link>
            <Link href="/learn" className={buttonClass('secondary')}>
              {tl('backToMap')}
            </Link>
          </div>
        </section>
      ) : null}

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
