'use client';

import type { components } from '@kcp/api-client-ts';
import { clsx } from 'clsx';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import {
  Alert,
  Avatar,
  Badge,
  buttonClass,
  Icon,
  IconBubble,
  Kicker,
  Meter,
  PageSpinner,
  SectionHeading,
} from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { useAccount } from '@/lib/use-account';
import { isolate } from '../auth/validation';
import { ProgressSummary } from '../progress/progress-summary';

type Overview = components['schemas']['LearningOverviewDto'];
type Module = Overview['tracks'][number]['modules'][number];
type LessonSummary = components['schemas']['LessonSummaryDto'];
type ModuleProject = components['schemas']['ModuleProjectDto'];

/** "Premium" with a lock, on lessons and projects the student can't open now. */
function PremiumBadge() {
  const t = useTranslations('learn');
  return (
    <Badge tone="warning" icon="lock">
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
      <p
        role="status"
        className="flex items-center gap-3 self-start rounded-row bg-sage-100 px-4.5 py-3 text-sm font-semibold text-sage-800 sm:rounded-full"
      >
        <Icon name="sparkle" className="text-base" />
        {t('trialBanner', {
          date: format.dateTime(new Date(premium.until), { dateStyle: 'long' }),
        })}
      </p>
    );
  }
  if (!premium.active && premium.trialEndsAt) {
    return <Alert tone="warning">{t('trialEnded')}</Alert>;
  }
  return null;
}

/** Where to carry on: the first lesson not done yet or, once a module's lessons are all
 * done, its project until it has shipped. */
function findNext(modules: Module[]) {
  for (const module of modules) {
    const index = module.lessons.findIndex((lesson) => lesson.status !== 'COMPLETED');
    if (index >= 0) return { lesson: module.lessons[index], number: index + 1, module };
    if (module.project && module.project.status !== 'SHIPPED') {
      return { project: module.project, module };
    }
  }
  return null;
}

/** The big "pick up where you left off" card, with the overall progress. */
function ContinueCard({
  next,
  done,
  total,
}: {
  next: ReturnType<typeof findNext>;
  done: number;
  total: number;
}) {
  const t = useTranslations('learn');
  const tp = useTranslations('project');
  const progressLabel = t('progress', { done: String(done), total: String(total) });
  return (
    <section
      aria-labelledby="continue-title"
      className="relative isolate overflow-hidden rounded-hero bg-brand-100 px-6 py-8 sm:px-10 sm:py-9"
    >
      <span
        aria-hidden="true"
        className="absolute -end-16 -top-24 -z-10 size-80 rounded-full bg-brand-200"
      />
      <span
        aria-hidden="true"
        className="absolute end-52 -bottom-18 -z-10 size-38 rounded-full bg-sage-200 max-sm:hidden"
      />
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-6">
        <div className="flex min-w-0 flex-1 basis-80 flex-col gap-1.5">
          {next ? (
            <>
              <h2
                id="continue-title"
                className="font-sans text-xs font-bold tracking-[0.1em] text-brand-text uppercase"
              >
                {t('continueTitle')}
              </h2>
              <p className="font-semibold text-brand-800">
                {next.lesson ? t('lessonNumber', { number: String(next.number) }) : tp('label')}
              </p>
              <p className="font-display text-3xl sm:text-[2.4rem]">
                {next.lesson ? next.lesson.title : next.project?.title}
              </p>
            </>
          ) : (
            <h2 id="continue-title" className="text-3xl">
              {t('allDone')}
            </h2>
          )}
          <div className="mt-4 flex max-w-md flex-wrap items-center gap-x-3.5 gap-y-1.5">
            <Meter
              value={done}
              max={total}
              label={progressLabel}
              track="brand"
              className="min-w-40 flex-1"
            />
            <span className="text-sm font-semibold text-brand-800">{progressLabel}</span>
          </div>
        </div>
        {next?.lesson ? (
          <Link href={`/learn/${next.lesson.id}`} className={buttonClass('primary', 'lg')}>
            {done === 0 && next.lesson.status === 'NOT_STARTED' ? t('startFirst') : t('continue')}
            <Icon name="arrow" />
          </Link>
        ) : next?.project ? (
          <Link
            href={`/learn/projects/${next.project.id}`}
            className={buttonClass('primary', 'lg')}
          >
            {next.project.status === 'DRAFT' ? tp('continue') : tp('start')}
            <Icon name="arrow" />
          </Link>
        ) : null}
      </div>
    </section>
  );
}

/** One lesson in a module's list: done, the one to do next, not started or locked. */
function LessonRow({
  lesson,
  number,
  current,
}: {
  lesson: LessonSummary;
  number: number;
  current: boolean;
}) {
  const t = useTranslations('learn');
  const done = lesson.status === 'COMPLETED';
  return (
    <li>
      <Link
        href={`/learn/${lesson.id}`}
        aria-current={current ? 'step' : undefined}
        className={clsx(
          'flex min-h-15 items-center gap-3.5 rounded-row transition-colors',
          current
            ? 'border-2 border-primary bg-brand-100 py-2.5 ps-2.5 pe-3.5'
            : 'bg-raised py-3 ps-3 pe-4 hover:bg-sand-200',
        )}
      >
        <span
          aria-hidden="true"
          className={clsx(
            'grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold',
            done && 'bg-sage text-on-primary',
            current && 'bg-primary text-on-primary',
            !done && !current && 'bg-sand-200 text-muted',
          )}
        >
          {done ? <Icon name="check" /> : number}
        </span>
        <span className="min-w-0 flex-1">
          <span className="sr-only">{t('lessonNumber', { number: String(number) })}: </span>
          <span className={clsx('block', current ? 'font-bold' : 'font-semibold')}>
            {lesson.title}
          </span>
          {lesson.summary ? (
            <span className={clsx('block text-sm', current ? 'text-brand-800' : 'text-muted')}>
              {lesson.summary}
            </span>
          ) : null}
        </span>
        {done ? (
          <Badge tone="success">{t('statusDone')}</Badge>
        ) : lesson.locked ? (
          <PremiumBadge />
        ) : lesson.status === 'STARTED' || current ? (
          <Badge tone="brand">{t('statusStarted')}</Badge>
        ) : null}
      </Link>
    </li>
  );
}

function ProjectRow({ project, current }: { project: ModuleProject; current: boolean }) {
  const tp = useTranslations('project');
  const tr = useTranslations('progress');
  const shipped = project.status === 'SHIPPED';
  return (
    <Link
      href={`/learn/projects/${project.id}`}
      aria-current={current ? 'step' : undefined}
      className={clsx(
        'mt-1 flex min-h-15 items-center gap-3.5 rounded-row border-2 border-dashed py-3 ps-3 pe-4 transition-colors hover:bg-raised',
        current ? 'border-primary bg-brand-100' : 'border-brand-300',
      )}
    >
      <span
        aria-hidden="true"
        className={clsx(
          'grid size-9 shrink-0 place-items-center rounded-full',
          shipped ? 'bg-sage text-on-primary' : 'bg-brand-200 text-brand-800',
        )}
      >
        <Icon name={shipped ? 'check' : 'star'} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[0.7rem] font-bold tracking-[0.1em] text-brand-text uppercase">
          {tp('label')}
        </span>
        <span className="block font-semibold">{project.title}</span>
        <span className="block text-sm text-muted">{project.summary}</span>
      </span>
      {project.locked && !shipped ? (
        <PremiumBadge />
      ) : shipped ? (
        <Badge tone="success">{tp('statusShipped')}</Badge>
      ) : project.status === 'DRAFT' ? (
        <Badge tone="brand">{tp('statusDraft')}</Badge>
      ) : (
        <span className="text-sm font-bold whitespace-nowrap text-muted" dir="ltr">
          {tr('xpGained', { xp: String(project.xp) })}
        </span>
      )}
    </Link>
  );
}

function ModuleCard({
  module,
  index,
  nextLessonId,
  nextProjectId,
}: {
  module: Module;
  index: number;
  nextLessonId?: string;
  nextProjectId?: string;
}) {
  const t = useTranslations('learn');
  return (
    <section
      aria-labelledby={`module-${module.id}`}
      className="flex flex-col gap-2 rounded-card bg-surface p-5 sm:p-6.5"
    >
      <Kicker tone={index % 2 === 0 ? 'brand' : 'sage'}>
        {t('moduleNumber', { number: String(index + 1) })}
      </Kicker>
      <h3 id={`module-${module.id}`} className="text-2xl">
        {module.title}
      </h3>
      {module.description ? (
        <p className="mb-2.5 text-sm text-muted">{module.description}</p>
      ) : null}
      <ol className="flex flex-col gap-2">
        {module.lessons.map((lesson, i) => (
          <LessonRow
            key={lesson.id}
            lesson={lesson}
            number={i + 1}
            current={lesson.id === nextLessonId}
          />
        ))}
      </ol>
      {module.project ? (
        <ProjectRow project={module.project} current={module.project.id === nextProjectId} />
      ) : null}
    </section>
  );
}

/** A child's home: where to carry on, how far they've come, and every lesson. */
export function StudentHome() {
  const t = useTranslations('learn');
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
  const next = findNext(modules);

  const tips = (
    <>
      <section className="flex gap-4 rounded-card bg-sage-100 p-6">
        <IconBubble icon="shield" tone="sageSolid" />
        <div>
          <h3 className="text-xl text-sage-900">{t('safetyTitle')}</h3>
          <p className="mt-1 text-sm text-sage-800">{t('safetyBody')}</p>
        </div>
      </section>
      <section className="flex gap-4 rounded-card bg-surface p-6">
        <IconBubble icon="key" tone="neutral" />
        <div>
          <h3 className="text-xl">{t('usernameTitle')}</h3>
          <p className="mt-1 text-sm text-muted">
            {t.rich('usernameBody', {
              username: isolate(user.username ?? ''),
              b: (chunks) => <b className="font-latin text-ink">{chunks}</b>,
            })}
          </p>
        </div>
      </section>
    </>
  );

  return (
    <div className="mx-auto flex max-w-300 flex-col gap-7">
      <section className="flex flex-wrap items-center gap-5">
        <Avatar
          avatarKey={user.student?.avatarKey ?? 'rocket'}
          size="hero"
          className="drop-shadow-[0_6px_14px_rgb(0_0_0/0.14)]"
        />
        <div>
          <h1 className="text-4xl sm:text-[2.75rem]">
            {t('greeting', { nickname: isolate(nickname) })}
          </h1>
          <p className="mt-1 text-lg text-muted">{t('subtitle')}</p>
        </div>
      </section>

      {failed ? <Alert tone="error">{t('loadFailed')}</Alert> : null}
      {!failed && !overview ? <PageSpinner /> : null}
      {overview && total > 0 ? <ContinueCard next={next} done={done} total={total} /> : null}
      {overview?.premium ? <PremiumBanner premium={overview.premium} /> : null}

      <ProgressSummary />

      {overview?.tracks.map((track) => {
        const projects = track.modules.filter((m) => m.project).length;
        const count = track.modules.reduce((sum, m) => sum + m.lessons.length, 0);
        const columns = [
          track.modules.filter((_, i) => i % 2 === 0),
          track.modules.filter((_, i) => i % 2 === 1),
        ];
        const card = (module: Module) => (
          <ModuleCard
            key={module.id}
            module={module}
            index={track.modules.indexOf(module)}
            nextLessonId={next?.lesson?.id}
            nextProjectId={next?.project?.id}
          />
        );
        return (
          <section
            key={track.id}
            aria-labelledby={`track-${track.id}`}
            className="mt-2 flex flex-col gap-5"
          >
            <SectionHeading
              id={`track-${track.id}`}
              detail={t('trackDetail', {
                modules: String(track.modules.length),
                lessons: String(count),
                projects: String(projects),
              })}
            >
              {track.title}
            </SectionHeading>
            <div className="grid items-start gap-4.5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
              <div className="flex flex-col gap-4.5">{columns[0]?.map(card)}</div>
              <div className="flex flex-col gap-4.5">
                {columns[1]?.map(card)}
                {track === overview.tracks.at(-1) ? tips : null}
              </div>
            </div>
          </section>
        );
      })}
      {overview && overview.tracks.length === 0 ? (
        <div className="grid gap-4.5 sm:grid-cols-2">{tips}</div>
      ) : null}
    </div>
  );
}
