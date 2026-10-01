'use client';

import type { components } from '@kcp/api-client-ts';
import { clsx } from 'clsx';
import { useFormatter, useTranslations } from 'next-intl';
import { useState } from 'react';
import { BackLink } from '@/components/back-link';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  buttonClass,
  Card,
  Icon,
  PageSpinner,
  Spinner,
} from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { useAccount } from '@/lib/use-account';
import { isolate } from '../auth/validation';
import { PullStateBadge } from '../events/events-page';
import { PullRequestView } from '../events/pull-page';
import { GitWorkspace } from '../events/workspace-page';
import { Markdown } from '../learn/markdown';
import {
  NoticeArea,
  ProjectStatusBadge,
  TaskStatusBadge,
  useAction,
  useDuration,
  useLoad,
} from './hub-common';

type Task = components['schemas']['HubTaskDto'];
type Usage = components['schemas']['TimeUsageDto'];

const OPEN: Task['status'][] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW'];

/** The timer bar for a project: running on which task, or a button per open task. */
function TimerBar({
  tasks,
  usage,
  projectId,
  onChange,
}: {
  tasks: Task[];
  usage: Usage;
  projectId: string;
  onChange: (usage: Usage) => void;
}) {
  const t = useTranslations('hub.project');
  const { busy, notice, run } = useAction();
  const mine = tasks.filter((task) => OPEN.includes(task.status));
  const runningHere = usage.running?.projectId === projectId;
  const start = (task: Task) =>
    run(task.id, async () => {
      const result = await api.POST('/v1/hub/tasks/{taskId}/timer', {
        params: { path: { taskId: task.id } },
      });
      if (result.data) onChange(result.data);
      return result;
    });
  const stop = () =>
    run('stop', async () => {
      const result = await api.POST('/v1/hub/timer/stop');
      if (result.data) onChange(result.data);
      return result;
    });
  return (
    <div className="flex flex-col gap-2 rounded-card bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <Icon name="clock" className="text-brand-text" />
        {runningHere ? (
          <>
            <span className="font-semibold">
              {t('timerOn', {
                task: tasks.find((x) => x.id === usage.running?.taskId)?.reference ?? '',
              })}
            </span>
            <Button
              size="sm"
              variant="secondary"
              loading={busy === 'stop'}
              onClick={() => void stop()}
            >
              {t('stopTimer')}
            </Button>
          </>
        ) : usage.running ? (
          <span className="font-semibold">{t('timerElsewhere')}</span>
        ) : mine.length === 0 ? (
          <span className="text-muted">{t('noOpenTasks')}</span>
        ) : (
          <>
            <span className="font-semibold">{t('startOn')}</span>
            {mine.map((task) => (
              <Button
                key={task.id}
                size="sm"
                loading={busy === task.id}
                disabled={busy !== null || !usage.allowedNow || usage.leftMinutes <= 0}
                onClick={() => void start(task)}
              >
                {task.reference}
              </Button>
            ))}
          </>
        )}
      </div>
      <p className="text-sm text-muted">{t('timerHelp')}</p>
      <NoticeArea notice={notice} />
    </div>
  );
}

/**
 * A hub project for a student on its team: what it is, their tasks (and the timer), the
 * team, the repository and its pull requests, and the team room.
 */
export function StudentProjectPage({ id }: { id: string }) {
  const t = useTranslations('hub.project');
  const th = useTranslations('hub');
  const format = useFormatter();
  const duration = useDuration();
  const user = useAccount('STUDENT');
  const project = useLoad(
    async () => (await api.GET('/v1/hub/projects/{id}', { params: { path: { id } } })).data,
    [id, user?.id],
  );
  const time = useLoad(async () => (await api.GET('/v1/hub/time')).data, [user?.id]);
  const pulls = useLoad(
    async () =>
      (await api.GET('/v1/hub/projects/{id}/pulls', { params: { path: { id } } })).data ?? [],
    [id, user?.id],
  );
  const { busy, notice, run } = useAction();
  const [open, setOpen] = useState<string | null>(null);

  if (!user || (!project.data && !project.failed)) return <PageSpinner />;
  if (!project.data) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <BackLink href="/learn/hub">{t('back')}</BackLink>
        <Alert tone="error">{th('loadFailed')}</Alert>
      </div>
    );
  }
  const p = project.data;
  const mine = p.tasks.filter((task) => task.assignee?.id === user.id);
  const others = p.tasks.filter((task) => task.assignee?.id !== user.id);
  const working =
    p.memberStatus === 'APPROVED' && (p.status === 'ACTIVE' || p.status === 'DELIVERED');

  const move = (task: Task, status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW') =>
    run(
      `${task.id}:${status}`,
      () =>
        api.PATCH('/v1/hub/tasks/{taskId}/status', {
          params: { path: { taskId: task.id } },
          body: { status },
        }),
      t('moved'),
    ).then(async (ok) => {
      if (ok) await project.reload();
    });

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5">
      <BackLink href="/learn/hub">{t('back')}</BackLink>
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl">{isolate(p.title)}</h1>
          <span className="text-muted">{p.reference}</span>
          <ProjectStatusBadge status={p.status} />
        </div>
        <p className="text-muted">
          {p.leadName ? t('lead', { name: isolate(p.leadName) }) : null}
          {p.deadline
            ? ` · ${t('deadline', { date: format.dateTime(new Date(p.deadline), { dateStyle: 'medium' }) })}`
            : null}
        </p>
      </header>
      {/* The client's own words, as plain text: no links to follow from here. */}
      <Card>
        <p className="whitespace-pre-line">{p.summary}</p>
      </Card>

      {working && time.data ? (
        <TimerBar
          tasks={mine}
          usage={time.data}
          projectId={p.id}
          onChange={(usage) => time.setData(usage)}
        />
      ) : null}
      <NoticeArea notice={notice} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <Card title={t('myTasks')}>
            {mine.length === 0 ? <p className="text-muted">{t('noTasks')}</p> : null}
            <ul className="flex flex-col gap-3">
              {mine.map((task) => (
                <li key={task.id} className="rounded-inner bg-raised p-4">
                  <button
                    type="button"
                    aria-expanded={open === task.id}
                    onClick={() => setOpen(open === task.id ? null : task.id)}
                    className="flex w-full flex-wrap items-center gap-2 text-start"
                  >
                    <span className="text-muted">{task.reference}</span>
                    <span className="flex-1 font-bold">{isolate(task.title)}</span>
                    <TaskStatusBadge status={task.status} />
                    <Icon name={open === task.id ? 'chevU' : 'chevD'} />
                  </button>
                  <p className="mt-1 text-sm text-muted">
                    {t('estimate', { time: duration(task.estimateMinutes) })} ·{' '}
                    <span dir="ltr">{task.skillTags.join(', ')}</span>
                  </p>
                  {open === task.id ? (
                    <div className="mt-3 border-t border-line pt-3">
                      <Markdown>{task.spec}</Markdown>
                    </div>
                  ) : null}
                  {working && OPEN.includes(task.status) ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(['TODO', 'IN_PROGRESS', 'IN_REVIEW'] as const)
                        .filter((status) => status !== task.status)
                        .map((status) => (
                          <Button
                            key={status}
                            size="sm"
                            variant="ghost"
                            loading={busy === `${task.id}:${status}`}
                            disabled={busy !== null}
                            onClick={() => void move(task, status)}
                          >
                            {t(`moveTo.${status}`)}
                          </Button>
                        ))}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </Card>
          {others.length ? (
            <Card title={t('teamTasks')}>
              <ul className="flex flex-col gap-2">
                {others.map((task) => (
                  <li
                    key={task.id}
                    className="flex flex-wrap items-center gap-2 rounded-row bg-raised px-4 py-2.5"
                  >
                    <span className="text-muted">{task.reference}</span>
                    <span className="flex-1 font-semibold">{isolate(task.title)}</span>
                    {task.assignee ? (
                      <span className="text-sm text-muted">{isolate(task.assignee.nickname)}</span>
                    ) : null}
                    <TaskStatusBadge status={task.status} />
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>

        <div className="flex flex-col gap-4">
          <Card title={t('code')}>
            {p.hasRepo || working ? (
              <>
                <p className="text-sm text-muted">{t('codeHelp')}</p>
                <Link
                  href={`/learn/hub/projects/${p.id}/workspace`}
                  className={clsx(buttonClass('primary', 'sm'), 'mt-3')}
                >
                  <Icon name="code" />
                  {t('openWorkspace')}
                </Link>
              </>
            ) : (
              <p className="text-muted">{t('noRepo')}</p>
            )}
            <h3 className="mt-5 font-bold">{t('pulls')}</h3>
            {!pulls.data ? (
              <Spinner />
            ) : pulls.data.length === 0 ? (
              <p className="text-sm text-muted">{t('noPulls')}</p>
            ) : (
              <ul className="mt-2 flex flex-col gap-1.5">
                {pulls.data.map((pull) => (
                  <li key={pull.number}>
                    <Link
                      href={`/learn/hub/projects/${p.id}/pulls/${pull.number}`}
                      className="flex flex-wrap items-center gap-2 rounded-row bg-raised px-3 py-2 hover:bg-ink/5"
                    >
                      <PullStateBadge state={pull.state} />
                      <span className="flex-1 font-semibold">{pull.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title={t('team')}>
            <ul className="flex flex-col gap-2">
              {p.team.map((mate) => (
                <li key={mate.id} className="flex items-center gap-3">
                  <Avatar avatarKey={mate.avatarKey} size="sm" />
                  <span className="flex-1 font-semibold">
                    {mate.isMe ? t('you') : isolate(mate.nickname)}
                  </span>
                  {mate.isLead ? <Badge tone="brand">{t('leadBadge')}</Badge> : null}
                </li>
              ))}
            </ul>
            {p.roomId ? (
              <Link
                href={`/learn/rooms?room=${p.roomId}`}
                className={clsx(buttonClass('secondary', 'sm'), 'mt-4')}
              >
                <Icon name="msg" />
                {t('room')}
              </Link>
            ) : null}
            <p className="mt-3 text-sm text-muted">{t('anonymous')}</p>
          </Card>
        </div>
      </div>
    </div>
  );
}

/** The project's repository in the browser, with the timer on top (pushing needs it). */
export function StudentWorkspacePage({ id }: { id: string }) {
  const t = useTranslations('hub.project');
  const tw = useTranslations('workspace');
  const user = useAccount('STUDENT');
  const project = useLoad(
    async () => (await api.GET('/v1/hub/projects/{id}', { params: { path: { id } } })).data,
    [id, user?.id],
  );
  const workspace = useLoad(
    async () =>
      (await api.GET('/v1/hub/projects/{id}/workspace', { params: { path: { id } } })).data,
    [id, user?.id],
  );
  const time = useLoad(async () => (await api.GET('/v1/hub/time')).data, [user?.id]);
  const [taskId, setTaskId] = useState('');

  if (!user || ((!project.data || !workspace.data) && !project.failed && !workspace.failed)) {
    return <PageSpinner />;
  }
  if (!project.data || !workspace.data) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <BackLink href={`/learn/hub/projects/${id}`}>{t('backToProject')}</BackLink>
        <Alert tone="error">{tw('notSetUp')}</Alert>
      </div>
    );
  }
  const p = project.data;
  const mine = p.tasks.filter(
    (task) => task.assignee?.id === user.id && OPEN.includes(task.status),
  );
  return (
    <GitWorkspace
      workspace={workspace.data}
      title={isolate(p.title)}
      backHref={`/learn/hub/projects/${id}`}
      backLabel={t('backToProject')}
      pullsHref={`/learn/hub/projects/${id}`}
      pullsLabel={t('seePulls')}
      readOnlyText={t('pushNeedsTimer')}
      readOnlyBadge={t('timerOff')}
      extra={
        time.data ? (
          <TimerBar
            tasks={mine}
            usage={time.data}
            projectId={id}
            onChange={(usage) => {
              time.setData(usage);
              void workspace.reload();
            }}
          />
        ) : null
      }
      pullExtra={
        mine.length ? (
          <label className="flex flex-col gap-1.5">
            <span className="font-bold">{t('pullTask')}</span>
            <select
              className="rounded-full border-2 border-line bg-surface px-3 py-2"
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
            >
              <option value="">{t('pullNoTask')}</option>
              {mine.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.reference} · {task.title}
                </option>
              ))}
            </select>
          </label>
        ) : null
      }
      openPull={async (title, body) => {
        const { data, error } = await api.POST('/v1/hub/projects/{id}/pulls', {
          params: { path: { id } },
          body: {
            branch: workspace.data!.branch,
            title,
            ...(body.trim() ? { body } : {}),
            ...(taskId ? { taskId } : {}),
          },
        });
        return data ? { href: `/learn/hub/projects/${id}/pulls/${data.number}` } : { error };
      }}
    />
  );
}

/** A pull request of a hub project (students and the lead). */
export function HubPullPage({
  id,
  number,
  area,
}: {
  id: string;
  number: number;
  area: 'STUDENT' | 'MENTOR';
}) {
  const t = useTranslations('hub.project');
  const user = useAccount(area);
  if (!user) return <PageSpinner />;
  const back = area === 'STUDENT' ? `/learn/hub/projects/${id}` : `/mentor/hub/projects/${id}`;
  return (
    <PullRequestView
      source={{ kind: 'hub', id }}
      number={number}
      backHref={back}
      backLabel={t('backToProject')}
    />
  );
}
