'use client';

import type { components } from '@kcp/api-client-ts';
import { useFormatter, useTranslations } from 'next-intl';
import { useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  buttonClass,
  Card,
  EmptyState,
  Icon,
  Meter,
  PageSpinner,
  SectionHeading,
} from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { useAccount } from '@/lib/use-account';
import { isolate } from '../auth/validation';
import {
  Money,
  NoticeArea,
  ProjectStatusBadge,
  PayoutStatusBadge,
  useAction,
  useDuration,
  useLoad,
} from './hub-common';

type Eligibility = components['schemas']['HubEligibilityDto'];
type Rules = components['schemas']['HubRulesDto'];
type Invite = components['schemas']['StudentInviteDto'];
type Usage = components['schemas']['TimeUsageDto'];
type Statement = components['schemas']['EarningsStatementDto'];

const clock = (minute: number) =>
  `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;

/** The country's hub rules in a sentence or two. */
export function RulesSummary({ rules }: { rules: Rules | null }) {
  const t = useTranslations('hub');
  const format = useFormatter();
  if (!rules) return null;
  const days = rules.schoolDays
    .map((day) =>
      format.dateTime(new Date(Date.UTC(2026, 0, 4 + day)), { weekday: 'short', timeZone: 'UTC' }),
    )
    .join(', ');
  return (
    <ul className="flex flex-col gap-1.5 text-sm">
      <li className="flex gap-2">
        <Icon name="clock" className="mt-1 text-brand-text" />
        {t('rules.weekly', { hours: Math.round((rules.weeklyMinutes / 60) * 10) / 10 })}
      </li>
      <li className="flex gap-2">
        <Icon name="sun" className="mt-1 text-brand-text" />
        <span>
          {t('rules.window', {
            from: clock(rules.dayStartMinute),
            to: clock(rules.dayEndMinute),
          })}
        </span>
      </li>
      {rules.schoolDays.length ? (
        <li className="flex gap-2">
          <Icon name="book" className="mt-1 text-brand-text" />
          <span>
            {t('rules.school', {
              from: clock(rules.schoolStartMinute),
              to: clock(rules.schoolEndMinute),
              days,
            })}
          </span>
        </li>
      ) : null}
    </ul>
  );
}

/** The steps into the hub, ticked off. */
export function StepList({ eligibility }: { eligibility: Eligibility }) {
  const t = useTranslations('hub.steps');
  return (
    <ol className="flex flex-col gap-2">
      {eligibility.steps.map((step) => (
        <li key={step.key} className="flex items-start gap-3 rounded-row bg-raised px-4 py-2.5">
          <span
            className={
              step.done
                ? 'mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-sage-100 text-sage-800'
                : 'mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-sand-200 text-muted'
            }
          >
            <Icon name={step.done ? 'check' : 'clock'} className="text-sm" />
          </span>
          <span className="flex flex-col">
            <span className="font-semibold">{t(`${step.key}.title`)}</span>
            {!step.done ? <span className="text-sm text-muted">{t(`${step.key}.how`)}</span> : null}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** The week's hub time: used, left, and whether work is allowed right now. */
export function TimeCard({
  usage,
  onStop,
  busy,
}: {
  usage: Usage;
  onStop?: () => void;
  busy?: boolean;
}) {
  const t = useTranslations('hub.time');
  const format = useFormatter();
  const duration = useDuration();
  const at = (value: string) =>
    format.dateTime(new Date(value), { weekday: 'short', hour: 'numeric', minute: '2-digit' });
  return (
    <Card title={t('title')}>
      <p className="mb-2 font-semibold">
        {t('used', { used: duration(usage.usedMinutes), cap: duration(usage.capMinutes) })}
      </p>
      <Meter
        value={usage.usedMinutes}
        max={Math.max(1, usage.capMinutes)}
        label={t('used', { used: duration(usage.usedMinutes), cap: duration(usage.capMinutes) })}
      />
      <p className="mt-3 text-sm">
        {usage.running
          ? t('running', { until: at(usage.running.stopsAt) })
          : usage.allowedNow
            ? usage.leftMinutes > 0
              ? t('allowedNow', {
                  until: usage.windowEnd ? at(usage.windowEnd) : '',
                  left: duration(usage.leftMinutes),
                })
              : t('capReached')
            : usage.nextWindow
              ? t('notNow', { next: at(usage.nextWindow) })
              : t('notNowNoNext')}
      </p>
      {usage.running && onStop ? (
        <Button className="mt-3" variant="secondary" loading={busy} onClick={onStop}>
          <Icon name="clock" />
          {t('stop')}
        </Button>
      ) : null}
    </Card>
  );
}

/** A student's money from the hub (paid to their parent). */
export function EarningsCard({
  statement,
  forParent,
}: {
  statement: Statement;
  forParent?: boolean;
}) {
  const t = useTranslations('hub.earnings');
  const format = useFormatter();
  const date = (value: string) => format.dateTime(new Date(value), { dateStyle: 'medium' });
  if (statement.earnings.length === 0) {
    return (
      <Card title={t('title')}>
        <p className="text-muted">{forParent ? t('noneParent') : t('none')}</p>
      </Card>
    );
  }
  return (
    <Card title={t('title')}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {statement.totals.map((total) =>
          (
            [
              ['earned', total.earnedMinor],
              ['held', total.heldMinor],
              ['payable', total.payableMinor],
              ['paid', total.paidMinor],
            ] as const
          ).map(([key, minor]) => (
            <div key={`${total.currency}-${key}`} className="rounded-inner bg-raised p-4">
              <p className="text-sm text-muted">{t(key)}</p>
              <p className="text-2xl font-bold">
                <Money minor={minor} currency={total.currency} />
              </p>
            </div>
          )),
        )}
      </div>
      <p className="mt-3 text-sm text-muted">{forParent ? t('howParent') : t('how')}</p>
      <h3 className="mt-5 text-lg">{t('byProject')}</h3>
      <ul className="mt-2 flex flex-col gap-2">
        {statement.earnings.map((earning) => (
          <li
            key={earning.id}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-row bg-raised px-4 py-2.5"
          >
            <span className="flex-1 font-semibold">
              {isolate(earning.projectTitle)}{' '}
              <span className="text-sm text-muted">{earning.projectReference}</span>
            </span>
            <Money minor={earning.amountMinor} currency={earning.currency} />
            <Badge tone={earning.releasedAt ? 'success' : 'warning'}>
              {earning.releasedAt
                ? t('released')
                : t('heldUntil', { date: date(earning.heldUntil) })}
            </Badge>
          </li>
        ))}
      </ul>
      {statement.payouts.length ? (
        <>
          <h3 className="mt-5 text-lg">{t('payouts')}</h3>
          <ul className="mt-2 flex flex-col gap-2">
            {statement.payouts.map((payout) => (
              <li
                key={payout.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-row bg-raised px-4 py-2.5"
              >
                <span className="flex-1 font-semibold">
                  {payout.reference}{' '}
                  <span className="text-sm font-normal text-muted">
                    {date(payout.paidAt ?? payout.createdAt)}
                  </span>
                </span>
                <Money minor={payout.netMinor} currency={payout.currency} />
                <PayoutStatusBadge status={payout.status} />
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </Card>
  );
}

function InviteCard({ invite, onAnswered }: { invite: Invite; onAnswered: () => Promise<void> }) {
  const t = useTranslations('hub.invite');
  const duration = useDuration();
  const { busy, notice, run } = useAction();
  const answer = async (accept: boolean) => {
    const ok = await run(
      accept ? 'yes' : 'no',
      () =>
        api.POST('/v1/hub/invites/{memberId}/answer', {
          params: { path: { memberId: invite.memberId } },
          body: { accept },
        }),
      accept ? t('accepted') : t('declined'),
    );
    if (ok) await onAnswered();
  };
  return (
    <Card tone="brand" title={isolate(invite.title)} kicker={t('kicker')}>
      <p className="whitespace-pre-line">{invite.summary}</p>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        {invite.taskTitle ? (
          <div>
            <dt className="text-muted">{t('task')}</dt>
            <dd className="font-semibold">{isolate(invite.taskTitle)}</dd>
          </div>
        ) : null}
        {invite.estimateMinutes ? (
          <div>
            <dt className="text-muted">{t('time')}</dt>
            <dd className="font-semibold">{duration(invite.estimateMinutes)}</dd>
          </div>
        ) : null}
        {invite.estimatedEarningsMinor ? (
          <div>
            <dt className="text-muted">{t('earnings')}</dt>
            <dd className="font-semibold">
              <Money minor={invite.estimatedEarningsMinor} currency={invite.currency} />
            </dd>
          </div>
        ) : null}
        {invite.leadName ? (
          <div>
            <dt className="text-muted">{t('lead')}</dt>
            <dd className="font-semibold">{isolate(invite.leadName)}</dd>
          </div>
        ) : null}
      </dl>
      {invite.note ? (
        <blockquote className="mt-3 border-s-4 border-brand ps-3 text-sm">
          {isolate(invite.note)}
        </blockquote>
      ) : null}
      <NoticeArea notice={notice} />
      {invite.status === 'INVITED' ? (
        <div className="mt-4 flex flex-wrap gap-2.5">
          <Button
            loading={busy === 'yes'}
            disabled={busy !== null}
            onClick={() => void answer(true)}
          >
            <Icon name="check" />
            {t('accept')}
          </Button>
          <Button
            variant="ghost"
            loading={busy === 'no'}
            disabled={busy !== null}
            onClick={() => void answer(false)}
          >
            {t('decline')}
          </Button>
        </div>
      ) : (
        <p className="mt-4 font-semibold">{t('waitingParent')}</p>
      )}
    </Card>
  );
}

/**
 * The student's hub: the way in (steps), invitations, their projects, this week's
 * hours and their earnings (paid to their parent).
 */
export function StudentHubPage() {
  const t = useTranslations('hub');
  const user = useAccount('STUDENT');
  const [stopping, setStopping] = useState(false);
  const me = useLoad(async () => (await api.GET('/v1/hub/me')).data, [user?.id]);
  const invites = useLoad(async () => (await api.GET('/v1/hub/invites')).data, [user?.id]);
  const projects = useLoad(async () => (await api.GET('/v1/hub/projects')).data, [user?.id]);
  const time = useLoad(async () => (await api.GET('/v1/hub/time')).data, [user?.id]);
  const earnings = useLoad(async () => (await api.GET('/v1/hub/earnings')).data, [user?.id]);

  if (!user || (!me.data && !me.failed)) return <PageSpinner />;
  if (!me.data) return <Alert tone="error">{t('loadFailed')}</Alert>;
  const eligibility = me.data;
  const waiting = (invites.data ?? []).filter(
    (i) => i.status === 'INVITED' || i.status === 'ACCEPTED',
  );

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <SectionHeading level={1}>{t('title')}</SectionHeading>
        <p className="max-w-3xl text-lg text-muted">{t('intro')}</p>
      </header>

      {eligibility.paused ? <Alert tone="warning">{t('paused')}</Alert> : null}

      {!eligibility.eligible ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <Card title={t('stepsTitle')}>
            <p className="mb-3 text-muted">{t('stepsIntro')}</p>
            <StepList eligibility={eligibility} />
          </Card>
          <Card title={t('rulesTitle')}>
            <RulesSummary rules={eligibility.rules} />
          </Card>
        </div>
      ) : null}

      {waiting.map((invite) => (
        <InviteCard
          key={invite.memberId}
          invite={invite}
          onAnswered={async () => {
            await Promise.all([invites.reload(), projects.reload()]);
          }}
        />
      ))}

      {eligibility.eligible || (projects.data ?? []).length ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <Card title={t('projectsTitle')}>
            {(projects.data ?? []).length === 0 ? (
              <EmptyState icon="rocket" title={t('noProjects')} body={t('noProjectsHint')} />
            ) : (
              <ul className="flex flex-col gap-2.5">
                {(projects.data ?? []).map((project) => (
                  <li key={project.id}>
                    <Link
                      href={`/learn/hub/projects/${project.id}`}
                      className="flex flex-wrap items-center gap-3 rounded-row bg-raised px-4 py-3 hover:bg-ink/5"
                    >
                      <span className="flex-1 font-bold">{isolate(project.title)}</span>
                      {project.openTasks ? (
                        <Badge tone="brand">{t('openTasks', { count: project.openTasks })}</Badge>
                      ) : null}
                      <ProjectStatusBadge status={project.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <div className="flex flex-col gap-4">
            {time.data ? (
              <TimeCard
                usage={time.data}
                busy={stopping}
                onStop={async () => {
                  setStopping(true);
                  const { data } = await api.POST('/v1/hub/timer/stop').catch(() => ({
                    data: undefined,
                  }));
                  if (data) time.setData(data);
                  setStopping(false);
                }}
              />
            ) : null}
            <Card title={t('rulesTitle')}>
              <RulesSummary rules={eligibility.rules} />
            </Card>
          </div>
        </div>
      ) : null}

      {earnings.data ? <EarningsCard statement={earnings.data} /> : null}

      <p className="text-sm text-muted">
        {t('safety')}{' '}
        <Link href="/safety" className={buttonClass('ghost', 'sm')}>
          {t('safetyLink')}
        </Link>
      </p>
    </div>
  );
}
