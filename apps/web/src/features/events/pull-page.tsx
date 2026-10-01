'use client';

import type { components } from '@kcp/api-client-ts';
import { clsx } from 'clsx';
import { useFormatter, useTranslations } from 'next-intl';
import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { BackLink } from '@/components/back-link';
import { Alert, Badge, Button, Icon, PageSpinner, textareaClass } from '@/components/ui';
import { api, errorCode } from '@/lib/api';
import { errorMessageKey } from '@/lib/errors';
import { useAccount } from '@/lib/use-account';
import { isolate } from '../auth/validation';
import { PullStateBadge } from './events-page';

type Pull = components['schemas']['PullDetailDto'];
type Author = components['schemas']['PullAuthorDto'];

interface DiffFile {
  path: string;
  lines: { kind: 'add' | 'del' | 'ctx' | 'hunk'; text: string }[];
}

/** A unified diff, split into files and lines. */
export function parseDiff(diff: string): DiffFile[] {
  const files: DiffFile[] = [];
  let current: DiffFile | null = null;
  for (const line of diff.split('\n')) {
    if (line.startsWith('diff --git ')) {
      const match = / b\/(.+)$/.exec(line);
      current = { path: match?.[1] ?? line, lines: [] };
      files.push(current);
    } else if (
      !current ||
      /^(index |--- |\+\+\+ |new file|deleted file|similarity|rename )/.test(line)
    ) {
      continue;
    } else if (line.startsWith('@@')) {
      current.lines.push({ kind: 'hunk', text: line });
    } else if (line.startsWith('+')) {
      current.lines.push({ kind: 'add', text: line.slice(1) });
    } else if (line.startsWith('-')) {
      current.lines.push({ kind: 'del', text: line.slice(1) });
    } else if (line.startsWith(' ')) {
      current.lines.push({ kind: 'ctx', text: line.slice(1) });
    }
  }
  return files;
}

function DiffView({ diff }: { diff: string }) {
  const t = useTranslations('pulls');
  const files = parseDiff(diff);
  if (files.length === 0) return <p className="text-muted">{t('noChanges')}</p>;
  return (
    <div className="flex flex-col gap-4">
      {files.map((file) => (
        <figure key={file.path} className="overflow-hidden rounded-card border-2 border-line">
          <figcaption
            dir="ltr"
            className="font-latin bg-raised px-4 py-2 text-start text-sm font-bold"
          >
            {file.path}
          </figcaption>
          <pre
            dir="ltr"
            className="overflow-x-auto bg-code-bg py-2 text-start text-[13px] leading-relaxed"
          >
            {file.lines.map((line, index) => (
              <div
                key={index}
                className={clsx(
                  'px-4 whitespace-pre-wrap break-all',
                  line.kind === 'add' && 'bg-sage-100',
                  line.kind === 'del' && 'bg-brand-100',
                  line.kind === 'hunk' && 'text-muted',
                )}
              >
                <span aria-hidden="true" className="inline-block w-4 select-none text-muted">
                  {line.kind === 'add' ? '+' : line.kind === 'del' ? '−' : ' '}
                </span>
                <span className="sr-only">
                  {line.kind === 'add' ? t('added') : line.kind === 'del' ? t('removed') : ''}
                </span>
                {line.text}
              </div>
            ))}
          </pre>
        </figure>
      ))}
    </div>
  );
}

function AuthorName({ author }: { author: Author }) {
  const t = useTranslations('pulls');
  return (
    <span className="font-bold">
      {author.isMe ? t('you') : isolate(author.name)}
      {author.isAdult ? (
        <>
          {' '}
          <Badge tone="brand">{t('adult')}</Badge>
        </>
      ) : null}
    </span>
  );
}

/**
 * A pull request: what changed (line by line), the reviews and comments, and — for
 * the team and its mentor — commenting, approving or asking for changes, and merging
 * into main once someone other than its author approved.
 */
/** Whose pull request: a hackathon team's, or a hub project's (reviews carry a score). */
export type PullSource = { kind: 'team'; id: string } | { kind: 'hub'; id: string };

export function PullRequestView({
  source,
  number,
  backHref,
  backLabel,
}: {
  source: PullSource;
  number: number;
  backHref: string;
  backLabel: string;
}) {
  const hub = source.kind === 'hub';
  const id = source.id;
  const t = useTranslations('pulls');
  const te = useTranslations('errors');
  const format = useFormatter();
  const [pull, setPull] = useState<Pull | null>(null);
  const [failed, setFailed] = useState(false);
  const [comment, setComment] = useState('');
  const [score, setScore] = useState(4);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = hub
        ? await api.GET('/v1/hub/projects/{id}/pulls/{number}', {
            params: { path: { id, number } },
          })
        : await api.GET('/v1/teams/{id}/pulls/{number}', { params: { path: { id, number } } });
      if (data) setPull(data);
      else setFailed(true);
    } catch {
      setFailed(true);
    }
  }, [hub, id, number]);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(
    kind: string,
    call: () => Promise<{ error?: unknown; response: Response }>,
    done: string,
  ) {
    setBusy(kind);
    setNotice(null);
    try {
      const { error, response } = await call();
      if (response.ok) {
        setNotice({ tone: 'success', text: done });
        await load();
        return true;
      }
      const code = errorCode(error);
      setNotice({
        tone: 'error',
        text:
          code === 'TEXT_BLOCKED'
            ? t('blocked')
            : code === 'OWN_PULL'
              ? t('ownPull')
              : te(errorMessageKey(code)),
      });
    } catch {
      setNotice({ tone: 'error', text: te('network') });
    } finally {
      setBusy(null);
    }
    return false;
  }

  async function sendComment(event: FormEvent) {
    event.preventDefault();
    const body = comment.trim();
    if (!body) return;
    const ok = await run(
      'comment',
      () =>
        hub
          ? api.POST('/v1/hub/projects/{id}/pulls/{number}/comments', {
              params: { path: { id, number } },
              body: { body },
            })
          : api.POST('/v1/teams/{id}/pulls/{number}/comments', {
              params: { path: { id, number } },
              body: { body },
            }),
      t('commented'),
    );
    if (ok) setComment('');
  }

  const review = (event: 'APPROVED' | 'REQUEST_CHANGES') =>
    run(
      event,
      () =>
        hub
          ? api.POST('/v1/hub/projects/{id}/pulls/{number}/review', {
              params: { path: { id, number } },
              body: {
                decision: event === 'APPROVED' ? 'APPROVED' : 'CHANGES_REQUESTED',
                score,
                ...(comment.trim() ? { body: comment.trim() } : {}),
              },
            })
          : api.POST('/v1/teams/{id}/pulls/{number}/reviews', {
              params: { path: { id, number } },
              body: { event, ...(comment.trim() ? { body: comment.trim() } : {}) },
            }),
      event === 'APPROVED' ? t('approvedDone') : t('changesDone'),
    ).then((ok) => ok && setComment(''));

  if (!pull && !failed) return <PageSpinner />;
  if (!pull) return <Alert tone="error">{t('loadFailed')}</Alert>;

  const timeline = [
    ...pull.comments.map((c) => ({
      key: `c${c.id}`,
      at: c.createdAt,
      author: c.author,
      body: c.body,
      state: null,
    })),
    ...pull.reviews.map((r) => ({
      key: `r${r.id}`,
      at: r.submittedAt,
      author: r.author,
      body: r.body,
      state: r.state,
    })),
  ].toSorted((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5">
      <BackLink href={backHref}>{backLabel}</BackLink>
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl">
            {pull.title} <span className="text-muted">#{pull.number}</span>
          </h1>
          <PullStateBadge state={pull.state} />
        </div>
        <p className="text-muted">
          {t('byline', { name: pull.author.isMe ? t('you') : isolate(pull.author.name) })}{' '}
          <code dir="ltr" className="font-latin">
            {pull.branch} → main
          </code>
        </p>
        {pull.body ? <p className="whitespace-pre-line">{pull.body}</p> : null}
      </header>
      <div aria-live="polite">
        {notice ? (
          <Alert tone={notice.tone} live={false}>
            {notice.text}
          </Alert>
        ) : null}
      </div>

      {pull.state === 'open' ? (
        <div className="flex flex-wrap items-center gap-3 rounded-card bg-surface p-4">
          {pull.canMerge ? (
            <Button
              loading={busy === 'merge'}
              onClick={() =>
                void run(
                  'merge',
                  () =>
                    hub
                      ? api.POST('/v1/hub/projects/{id}/pulls/{number}/merge', {
                          params: { path: { id, number } },
                        })
                      : api.POST('/v1/teams/{id}/pulls/{number}/merge', {
                          params: { path: { id, number } },
                        }),
                  t('merged'),
                )
              }
            >
              <Icon name="check" />
              {t('merge')}
            </Button>
          ) : (
            <p className="font-semibold">
              {t(
                `${hub ? 'hubBlocked' : 'blockedReason'}.${pull.mergeBlocked ?? 'APPROVAL_NEEDED'}` as 'blockedReason.APPROVAL_NEEDED',
              )}
            </p>
          )}
        </div>
      ) : null}

      <section aria-labelledby="diff-heading" className="flex flex-col gap-3">
        <h2 id="diff-heading" className="text-2xl">
          {t('changes')}
        </h2>
        <DiffView diff={pull.diff} />
        {pull.diffTruncated ? <p className="text-sm text-muted">{t('truncated')}</p> : null}
      </section>

      <section aria-labelledby="talk-heading" className="flex flex-col gap-3">
        <h2 id="talk-heading" className="text-2xl">
          {t('conversation')}
        </h2>
        {timeline.length === 0 ? <p className="text-muted">{t('noComments')}</p> : null}
        <ol className="flex flex-col gap-2.5">
          {timeline.map((entry) => (
            <li key={entry.key} className="rounded-row bg-surface px-4 py-3">
              <p className="flex flex-wrap items-center gap-2 text-sm">
                <AuthorName author={entry.author} />
                {entry.state === 'APPROVED' ? (
                  <Badge tone="success">{t('approvedBadge')}</Badge>
                ) : null}
                {entry.state === 'REQUEST_CHANGES' ? (
                  <Badge tone="warning">{t('changesBadge')}</Badge>
                ) : null}
                <span className="text-muted">
                  {format.dateTime(new Date(entry.at), { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              </p>
              {entry.body ? <p className="mt-1 whitespace-pre-line">{entry.body}</p> : null}
            </li>
          ))}
        </ol>
        <form onSubmit={sendComment} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="font-bold">{t('commentLabel')}</span>
            <textarea
              className={clsx(textareaClass(), 'min-h-24')}
              value={comment}
              maxLength={1000}
              onChange={(e) => setComment(e.target.value)}
            />
          </label>
          <div className="flex flex-wrap gap-2.5">
            <Button
              type="submit"
              variant="secondary"
              loading={busy === 'comment'}
              disabled={!comment.trim()}
            >
              <Icon name="msg" />
              {t('comment')}
            </Button>
            {pull.canReview ? (
              <>
                {hub ? (
                  <label className="flex items-center gap-2">
                    <span className="font-bold">{t('score')}</span>
                    <select
                      className="rounded-full border-2 border-line bg-surface px-3 py-1.5"
                      value={score}
                      onChange={(e) => setScore(Number(e.target.value))}
                    >
                      {[5, 4, 3, 2, 1].map((value) => (
                        <option key={value} value={value}>
                          {t(`scores.${value}` as 'scores.5')}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                <Button
                  type="button"
                  loading={busy === 'APPROVED'}
                  onClick={() => void review('APPROVED')}
                >
                  <Icon name="check" />
                  {t('approve')}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  loading={busy === 'REQUEST_CHANGES'}
                  onClick={() => void review('REQUEST_CHANGES')}
                >
                  <Icon name="undo" />
                  {t('requestChanges')}
                </Button>
              </>
            ) : null}
          </div>
        </form>
      </section>
    </div>
  );
}

/** A student's view of a pull request in their team (from the event page). */
export function StudentPullPage({ slug, number }: { slug: string; number: number }) {
  const t = useTranslations('pulls');
  const user = useAccount('STUDENT');
  const [teamId, setTeamId] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!user) return;
    void api
      .GET('/v1/events/{slug}', { params: { path: { slug } } })
      .then(({ data }) => (data?.team?.approved ? setTeamId(data.team.id) : setFailed(true)))
      .catch(() => setFailed(true));
  }, [slug, user]);
  if (failed) return <Alert tone="error">{t('loadFailed')}</Alert>;
  if (!teamId) return <PageSpinner />;
  return (
    <PullRequestView
      source={{ kind: 'team', id: teamId }}
      number={number}
      backHref={`/learn/events/${slug}`}
      backLabel={t('back')}
    />
  );
}
