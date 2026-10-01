'use client';

import type { components } from '@kcp/api-client-ts';
import { clsx } from 'clsx';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { type FormEvent, useState } from 'react';
import { BackLink } from '@/components/back-link';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  Checkbox,
  Dialog,
  Icon,
  PageSpinner,
  SelectField,
  Spinner,
  TextField,
  textareaClass,
} from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { minorDigits } from '@/lib/money';
import { useAccount } from '@/lib/use-account';
import { isolate } from '../auth/validation';
import { PullStateBadge } from '../events/events-page';
import { Markdown } from '../learn/markdown';
import {
  DeliveryStatusBadge,
  InvoiceStatusBadge,
  MemberStatusBadge,
  Money,
  NoticeArea,
  ProjectStatusBadge,
  previewUrl,
  TaskStatusBadge,
  useAction,
  useDuration,
  useLoad,
} from './hub-common';

type Project = components['schemas']['LeadProjectDto'];
type Quote = components['schemas']['HubQuoteDto'];
type Task = components['schemas']['HubTaskDto'];
type Member = components['schemas']['HubMemberDto'];
type Match = components['schemas']['MatchDto'];

type Tab = 'scope' | 'team' | 'milestones' | 'client' | 'code';
const TABS: Tab[] = ['scope', 'team', 'milestones', 'client', 'code'];

/** Major units typed by a person ("1200.50") to minor units. */
const toMinor = (value: string, currency: string) =>
  Math.round(Number(value.replace(',', '.')) * 10 ** minorDigits(currency));
const toMajor = (minor: number, currency: string) =>
  (minor / 10 ** minorDigits(currency)).toFixed(minorDigits(currency));

function TaskForm({
  quote,
  task,
  onSaved,
  onCancel,
}: {
  quote: Quote;
  task?: Task;
  onSaved: (project: Project) => void;
  onCancel?: () => void;
}) {
  const t = useTranslations('hub.leadProject');
  const { busy, notice, run } = useAction();
  const [title, setTitle] = useState(task?.title ?? '');
  const [spec, setSpec] = useState(task?.spec ?? '');
  const [skills, setSkills] = useState(task?.skillTags.join(', ') ?? '');
  const [hours, setHours] = useState(task ? String(task.estimateMinutes / 60) : '2');
  const [share, setShare] = useState(task ? String(task.shareBp / 100) : '0');
  const locked = quote.status === 'APPROVED';

  async function submit(event: FormEvent) {
    event.preventDefault();
    const body = {
      title: title.trim(),
      spec: spec.trim(),
      skillTags: skills
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
      estimateMinutes: Math.round(Number(hours) * 60),
    };
    await run('save', async () => {
      const result = task
        ? await api.PATCH('/v1/mentor/hub/tasks/{taskId}', {
            params: { path: { taskId: task.id } },
            body,
          })
        : await api.POST('/v1/mentor/hub/quotes/{quoteId}/tasks', {
            params: { path: { quoteId: quote.id } },
            body: { ...body, shareBp: locked ? 0 : Math.round(Number(share) * 100) },
          });
      if (result.data) onSaved(result.data);
      return result;
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-inner bg-raised p-4">
      <TextField
        label={t('taskTitle')}
        value={title}
        maxLength={120}
        required
        onChange={(e) => setTitle(e.target.value)}
      />
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold">{t('taskSpec')}</span>
        <textarea
          className={clsx(textareaClass(), 'min-h-28')}
          value={spec}
          maxLength={5000}
          required
          onChange={(e) => setSpec(e.target.value)}
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-3">
        <TextField
          label={t('taskSkills')}
          hint={t('taskSkillsHint')}
          value={skills}
          dir="ltr"
          onChange={(e) => setSkills(e.target.value)}
        />
        <TextField
          label={t('taskHours')}
          type="number"
          min="0.25"
          step="0.25"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
        />
        {!task && !locked ? (
          <TextField
            label={t('taskShare')}
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={share}
            onChange={(e) => setShare(e.target.value)}
          />
        ) : null}
      </div>
      {locked && !task ? <p className="text-sm text-muted">{t('inScopeNote')}</p> : null}
      <NoticeArea notice={notice} />
      <div className="flex flex-wrap gap-2.5">
        <Button
          type="submit"
          size="sm"
          loading={busy === 'save'}
          disabled={title.trim().length < 3 || spec.trim().length < 10}
        >
          {task ? t('saveTask') : t('addTask')}
        </Button>
        {onCancel ? (
          <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
            {t('cancel')}
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function QuoteCard({
  project,
  quote,
  onChange,
}: {
  project: Project;
  quote: Quote;
  onChange: (p: Project) => void;
}) {
  const t = useTranslations('hub.leadProject');
  const format = useFormatter();
  const duration = useDuration();
  const { busy, notice, run } = useAction();
  const [price, setPrice] = useState(toMajor(quote.priceMinor, project.currency));
  const [note, setNote] = useState(quote.note ?? '');
  const [shares, setShares] = useState<Record<string, string>>(
    Object.fromEntries(quote.tasks.map((task) => [task.id, String(task.shareBp / 100)])),
  );
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const draft = quote.status === 'DRAFT';
  const live = quote.tasks.filter((task) => task.status !== 'CANCELLED');
  const shareTotal = live.reduce((sum, task) => sum + Number(shares[task.id] ?? 0), 0);
  const apply = <R extends { data?: Project }>(result: R): R => {
    if (result.data) onChange(result.data);
    return result;
  };

  return (
    <Card
      tone="raised"
      kicker={t(`kinds.${quote.kind}`)}
      title={t('quoteTitle', { version: quote.version })}
      actions={
        <Badge
          tone={
            quote.status === 'APPROVED'
              ? 'success'
              : quote.status === 'SENT'
                ? 'warning'
                : 'neutral'
          }
        >
          {t(`quoteStatus.${quote.status}`)}
        </Badge>
      }
    >
      {draft ? (
        <div className="grid gap-3 sm:grid-cols-[12rem_1fr_auto] sm:items-end">
          <TextField
            label={t('price', { currency: project.currency })}
            type="number"
            min="1"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
          <TextField
            label={t('quoteNote')}
            value={note}
            maxLength={2000}
            onChange={(e) => setNote(e.target.value)}
          />
          <Button
            size="sm"
            variant="secondary"
            loading={busy === 'price'}
            onClick={() =>
              void run(
                'price',
                async () =>
                  apply(
                    await api.PATCH('/v1/mentor/hub/quotes/{quoteId}', {
                      params: { path: { quoteId: quote.id } },
                      body: {
                        priceMinor: toMinor(price, project.currency),
                        ...(note.trim() ? { note: note.trim() } : {}),
                      },
                    }),
                  ),
                t('saved'),
              )
            }
          >
            {t('save')}
          </Button>
        </div>
      ) : (
        <p className="text-lg">
          <Money minor={quote.priceMinor} currency={project.currency} />
          {quote.depositMinor ? (
            <span className="text-sm text-muted">
              {' · '}
              {t('deposit')} <Money minor={quote.depositMinor} currency={project.currency} />
            </span>
          ) : null}
          {quote.acceptedAt ? (
            <Badge tone="success">
              {t('accepted', {
                date: format.dateTime(new Date(quote.acceptedAt), { dateStyle: 'medium' }),
              })}
            </Badge>
          ) : null}
        </p>
      )}
      {quote.declineReason ? (
        <Alert tone="warning">{t('declinedBecause', { reason: quote.declineReason })}</Alert>
      ) : null}

      <ul className="mt-4 flex flex-col gap-2">
        {quote.tasks.map((task) =>
          editing === task.id ? (
            <li key={task.id}>
              <TaskForm
                quote={quote}
                task={task}
                onSaved={(p) => {
                  onChange(p);
                  setEditing(null);
                }}
                onCancel={() => setEditing(null)}
              />
            </li>
          ) : (
            <li
              key={task.id}
              className="flex flex-wrap items-center gap-2 rounded-row bg-surface px-3 py-2"
            >
              <span className="text-muted">{task.reference}</span>
              <span className="min-w-40 flex-1 font-semibold">{isolate(task.title)}</span>
              <span className="text-sm text-muted">{duration(task.estimateMinutes)}</span>
              {draft ? (
                <label className="flex items-center gap-1 text-sm">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    aria-label={t('shareOf', { task: task.reference })}
                    className="w-20 rounded-full border-2 border-line bg-raised px-2 py-1"
                    value={shares[task.id] ?? '0'}
                    onChange={(e) => setShares((now) => ({ ...now, [task.id]: e.target.value }))}
                  />
                  %
                </label>
              ) : (
                <Badge>{(task.shareBp / 100).toFixed(task.shareBp % 100 ? 2 : 0)}%</Badge>
              )}
              <TaskStatusBadge status={task.status} />
              {task.status !== 'CANCELLED' && !quote.acceptedAt && quote.status !== 'SENT' ? (
                <>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(task.id)}>
                    <Icon name="pencil" />
                    <span className="sr-only">{t('editTask')}</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    loading={busy === `rm:${task.id}`}
                    onClick={() =>
                      void run(`rm:${task.id}`, async () =>
                        apply(
                          await api.DELETE('/v1/mentor/hub/tasks/{taskId}', {
                            params: { path: { taskId: task.id } },
                          }),
                        ),
                      )
                    }
                  >
                    <Icon name="trash" />
                    <span className="sr-only">{t('removeTask')}</span>
                  </Button>
                </>
              ) : null}
            </li>
          ),
        )}
      </ul>

      {draft && live.length ? (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span
            className={clsx(
              'text-sm font-semibold',
              Math.abs(shareTotal - 100) > 0.001 && 'text-danger',
            )}
          >
            {t('shareTotal', { total: Math.round(shareTotal * 100) / 100 })}
          </span>
          <Button
            size="sm"
            variant="secondary"
            loading={busy === 'shares'}
            onClick={() =>
              void run(
                'shares',
                async () =>
                  apply(
                    await api.PUT('/v1/mentor/hub/quotes/{quoteId}/shares', {
                      params: { path: { quoteId: quote.id } },
                      body: {
                        shares: live.map((task) => ({
                          taskId: task.id,
                          shareBp: Math.round(Number(shares[task.id] ?? 0) * 100),
                        })),
                      },
                    }),
                  ),
                t('saved'),
              )
            }
          >
            {t('saveShares')}
          </Button>
        </div>
      ) : null}

      {draft || (quote.status === 'APPROVED' && !quote.acceptedAt) ? (
        adding ? (
          <div className="mt-3">
            <TaskForm
              quote={quote}
              onSaved={(p) => {
                onChange(p);
                setAdding(false);
              }}
              onCancel={() => setAdding(false)}
            />
          </div>
        ) : (
          <Button className="mt-3" size="sm" variant="ghost" onClick={() => setAdding(true)}>
            <Icon name="plus" />
            {quote.status === 'APPROVED' ? t('addInScope') : t('addTask')}
          </Button>
        )
      ) : null}

      <NoticeArea notice={notice} />
      <div className="mt-3 flex flex-wrap gap-2.5">
        {draft ? (
          <Button
            loading={busy === 'send'}
            disabled={live.length === 0}
            onClick={() =>
              void run(
                'send',
                async () =>
                  apply(
                    await api.POST('/v1/mentor/hub/quotes/{quoteId}/send', {
                      params: { path: { quoteId: quote.id } },
                    }),
                  ),
                t('sent'),
              )
            }
          >
            <Icon name="send" />
            {t('send')}
          </Button>
        ) : null}
        {quote.status === 'SENT' ? (
          <Button
            variant="ghost"
            loading={busy === 'withdraw'}
            onClick={() =>
              void run(
                'withdraw',
                async () =>
                  apply(
                    await api.POST('/v1/mentor/hub/quotes/{quoteId}/withdraw', {
                      params: { path: { quoteId: quote.id } },
                    }),
                  ),
                t('withdrawn'),
              )
            }
          >
            {t('withdraw')}
          </Button>
        ) : null}
      </div>
      {quote.sowText && !draft ? (
        <details className="mt-4">
          <summary className="cursor-pointer font-semibold">{t('sow')}</summary>
          <div className="mt-2 max-h-80 overflow-auto rounded-inner bg-surface p-4">
            <Markdown>{quote.sowText}</Markdown>
          </div>
        </details>
      ) : null}
    </Card>
  );
}

function ScopeTab({ project, onChange }: { project: Project; onChange: (p: Project) => void }) {
  const t = useTranslations('hub.leadProject');
  const format = useFormatter();
  const { busy, notice, run } = useAction();
  const [title, setTitle] = useState(project.title);
  const [summary, setSummary] = useState(project.summary);
  const [deadline, setDeadline] = useState(project.deadline?.slice(0, 10) ?? '');
  const [newPrice, setNewPrice] = useState('');
  const mainApproved = project.quotes.some((q) => q.kind === 'MAIN' && q.status === 'APPROVED');
  const hasDraft = project.quotes.some((q) => q.status === 'DRAFT');
  return (
    <div className="flex flex-col gap-4">
      <Card title={t('overview')}>
        <p className="text-sm text-muted">
          {t('split', {
            student: project.split.student,
            lead: project.split.lead,
            platform: project.split.platform,
          })}
          {' · '}
          {t('depositPercent', { percent: project.depositPercent })}
        </p>
        <details className="mt-3">
          <summary className="cursor-pointer font-semibold">{t('editProject')}</summary>
          <form
            className="mt-3 flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              void run(
                'project',
                async () => {
                  const result = await api.PATCH('/v1/mentor/hub/projects/{id}', {
                    params: { path: { id: project.id } },
                    body: {
                      title: title.trim(),
                      summary: summary.trim(),
                      ...(deadline ? { deadline } : {}),
                    },
                  });
                  if (result.data) onChange(result.data);
                  return result;
                },
                t('saved'),
              );
            }}
          >
            <TextField
              label={t('projectTitle')}
              value={title}
              maxLength={120}
              onChange={(e) => setTitle(e.target.value)}
            />
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold">{t('summary')}</span>
              <textarea
                className={clsx(textareaClass(), 'min-h-28')}
                value={summary}
                maxLength={5000}
                onChange={(e) => setSummary(e.target.value)}
              />
            </label>
            <TextField
              label={t('deadline')}
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
            <Button type="submit" size="sm" className="self-start" loading={busy === 'project'}>
              {t('save')}
            </Button>
          </form>
        </details>
        <div className="mt-3">
          <Markdown>{project.summary}</Markdown>
        </div>
      </Card>
      <NoticeArea notice={notice} />
      {project.quotes.map((quote) => (
        <QuoteCard key={quote.id} project={project} quote={quote} onChange={onChange} />
      ))}
      {!hasDraft && project.status !== 'CANCELLED' && project.status !== 'COMPLETED' ? (
        <Card title={mainApproved ? t('newChangeQuote') : t('newQuote')}>
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              void run(
                'quote',
                async () => {
                  const result = await api.POST('/v1/mentor/hub/projects/{id}/quotes', {
                    params: { path: { id: project.id } },
                    body: {
                      kind: mainApproved ? 'CHANGE' : 'MAIN',
                      priceMinor: toMinor(newPrice, project.currency),
                    },
                  });
                  if (result.data) onChange(result.data);
                  return result;
                },
                t('quoteMade'),
              );
            }}
          >
            <TextField
              label={t('price', { currency: project.currency })}
              type="number"
              min="1"
              step="0.01"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
            />
            <Button type="submit" loading={busy === 'quote'} disabled={!(Number(newPrice) > 0)}>
              <Icon name="plus" />
              {t('makeQuote')}
            </Button>
          </form>
        </Card>
      ) : null}
      <Card title={t('invoices')}>
        {project.invoices.length === 0 ? (
          <p className="text-muted">{t('noInvoices')}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {project.invoices.map((invoice) => (
              <li
                key={invoice.id}
                className="flex flex-wrap items-center gap-2 rounded-row bg-raised px-4 py-2.5"
              >
                <span className="font-semibold">{invoice.reference}</span>
                <span className="flex-1 text-sm text-muted">
                  {t(`invoiceKind.${invoice.kind}`)} ·{' '}
                  {format.dateTime(new Date(invoice.issuedAt), { dateStyle: 'medium' })}
                </span>
                <Money minor={invoice.amountMinor} currency={invoice.currency} />
                <InvoiceStatusBadge status={invoice.status} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Suggestions({
  project,
  task,
  onInvited,
}: {
  project: Project;
  task: Task;
  onInvited: () => Promise<void>;
}) {
  const t = useTranslations('hub.leadProject');
  const duration = useDuration();
  const [note, setNote] = useState('');
  const { busy, notice, run } = useAction();
  const matches = useLoad(
    async () =>
      (
        await api.GET('/v1/mentor/hub/projects/{id}/tasks/{taskId}/suggestions', {
          params: { path: { id: project.id, taskId: task.id } },
        })
      ).data,
    [project.id, task.id],
  );
  if (!matches.data)
    return matches.failed ? <Alert tone="error">{t('loadFailed')}</Alert> : <Spinner />;
  return (
    <div className="mt-3 flex flex-col gap-2 rounded-inner bg-surface p-3">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold">{t('inviteNote')}</span>
        <textarea
          className={textareaClass()}
          maxLength={500}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>
      <NoticeArea notice={notice} />
      {matches.data.length === 0 ? <p className="text-sm text-muted">{t('noMatches')}</p> : null}
      <ul className="flex flex-col gap-1.5">
        {matches.data.map((match: Match) => (
          <li
            key={match.studentId}
            className="flex flex-wrap items-center gap-2 rounded-row bg-raised px-3 py-2"
          >
            <Avatar avatarKey={match.avatarKey} size="sm" />
            <span className="min-w-32 flex-1 font-semibold">{isolate(match.nickname)}</span>
            <span className="text-xs text-muted" dir="ltr">
              {match.matchedSkills.join(', ')}
            </span>
            <Badge>{t('score', { score: match.score.total })}</Badge>
            <span className="text-xs text-muted">
              {t('freeTime', { time: duration(match.minutesLeft) })}
            </span>
            <Button
              size="sm"
              loading={busy === match.studentId}
              disabled={busy !== null}
              onClick={() =>
                void run(
                  match.studentId,
                  () =>
                    api.POST('/v1/mentor/hub/projects/{id}/invites', {
                      params: { path: { id: project.id } },
                      body: {
                        studentId: match.studentId,
                        taskId: task.id,
                        ...(note.trim() ? { note: note.trim() } : {}),
                      },
                    }),
                  t('invited', { nickname: isolate(match.nickname) }),
                ).then(async (ok) => {
                  if (ok) await Promise.all([onInvited(), matches.reload()]);
                })
              }
            >
              {t('invite')}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TeamTab({ project, onChange }: { project: Project; onChange: (p: Project) => void }) {
  const t = useTranslations('hub.leadProject');
  const duration = useDuration();
  const team = useLoad(
    async () =>
      (await api.GET('/v1/mentor/hub/projects/{id}/team', { params: { path: { id: project.id } } }))
        .data,
    [project.id],
  );
  const { busy, notice, run } = useAction();
  const [finding, setFinding] = useState<string | null>(null);
  const [removing, setRemoving] = useState<Member | null>(null);
  const [reason, setReason] = useState('');
  const approved = (team.data ?? []).filter((m) => m.status === 'APPROVED');
  const tasks = project.quotes
    .filter((q) => q.status === 'APPROVED')
    .flatMap((q) => q.tasks)
    .filter((task) => task.status !== 'CANCELLED');
  const staffing =
    project.status === 'ACTIVE' ||
    project.status === 'DELIVERED' ||
    project.status === 'AWAITING_DEPOSIT';
  return (
    <div className="flex flex-col gap-4">
      <NoticeArea notice={notice} />
      <Card title={t('team')}>
        {!team.data ? (
          <Spinner />
        ) : team.data.length === 0 ? (
          <p className="text-muted">{t('noTeam')}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {team.data.map((member) => (
              <li
                key={member.memberId}
                className="flex flex-wrap items-center gap-2 rounded-row bg-raised px-3 py-2"
              >
                <Avatar avatarKey={member.avatarKey} size="sm" />
                <span className="min-w-32 flex-1">
                  <span className="font-semibold">{isolate(member.nickname)}</span>{' '}
                  <span className="text-sm text-muted">({member.pseudonym})</span>
                </span>
                <span className="text-sm text-muted">{duration(member.minutes)}</span>
                <MemberStatusBadge status={member.status} />
                {member.status !== 'REMOVED' && member.status !== 'DECLINED' ? (
                  <Button size="sm" variant="ghost" onClick={() => setRemoving(member)}>
                    {t('removeMember')}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-sm text-muted">{t('teamNote')}</p>
      </Card>
      <Card title={t('board')}>
        {tasks.length === 0 ? <p className="text-muted">{t('noBoard')}</p> : null}
        <ul className="flex flex-col gap-3">
          {tasks.map((task) => (
            <li key={task.id} className="rounded-inner bg-raised p-3">
              <p className="flex flex-wrap items-center gap-2">
                <span className="text-muted">{task.reference}</span>
                <span className="min-w-40 flex-1 font-semibold">{isolate(task.title)}</span>
                <TaskStatusBadge status={task.status} />
              </p>
              <div className="mt-2 flex flex-wrap items-end gap-3">
                <SelectField
                  label={t('assignee')}
                  value={task.assignee?.id ?? ''}
                  disabled={busy !== null}
                  onChange={(e) =>
                    void run(`as:${task.id}`, async () => {
                      const result = await api.PUT('/v1/mentor/hub/tasks/{taskId}/assignee', {
                        params: { path: { taskId: task.id } },
                        body: { studentId: e.target.value || null },
                      });
                      if (result.data) onChange(result.data);
                      return result;
                    })
                  }
                >
                  <option value="">{t('nobody')}</option>
                  {approved.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nickname}
                    </option>
                  ))}
                </SelectField>
                <SelectField
                  label={t('status')}
                  value={task.status}
                  disabled={busy !== null}
                  onChange={(e) =>
                    void run(`st:${task.id}`, async () => {
                      const result = await api.PATCH('/v1/mentor/hub/tasks/{taskId}/status', {
                        params: { path: { taskId: task.id } },
                        body: { status: e.target.value as 'TODO' },
                      });
                      if (result.data) onChange(result.data);
                      return result;
                    })
                  }
                >
                  {(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'] as const).map((status) => (
                    <option key={status} value={status}>
                      {t(`statusName.${status}`)}
                    </option>
                  ))}
                </SelectField>
                {staffing && !task.assignee ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setFinding(finding === task.id ? null : task.id)}
                  >
                    <Icon name="userPlus" />
                    {t('findStudents')}
                  </Button>
                ) : null}
              </div>
              {finding === task.id ? (
                <Suggestions
                  project={project}
                  task={task}
                  onInvited={async () => {
                    await team.reload();
                  }}
                />
              ) : null}
            </li>
          ))}
        </ul>
      </Card>
      <Dialog open={removing !== null} onClose={() => setRemoving(null)} title={t('removeTitle')}>
        <p>{t('removeBody', { nickname: isolate(removing?.nickname ?? '') })}</p>
        <TextField
          label={t('reason')}
          value={reason}
          maxLength={300}
          onChange={(e) => setReason(e.target.value)}
        />
        <div className="flex flex-wrap gap-2.5">
          <Button
            variant="danger"
            disabled={reason.trim().length < 3}
            loading={busy === 'remove'}
            onClick={() =>
              void run(
                'remove',
                () =>
                  api.DELETE('/v1/mentor/hub/members/{memberId}', {
                    params: { path: { memberId: removing!.memberId } },
                    body: { reason: reason.trim() },
                  }),
                t('removed'),
              ).then(async (ok) => {
                if (ok) {
                  setRemoving(null);
                  setReason('');
                  await team.reload();
                }
              })
            }
          >
            {t('removeConfirm')}
          </Button>
          <Button variant="ghost" onClick={() => setRemoving(null)}>
            {t('cancel')}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

function MilestonesTab({ project }: { project: Project }) {
  const t = useTranslations('hub.leadProject');
  const locale = useLocale();
  const format = useFormatter();
  const deliveries = useLoad(
    async () =>
      (
        await api.GET('/v1/mentor/hub/projects/{id}/deliveries', {
          params: { path: { id: project.id } },
        })
      ).data,
    [project.id],
  );
  const open = project.quotes.filter((q) => q.status === 'APPROVED' && !q.acceptedAt);
  const [quoteId, setQuoteId] = useState(open[0]?.id ?? '');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [final, setFinal] = useState(false);
  const { busy, notice, run } = useAction();
  return (
    <div className="flex flex-col gap-4">
      {open.length ? (
        <Card title={t('newMilestone')}>
          <form
            className="flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              void run(
                'make',
                async () => {
                  const result = await api.POST('/v1/mentor/hub/projects/{id}/deliveries', {
                    params: { path: { id: project.id } },
                    body: { quoteId, title: title.trim(), notes: notes.trim(), final },
                  });
                  if (result.data) {
                    deliveries.setData(result.data);
                    setTitle('');
                    setNotes('');
                    setFinal(false);
                  }
                  return result;
                },
                t('milestoneShared'),
              );
            }}
          >
            <p className="text-sm text-muted">{t('milestoneHelp')}</p>
            {open.length > 1 ? (
              <SelectField
                label={t('quote')}
                value={quoteId}
                onChange={(e) => setQuoteId(e.target.value)}
              >
                {open.map((q) => (
                  <option key={q.id} value={q.id}>
                    {t('quoteTitle', { version: q.version })}
                  </option>
                ))}
              </SelectField>
            ) : null}
            <TextField
              label={t('milestoneTitle')}
              value={title}
              maxLength={120}
              onChange={(e) => setTitle(e.target.value)}
            />
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold">{t('milestoneNotes')}</span>
              <textarea
                className={clsx(textareaClass(), 'min-h-24')}
                value={notes}
                maxLength={3000}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
            <Checkbox
              label={t('final')}
              checked={final}
              onChange={(e) => setFinal(e.target.checked)}
            />
            <NoticeArea notice={notice} />
            <Button
              type="submit"
              className="self-start"
              loading={busy === 'make'}
              disabled={title.trim().length < 3 || notes.trim().length < 3}
            >
              <Icon name="share" />
              {t('shareMilestone')}
            </Button>
          </form>
        </Card>
      ) : null}
      <Card title={t('milestones')}>
        {!deliveries.data ? (
          <Spinner />
        ) : deliveries.data.length === 0 ? (
          <p className="text-muted">{t('noMilestones')}</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {deliveries.data.map((d) => (
              <li key={d.id} className="flex flex-col gap-1.5 rounded-inner bg-raised p-4">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="text-muted">{d.reference}</span>
                  <span className="flex-1 font-bold">{isolate(d.title)}</span>
                  {d.final ? <Badge tone="brand">{t('finalBadge')}</Badge> : null}
                  <DeliveryStatusBadge status={d.status} />
                </p>
                <p className="text-sm text-muted">
                  {format.dateTime(new Date(d.submittedAt), { dateStyle: 'medium' })} ·{' '}
                  <code dir="ltr">{d.commit.slice(0, 7)}</code> ·{' '}
                  {t('files', { count: d.fileCount })}
                </p>
                {d.clientComment ? (
                  <blockquote className="border-s-4 border-brand ps-3 text-sm">
                    {d.clientComment}
                  </blockquote>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  {d.previewToken ? (
                    <a
                      href={previewUrl(d.previewToken, locale)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-bold text-brand-text hover:underline"
                    >
                      {t('openPreview')} <Icon name="external" />
                    </a>
                  ) : null}
                  {d.status === 'SUBMITTED' ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      loading={busy === d.id}
                      onClick={() =>
                        void run(
                          d.id,
                          () =>
                            api.POST('/v1/mentor/hub/deliveries/{deliveryId}/withdraw', {
                              params: { path: { deliveryId: d.id } },
                            }),
                          t('milestoneWithdrawn'),
                        ).then(async (ok) => {
                          if (ok) await deliveries.reload();
                        })
                      }
                    >
                      {t('withdrawMilestone')}
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

/** Messages with the client (and staff), shared by the lead's and the client's pages. */
export function MessagesCard({
  load,
  send,
}: {
  load: () => Promise<components['schemas']['HubCommentDto'][] | undefined>;
  send: (body: string) => Promise<{
    data?: components['schemas']['HubCommentDto'][];
    error?: unknown;
    response: Response;
  }>;
}) {
  const t = useTranslations('hub.messages');
  const format = useFormatter();
  const comments = useLoad(load, []);
  const [body, setBody] = useState('');
  const { busy, notice, run } = useAction();
  return (
    <Card title={t('title')}>
      {!comments.data ? (
        <Spinner />
      ) : comments.data.length === 0 ? (
        <p className="text-muted">{t('none')}</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {comments.data.map((c) => (
            <li
              key={c.id}
              className={clsx('rounded-row px-4 py-2.5', c.isMine ? 'bg-brand-100' : 'bg-raised')}
            >
              <p className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-bold">{c.isMine ? t('you') : isolate(c.authorName)}</span>
                <Badge>{t(`from.${c.from}`)}</Badge>
                <span className="text-muted">
                  {format.dateTime(new Date(c.createdAt), {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </span>
              </p>
              <p className="mt-1 whitespace-pre-line">{c.body}</p>
            </li>
          ))}
        </ol>
      )}
      <form
        className="mt-4 flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void run('send', async () => {
            const result = await send(body.trim());
            if (result.data) {
              comments.setData(result.data);
              setBody('');
            }
            return result;
          });
        }}
      >
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">{t('write')}</span>
          <textarea
            className={clsx(textareaClass(), 'min-h-20')}
            value={body}
            maxLength={3000}
            onChange={(e) => setBody(e.target.value)}
          />
        </label>
        <NoticeArea notice={notice} />
        <Button
          type="submit"
          size="sm"
          className="self-start"
          loading={busy === 'send'}
          disabled={!body.trim()}
        >
          <Icon name="send" />
          {t('send')}
        </Button>
      </form>
    </Card>
  );
}

function ClientTab({ project }: { project: Project }) {
  const t = useTranslations('hub.leadProject');
  const format = useFormatter();
  const changes = useLoad(
    async () =>
      (
        await api.GET('/v1/mentor/hub/projects/{id}/changes', {
          params: { path: { id: project.id } },
        })
      ).data,
    [project.id],
  );
  const changeQuotes = project.quotes.filter((q) => q.kind === 'CHANGE');
  const [deciding, setDeciding] = useState<
    Record<string, { decision: string; note: string; quoteId: string }>
  >({});
  const { busy, notice, run } = useAction();
  return (
    <div className="flex flex-col gap-4">
      <MessagesCard
        load={async () =>
          (
            await api.GET('/v1/mentor/hub/projects/{id}/comments', {
              params: { path: { id: project.id } },
            })
          ).data
        }
        send={(body) =>
          api.POST('/v1/mentor/hub/projects/{id}/comments', {
            params: { path: { id: project.id } },
            body: { body },
          })
        }
      />
      <Card title={t('changes')}>
        <p className="mb-3 text-sm text-muted">{t('changesHelp')}</p>
        <NoticeArea notice={notice} />
        {!changes.data ? (
          <Spinner />
        ) : changes.data.length === 0 ? (
          <p className="text-muted">{t('noChanges')}</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {changes.data.map((change) => {
              const form = deciding[change.id] ?? { decision: 'IN_SCOPE', note: '', quoteId: '' };
              const set = (patch: Partial<typeof form>) =>
                setDeciding((now) => ({ ...now, [change.id]: { ...form, ...patch } }));
              return (
                <li key={change.id} className="flex flex-col gap-2 rounded-inner bg-raised p-4">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="flex-1 whitespace-pre-line">{change.body}</span>
                    <Badge tone={change.status === 'OPEN' ? 'warning' : 'neutral'}>
                      {t(`changeStatus.${change.status}`)}
                    </Badge>
                  </p>
                  <p className="text-sm text-muted">
                    {format.dateTime(new Date(change.createdAt), { dateStyle: 'medium' })}
                  </p>
                  {change.note ? (
                    <p className="text-sm">{t('yourAnswer', { note: change.note })}</p>
                  ) : null}
                  {change.status === 'OPEN' ? (
                    <div className="flex flex-col gap-2 border-t border-line pt-2">
                      <SelectField
                        label={t('decision')}
                        value={form.decision}
                        onChange={(e) => set({ decision: e.target.value })}
                      >
                        {(['IN_SCOPE', 'QUOTED', 'DECLINED'] as const).map((d) => (
                          <option key={d} value={d}>
                            {t(`changeStatus.${d}`)}
                          </option>
                        ))}
                      </SelectField>
                      {form.decision === 'QUOTED' && changeQuotes.length ? (
                        <SelectField
                          label={t('changeQuote')}
                          value={form.quoteId}
                          onChange={(e) => set({ quoteId: e.target.value })}
                        >
                          <option value="">—</option>
                          {changeQuotes.map((q) => (
                            <option key={q.id} value={q.id}>
                              {t('quoteTitle', { version: q.version })}
                            </option>
                          ))}
                        </SelectField>
                      ) : null}
                      <TextField
                        label={t('answer')}
                        value={form.note}
                        maxLength={2000}
                        onChange={(e) => set({ note: e.target.value })}
                      />
                      <Button
                        size="sm"
                        className="self-start"
                        loading={busy === change.id}
                        disabled={form.note.trim().length < 3}
                        onClick={() =>
                          void run(
                            change.id,
                            () =>
                              api.POST('/v1/mentor/hub/changes/{changeId}/decide', {
                                params: { path: { changeId: change.id } },
                                body: {
                                  decision: form.decision as 'IN_SCOPE',
                                  note: form.note.trim(),
                                  ...(form.quoteId ? { quoteId: form.quoteId } : {}),
                                },
                              }),
                            t('answered'),
                          ).then(async (ok) => {
                            if (ok) await changes.reload();
                          })
                        }
                      >
                        {t('sendAnswer')}
                      </Button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

function CodeTab({ project }: { project: Project }) {
  const t = useTranslations('hub.leadProject');
  const format = useFormatter();
  const pulls = useLoad(
    async () =>
      (await api.GET('/v1/hub/projects/{id}/pulls', { params: { path: { id: project.id } } })).data,
    [project.id],
  );
  return (
    <Card title={t('pulls')}>
      <p className="mb-3 text-sm text-muted">{t('pullsHelp')}</p>
      {!pulls.data ? (
        pulls.failed ? (
          <p className="text-muted">{t('noRepo')}</p>
        ) : (
          <Spinner />
        )
      ) : pulls.data.length === 0 ? (
        <p className="text-muted">{t('noPulls')}</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {pulls.data.map((pull) => (
            <li key={pull.number}>
              <Link
                href={`/mentor/hub/projects/${project.id}/pulls/${pull.number}`}
                className="flex flex-wrap items-center gap-2 rounded-row bg-raised px-3 py-2 hover:bg-ink/5"
              >
                <PullStateBadge state={pull.state} />
                <span className="flex-1 font-semibold">{pull.title}</span>
                <span className="text-sm text-muted">
                  {isolate(pull.author.name)} ·{' '}
                  {format.dateTime(new Date(pull.updatedAt), { dateStyle: 'medium' })}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** A hub project for its lead developer: scope and quotes, the team, milestones, the client, the code. */
export function LeadProjectPage({ id }: { id: string }) {
  const t = useTranslations('hub.leadProject');
  const user = useAccount('MENTOR');
  const project = useLoad(
    async () => (await api.GET('/v1/mentor/hub/projects/{id}', { params: { path: { id } } })).data,
    [id, user?.id],
  );
  const [tab, setTab] = useState<Tab>('scope');
  if (!user || (!project.data && !project.failed)) return <PageSpinner />;
  if (!project.data) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <BackLink href="/mentor/hub">{t('back')}</BackLink>
        <Alert tone="error">{t('loadFailed')}</Alert>
      </div>
    );
  }
  const p = project.data;
  const onChange = (next: Project) => project.setData(next);
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
      <BackLink href="/mentor/hub">{t('back')}</BackLink>
      <header className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl">{isolate(p.title)}</h1>
          <span className="text-muted">{p.reference}</span>
          <ProjectStatusBadge status={p.status} />
        </div>
        <p className="text-muted">{t('client', { name: isolate(p.clientName) })}</p>
      </header>
      <div role="tablist" aria-label={t('sections')} className="flex flex-wrap gap-1.5">
        {TABS.map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={clsx(
              'min-h-10 rounded-full px-4 text-sm font-bold transition-colors',
              tab === key
                ? 'bg-brand-100 text-brand-800'
                : 'text-muted hover:bg-ink/7 hover:text-ink',
            )}
          >
            {t(`tabs.${key}`)}
          </button>
        ))}
      </div>
      <div role="tabpanel">
        {tab === 'scope' ? <ScopeTab project={p} onChange={onChange} /> : null}
        {tab === 'team' ? <TeamTab project={p} onChange={onChange} /> : null}
        {tab === 'milestones' ? <MilestonesTab project={p} /> : null}
        {tab === 'client' ? <ClientTab project={p} /> : null}
        {tab === 'code' ? <CodeTab project={p} /> : null}
      </div>
    </div>
  );
}
