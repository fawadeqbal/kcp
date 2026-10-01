'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useState } from 'react';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  PageSpinner,
  SectionHeading,
  textareaClass,
} from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { api, errorCode } from '@/lib/api';
import { useAccount } from '@/lib/use-account';
import { isolate } from '../auth/validation';
import { Money, NoticeArea, ProjectStatusBadge, useAction, useLoad } from './hub-common';

/**
 * A lead developer's hub: students to sign off for paid work, their projects, and what
 * the platform owes them.
 */
export function LeadHubPage() {
  const t = useTranslations('hub.lead');
  const format = useFormatter();
  const user = useAccount('MENTOR');
  const [notLead, setNotLead] = useState(false);
  const projects = useLoad(async () => {
    const { data, error } = await api.GET('/v1/mentor/hub/projects');
    if (!data && errorCode(error) === 'NOT_LEAD') setNotLead(true);
    return data;
  }, [user?.id]);
  const candidates = useLoad(
    async () => (await api.GET('/v1/mentor/hub/candidates')).data,
    [user?.id],
  );
  const earnings = useLoad(async () => (await api.GET('/v1/mentor/hub/earnings')).data, [user?.id]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const { busy, notice, run } = useAction();

  if (!user || (!projects.data && !projects.failed)) return <PageSpinner />;
  if (notLead || !projects.data) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <SectionHeading level={1}>{t('title')}</SectionHeading>
        <Alert tone="info">{t('notLead')}</Alert>
      </div>
    );
  }
  const waiting = (candidates.data ?? []).filter((c) => !c.signedOffAt);
  const signed = (candidates.data ?? []).filter((c) => c.signedOffAt);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <SectionHeading level={1}>{t('title')}</SectionHeading>
        <p className="text-lg text-muted">{t('intro')}</p>
      </header>
      <NoticeArea notice={notice} />

      <Card title={t('projects')}>
        {projects.data.length === 0 ? (
          <EmptyState icon="rocket" title={t('noProjects')} body={t('noProjectsHint')} />
        ) : (
          <ul className="flex flex-col gap-2.5">
            {projects.data.map((project) => (
              <li key={project.id}>
                <Link
                  href={`/mentor/hub/projects/${project.id}`}
                  className="flex flex-wrap items-center gap-3 rounded-row bg-raised px-4 py-3 hover:bg-ink/5"
                >
                  <span className="text-muted">{project.reference}</span>
                  <span className="flex-1 font-bold">{isolate(project.title)}</span>
                  <span className="text-sm text-muted">{isolate(project.clientName)}</span>
                  <ProjectStatusBadge status={project.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title={t('candidates')}>
        <p className="mb-3 text-muted">{t('candidatesIntro')}</p>
        {waiting.length === 0 ? <p className="text-muted">{t('noCandidates')}</p> : null}
        <ul className="flex flex-col gap-3">
          {waiting.map((candidate) => (
            <li
              key={candidate.studentId}
              className="flex flex-col gap-2 rounded-inner bg-raised p-4"
            >
              <p className="flex flex-wrap items-center gap-3">
                <Avatar avatarKey={candidate.avatarKey} size="sm" />
                <span className="flex-1 font-bold">{isolate(candidate.nickname)}</span>
                <span className="text-sm text-muted">
                  {t('passed', {
                    date: format.dateTime(new Date(candidate.passedAt), { dateStyle: 'medium' }),
                    score: candidate.score ?? 0,
                    max: candidate.maxScore,
                  })}
                </span>
                {candidate.reviewId ? (
                  <Link
                    href={`/mentor/reviews/${candidate.reviewId}`}
                    className="text-sm font-bold text-brand-text hover:underline"
                  >
                    {t('seeCheck')}
                  </Link>
                ) : null}
              </p>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold">{t('note')}</span>
                <textarea
                  className={textareaClass()}
                  maxLength={500}
                  value={notes[candidate.studentId] ?? ''}
                  onChange={(e) =>
                    setNotes((now) => ({ ...now, [candidate.studentId]: e.target.value }))
                  }
                />
              </label>
              <Button
                size="sm"
                className="self-start"
                loading={busy === candidate.studentId}
                disabled={busy !== null}
                onClick={() =>
                  void run(
                    candidate.studentId,
                    () =>
                      api.POST('/v1/mentor/hub/candidates/{studentId}/sign-off', {
                        params: { path: { studentId: candidate.studentId } },
                        body: notes[candidate.studentId]?.trim()
                          ? { note: notes[candidate.studentId]!.trim() }
                          : {},
                      }),
                    t('signedOff', { nickname: isolate(candidate.nickname) }),
                  ).then(async (ok) => {
                    if (ok) await candidates.reload();
                  })
                }
              >
                {t('signOff')}
              </Button>
            </li>
          ))}
        </ul>
        {signed.length ? (
          <>
            <h3 className="mt-5 font-bold">{t('signedList')}</h3>
            <ul className="mt-2 flex flex-wrap gap-2">
              {signed.map((c) => (
                <li key={c.studentId}>
                  <Badge tone={c.eligible ? 'success' : 'neutral'}>
                    {isolate(c.nickname)} · {c.eligible ? t('eligible') : t('waitingParent')}
                  </Badge>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </Card>

      {earnings.data ? (
        <Card title={t('earnings')}>
          <div className="flex flex-wrap gap-3">
            {earnings.data.payable.length === 0 ? (
              <p className="text-muted">{t('nothingOwed')}</p>
            ) : (
              (earnings.data.payable as { currency: string; amountMinor: number }[]).map((row) => (
                <div key={row.currency} className="rounded-inner bg-raised p-4">
                  <p className="text-sm text-muted">{t('owed')}</p>
                  <p className="text-2xl font-bold">
                    <Money minor={row.amountMinor} currency={row.currency} />
                  </p>
                </div>
              ))
            )}
          </div>
          {earnings.data.lines.length ? (
            <ul className="mt-4 flex flex-col gap-1.5 text-sm">
              {earnings.data.lines.map((line) => (
                <li
                  key={`${line.transactionId}-${line.amountMinor}`}
                  className="flex flex-wrap gap-2"
                >
                  <span className="text-muted">
                    {format.dateTime(new Date(line.createdAt), { dateStyle: 'medium' })}
                  </span>
                  <span className="flex-1">{line.memo}</span>
                  <span className={line.amountMinor < 0 ? 'text-muted' : 'font-semibold'}>
                    <Money minor={line.amountMinor} currency={line.currency} />
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          <p className="mt-3 text-sm text-muted">{t('earningsHow')}</p>
        </Card>
      ) : null}
    </div>
  );
}
