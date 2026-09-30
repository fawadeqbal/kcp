'use client';

import type { components } from '@kcp/api-client-ts';
import { clsx } from 'clsx';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Alert, Avatar, Badge, buttonClass, Card, PageSpinner } from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { useAccount } from '@/lib/use-account';
import { isolate } from '../auth/validation';
import { ProgressSummary } from '../progress/progress-summary';

type Overview = components['schemas']['LearningOverviewDto'];
type LessonSummary = components['schemas']['LessonSummaryDto'];
type ModuleProject = components['schemas']['ModuleProjectDto'];

function ProjectBadge({ project }: { project: ModuleProject }) {
  const t = useTranslations('project');
  if (project.status === 'SHIPPED') return <Badge tone="success">{t('statusShipped')}</Badge>;
  if (project.status === 'DRAFT') return <Badge tone="brand">{t('statusDraft')}</Badge>;
  return null;
}

function StatusBadge({ lesson }: { lesson: LessonSummary }) {
  const t = useTranslations('learn');
  if (lesson.status === 'COMPLETED') return <Badge tone="success">{t('statusDone')}</Badge>;
  if (lesson.locked) return <PremiumBadge />;
  if (lesson.status === 'STARTED') return <Badge tone="brand">{t('statusStarted')}</Badge>;
  return null;
}

/** "Premium" with a lock, on lessons and projects the student can't open now. */
function PremiumBadge() {
  const t = useTranslations('learn');
  return (
    <Badge tone="warning">
      <span aria-hidden="true">🔒 </span>
      {t('premiumTag')}
    </Badge>
  );
}

/** The free trial: when it ends, or that it has ended. */
function PremiumBanner({ premium }: { premium: NonNullable<Overview['premium']> }) {
  const t = useTranslations('learn');
  const format = useFormatter();
  if (premium.source === 'trial' && premium.until) {
    return (
      <Alert tone="info">
        {t('trialBanner', {
          date: format.dateTime(new Date(premium.until), { dateStyle: 'long' }),
        })}
      </Alert>
    );
  }
  if (!premium.active && premium.trialEndsAt) {
    return <Alert tone="warning">{t('trialEnded')}</Alert>;
  }
  return null;
}

/** A child's home: where to carry on, how far they've come, and every lesson. */
export function StudentHome() {
  const t = useTranslations('learn');
  const tp = useTranslations('project');
  const locale = useLocale();
  const user = useAccount('STUDENT');
  const signedIn = user !== null;
  const [overview, setOverview] = useState<Overview | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    api
      .GET('/v1/learning/tracks', { params: { query: { lang: locale } } })
      .then(({ data }) => {
        if (cancelled) return;
        if (data) setOverview(data);
        else setFailed(true);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [signedIn, locale]);

  if (!user) return <PageSpinner />;

  const nickname = user.student?.nickname ?? '';
  const modules = overview?.tracks.flatMap((track) => track.modules) ?? [];
  const lessons = modules.flatMap((m) => m.lessons);
  const total = lessons.length;
  const done = lessons.filter((lesson) => lesson.status === 'COMPLETED').length;
  // Where to carry on: in module order, the first lesson not done yet — or, once a
  // module's lessons are all done, its project until it has shipped.
  let next: LessonSummary | undefined;
  let nextNumber = 0;
  let nextProject: ModuleProject | null = null;
  for (const module of modules) {
    const index = module.lessons.findIndex((lesson) => lesson.status !== 'COMPLETED');
    if (index >= 0) {
      next = module.lessons[index];
      nextNumber = index + 1;
      break;
    }
    if (module.project && module.project.status !== 'SHIPPED') {
      nextProject = module.project;
      break;
    }
  }
  const progressLabel = t('progress', { done: String(done), total: String(total) });

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <section className="flex flex-wrap items-center gap-5">
        <Avatar avatarKey={user.student?.avatarKey ?? 'rocket'} size="xl" />
        <div>
          <h1 className="text-3xl font-bold">{t('greeting', { nickname: isolate(nickname) })}</h1>
          <p className="mt-1 text-lg text-muted">{t('subtitle')}</p>
        </div>
      </section>

      <ProgressSummary />

      {overview?.premium ? <PremiumBanner premium={overview.premium} /> : null}

      {failed ? <Alert tone="error">{t('loadFailed')}</Alert> : null}
      {!failed && !overview ? <PageSpinner /> : null}

      {overview && total > 0 ? (
        <section className="rounded-[var(--radius-card)] border border-brand-100 bg-brand-50 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              {next ? (
                <>
                  <h2 className="text-lg font-semibold">{t('continueTitle')}</h2>
                  <p className="mt-1 text-sm font-semibold text-brand-700">
                    {t('lessonNumber', { number: String(nextNumber) })}
                  </p>
                  <p className="text-xl font-bold">{next.title}</p>
                </>
              ) : nextProject ? (
                <>
                  <h2 className="text-lg font-semibold">{t('continueTitle')}</h2>
                  <p className="mt-1 text-sm font-semibold text-brand-700">{tp('label')}</p>
                  <p className="text-xl font-bold">{nextProject.title}</p>
                </>
              ) : (
                <p className="text-lg font-semibold">{t('allDone')}</p>
              )}
            </div>
            {next ? (
              <Link href={`/learn/${next.id}`} className={buttonClass('primary')}>
                {done === 0 && next.status === 'NOT_STARTED' ? t('startFirst') : t('continue')}
              </Link>
            ) : nextProject ? (
              <Link href={`/learn/projects/${nextProject.id}`} className={buttonClass('primary')}>
                {nextProject.status === 'DRAFT' ? tp('continue') : tp('start')}
              </Link>
            ) : null}
          </div>
          <div className="mt-5">
            <p className="text-sm text-muted">{progressLabel}</p>
            <div
              role="progressbar"
              aria-label={progressLabel}
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={done}
              className="mt-2 h-3 overflow-hidden rounded-full bg-surface"
            >
              <div
                className="h-full rounded-full bg-brand-600 transition-[width]"
                style={{ width: `${Math.round((done / total) * 100)}%` }}
              />
            </div>
          </div>
        </section>
      ) : null}

      {overview?.tracks.map((track) => (
        <section
          key={track.id}
          aria-labelledby={`track-${track.id}`}
          className="flex flex-col gap-4"
        >
          <h2 id={`track-${track.id}`} className="text-2xl font-bold">
            {track.title}
          </h2>
          {track.modules.map((module) => (
            <Card key={module.id} title={module.title} headingLevel={3}>
              {module.description ? (
                <p className="-mt-2 mb-4 text-muted">{module.description}</p>
              ) : null}
              <ol className="flex flex-col gap-2">
                {module.lessons.map((lesson, index) => (
                  <li key={lesson.id}>
                    <Link
                      href={`/learn/${lesson.id}`}
                      className={clsx(
                        'flex min-h-14 items-center gap-4 rounded-xl border px-4 py-3 transition-colors hover:border-brand-600',
                        lesson.id === next?.id ? 'border-brand-600 bg-brand-50' : 'border-line',
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={clsx(
                          'grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold',
                          lesson.status === 'COMPLETED'
                            ? 'bg-success text-white'
                            : 'bg-brand-50 text-brand-700',
                        )}
                      >
                        {lesson.status === 'COMPLETED' ? '✓' : index + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="sr-only">
                          {t('lessonNumber', { number: String(index + 1) })}:{' '}
                        </span>
                        <span className="block font-semibold">{lesson.title}</span>
                        <span className="block text-sm text-muted">{lesson.summary}</span>
                      </span>
                      <StatusBadge lesson={lesson} />
                    </Link>
                  </li>
                ))}
              </ol>
              {module.project ? (
                <Link
                  href={`/learn/projects/${module.project.id}`}
                  className={clsx(
                    'mt-3 flex min-h-14 items-center gap-4 rounded-xl border-2 border-dashed px-4 py-3 transition-colors hover:border-brand-600',
                    module.project.id === nextProject?.id
                      ? 'border-brand-600 bg-brand-50'
                      : 'border-brand-100',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={clsx(
                      'grid size-9 shrink-0 place-items-center rounded-full text-base font-bold',
                      module.project.status === 'SHIPPED'
                        ? 'bg-success text-white'
                        : 'bg-accent/20 text-ink',
                    )}
                  >
                    {module.project.status === 'SHIPPED' ? '✓' : '★'}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold tracking-wide text-brand-700 uppercase">
                      {tp('label')}
                    </span>
                    <span className="block font-semibold">{module.project.title}</span>
                    <span className="block text-sm text-muted">{module.project.summary}</span>
                  </span>
                  {module.project.locked && module.project.status !== 'SHIPPED' ? (
                    <PremiumBadge />
                  ) : (
                    <ProjectBadge project={module.project} />
                  )}
                </Link>
              ) : null}
            </Card>
          ))}
        </section>
      ))}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card title={t('usernameTitle')}>
          <p className="text-muted">
            {t('usernameBody', { username: isolate(user.username ?? '') })}
          </p>
        </Card>
        <Card title={t('safetyTitle')}>
          <p className="text-muted">{t('safetyBody')}</p>
        </Card>
      </div>
    </div>
  );
}
