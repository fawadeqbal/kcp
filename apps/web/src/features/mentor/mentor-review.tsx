'use client';

import type { components } from '@kcp/api-client-ts';
import type { CodeFiles, StageLevel } from '@kcp/checks';
import { clsx } from 'clsx';
import { useFormatter, useTranslations } from 'next-intl';
import { type FormEvent, useCallback, useEffect, useId, useState } from 'react';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  buttonClass,
  Card,
  Icon,
  PageSpinner,
  textareaClass,
} from '@/components/ui';
import { Link, useRouter } from '@/i18n/navigation';
import { api, errorCode } from '@/lib/api';
import { errorMessageKey } from '@/lib/errors';
import { useAccount } from '@/lib/use-account';
import { Markdown } from '../learn/markdown';
import { ProjectPreview } from '../portfolio/project-preview';
import { CodeLines, type FileKey } from '../reviews/code-lines';
import { languageName } from './mentor-home';

type Review = components['schemas']['MentorReviewDto'];
type Criterion = 'works' | 'code' | 'design' | 'creativity' | 'independence';

/** One review in the mentor console: the brief, the code with line comments, the rubric. */
export function MentorReview({ id }: { id: string }) {
  const user = useAccount('MENTOR');
  const t = useTranslations();
  const format = useFormatter();
  const router = useRouter();
  const [review, setReview] = useState<Review | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [commenting, setCommenting] = useState<{ file: FileKey; line: number } | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [summary, setSummary] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error: apiError } = await api.GET('/v1/mentor/reviews/{id}', {
      params: { path: { id } },
    });
    if (data) {
      setReview(data);
      setScores(data.scores);
      setSummary((current) => current || data.summary || '');
    } else setError(t(`errors.${errorMessageKey(errorCode(apiError))}`));
  }, [id, t]);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  const run = async (call: () => Promise<{ error?: unknown; response: Response }>) => {
    setBusy(true);
    setError(null);
    const { error: apiError, response } = await call();
    setBusy(false);
    if (!response.ok) setError(t(`errors.${errorMessageKey(errorCode(apiError))}`));
    return response.ok;
  };

  if (!user || (!review && !error)) return <PageSpinner />;
  if (!review) return <Alert tone="error">{error}</Alert>;

  const editable = review.status === 'IN_REVIEW' && review.isMine;
  const path = { params: { path: { id } } };
  const decide = async (decision: 'APPROVED' | 'CHANGES_REQUESTED') => {
    if (
      await run(() =>
        api.POST('/v1/mentor/reviews/{id}/decision', {
          ...path,
          body: { decision, scores, summary: summary.trim() },
        }),
      )
    ) {
      router.push('/mentor');
    }
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <Link href="/mentor" className="self-start text-sm font-bold text-brand-text hover:underline">
        {t('mentor.back')}
      </Link>
      <header className="flex flex-wrap items-center gap-4">
        <Avatar avatarKey={review.avatarKey} size="md" />
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl">
            {t('mentor.reviewTitle', { title: review.brief?.title ?? '' })}
          </h1>
          <p className="text-muted">
            {t('mentor.byStudent', {
              nickname: review.nickname,
              version: String(review.version),
              date: format.dateTime(new Date(review.requestedAt), { dateStyle: 'medium' }),
            })}{' '}
            · {languageName(t, review.languageCode)}
          </p>
        </div>
        <Badge
          tone={
            review.status === 'APPROVED'
              ? 'success'
              : review.status === 'CHANGES_REQUESTED'
                ? 'warning'
                : 'brand'
          }
        >
          {t(`review.status.${review.status}`)}
        </Badge>
        {review.status === 'WAITING' ? (
          <Button
            loading={busy}
            onClick={() =>
              void run(() => api.POST('/v1/mentor/reviews/{id}/claim', path)).then((ok) => {
                if (ok) void load();
              })
            }
          >
            {t('mentor.take')}
          </Button>
        ) : null}
      </header>
      {error ? <Alert tone="error">{error}</Alert> : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {review.brief ? (
          <Card title={t('mentor.brief')}>
            <p className="font-semibold">{review.brief.summary}</p>
            <div className="mt-2 text-[0.95rem]">
              <Markdown>{review.brief.body}</Markdown>
            </div>
            {Object.keys(review.brief.checkLabels).length ? (
              <>
                <h3 className="mt-4 font-sans text-sm font-bold text-muted">
                  {t('mentor.requirements')}
                </h3>
                <ul className="mt-1 list-disc ps-6 text-sm">
                  {Object.values(review.brief.checkLabels).map((label) => (
                    <li key={label}>{label}</li>
                  ))}
                </ul>
              </>
            ) : null}
          </Card>
        ) : null}
        <Card title={t('mentor.running')}>
          <ProjectPreview
            files={review.files as CodeFiles}
            stage={review.stage as StageLevel | null}
            title={t('mentor.running')}
            className="h-96"
          />
        </Card>
      </div>

      <Card title={t('mentor.code')}>
        {editable ? <p className="mb-2 text-sm text-muted">{t('mentor.commentHelp')}</p> : null}
        <CodeLines
          files={review.files}
          comments={review.comments}
          onLine={editable ? (file, line) => setCommenting({ file, line }) : undefined}
          renderComment={(comment) =>
            editable && 'mine' in comment && comment.mine ? (
              <button
                type="button"
                className="mt-1 text-sm font-bold text-brand-text underline-offset-4 hover:underline"
                onClick={() =>
                  void run(() =>
                    api.DELETE('/v1/mentor/reviews/{id}/comments/{commentId}', {
                      params: { path: { id, commentId: comment.id } },
                    }),
                  ).then((ok) => {
                    if (ok) void load();
                  })
                }
              >
                {t('mentor.deleteComment')}
              </button>
            ) : null
          }
          lineAction={(file, line) =>
            commenting?.file === file && commenting.line === line ? (
              <CommentForm
                line={line}
                onCancel={() => setCommenting(null)}
                onSave={async (body) => {
                  const ok = await run(() =>
                    api.POST('/v1/mentor/reviews/{id}/comments', {
                      ...path,
                      body: { file, line, body },
                    }),
                  );
                  if (ok) {
                    setCommenting(null);
                    await load();
                  }
                }}
              />
            ) : null
          }
        />
      </Card>

      <Card title={t('mentor.rubric')}>
        <div className="flex flex-col gap-5">
          {review.criteria.map((criterion) => (
            <ScoreField
              key={criterion}
              criterion={criterion as Criterion}
              value={scores[criterion]}
              disabled={!editable}
              onChange={(score) => setScores((s) => ({ ...s, [criterion]: score }))}
            />
          ))}
          <SummaryField
            value={summary}
            disabled={!editable}
            language={languageName(t, review.languageCode)}
            onChange={setSummary}
          />
          {editable ? (
            <div className="flex flex-wrap gap-3">
              <Button variant="sage" loading={busy} onClick={() => void decide('APPROVED')}>
                <Icon name="check" />
                {t(review.kind === 'READINESS' ? 'mentor.pass' : 'mentor.approve')}
              </Button>
              <Button
                variant="secondary"
                loading={busy}
                onClick={() => void decide('CHANGES_REQUESTED')}
              >
                {t(review.kind === 'READINESS' ? 'mentor.notYet' : 'mentor.requestChanges')}
              </Button>
              <Button
                variant="ghost"
                className="ms-auto"
                onClick={() =>
                  void run(() => api.POST('/v1/mentor/reviews/{id}/release', path)).then(
                    (ok) => ok && router.push('/mentor'),
                  )
                }
              >
                {t('mentor.release')}
              </Button>
            </div>
          ) : null}
        </div>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Notes review={review} onSaved={load} />
        {review.history.length ? (
          <Card title={t('mentor.history')}>
            <ul className="flex flex-col gap-2">
              {review.history.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center gap-2 text-sm">
                  <span>{t('mentor.version', { version: String(item.version) })}</span>
                  <Badge tone="neutral">{t(`review.status.${item.status}`)}</Badge>
                  {item.decidedAt ? (
                    <span className="text-muted">
                      {format.dateTime(new Date(item.decidedAt), { dateStyle: 'medium' })}
                    </span>
                  ) : null}
                  <Link href={`/mentor/reviews/${item.id}`} className={buttonClass('ghost', 'sm')}>
                    {t('mentor.open')}
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

function CommentForm({
  line,
  onCancel,
  onSave,
}: {
  line: number;
  onCancel: () => void;
  onSave: (body: string) => Promise<void>;
}) {
  const t = useTranslations('mentor');
  const id = useId();
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!body.trim()) return;
    setSaving(true);
    await onSave(body.trim());
    setSaving(false);
  };
  return (
    <form
      onSubmit={submit}
      dir="auto"
      className="ms-12 me-3 my-2 flex flex-col gap-2 rounded-row bg-surface p-3 font-sans"
    >
      <label htmlFor={id} className="text-sm font-semibold">
        {t('commentOn', { line: String(line) })}
      </label>
      <textarea
        id={id}
        rows={3}
        maxLength={1000}
        // oxlint-disable-next-line jsx-a11y/no-autofocus -- the form opens because the mentor chose this line
        autoFocus
        value={body}
        onChange={(e) => setBody(e.target.value)}
        className={clsx(textareaClass(), 'min-h-0 text-sm')}
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={saving} disabled={!body.trim()}>
          {t('addComment')}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          {t('cancel')}
        </Button>
      </div>
    </form>
  );
}

function ScoreField({
  criterion,
  value,
  disabled,
  onChange,
}: {
  criterion: Criterion;
  value: number | undefined;
  disabled: boolean;
  onChange: (score: number) => void;
}) {
  const t = useTranslations();
  const name = useId();
  return (
    <fieldset disabled={disabled} className="flex flex-col gap-2">
      <legend className="font-semibold">
        {t(`review.criteria.${criterion}`)}{' '}
        <span className="font-normal text-muted">— {t(`review.criteriaHelp.${criterion}`)}</span>
      </legend>
      <div className="flex flex-wrap gap-2">
        {([1, 2, 3, 4] as const).map((score) => (
          <label
            key={score}
            className={clsx(
              'flex min-h-10 cursor-pointer items-center gap-2 rounded-full border px-3.5 text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand',
              value === score
                ? 'border-primary bg-primary text-on-primary'
                : 'border-line hover:bg-ink/7',
            )}
          >
            <input
              type="radio"
              name={name}
              value={score}
              checked={value === score}
              onChange={() => onChange(score)}
              className="sr-only"
            />
            {score} · {t(`mentor.score${score}`)}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function SummaryField({
  value,
  disabled,
  language,
  onChange,
}: {
  value: string;
  disabled: boolean;
  language: string;
  onChange: (value: string) => void;
}) {
  const t = useTranslations('mentor');
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-semibold">
        {t('summaryLabel')}
      </label>
      <p className="text-sm text-muted">{t('summaryHelp', { language })}</p>
      <textarea
        id={id}
        rows={5}
        dir="auto"
        maxLength={4000}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={textareaClass()}
      />
    </div>
  );
}

function Notes({ review, onSaved }: { review: Review; onSaved: () => Promise<void> }) {
  const t = useTranslations('mentor');
  const format = useFormatter();
  const id = useId();
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (body.trim().length < 3) return;
    setSaving(true);
    const { response } = await api.POST('/v1/mentor/students/{id}/notes', {
      params: { path: { id: review.studentId } },
      body: { body: body.trim() },
    });
    setSaving(false);
    if (response.ok) {
      setBody('');
      await onSaved();
    }
  };
  return (
    <Card title={t('notesTitle')}>
      <p className="text-sm text-muted">{t('notesHelp')}</p>
      {review.notes.length ? (
        <ul className="mt-3 flex flex-col gap-2.5">
          {review.notes.map((note) => (
            <li key={note.id} className="rounded-row bg-raised px-3.5 py-2.5 text-sm" dir="auto">
              <p className="whitespace-pre-wrap">{note.body}</p>
              <p className="mt-1 text-xs text-muted">
                {note.author} · {format.dateTime(new Date(note.createdAt), { dateStyle: 'medium' })}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted">{t('noNotes')}</p>
      )}
      <form onSubmit={save} className="mt-4 flex flex-col gap-2">
        <label htmlFor={id} className="text-sm font-semibold">
          {t('noteLabel')}
        </label>
        <textarea
          id={id}
          rows={3}
          dir="auto"
          maxLength={2000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className={clsx(textareaClass(), 'min-h-0 text-sm')}
        />
        <div>
          <Button type="submit" size="sm" variant="secondary" loading={saving}>
            {t('addNote')}
          </Button>
        </div>
      </form>
    </Card>
  );
}
