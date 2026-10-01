'use client';

import type { components } from '@kcp/api-client-ts';
import { useFormatter, useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  buttonClass,
  Card,
  Checkbox,
  EmptyState,
  Icon,
  PageSpinner,
  SectionHeading,
} from '@/components/ui';
import { Link, useRouter } from '@/i18n/navigation';
import { api, errorCode } from '@/lib/api';
import { errorMessageKey } from '@/lib/errors';
import { useAccount } from '@/lib/use-account';

type Status = components['schemas']['MentorStatusDto'];
type Queue = components['schemas']['MentorQueueDto'];
type Item = components['schemas']['MentorQueueItemDto'];

/** The mentor console: onboarding until ready, then the review queue. */
export function MentorHome() {
  const user = useAccount('MENTOR');
  const t = useTranslations('mentor');
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    void api.GET('/v1/mentor/status').then(({ data, error: apiError }) => {
      if (data) setStatus(data);
      else setError(errorCode(apiError) ?? 'generic');
    });
  }, [user]);

  if (!user || (!status && !error)) return <PageSpinner />;
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-7">
      <header>
        <h1 className="text-4xl">{t('title')}</h1>
        <p className="mt-2 text-muted">{t('intro')}</p>
      </header>
      {status?.ready ? <Queue /> : status ? <Onboarding status={status} /> : null}
      {error ? <GenericError /> : null}
    </div>
  );
}

/** "Urdu" for "ur" (the launch languages), else the code. */
export function languageName(
  t: (
    key: 'mentor.languageNames.en' | 'mentor.languageNames.ar' | 'mentor.languageNames.ur',
  ) => string,
  code: string,
): string {
  return code === 'en' || code === 'ar' || code === 'ur' ? t(`mentor.languageNames.${code}`) : code;
}

function GenericError() {
  const t = useTranslations();
  return <Alert tone="error">{t('errors.generic')}</Alert>;
}

function Onboarding({ status }: { status: Status }) {
  const t = useTranslations('mentor');
  return (
    <Card title={t('onboardingTitle')}>
      {!status.isActive ? <Alert tone="warning">{t('inactive')}</Alert> : null}
      <ol className="mt-2 flex flex-col gap-4">
        <li className="flex items-start gap-3">
          <Icon
            name={status.backgroundCheck === 'PASSED' ? 'check' : 'clock'}
            className="mt-1 text-lg text-brand-text"
          />
          <div>
            <p className="font-semibold">
              {t('checkStatus', { status: t(`check.${status.backgroundCheck}`) })}
            </p>
            <p className="text-sm text-muted">{t('checkHelp')}</p>
          </div>
        </li>
        <li className="flex items-start gap-3">
          <Icon
            name={status.codeOfConductSigned ? 'check' : 'file'}
            className="mt-1 text-lg text-brand-text"
          />
          {status.codeOfConductSigned ? (
            <p className="font-semibold">{t('conductSigned')}</p>
          ) : (
            <Link href="/mentor/code-of-conduct" className={buttonClass('primary', 'md')}>
              {t('conductNeeded')}
            </Link>
          )}
        </li>
      </ol>
    </Card>
  );
}

function Queue() {
  const t = useTranslations('mentor');
  const [all, setAll] = useState(false);
  const [queue, setQueue] = useState<Queue | null>(null);
  const [failed, setFailed] = useState(false);
  const load = useCallback(async () => {
    const { data } = await api.GET('/v1/mentor/queue', {
      params: { query: { languages: all ? 'all' : 'mine' } },
    });
    if (data) setQueue(data);
    else setFailed(true);
  }, [all]);
  useEffect(() => {
    void load();
  }, [load]);

  if (failed) return <GenericError />;
  if (!queue) return <PageSpinner />;
  const { stats } = queue;
  return (
    <>
      <section aria-label={t('title')} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={t('statWaiting')} value={String(stats.waiting)} />
        <Stat label={t('statOverdue')} value={String(stats.overdue)} warn={stats.overdue > 0} />
        <Stat label={t('statDecided')} value={String(stats.decidedLast30Days)} />
        <Stat
          label={t('statAverage')}
          value={
            stats.averageTurnaroundHours === null
              ? '—'
              : t('hours', { hours: String(stats.averageTurnaroundHours) })
          }
        />
      </section>

      <section aria-labelledby="mine" className="flex flex-col gap-3">
        <SectionHeading id="mine">{t('mineTitle')}</SectionHeading>
        {queue.mine.length ? (
          <ul className="flex flex-col gap-2.5">
            {queue.mine.map((item) => (
              <Row key={item.id} item={item} action="continue" />
            ))}
          </ul>
        ) : (
          <p className="text-muted">{t('emptyMine')}</p>
        )}
      </section>

      <section aria-labelledby="waiting" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-4">
          <SectionHeading id="waiting">{t('waitingTitle')}</SectionHeading>
          <Checkbox
            label={t('allLanguages')}
            checked={all}
            onChange={(event) => setAll(event.target.checked)}
          />
        </div>
        {queue.waiting.length ? (
          <ul className="flex flex-col gap-2.5">
            {queue.waiting.map((item) => (
              <Row key={item.id} item={item} action="take" onTaken={load} />
            ))}
          </ul>
        ) : (
          <EmptyState icon="check" title={t('emptyWaiting')} />
        )}
      </section>

      {queue.decided.length ? (
        <section aria-labelledby="decided" className="flex flex-col gap-3">
          <SectionHeading id="decided">{t('decidedTitle')}</SectionHeading>
          <ul className="flex flex-col gap-2.5">
            {queue.decided.map((item) => (
              <Row key={item.id} item={item} action="open" />
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}

function Stat({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className={warn ? 'rounded-row bg-danger-soft p-4' : 'rounded-row bg-surface p-4'}>
      <p className="text-sm text-muted">{label}</p>
      <p className="font-display text-3xl">{value}</p>
    </div>
  );
}

function Row({
  item,
  action,
  onTaken,
}: {
  item: Item;
  action: 'take' | 'continue' | 'open';
  onTaken?: () => void;
}) {
  const t = useTranslations();
  const format = useFormatter();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const take = async () => {
    setBusy(true);
    setError(null);
    const { error: apiError, response } = await api.POST('/v1/mentor/reviews/{id}/claim', {
      params: { path: { id: item.id } },
    });
    setBusy(false);
    if (response.ok) router.push(`/mentor/reviews/${item.id}`);
    else {
      setError(t(`errors.${errorMessageKey(errorCode(apiError))}`));
      onTaken?.();
    }
  };
  return (
    <li className="flex flex-wrap items-center gap-3.5 rounded-row bg-surface px-4 py-3.5">
      <Avatar avatarKey={item.avatarKey} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">
          <bdi>{item.title}</bdi> · <bdi>{item.nickname}</bdi>
        </p>
        <p className="text-sm text-muted">
          {item.kind === 'READINESS'
            ? t('mentor.readinessKind')
            : `${item.moduleTitle} · ${t('mentor.version', { version: String(item.version) })}`}{' '}
          · {languageName(t, item.languageCode)} ·{' '}
          {item.decidedAt
            ? format.dateTime(new Date(item.decidedAt), { dateStyle: 'medium' })
            : t('mentor.waited', { hours: String(item.hoursWaiting) })}
        </p>
        {error ? <p className="text-sm text-danger-text">{error}</p> : null}
      </div>
      {item.overdue ? <Badge tone="danger">{t('mentor.overdue')}</Badge> : null}
      {item.status === 'APPROVED' || item.status === 'CHANGES_REQUESTED' ? (
        <Badge tone={item.status === 'APPROVED' ? 'success' : 'warning'}>
          {t(`review.status.${item.status}`)}
        </Badge>
      ) : null}
      {action === 'take' ? (
        <Button size="sm" onClick={() => void take()} loading={busy}>
          {t('mentor.take')}
        </Button>
      ) : (
        <Link href={`/mentor/reviews/${item.id}`} className={buttonClass('secondary', 'sm')}>
          {t('mentor.open')}
        </Link>
      )}
    </li>
  );
}

/** The code of conduct, signed once per version. */
export function MentorConduct() {
  const user = useAccount('MENTOR');
  const t = useTranslations('mentor');
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!user) return;
    void api.GET('/v1/mentor/status').then(({ data }) => data && setStatus(data));
  }, [user]);
  if (!user || !status) return <PageSpinner />;
  const rules = ['rule1', 'rule2', 'rule3', 'rule4', 'rule5', 'rule6', 'rule7'] as const;
  const sign = async () => {
    setBusy(true);
    setFailed(false);
    const { response } = await api.POST('/v1/mentor/code-of-conduct', {
      body: { version: status.codeOfConductVersion },
    });
    setBusy(false);
    if (response.ok) router.replace('/mentor');
    else setFailed(true);
  };
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header>
        <h1 className="text-4xl">{t('conductTitle')}</h1>
        <p className="mt-2 text-muted">
          {t('conductIntro')} {t('conductVersion', { version: status.codeOfConductVersion })}
        </p>
      </header>
      <Card>
        <ol className="flex list-decimal flex-col gap-3 ps-6">
          {rules.map((rule) => (
            <li key={rule}>{t(`conduct.${rule}`)}</li>
          ))}
        </ol>
      </Card>
      {status.codeOfConductSigned ? (
        <Alert tone="success">{t('conductSigned')}</Alert>
      ) : (
        <div className="flex flex-col gap-4">
          <Checkbox
            label={t('conductAgree')}
            checked={agreed}
            onChange={(event) => setAgreed(event.target.checked)}
          />
          {failed ? <GenericError /> : null}
          <div>
            <Button onClick={() => void sign()} disabled={!agreed} loading={busy}>
              {t('conductSign')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
