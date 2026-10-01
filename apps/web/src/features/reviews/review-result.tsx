'use client';

import type { components } from '@kcp/api-client-ts';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import type { BadgeTone } from '@kcp/ui';
import { Alert, Badge, Card, Meter, PageSpinner } from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { refreshNotifications } from '@/components/notification-bell';
import { areaOf } from '@/lib/auth-provider';
import { useAccountIn } from '@/lib/use-account';
import { CodeLines } from './code-lines';

type Review = components['schemas']['StudentReviewDto'];
type Status = components['schemas']['ReviewSummaryDto']['status'];
type Criterion = 'works' | 'code' | 'design' | 'creativity' | 'independence';

export const REVIEW_TONE: Record<Status, BadgeTone> = {
  WAITING: 'neutral',
  IN_REVIEW: 'brand',
  APPROVED: 'success',
  CHANGES_REQUESTED: 'warning',
  CANCELLED: 'neutral',
};

/** A mentor's review of a project, for the student (or their parent). */
export function ReviewResult({ id }: { id: string }) {
  const user = useAccountIn(['STUDENT', 'PARENT']);
  const t = useTranslations();
  const locale = useLocale();
  const format = useFormatter();
  const [review, setReview] = useState<Review | null>(null);
  const [missing, setMissing] = useState(false);
  const student = user ? areaOf(user) === 'STUDENT' : false;

  useEffect(() => {
    if (!user) return;
    void api
      .GET('/v1/reviews/{id}', { params: { path: { id }, query: { lang: locale } } })
      .then(async ({ data }) => {
        if (!data) {
          setMissing(true);
          return;
        }
        setReview(data);
        if (student && !data.seen && data.decidedAt) {
          await api.POST('/v1/reviews/{id}/seen', { params: { path: { id } } });
          refreshNotifications();
        }
      });
  }, [user, id, locale, student]);

  if (!user || (!review && !missing)) return <PageSpinner />;
  if (!review) return <Alert tone="error">{t('errors.generic')}</Alert>;
  const decided = review.status === 'APPROVED' || review.status === 'CHANGES_REQUESTED';
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <Link
        href={
          student
            ? review.kind === 'READINESS'
              ? '/learn/readiness'
              : review.briefId
                ? `/learn/projects/${review.briefId}`
                : '/learn'
            : '/dashboard'
        }
        className="self-start text-sm font-bold text-brand-text hover:underline"
      >
        {student
          ? t(review.kind === 'READINESS' ? 'review.backToReadiness' : 'review.backToProject')
          : t('review.backToDashboard')}
      </Link>
      <header className="flex flex-col gap-2">
        <p className="text-xs font-bold tracking-[0.1em] text-brand-text uppercase">
          {t('review.title')}
        </p>
        <h1 className="text-4xl">
          <bdi>{review.title}</bdi>
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={REVIEW_TONE[review.status]}>
            {t(
              review.kind === 'READINESS' && decided
                ? `review.readinessStatus.${review.status as 'APPROVED' | 'CHANGES_REQUESTED'}`
                : `review.status.${review.status}`,
            )}
          </Badge>
          {review.decidedAt ? (
            <span className="text-sm text-muted">
              {format.dateTime(new Date(review.decidedAt), { dateStyle: 'medium' })}
            </span>
          ) : null}
        </div>
      </header>

      {!decided ? (
        <Alert>{t('review.waitingBody')}</Alert>
      ) : (
        <>
          <Card tone={review.status === 'APPROVED' ? 'sage' : 'brand'}>
            {review.mentorName ? (
              <p className="text-sm font-bold">
                {t(student ? 'review.from' : 'review.fromParent', { name: review.mentorName })}
              </p>
            ) : null}
            <p className="mt-2 text-lg whitespace-pre-wrap" dir="auto">
              {review.summary}
            </p>
            {review.status === 'CHANGES_REQUESTED' && student ? (
              <p className="mt-3 text-sm">
                {t(review.kind === 'READINESS' ? 'review.readinessRetry' : 'review.changesHint')}
              </p>
            ) : null}
            {review.status === 'APPROVED' && review.kind === 'READINESS' ? (
              <p className="mt-3 text-sm">{t('review.readinessPassed')}</p>
            ) : null}
          </Card>

          <Card title={t('review.scores')}>
            <ul className="grid gap-4 sm:grid-cols-2">
              {review.criteria.map((criterion) => {
                const score = review.scores[criterion] ?? 0;
                const name = t(`review.criteria.${criterion as Criterion}`);
                return (
                  <li key={criterion} className="flex flex-col gap-1.5">
                    <p className="flex justify-between gap-3 font-semibold">
                      <span>{name}</span>
                      <span className="text-muted">
                        {t('review.scoreOf', { score: String(score) })}
                      </span>
                    </p>
                    <Meter
                      value={score}
                      max={4}
                      label={`${name}: ${t('review.scoreOf', { score: String(score) })}`}
                      tone="sage"
                    />
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card title={t('review.comments')}>
            {review.comments.length ? null : (
              <p className="mb-3 text-sm text-muted">{t('review.noComments')}</p>
            )}
            <CodeLines files={review.files} comments={review.comments} />
          </Card>
        </>
      )}
    </div>
  );
}
