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
  Button,
  buttonClass,
  Card,
  EmptyState,
  Icon,
  PageSpinner,
  SelectField,
  textareaClass,
} from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { api, errorCode } from '@/lib/api';
import { errorMessageKey } from '@/lib/errors';
import { useAccount } from '@/lib/use-account';
import { isolate } from '../auth/validation';
import { ProjectPreview } from '../portfolio/project-preview';
import { PullRequestView } from './pull-page';
import { PullStateBadge, STATUS_TONES } from './events-page';
import { pageFiles } from './team-git';

type MentorEvents = components['schemas']['MentorEventsDto'];
type Pull = components['schemas']['PullSummaryDto'];
type Judging = components['schemas']['JudgingDto'];
type JudgingTeam = components['schemas']['JudgingTeamDto'];

/** A team's page as its mentor sees it: members, pull requests, and the site on main. */
export function TeamFilesPreview({
  teamId,
  which,
  title,
}: {
  teamId: string;
  which: 'main' | 'submission';
  title: string;
}) {
  const t = useTranslations('mentorEvents');
  const [files, setFiles] = useState<Record<string, string> | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    void api
      .GET('/v1/teams/{id}/files', { params: { path: { id: teamId }, query: { ref: which } } })
      .then(({ data }) => (data ? setFiles(data.files) : setFailed(true)))
      .catch(() => setFailed(true));
  }, [teamId, which]);
  if (failed) return <p className="text-muted">{t('noPreview')}</p>;
  if (!files) return <PageSpinner />;
  return <ProjectPreview files={pageFiles(files)} title={title} />;
}

/** Mentors: the teams they mentor and the events they judge. */
export function MentorEventsPage() {
  const t = useTranslations('mentorEvents');
  const te = useTranslations('events');
  const user = useAccount('MENTOR');
  const [data, setData] = useState<MentorEvents | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!user) return;
    void api
      .GET('/v1/mentor/events')
      .then(({ data: result }) => (result ? setData(result) : setFailed(true)))
      .catch(() => setFailed(true));
  }, [user]);

  if (!user || (!data && !failed)) return <PageSpinner />;
  if (!data) return <Alert tone="error">{t('loadFailed')}</Alert>;
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-7">
      <header>
        <h1 className="text-4xl">{t('title')}</h1>
        <p className="mt-2 text-muted">{t('intro')}</p>
      </header>
      <section aria-labelledby="teams-heading" className="flex flex-col gap-3">
        <h2 id="teams-heading" className="text-2xl">
          {t('teamsTitle')}
        </h2>
        {data.teams.length === 0 ? (
          <EmptyState icon="users" title={t('noTeams')} />
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {data.teams.map((team) => (
              <li key={team.id}>
                <Link
                  href={`/mentor/teams/${team.id}`}
                  className="flex flex-col gap-2 rounded-card bg-surface p-5 hover:bg-raised"
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-xl font-bold">{isolate(team.name)}</span>
                    <Badge tone={STATUS_TONES[team.event.status]}>
                      {te(`status.${team.event.status}`)}
                    </Badge>
                  </span>
                  <span className="text-sm text-muted">{isolate(team.event.title)}</span>
                  <span className="flex flex-wrap gap-2">
                    {team.members.map((m) => (
                      <span key={m.nickname} className="flex items-center gap-1.5 text-sm">
                        <Avatar avatarKey={m.avatarKey} size="sm" />
                        {isolate(m.nickname)}
                      </span>
                    ))}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      {data.judging.length ? (
        <section aria-labelledby="judging-heading" className="flex flex-col gap-3">
          <h2 id="judging-heading" className="text-2xl">
            {t('judgingTitle')}
          </h2>
          <ul className="flex flex-col gap-2">
            {data.judging.map((event) => (
              <li
                key={event.slug}
                className="flex flex-wrap items-center gap-3 rounded-row bg-surface px-4 py-3"
              >
                <span className="flex-1 font-bold">{isolate(event.title)}</span>
                <Badge tone={STATUS_TONES[event.status]}>{te(`status.${event.status}`)}</Badge>
                {event.status === 'JUDGING' || event.status === 'FINISHED' ? (
                  <Link
                    href={`/mentor/judging/${event.slug}`}
                    className={buttonClass('secondary', 'sm')}
                  >
                    {t('judge')}
                  </Link>
                ) : (
                  <span className="text-sm text-muted">{t('judgingLater')}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

/** One team, for its mentor: pull requests to review, the room, and the site on main. */
export function MentorTeamPage({ teamId }: { teamId: string }) {
  const t = useTranslations('mentorEvents');
  const user = useAccount('MENTOR');
  const format = useFormatter();
  const [data, setData] = useState<MentorEvents | null>(null);
  const [pulls, setPulls] = useState<Pull[] | null>(null);

  useEffect(() => {
    if (!user) return;
    void api.GET('/v1/mentor/events').then(({ data: result }) => setData(result ?? null));
    void api
      .GET('/v1/teams/{id}/pulls', { params: { path: { id: teamId } } })
      .then(({ data: result }) => setPulls(result ?? []))
      .catch(() => setPulls([]));
  }, [user, teamId]);

  const team = data?.teams.find((candidate) => candidate.id === teamId);
  if (!user || !data || !pulls) return <PageSpinner />;
  if (!team) return <Alert tone="error">{t('loadFailed')}</Alert>;
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <BackLink href="/mentor/events">{t('back')}</BackLink>
      <header className="flex flex-col gap-2">
        <h1 className="text-4xl">{isolate(team.name)}</h1>
        <p className="text-muted">{isolate(team.event.title)}</p>
        <span className="flex flex-wrap gap-3">
          {team.members.map((m) => (
            <span key={m.nickname} className="flex items-center gap-1.5">
              <Avatar avatarKey={m.avatarKey} size="sm" />
              {isolate(m.nickname)}
            </span>
          ))}
        </span>
        {team.roomId ? (
          <Link
            href={`/mentor/rooms?room=${team.roomId}`}
            className={clsx(buttonClass('secondary', 'md'), 'self-start')}
          >
            <Icon name="msg" />
            {t('room')}
          </Link>
        ) : null}
      </header>
      <section aria-labelledby="mentor-pulls" className="flex flex-col gap-3">
        <h2 id="mentor-pulls" className="text-2xl">
          {t('pullsTitle')}
        </h2>
        {pulls.length === 0 ? <p className="text-muted">{t('noPulls')}</p> : null}
        <ul className="flex flex-col gap-2">
          {pulls.map((pull) => (
            <li key={pull.number}>
              <Link
                href={`/mentor/teams/${teamId}/pulls/${pull.number}`}
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
      </section>
      {team.hasRepo ? (
        <section aria-labelledby="mentor-preview" className="flex flex-col gap-3">
          <h2 id="mentor-preview" className="text-2xl">
            {t('mainTitle')}
          </h2>
          <TeamFilesPreview
            teamId={teamId}
            which="main"
            title={t('previewOf', { team: team.name })}
          />
        </section>
      ) : null}
    </div>
  );
}

export function MentorPullPage({ teamId, number }: { teamId: string; number: number }) {
  const t = useTranslations('mentorEvents');
  const user = useAccount('MENTOR');
  if (!user) return <PageSpinner />;
  return (
    <PullRequestView
      teamId={teamId}
      number={number}
      backHref={`/mentor/teams/${teamId}`}
      backLabel={t('backToTeam')}
    />
  );
}

/** Judging an event: each team's work, and scores on the event's criteria. */
export function JudgingPage({ slug }: { slug: string }) {
  const t = useTranslations('mentorEvents');
  const user = useAccount('MENTOR');
  const [data, setData] = useState<Judging | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    const { data: result } = await api
      .GET('/v1/mentor/judging/{slug}', { params: { path: { slug } } })
      .catch(() => ({ data: undefined }));
    if (result) setData(result);
    else setFailed(true);
  }, [slug]);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  if (!user || (!data && !failed)) return <PageSpinner />;
  if (!data) return <Alert tone="error">{t('loadFailed')}</Alert>;
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <BackLink href="/mentor/events">{t('back')}</BackLink>
      <header>
        <h1 className="text-4xl">{t('judgingOf', { event: isolate(data.title) })}</h1>
        <p className="mt-2 text-muted">
          {data.status === 'JUDGING' ? t('judgingIntro') : t('judgingClosed')}
        </p>
      </header>
      {data.teams.length === 0 ? <EmptyState icon="trophy" title={t('noSubmissions')} /> : null}
      {data.teams.map((team) => (
        <ScoreCard key={team.id} team={team} judging={data} onSaved={load} />
      ))}
    </div>
  );
}

function ScoreCard({
  team,
  judging,
  onSaved,
}: {
  team: JudgingTeam;
  judging: Judging;
  onSaved: () => Promise<void>;
}) {
  const t = useTranslations('mentorEvents');
  const te = useTranslations('errors');
  const [scores, setScores] = useState<Record<string, number>>(
    () => team.myScores ?? Object.fromEntries(judging.rubric.map((item) => [item.key, 0])),
  );
  const [comment, setComment] = useState(team.myComment ?? '');
  const [showPreview, setShowPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const open = judging.status === 'JUDGING';
  const total = Object.values(scores).reduce((a, b) => a + b, 0);

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    const { error, response } = await api
      .PUT('/v1/mentor/judging/teams/{id}/score', {
        params: { path: { id: team.id } },
        body: { scores, ...(comment.trim() ? { comment: comment.trim() } : {}) },
      })
      .catch((e: unknown) => ({ error: e, response: null }));
    setBusy(false);
    if (response?.ok) {
      setNotice({ tone: 'success', text: t('saved') });
      await onSaved();
    } else setNotice({ tone: 'error', text: te(errorMessageKey(errorCode(error))) });
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-2xl">{isolate(team.name)}</h2>
        {team.myScores ? <Badge tone="success">{t('scored')}</Badge> : null}
      </div>
      <p className="mt-1 flex flex-wrap gap-3 text-sm text-muted">
        {team.members.map((m) => (
          <span key={m.nickname}>{isolate(m.nickname)}</span>
        ))}
      </p>
      {team.submission ? (
        <div className="mt-3">
          <p className="font-bold">{team.submission.title}</p>
          <p className="whitespace-pre-line">{team.submission.description}</p>
        </div>
      ) : null}
      <div className="mt-3">
        {showPreview ? (
          <TeamFilesPreview
            teamId={team.id}
            which="submission"
            title={t('previewOf', { team: team.name })}
          />
        ) : (
          <Button variant="secondary" onClick={() => setShowPreview(true)}>
            <Icon name="eye" />
            {t('showProject')}
          </Button>
        )}
      </div>
      <form onSubmit={save} className="mt-4 flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {judging.rubric.map((item) => (
            <SelectField
              key={item.key}
              label={t('criterion', { name: item.label, max: item.max })}
              value={String(scores[item.key] ?? 0)}
              disabled={!open}
              onChange={(e) => setScores((now) => ({ ...now, [item.key]: Number(e.target.value) }))}
            >
              {Array.from({ length: item.max + 1 }, (_, value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </SelectField>
          ))}
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="font-bold">{t('commentLabel')}</span>
          <textarea
            className={clsx(textareaClass(), 'min-h-20')}
            value={comment}
            maxLength={1000}
            disabled={!open}
            onChange={(e) => setComment(e.target.value)}
          />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-bold">{t('total', { total })}</span>
          {open ? (
            <Button type="submit" loading={busy}>
              {t('saveScore')}
            </Button>
          ) : null}
          <span aria-live="polite">
            {notice ? (
              <span className={notice.tone === 'error' ? 'text-danger-text' : 'text-sage-text'}>
                {notice.text}
              </span>
            ) : null}
          </span>
        </div>
      </form>
    </Card>
  );
}
