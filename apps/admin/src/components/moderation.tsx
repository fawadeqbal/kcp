'use client';

import type { components } from '@kcp/api-client-ts';
import { CHAT_MUTE_HOURS } from '@kcp/shared';
import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Dialog,
  PageSpinner,
  SelectField,
  TextField,
} from '@kcp/ui';
import { clsx } from 'clsx';
import Link from 'next/link';
import { type FormEvent, useState } from 'react';
import { useAction } from '@/lib/action';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatDateTime, humanize } from '@/lib/format';
import { useLoad } from '@/lib/hooks';
import { PageHeader } from './shell';

type Report = components['schemas']['ModerationReportDto'];
type Message = components['schemas']['ChatMessageDto'];
type ActionKind = components['schemas']['ModerationActDto']['kind'];
type Term = components['schemas']['BlockedTermDto'];

/** Phrases as the students' apps show them (English). */
const PHRASES: Record<string, string> = {
  hello: 'Hello!',
  thanks: 'Thank you!',
  'great-job': 'Great job!',
  'lets-go': 'Let’s go!',
  'i-need-help': 'I need help',
  'can-you-check': 'Can you check my part?',
  'i-have-an-idea': 'I have an idea!',
  'my-part-is-done': 'My part is done',
  'good-idea': 'Good idea!',
  'give-me-a-minute': 'Give me a minute',
  yes: 'Yes',
  no: 'No',
  'see-you': 'See you!',
};

const REASONS: Record<Report['reason'], string> = {
  UNKIND: 'Unkind or rude',
  PERSONAL_INFO: 'Personal information',
  SPAM: 'Spam',
  SCARY: 'Scary or worrying',
  OTHER: 'Something else',
};

const ACTIONS: Record<ActionKind, { label: string; help: string }> = {
  WARN: {
    label: 'Warn',
    help: 'The student gets a reminder of the room rules; their parents are told.',
  },
  MUTE: {
    label: 'Mute',
    help: 'The student can read rooms but not send, for the time you pick; their parents are told.',
  },
  SUSPEND: {
    label: 'Suspend the account',
    help: 'Signs the student out everywhere until an admin reactivates the account.',
  },
  HIDE: { label: 'Remove the message', help: 'Everyone sees “A moderator removed this message”.' },
  DISMISS: { label: 'Dismiss', help: 'Nothing wrong: the report is closed.' },
};

const ACTION_TONES: Record<ActionKind, 'warning' | 'danger' | 'neutral' | 'brand'> = {
  WARN: 'warning',
  MUTE: 'warning',
  SUSPEND: 'danger',
  HIDE: 'brand',
  DISMISS: 'neutral',
};

export const messageText = (message: Message) =>
  message.hidden
    ? 'Removed by a moderator'
    : message.kind === 'PHRASE'
      ? `${PHRASES[message.phraseKey ?? ''] ?? message.phraseKey} (phrase)`
      : (message.text ?? '');

/** The reports queue: each report with the messages around it, and what to do. */
export function ModerationQueue() {
  const { state } = useAuth();
  const ability = state.status === 'authenticated' ? state.ability : null;
  const [status, setStatus] = useState<'OPEN' | 'RESOLVED'>('OPEN');
  const [notice, setNotice] = useState<string | null>(null);
  const [acting, setActing] = useState<Report | null>(null);
  const queue = useLoad(
    () => api.GET('/v1/admin/moderation/reports', { params: { query: { status } } }),
    status,
  );
  if (!ability?.can('read', 'Moderation')) return null;
  const canAct = ability.can('update', 'Moderation');

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Room moderation"
        description="Reports from team, class and event rooms. Read the messages around each one, then warn, mute, suspend, remove the message, or dismiss. Every action is kept in the audit log."
        actions={
          ability.can('read', 'BlockedTerm') ? (
            <Link
              href="/moderation/words"
              className="font-semibold text-brand-text hover:underline"
            >
              Blocked words
            </Link>
          ) : null
        }
      />
      <div className="max-w-60">
        <SelectField
          label="Show"
          value={status}
          onChange={(e) => setStatus(e.target.value as 'OPEN' | 'RESOLVED')}
        >
          <option value="OPEN">Open reports{queue.data ? ` (${queue.data.open})` : ''}</option>
          <option value="RESOLVED">Dealt with</option>
        </SelectField>
      </div>
      {notice ? <Alert tone="success">{notice}</Alert> : null}
      {queue.error ? <Alert tone="error">{queue.error}</Alert> : null}
      {!queue.data && !queue.error ? <PageSpinner label="Loading" /> : null}
      {queue.data && queue.data.reports.length === 0 ? (
        <p className="text-muted">
          {status === 'OPEN' ? 'No open reports.' : 'Nothing dealt with yet.'}
        </p>
      ) : null}
      <ul className="flex flex-col gap-4">
        {queue.data?.reports.map((report) => (
          <li key={report.id}>
            <ReportCard
              report={report}
              onAct={canAct && report.status === 'OPEN' ? () => setActing(report) : undefined}
            />
          </li>
        ))}
      </ul>
      {acting ? (
        <ActDialog
          report={acting}
          canSuspend={ability.can('update', 'User')}
          onClose={() => setActing(null)}
          onDone={(message) => {
            setActing(null);
            setNotice(message);
            queue.reload();
          }}
        />
      ) : null}
    </div>
  );
}

function ReportCard({ report, onAct }: { report: Report; onAct?: () => void }) {
  const subject = report.subject;
  return (
    <Card
      title={
        <span className="flex flex-wrap items-center gap-2">
          {REASONS[report.reason]}
          <Badge tone={report.status === 'OPEN' ? 'warning' : 'success'}>
            {report.status === 'OPEN' ? 'Open' : 'Dealt with'}
          </Badge>
        </span>
      }
    >
      <div className="flex flex-col gap-4">
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">About</dt>
            <dd className="flex flex-wrap items-center gap-2 font-semibold">
              <Link href={`/users/${subject.id}`} className="hover:underline">
                <bdi>{subject.name}</bdi>
              </Link>
              {subject.username ? (
                <span className="font-normal text-muted">
                  (<bdi>{subject.username}</bdi>)
                </span>
              ) : null}
              {subject.isAdult ? <Badge tone="brand">Adult</Badge> : null}
              {subject.status !== 'ACTIVE' ? (
                <Badge tone="danger">{humanize(subject.status)}</Badge>
              ) : null}
              {subject.mutedUntil ? (
                <Badge tone="warning">Muted until {formatDateTime(subject.mutedUntil)}</Badge>
              ) : null}
            </dd>
            <dd className="text-muted">
              {subject.openReports} open report{subject.openReports === 1 ? '' : 's'} ·{' '}
              {subject.pastActions} past action{subject.pastActions === 1 ? '' : 's'}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Reported by</dt>
            <dd className="font-semibold">
              <Link href={`/users/${report.reporter.id}`} className="hover:underline">
                <bdi>{report.reporter.name}</bdi>
              </Link>{' '}
              <span className="font-normal text-muted">{formatDateTime(report.createdAt)}</span>
            </dd>
            {report.room ? (
              <dd className="text-muted">
                In <bdi>{report.room.name}</bdi> ({humanize(report.room.kind)})
              </dd>
            ) : null}
          </div>
        </dl>
        {report.snapshot ? (
          <div>
            <p className="text-sm text-muted">The message when it was reported</p>
            <blockquote
              dir="auto"
              className="mt-1 rounded-row bg-brand-100 px-3.5 py-2 font-semibold"
            >
              {report.snapshot}
            </blockquote>
          </div>
        ) : (
          <p className="text-sm text-muted">A report about the member, not one message.</p>
        )}
        {report.context.length ? (
          <div>
            <p className="text-sm text-muted">
              {report.message ? 'Messages around it' : 'Their latest messages in the room'}
            </p>
            <ol className="mt-1 flex flex-col gap-1 text-sm">
              {report.context.map((message) => (
                <li
                  key={message.id}
                  className={clsx(
                    'flex flex-wrap gap-x-2 rounded-row px-3 py-1.5',
                    message.id === report.message?.id ? 'bg-brand-100' : 'bg-canvas',
                  )}
                >
                  <span className="text-muted">{formatDateTime(message.createdAt)}</span>
                  <bdi className="font-semibold">{message.author.name}</bdi>
                  <span dir="auto" className={clsx(message.hidden && 'text-muted italic')}>
                    {messageText(message)}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
        {report.actions.length ? (
          <ul className="flex flex-col gap-1 text-sm">
            {report.actions.map((action) => (
              <li key={action.id} className="flex flex-wrap items-center gap-2">
                <Badge tone={ACTION_TONES[action.kind]}>{ACTIONS[action.kind].label}</Badge>
                <span>{action.reason}</span>
                <span className="text-muted">
                  by <bdi>{action.staffName}</bdi>, {formatDateTime(action.createdAt)}
                  {action.until ? ` · until ${formatDateTime(action.until)}` : ''}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        {onAct ? (
          <div>
            <Button onClick={onAct}>Deal with this report</Button>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

function ActDialog({
  report,
  canSuspend,
  onClose,
  onDone,
}: {
  report: Report;
  canSuspend: boolean;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const isStudent = !report.subject.isAdult;
  const kinds = (Object.keys(ACTIONS) as ActionKind[]).filter(
    (kind) =>
      (kind !== 'HIDE' || report.message) &&
      (kind !== 'MUTE' || isStudent) &&
      (kind !== 'SUSPEND' || (isStudent && canSuspend)),
  );
  const [kind, setKind] = useState<ActionKind>(kinds[0] ?? 'DISMISS');
  const [hours, setHours] = useState<(typeof CHAT_MUTE_HOURS)[number]>(24);
  const [hide, setHide] = useState(Boolean(report.message && !report.message.hidden));
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | undefined>();
  const action = useAction();
  const canHideToo = kind !== 'HIDE' && kind !== 'DISMISS' && Boolean(report.message);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (reason.trim().length < 3) {
      setError('Write a short reason (kept in the audit log, never shown to the student).');
      return;
    }
    setError(undefined);
    const ok = await action.run(() =>
      api.POST('/v1/admin/moderation/reports/{id}/actions', {
        params: { path: { id: report.id } },
        body: {
          kind,
          reason: reason.trim(),
          ...(kind === 'MUTE' ? { hours } : {}),
          ...(canHideToo ? { hideMessage: hide } : {}),
        },
      }),
    );
    if (ok) onDone(`Done: ${ACTIONS[kind].label.toLowerCase()} (${report.subject.name}).`);
  }

  return (
    <Dialog open onClose={onClose} title={`Report about ${report.subject.name}`}>
      <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 font-semibold">What to do</legend>
          {kinds.map((value) => (
            <label key={value} className="flex items-start gap-2.5">
              <input
                type="radio"
                name="moderation-action"
                value={value}
                checked={kind === value}
                onChange={() => setKind(value)}
                className="mt-1 size-4.5 accent-brand"
              />
              <span>
                <span className="font-semibold">{ACTIONS[value].label}</span>
                <span className="block text-sm text-muted">{ACTIONS[value].help}</span>
              </span>
            </label>
          ))}
        </fieldset>
        {kind === 'MUTE' ? (
          <SelectField
            label="How long"
            value={String(hours)}
            onChange={(e) => setHours(Number(e.target.value) as (typeof CHAT_MUTE_HOURS)[number])}
          >
            {CHAT_MUTE_HOURS.map((value) => (
              <option key={value} value={value}>
                {value < 24 ? `${value} hour` : value === 24 ? '1 day' : `${value / 24} days`}
              </option>
            ))}
          </SelectField>
        ) : null}
        {canHideToo ? (
          <Checkbox
            label="Also remove the message"
            checked={hide}
            onChange={(e) => setHide(e.target.checked)}
          />
        ) : null}
        <TextField
          label="Reason"
          hint="Required. Kept in the audit log; never shown to the student."
          value={reason}
          maxLength={500}
          error={error}
          onChange={(e) => setReason(e.target.value)}
        />
        {action.error ? <Alert tone="error">{action.error}</Alert> : null}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            loading={action.busy}
            variant={kind === 'SUSPEND' ? 'danger' : 'primary'}
          >
            {ACTIONS[kind].label}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

/** Words the room filter refuses (on top of the built-in lists), and a place to try a text. */
export function BlockedWords() {
  const { state } = useAuth();
  const ability = state.status === 'authenticated' ? state.ability : null;
  const terms = useLoad(() => api.GET('/v1/admin/blocked-terms'), 'terms');
  const [term, setTerm] = useState('');
  const [language, setLanguage] = useState<Term['language']>('en');
  const [trial, setTrial] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [removing, setRemoving] = useState<Term | null>(null);
  const add = useAction();
  const check = useAction();
  const remove = useAction();
  if (!ability?.can('read', 'BlockedTerm')) return null;
  const canEdit = ability.can('create', 'BlockedTerm');

  async function onAdd(event: FormEvent) {
    event.preventDefault();
    if (term.trim().length < 2) return;
    const ok = await add.run(() =>
      api.POST('/v1/admin/blocked-terms', { body: { term: term.trim(), language } }),
    );
    if (ok) {
      setTerm('');
      terms.reload();
    }
  }

  async function onCheck(event: FormEvent) {
    event.preventDefault();
    if (!trial.trim()) return;
    setResult(null);
    const { data } = await api
      .POST('/v1/admin/blocked-terms/check', { body: { text: trial } })
      .catch(() => ({ data: undefined }));
    if (data) {
      setResult(
        data.problem
          ? `Refused: ${
              {
                LINK: 'a link',
                EMAIL: 'an email address',
                PHONE: 'a phone number',
                CONTACT: 'another app or a way to reach someone',
                WORDS: 'a blocked word',
              }[data.problem]
            }.`
          : 'This text would be sent.',
      );
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Blocked words"
        description="Typed messages in rooms (students 13 and older) pass a filter first: links, email addresses, phone numbers, other apps, and unkind words. The built-in lists cover English, Arabic, Urdu and Roman Urdu; add more here. Words match whole, after spelling tricks are undone (“b.a.d”, “baaad”, “b4d”)."
        actions={
          <Link href="/moderation" className="font-semibold text-brand-text hover:underline">
            Back to reports
          </Link>
        }
      />
      <Card title="Try a message">
        <form onSubmit={onCheck} className="flex flex-wrap items-end gap-3">
          <div className="min-w-60 flex-1">
            <TextField
              label="Text"
              value={trial}
              maxLength={300}
              dir="auto"
              onChange={(e) => setTrial(e.target.value)}
            />
          </div>
          <Button type="submit" variant="secondary" loading={check.busy}>
            Check
          </Button>
        </form>
        <div aria-live="polite">
          {result ? <p className="mt-3 font-semibold">{result}</p> : null}
        </div>
      </Card>
      {canEdit ? (
        <Card title="Add a word">
          <form onSubmit={onAdd} className="flex flex-wrap items-end gap-3">
            <div className="min-w-60 flex-1">
              <TextField
                label="Word or phrase"
                value={term}
                maxLength={60}
                dir="auto"
                onChange={(e) => setTerm(e.target.value)}
              />
            </div>
            <div className="w-44">
              <SelectField
                label="Language"
                value={language}
                onChange={(e) => setLanguage(e.target.value as Term['language'])}
              >
                <option value="en">English</option>
                <option value="ar">Arabic</option>
                <option value="ur">Urdu</option>
                <option value="roman-ur">Roman Urdu</option>
                <option value="any">Any (names, apps)</option>
              </SelectField>
            </div>
            <Button type="submit" loading={add.busy}>
              Add
            </Button>
          </form>
          {add.error ? (
            <div className="mt-3">
              <Alert tone="error">{add.error}</Alert>
            </div>
          ) : null}
        </Card>
      ) : null}
      <Card title={`Added by staff${terms.data ? ` (${terms.data.length})` : ''}`}>
        {terms.error ? <Alert tone="error">{terms.error}</Alert> : null}
        {!terms.data && !terms.error ? <PageSpinner label="Loading" /> : null}
        {terms.data?.length === 0 ? <p className="text-muted">None yet.</p> : null}
        <ul className="flex flex-col gap-2">
          {terms.data?.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center gap-3">
              <bdi className="font-semibold">{row.term}</bdi>
              <Badge tone="neutral">{row.language}</Badge>
              <span className="text-sm text-muted">{formatDateTime(row.createdAt)}</span>
              {canEdit ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="ms-auto"
                  onClick={() => setRemoving(row)}
                >
                  Remove
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      </Card>
      {removing ? (
        <Dialog open onClose={() => setRemoving(null)} title={`Remove “${removing.term}”?`}>
          <p className="text-muted">Messages with this word can be sent again.</p>
          {remove.error ? <Alert tone="error">{remove.error}</Alert> : null}
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setRemoving(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={remove.busy}
              onClick={async () => {
                const ok = await remove.run(() =>
                  api.DELETE('/v1/admin/blocked-terms/{id}', {
                    params: { path: { id: removing.id } },
                  }),
                );
                if (ok) {
                  setRemoving(null);
                  terms.reload();
                }
              }}
            >
              Remove
            </Button>
          </div>
        </Dialog>
      ) : null}
    </div>
  );
}

/** On a student's page: what moderators did, and ending a mute early. */
export function StudentModerationCard({
  userId,
  onDone,
}: {
  userId: string;
  onDone: (message: string) => void;
}) {
  const { state } = useAuth();
  const canAct = state.status === 'authenticated' && state.ability.can('update', 'Moderation');
  const history = useLoad(
    () => api.GET('/v1/admin/moderation/students/{id}', { params: { path: { id: userId } } }),
    userId,
  );
  const unmute = useAction();
  const data = history.data;
  return (
    <Card title="Rooms">
      {history.error ? (
        <p className="text-muted">{history.error}</p>
      ) : !data ? (
        <p className="text-muted">Loading…</p>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm">
            {data.openReports} open report{data.openReports === 1 ? '' : 's'}.{' '}
            {data.mutedUntil ? `Muted until ${formatDateTime(data.mutedUntil)}.` : 'Not muted.'}
          </p>
          {data.mutedUntil && canAct ? (
            <div>
              <Button
                variant="secondary"
                size="sm"
                loading={unmute.busy}
                onClick={async () => {
                  const ok = await unmute.run(() =>
                    api.POST('/v1/admin/moderation/students/{id}/unmute', {
                      params: { path: { id: userId } },
                    }),
                  );
                  if (ok) {
                    history.reload();
                    onDone('The mute ended.');
                  }
                }}
              >
                End the mute now
              </Button>
              {unmute.error ? <Alert tone="error">{unmute.error}</Alert> : null}
            </div>
          ) : null}
          {data.actions.length === 0 ? (
            <p className="text-muted">No moderation actions.</p>
          ) : (
            <ul className="flex flex-col gap-1.5 text-sm">
              {data.actions.map((action) => (
                <li key={action.id} className="flex flex-wrap items-center gap-2">
                  <Badge tone={ACTION_TONES[action.kind]}>{ACTIONS[action.kind].label}</Badge>
                  <span>{action.reason}</span>
                  <span className="text-muted">
                    <bdi>{action.staffName}</bdi>, {formatDateTime(action.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}
