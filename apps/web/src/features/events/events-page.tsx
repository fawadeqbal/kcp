'use client';

import type { components } from '@kcp/api-client-ts';
import { clsx } from 'clsx';
import { useFormatter, useTranslations } from 'next-intl';
import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { BackLink } from '@/components/back-link';
import {
  Alert,
  Avatar,
  Badge,
  type BadgeTone,
  Button,
  buttonClass,
  Card,
  Icon,
  PageSpinner,
  TextField,
  textareaClass,
} from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { api, errorCode } from '@/lib/api';
import { errorMessageKey } from '@/lib/errors';
import { useAccount } from '@/lib/use-account';
import { isolate } from '../auth/validation';
import { SocialTabs } from '../rooms/social-tabs';

type Summary = components['schemas']['EventSummaryDto'];
type Detail = components['schemas']['EventDetailDto'];
type Team = components['schemas']['EventTeamDto'];
type Pull = components['schemas']['PullSummaryDto'];

export const STATUS_TONES: Record<Summary['status'], BadgeTone> = {
  DRAFT: 'neutral',
  OPEN: 'brand',
  RUNNING: 'success',
  JUDGING: 'warning',
  FINISHED: 'neutral',
};

function useDates() {
  const format = useFormatter();
  return (start: string, end: string) =>
    format.dateTimeRange(new Date(start), new Date(end), { dateStyle: 'medium' });
}

/** Hackathons students can see: open ones to join, running ones, and results. */
export function EventsPage() {
  const t = useTranslations('events');
  const user = useAccount('STUDENT');
  const dates = useDates();
  const [events, setEvents] = useState<Summary[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!user) return;
    void api
      .GET('/v1/events')
      .then(({ data }) => (data ? setEvents(data) : setFailed(true)))
      .catch(() => setFailed(true));
  }, [user]);

  if (!user || (!events && !failed)) return <PageSpinner />;
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <header className="flex flex-col gap-4">
        <SocialTabs current="events" />
        <div>
          <h1 className="text-4xl">{t('title')}</h1>
          <p className="mt-1.5 text-lg text-muted">{t('subtitle')}</p>
        </div>
      </header>
      {!events ? (
        <Alert tone="error">{t('loadFailed')}</Alert>
      ) : events.length === 0 ? (
        <p className="rounded-card border-2 border-dashed border-line px-6 py-10 text-center text-muted">
          {t('none')}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {events.map((event) => (
            <li key={event.slug}>
              <Link
                href={`/learn/events/${event.slug}`}
                className="flex flex-wrap items-center gap-4 rounded-card bg-surface p-5 hover:bg-raised"
              >
                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-brand-100 text-xl text-brand-text">
                  <Icon name="trophy" />
                </span>
                <span className="flex min-w-48 flex-1 flex-col gap-1">
                  <span className="text-xl font-bold">{isolate(event.title)}</span>
                  <span className="text-sm text-muted">{dates(event.startsAt, event.endsAt)}</span>
                </span>
                {event.myTeam ? (
                  <Badge tone={event.myTeam.approved ? 'success' : 'warning'}>
                    {event.myTeam.approved
                      ? t('inTeam', { team: isolate(event.myTeam.name) })
                      : t('waitingParent')}
                  </Badge>
                ) : null}
                <Badge tone={STATUS_TONES[event.status]}>{t(`status.${event.status}`)}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** One event: joining (or the team), the work, handing in, and the results. */
export function EventPage({ slug }: { slug: string }) {
  const t = useTranslations('events');
  const te = useTranslations('errors');
  const user = useAccount('STUDENT');
  const dates = useDates();
  const format = useFormatter();
  const [event, setEvent] = useState<Detail | null>(null);
  const [failed, setFailed] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.GET('/v1/events/{slug}', { params: { path: { slug } } });
      if (data) setEvent(data);
      else setFailed(true);
    } catch {
      setFailed(true);
    }
  }, [slug]);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  const fail = (error: unknown) =>
    setNotice({ tone: 'error', text: te(errorMessageKey(errorCode(error))) });

  if (!user || (!event && !failed)) return <PageSpinner />;
  if (!event) return <Alert tone="error">{t('loadFailed')}</Alert>;
  const team = event.team;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <BackLink href="/learn/events">{t('back')}</BackLink>
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-4xl">{isolate(event.title)}</h1>
          <Badge tone={STATUS_TONES[event.status]}>{t(`status.${event.status}`)}</Badge>
        </div>
        <p className="text-muted">
          {dates(event.startsAt, event.endsAt)} ·{' '}
          {t('teamsOf', { size: event.teamSize, age: event.minAge })}
        </p>
        <p className="text-lg whitespace-pre-line">{event.description}</p>
        <p className="font-semibold">
          {t(`about.${event.status}`, {
            start: format.dateTime(new Date(event.startsAt), { dateStyle: 'medium' }),
            end: format.dateTime(new Date(event.endsAt), { dateStyle: 'medium' }),
          })}
        </p>
      </header>
      <div aria-live="polite">
        {notice ? (
          <Alert tone={notice.tone} live={false}>
            {notice.text}
          </Alert>
        ) : null}
      </div>

      {team ? (
        <TeamCard
          event={event}
          team={team}
          onLeft={async () => {
            setNotice({ tone: 'success', text: t('left') });
            await load();
          }}
          onError={fail}
        />
      ) : event.canJoin ? (
        <JoinForms slug={slug} onJoined={setEvent} onError={fail} />
      ) : event.status === 'OPEN' || event.status === 'RUNNING' ? (
        <Alert tone="info">{t('tooYoung', { age: event.minAge })}</Alert>
      ) : null}

      {team?.approved ? (
        <>
          <PullList event={event} team={team} />
          <SubmissionCard event={event} team={team} onSaved={load} onError={fail} />
        </>
      ) : null}

      {event.status === 'FINISHED' ? <Results event={event} /> : null}
    </div>
  );
}

function JoinForms({
  slug,
  onJoined,
  onError,
}: {
  slug: string;
  onJoined: (event: Detail) => void;
  onError: (error: unknown) => void;
}) {
  const t = useTranslations('events');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<'make' | 'join' | null>(null);

  async function make(event: FormEvent) {
    event.preventDefault();
    if (busy || name.trim().length < 3) return;
    setBusy('make');
    const { data, error } = await api
      .POST('/v1/events/{slug}/teams', { params: { path: { slug } }, body: { name } })
      .catch((e: unknown) => ({ data: undefined, error: e }));
    setBusy(null);
    if (data) onJoined(data);
    else onError(error);
  }

  async function join(event: FormEvent) {
    event.preventDefault();
    if (busy || code.trim().length < 4) return;
    setBusy('join');
    const { data, error } = await api
      .POST('/v1/events/{slug}/join', { params: { path: { slug } }, body: { code } })
      .catch((e: unknown) => ({ data: undefined, error: e }));
    setBusy(null);
    if (data) onJoined(data);
    else onError(error);
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <h2 className="text-xl">{t('makeTitle')}</h2>
        <p className="mt-1 text-sm text-muted">{t('makeHelp')}</p>
        <form onSubmit={make} className="mt-4 flex flex-col gap-3">
          <TextField
            label={t('teamName')}
            value={name}
            maxLength={30}
            autoComplete="off"
            onChange={(e) => setName(e.target.value)}
          />
          <Button type="submit" loading={busy === 'make'} className="self-start">
            <Icon name="plus" />
            {t('make')}
          </Button>
        </form>
      </Card>
      <Card>
        <h2 className="text-xl">{t('joinTitle')}</h2>
        <p className="mt-1 text-sm text-muted">{t('joinHelp')}</p>
        <form onSubmit={join} className="mt-4 flex flex-col gap-3">
          <TextField
            label={t('code')}
            value={code}
            maxLength={12}
            dir="ltr"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            className="font-latin tracking-widest"
            onChange={(e) => setCode(e.target.value)}
          />
          <Button type="submit" loading={busy === 'join'} className="self-start">
            <Icon name="userPlus" />
            {t('join')}
          </Button>
        </form>
      </Card>
    </div>
  );
}

function TeamCard({
  event,
  team,
  onLeft,
  onError,
}: {
  event: Detail;
  team: Team;
  onLeft: () => Promise<void>;
  onError: (error: unknown) => void;
}) {
  const t = useTranslations('events');
  const [copied, setCopied] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const canChange = event.status === 'OPEN' || event.status === 'RUNNING';

  async function leave() {
    setLeaving(true);
    const { error, response } = await api
      .POST('/v1/events/{slug}/leave', { params: { path: { slug: event.slug } } })
      .catch((e: unknown) => ({ error: e, response: null }));
    setLeaving(false);
    if (response?.ok) await onLeft();
    else onError(error);
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-2xl">{isolate(team.name)}</h2>
        {team.rank ? <Badge tone="brand">{t('rank', { rank: team.rank })}</Badge> : null}
      </div>
      {!team.approved ? (
        <div className="mt-3">
          <Alert tone="warning">{t('waitingParentLong')}</Alert>
        </div>
      ) : null}
      <ul className="mt-4 flex flex-wrap gap-3">
        {team.members.map((member) => (
          <li
            key={`${member.nickname}-${member.isMe}`}
            className="flex items-center gap-2.5 rounded-row bg-raised px-3 py-2"
          >
            <Avatar avatarKey={member.avatarKey} size="sm" />
            <span className="flex flex-col">
              <span className="font-bold">
                {member.isMe
                  ? t('you', { nickname: isolate(member.nickname) })
                  : isolate(member.nickname)}
              </span>
              <span className="text-xs text-muted">
                {[
                  member.isCaptain ? t('captain') : null,
                  member.status === 'PENDING' ? t('pending') : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </span>
          </li>
        ))}
      </ul>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        {team.joinCode && canChange && team.members.length < event.teamSize ? (
          <div>
            <dt className="text-sm text-muted">{t('shareCode')}</dt>
            <dd className="flex items-center gap-2">
              <span
                dir="ltr"
                className="font-latin text-2xl font-extrabold tracking-[0.15em] text-brand-text"
              >
                {team.joinCode}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  void navigator.clipboard
                    ?.writeText(team.joinCode ?? '')
                    .then(() => setCopied(true))
                    .catch(() => undefined)
                }
              >
                <Icon name={copied ? 'check' : 'copy'} />
                {copied ? t('copied') : t('copy')}
              </Button>
            </dd>
          </div>
        ) : null}
        <div>
          <dt className="text-sm text-muted">{t('mentor')}</dt>
          <dd className="font-semibold">
            {team.mentorName ? isolate(team.mentorName) : t('noMentor')}
          </dd>
        </div>
      </dl>
      <div className="mt-5 flex flex-wrap gap-2.5">
        {team.approved && event.gitEnabled ? (
          <Link
            href={`/learn/events/${event.slug}/workspace`}
            className={buttonClass('primary', 'md')}
          >
            <Icon name="code" />
            {t('workspace')}
          </Link>
        ) : null}
        {team.roomId ? (
          <Link
            href={`/learn/rooms?room=${team.roomId}`}
            className={buttonClass('secondary', 'md')}
          >
            <Icon name="msg" />
            {t('teamRoom')}
          </Link>
        ) : null}
        {canChange ? (
          <Button
            variant="ghost"
            loading={leaving}
            onClick={() => void leave()}
            className="ms-auto"
          >
            {t('leave')}
          </Button>
        ) : null}
      </div>
    </Card>
  );
}

function PullList({ event, team }: { event: Detail; team: Team }) {
  const t = useTranslations('events');
  const format = useFormatter();
  const [pulls, setPulls] = useState<Pull[] | null>(null);

  useEffect(() => {
    if (!event.gitEnabled) return;
    void api
      .GET('/v1/teams/{id}/pulls', { params: { path: { id: team.id } } })
      .then(({ data }) => setPulls(data ?? []))
      .catch(() => setPulls([]));
  }, [event.gitEnabled, team.id]);

  if (!event.gitEnabled || !pulls) return null;
  return (
    <section aria-labelledby="pulls-heading" className="flex flex-col gap-3">
      <h2 id="pulls-heading" className="text-2xl">
        {t('pullsTitle')}
      </h2>
      {pulls.length === 0 ? (
        <p className="text-muted">{t('noPulls')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {pulls.map((pull) => (
            <li key={pull.number}>
              <Link
                href={`/learn/events/${event.slug}/pulls/${pull.number}`}
                className="flex flex-wrap items-center gap-3 rounded-row bg-surface px-4 py-3 hover:bg-raised"
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
    </section>
  );
}

export function PullStateBadge({ state }: { state: Pull['state'] }) {
  const t = useTranslations('events');
  return (
    <Badge tone={state === 'merged' ? 'success' : state === 'open' ? 'brand' : 'neutral'}>
      {t(`pullState.${state}`)}
    </Badge>
  );
}

function SubmissionCard({
  event,
  team,
  onSaved,
  onError,
}: {
  event: Detail;
  team: Team;
  onSaved: () => Promise<void>;
  onError: (error: unknown) => void;
}) {
  const t = useTranslations('events');
  const format = useFormatter();
  const [title, setTitle] = useState(team.submission?.title ?? '');
  const [description, setDescription] = useState(team.submission?.description ?? '');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const open = event.status === 'RUNNING';

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setSaved(false);
    const { data, error } = await api
      .PUT('/v1/teams/{id}/submission', {
        params: { path: { id: team.id } },
        body: { title, description },
      })
      .catch((err: unknown) => ({ data: undefined, error: err }));
    setBusy(false);
    if (data) {
      setSaved(true);
      await onSaved();
    } else onError(error);
  }

  if (!open && !team.submission) return null;
  return (
    <Card>
      <h2 className="text-2xl">{t('submitTitle')}</h2>
      {team.submission ? (
        <p className="mt-1 text-sm text-muted">
          {t('submittedAt', {
            date: format.dateTime(new Date(team.submission.submittedAt), {
              dateStyle: 'medium',
              timeStyle: 'short',
            }),
          })}
        </p>
      ) : (
        <p className="mt-1 text-sm text-muted">{t('submitHelp')}</p>
      )}
      {open ? (
        <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
          <TextField
            label={t('projectTitle')}
            value={title}
            maxLength={80}
            onChange={(e) => setTitle(e.target.value)}
          />
          <label className="flex flex-col gap-1.5">
            <span className="font-bold">{t('projectDescription')}</span>
            <textarea
              className={clsx(textareaClass(), 'min-h-28')}
              value={description}
              maxLength={1000}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" loading={busy}>
              <Icon name="send" />
              {team.submission ? t('resubmit') : t('submit')}
            </Button>
            <span aria-live="polite" className="text-sm font-semibold text-sage-text">
              {saved ? t('submitted') : ''}
            </span>
          </div>
        </form>
      ) : team.submission ? (
        <div className="mt-3">
          <p className="font-bold">{team.submission.title}</p>
          <p className="whitespace-pre-line">{team.submission.description}</p>
        </div>
      ) : null}
    </Card>
  );
}

function Results({ event }: { event: Detail }) {
  const t = useTranslations('events');
  return (
    <section aria-labelledby="results-heading" className="flex flex-col gap-3">
      <h2 id="results-heading" className="text-2xl">
        {t('resultsTitle')}
      </h2>
      {event.results.length === 0 ? (
        <p className="text-muted">{t('noResults')}</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {event.results.map((result) => (
            <li
              key={result.team}
              className="flex flex-wrap items-center gap-4 rounded-row bg-surface px-4 py-3"
            >
              <span className="grid size-10 place-items-center rounded-full bg-brand-100 font-extrabold text-brand-text">
                {result.rank}
              </span>
              <span className="flex-1 font-bold">{isolate(result.team)}</span>
              <span className="flex flex-wrap items-center gap-2">
                {result.members.map((member) => (
                  <span key={member.nickname} className="flex items-center gap-1.5 text-sm">
                    <Avatar avatarKey={member.avatarKey} size="sm" />
                    {isolate(member.nickname)}
                  </span>
                ))}
              </span>
              <span className="text-sm text-muted">{t('points', { score: result.score })}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
