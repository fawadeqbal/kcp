'use client';

import type { components } from '@kcp/api-client-ts';
import { clsx } from 'clsx';
import { useFormatter, useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Badge,
  type BadgeTone,
  Button,
  buttonClass,
  Card,
  Dialog,
  Icon,
  Kicker,
  Meter,
  PageSpinner,
} from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { api, errorCode } from '@/lib/api';
import { errorMessageKey } from '@/lib/errors';
import { useAccount } from '@/lib/use-account';
import { CodeEditor } from '../learn/code-editor';
import { Markdown } from '../learn/markdown';
import { ProjectPreview } from '../portfolio/project-preview';

type Overview = components['schemas']['ReadinessDto'];
type Check = components['schemas']['ReadinessCheckDto'];
type FileKey = 'html' | 'css' | 'js';

const FILES: { key: FileKey; name: string }[] = [
  { key: 'html', name: 'index.html' },
  { key: 'css', name: 'style.css' },
  { key: 'js', name: 'script.js' },
];
const SAVE_DELAY_MS = 1200;
/** The server takes a hand-in this long after the time (READINESS_GRACE_MINUTES). */
const GRACE_MS = 5 * 60 * 1000;

export const READINESS_TONES: Record<Check['status'], BadgeTone> = {
  STARTED: 'brand',
  SUBMITTED: 'warning',
  PASSED: 'success',
  NOT_PASSED: 'neutral',
  EXPIRED: 'neutral',
};

/** "2:05:09" left until `dueAt`, ticking every second. */
function useTimeLeft(dueAt: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!dueAt) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [dueAt]);
  if (!dueAt) return null;
  const left = Math.max(0, new Date(dueAt).getTime() - now);
  const seconds = Math.floor(left / 1000);
  return {
    ms: left,
    text: `${Math.floor(seconds / 3600)}:${String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`,
  };
}

/**
 * The hub readiness check: what it is and who may take it, then a timed brief built
 * in the browser (saved as the student types) and handed in for a mentor to grade.
 */
export function ReadinessPage() {
  const t = useTranslations('readiness');
  const te = useTranslations('errors');
  const format = useFormatter();
  const user = useAccount('STUDENT');
  const [overview, setOverview] = useState<Overview | null>(null);
  const [failed, setFailed] = useState(false);
  const [files, setFiles] = useState<Record<FileKey, string>>({ html: '', css: '', js: '' });
  const [selected, setSelected] = useState<FileKey>('html');
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'failed'>('saved');
  const [confirm, setConfirm] = useState<'start' | 'handIn' | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(files);
  latest.current = files;

  const load = useCallback(async () => {
    try {
      const { data } = await api.GET('/v1/readiness');
      if (!data) {
        setFailed(true);
        return;
      }
      setOverview(data);
      if (data.current?.status === 'STARTED') {
        const f = data.current.files;
        setFiles({ html: f.html ?? '', css: f.css ?? '', js: f.js ?? '' });
      }
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  const current = overview?.current ?? null;
  const running = current?.status === 'STARTED';
  const left = useTimeLeft(running ? current.dueAt : null);

  const save = useCallback(async () => {
    setSaveState('saving');
    try {
      const { data, error } = await api.PUT('/v1/readiness/current', {
        body: { files: latest.current },
      });
      if (data) setSaveState('saved');
      else {
        setSaveState('failed');
        if (errorCode(error) === 'TIME_UP') {
          setNotice({ tone: 'error', text: t('timeUp') });
          await load();
        }
      }
    } catch {
      setSaveState('failed');
    }
  }, [load, t]);

  function edit(key: FileKey, value: string) {
    setFiles((before) => ({ ...before, [key]: value }));
    setSaveState('saving');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void save(), SAVE_DELAY_MS);
  }

  // When the time runs out there are a few minutes to hand in; then the server hands
  // in what was saved: show it.
  const timeUp = running && left?.ms === 0;
  useEffect(() => {
    if (!timeUp) return;
    const timer = setTimeout(() => void load(), GRACE_MS + 5000);
    return () => clearTimeout(timer);
  }, [timeUp, load]);

  async function start() {
    setConfirm(null);
    setBusy(true);
    setNotice(null);
    try {
      const { data, error } = await api.POST('/v1/readiness/start');
      if (data) await load();
      else setNotice({ tone: 'error', text: te(errorMessageKey(errorCode(error))) });
    } catch {
      setNotice({ tone: 'error', text: te('network') });
    } finally {
      setBusy(false);
    }
  }

  async function handIn() {
    setConfirm(null);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setBusy(true);
    setNotice(null);
    try {
      const { data, error } = await api.POST('/v1/readiness/current/submit', {
        body: { files: latest.current },
      });
      if (data) {
        setNotice({ tone: 'success', text: t('handedIn') });
      } else if (errorCode(error) === 'TIME_UP') {
        setNotice({ tone: 'error', text: t('timeUp') });
      } else {
        setNotice({ tone: 'error', text: te(errorMessageKey(errorCode(error))) });
      }
      await load();
    } catch {
      setNotice({ tone: 'error', text: te('network') });
    } finally {
      setBusy(false);
    }
  }

  if (!user || (!overview && !failed)) return <PageSpinner />;
  if (!overview) return <Alert tone="error">{t('loadFailed')}</Alert>;
  const hours = overview.minutes / 60;
  const date = (value: string) => format.dateTime(new Date(value), { dateStyle: 'medium' });
  const brief = (
    <>
      <p className="text-lg font-semibold">{overview.brief.summary}</p>
      <div className="mt-3">
        <Markdown>{overview.brief.body}</Markdown>
      </div>
      <h3 className="mt-4 text-lg">{t('requirements')}</h3>
      <ul className="mt-2 flex list-disc flex-col gap-1 ps-6">
        {Object.entries(overview.brief.requirements).map(([key, text]) => (
          <li key={key}>{text}</li>
        ))}
      </ul>
    </>
  );

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <header>
        <Kicker>{t('kicker')}</Kicker>
        <h1 className="text-4xl">{overview.brief.title}</h1>
        <p className="mt-1.5 text-lg text-muted">{t('subtitle', { hours })}</p>
      </header>
      <div aria-live="polite">
        {notice ? (
          <Alert tone={notice.tone} live={false}>
            {notice.text}
          </Alert>
        ) : null}
      </div>

      {running && current ? (
        <>
          {timeUp ? <Alert tone="warning">{t('timeUpHandIn')}</Alert> : null}
          <div className="flex flex-wrap items-center gap-3 rounded-card bg-surface p-4">
            <Icon name="clock" />
            <span className="font-bold" role="timer" aria-live="off">
              {t('timeLeft', { time: left?.text ?? '' })}
            </span>
            <span className="text-sm text-muted" aria-live="polite">
              {t(`save.${saveState}`)}
            </span>
            <Button className="ms-auto" loading={busy} onClick={() => setConfirm('handIn')}>
              <Icon name="send" />
              {t('handIn')}
            </Button>
          </div>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
            <section
              aria-label={t('filesLabel')}
              className="flex min-h-[32rem] flex-col overflow-hidden rounded-panel bg-code-bg"
            >
              <div className="flex flex-wrap gap-1.5 border-b border-line p-2.5">
                {FILES.map((file) => (
                  <button
                    key={file.key}
                    type="button"
                    aria-pressed={file.key === selected}
                    onClick={() => setSelected(file.key)}
                    className={clsx(
                      'font-latin min-h-9 rounded-full px-3.5 text-sm transition-colors',
                      file.key === selected
                        ? 'bg-brand-100 font-bold text-brand-800'
                        : 'font-semibold text-muted hover:bg-ink/7 hover:text-ink',
                    )}
                  >
                    <bdi>{file.name}</bdi>
                  </button>
                ))}
              </div>
              <div className="relative min-h-0 flex-1 overflow-auto">
                <CodeEditor
                  key={selected}
                  value={files[selected]}
                  language={selected}
                  label={t('editorLabel', {
                    file: FILES.find((f) => f.key === selected)?.name ?? '',
                  })}
                  onChange={(value) => edit(selected, value)}
                />
              </div>
            </section>
            <ProjectPreview files={files} title={t('previewLabel')} className="h-[28rem]" />
          </div>
          <details className="rounded-card bg-surface p-5">
            <summary className="cursor-pointer text-lg font-bold">{t('briefTitle')}</summary>
            <div className="mt-3">{brief}</div>
          </details>
        </>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <Card>{brief}</Card>
          <div className="flex flex-col gap-4">
            {current?.status === 'SUBMITTED' ? (
              <Card title={t('waitingTitle')}>
                <p>{t('waitingBody')}</p>
              </Card>
            ) : (
              <Card title={t('startTitle')}>
                <div className="flex flex-col gap-3">
                  <div>
                    <p className="text-sm text-muted">
                      {t('proProgress', {
                        done: overview.proLessonsDone,
                        total: overview.proLessons,
                      })}
                    </p>
                    <Meter
                      value={overview.proLessonsDone}
                      max={Math.max(1, overview.proLessons)}
                      label={t('proProgress', {
                        done: overview.proLessonsDone,
                        total: overview.proLessons,
                      })}
                    />
                  </div>
                  {overview.blockers
                    .filter((b) => b !== 'OPEN')
                    .map((blocker) => (
                      <p
                        key={blocker}
                        className={blocker === 'PASSED' ? 'font-semibold' : undefined}
                      >
                        {t(`blockers.${blocker}`, {
                          date: overview.retryAt ? date(overview.retryAt) : '',
                          done: overview.proLessonsDone,
                          total: overview.proLessons,
                        })}
                      </p>
                    ))}
                  {overview.blockers.includes('PRO_TRACK') ? (
                    <Link href="/learn" className={buttonClass('secondary', 'sm')}>
                      {t('toLessons')}
                    </Link>
                  ) : null}
                  {overview.canStart ? (
                    <Button loading={busy} onClick={() => setConfirm('start')}>
                      <Icon name="play" />
                      {t('start')}
                    </Button>
                  ) : null}
                </div>
              </Card>
            )}
            {overview.history.length ? (
              <Card title={t('history')}>
                <ul className="flex flex-col gap-2">
                  {overview.history.map((check) => (
                    <li key={check.id} className="flex flex-wrap items-center gap-2">
                      <span className="text-sm text-muted">{date(check.startedAt)}</span>
                      <Badge tone={READINESS_TONES[check.status]}>
                        {t(`status.${check.status}`)}
                      </Badge>
                      {check.score !== null ? (
                        <span className="text-sm">
                          {t('score', { score: check.score, max: check.maxScore })}
                        </span>
                      ) : null}
                      {check.reviewId && check.decidedAt ? (
                        <Link
                          href={`/reviews/${check.reviewId}`}
                          className="text-sm font-semibold underline"
                        >
                          {t('seeResult')}
                        </Link>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}
          </div>
        </div>
      )}

      <Dialog
        open={confirm === 'start'}
        onClose={() => setConfirm(null)}
        title={t('startConfirmTitle')}
      >
        <p className="text-muted">{t('startConfirmBody', { hours })}</p>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setConfirm(null)}>
            {t('cancel')}
          </Button>
          <Button onClick={() => void start()}>{t('start')}</Button>
        </div>
      </Dialog>
      <Dialog
        open={confirm === 'handIn'}
        onClose={() => setConfirm(null)}
        title={t('handInConfirmTitle')}
      >
        <p className="text-muted">{t('handInConfirmBody')}</p>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setConfirm(null)}>
            {t('cancel')}
          </Button>
          <Button onClick={() => void handIn()}>{t('handIn')}</Button>
        </div>
      </Dialog>
    </div>
  );
}
