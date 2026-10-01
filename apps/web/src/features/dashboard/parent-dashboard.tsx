'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { MAX_CHILDREN_PER_PARENT } from '@kcp/shared';
import {
  Alert,
  buttonClass,
  EmptyState,
  Icon,
  IconBubble,
  PageSpinner,
  SectionHeading,
  Switch,
} from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { useAccount } from '@/lib/use-account';
import { isolate } from '../auth/validation';
import { type Child, ChildCard } from '../children/child-card';
import { EventRequestsCard } from '../events/parent-events';
import { FriendRequestsCard } from '../friends/parent-friends';
import { ReferralCard } from '../reports/referral-card';
import { ClassRequestsCard } from '../schools/parent-classes';

export function ParentDashboard() {
  const t = useTranslations('dashboard');
  const tp = useTranslations('pair');
  const tr = useTranslations('reports');
  const user = useAccount('PARENT');
  const [children, setChildren] = useState<Child[] | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!user) return;
    api
      .GET('/v1/children')
      .then(({ data }) => (data ? setChildren(data) : setFailed(true)))
      .catch(() => setFailed(true));
  }, [user]);

  if (!user) return <PageSpinner />;

  const replace = (updated: Child) =>
    setChildren((list) => list?.map((c) => (c.id === updated.id ? updated : c)) ?? null);
  const remove = (deleted: Child) => {
    setChildren((list) => list?.filter((c) => c.id !== deleted.id) ?? null);
    setNotice(t('deleted', { nickname: isolate(deleted.nickname) }));
  };

  const addChild = (
    <Link href="/children/new" className={buttonClass('primary', 'lg')}>
      <Icon name="userPlus" />
      {t('addChild')}
    </Link>
  );

  return (
    <div className="mx-auto flex max-w-300 flex-col gap-7">
      <section className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div>
          <h1 className="text-4xl sm:text-[2.75rem]">
            {t('greeting', { name: user.displayName ?? '' })}
          </h1>
          <p className="mt-1.5 max-w-xl text-lg text-muted">{t('subtitle')}</p>
        </div>
        {children?.length ? (
          <div className="flex flex-wrap gap-3">
            <Link href="/pair" className={buttonClass('secondary', 'lg')}>
              <Icon name="laptop" />
              {tp('dashboardLink')}
            </Link>
            {addChild}
          </div>
        ) : null}
      </section>

      {notice ? (
        <p
          role="status"
          className="flex items-center gap-3 self-start rounded-row bg-sage-100 px-5 py-3.5 text-sm font-semibold text-sage-800 sm:rounded-full"
        >
          <Icon name="check" className="text-base" />
          {notice}
        </p>
      ) : null}

      <FriendRequestsCard />
      <EventRequestsCard />
      <ClassRequestsCard />

      <section aria-labelledby="children-heading" className="flex flex-col gap-4.5">
        <SectionHeading
          id="children-heading"
          detail={
            children?.length
              ? t('childrenCount', {
                  count: String(children.length),
                  max: String(MAX_CHILDREN_PER_PARENT),
                })
              : undefined
          }
        >
          {t('childrenTitle')}
        </SectionHeading>
        {failed ? (
          <Alert tone="error">{t('loadFailed')}</Alert>
        ) : children === null ? (
          <PageSpinner />
        ) : children.length === 0 ? (
          <EmptyState
            icon="userPlus"
            title={t('emptyTitle')}
            body={t('emptyBody')}
            action={addChild}
          />
        ) : (
          <div className="flex flex-col gap-4">
            {children.map((child) => (
              <ChildCard key={child.id} child={child} onChange={replace} onDeleted={remove} />
            ))}
          </div>
        )}
      </section>

      <div className="mt-2 grid gap-4.5 md:grid-cols-3">
        <section className="flex flex-col gap-2.5 rounded-card bg-brand-100 p-6.5">
          <IconBubble icon="card" tone="solid" />
          <h2 className="mt-1 text-xl">{t('billingTitle')}</h2>
          <p className="text-sm text-brand-800">{t('billingBody')}</p>
          <Link
            href="/billing"
            className="mt-auto flex items-center gap-1.5 self-start rounded-full py-1 text-sm font-bold text-brand-text hover:underline"
          >
            {t('billingLink')}
            <Icon name="arrow" />
          </Link>
        </section>
        <section className="flex flex-col gap-2.5 rounded-card bg-sage-100 p-6.5">
          <IconBubble icon="shield" tone="sageSolid" />
          <h2 className="mt-1 text-xl">{t('safetyTitle')}</h2>
          <p className="text-sm text-sage-800">{t('safetyBody')}</p>
        </section>
        <section className="flex flex-col gap-2.5 rounded-card bg-sand-200 p-6.5">
          <IconBubble icon="chart" tone="neutral" />
          <h2 className="mt-1 text-xl">{tr('title')}</h2>
          <p className="text-sm text-muted">{tr('subtitle')}</p>
          <Link
            href="/reports"
            className="mt-auto flex items-center gap-1.5 self-start rounded-full py-1 text-sm font-bold text-brand-text hover:underline"
          >
            {tr('dashboardLink')}
            <Icon name="arrow" />
          </Link>
        </section>
        <ReferralCard />
        <section className="flex flex-col gap-2.5 rounded-card bg-surface p-6.5">
          <IconBubble icon="user" tone="neutral" />
          <h2 className="mt-1 text-xl">{t('accountTitle')}</h2>
          <p className="text-sm text-muted">
            {t('accountEmail', { email: isolate(user.email ?? '') })}
          </p>
          <MonthlySummarySwitch />
          <Link
            href="/account"
            className="flex items-center gap-1.5 self-start rounded-full py-1 text-sm font-bold text-brand-text hover:underline"
          >
            {t('accountSettings')}
            <Icon name="arrow" />
          </Link>
        </section>
      </div>
    </div>
  );
}

/** The family emails: the monthly progress email and the weekly report (on unless switched off). */
function MonthlySummarySwitch() {
  const t = useTranslations('dashboard');
  const [prefs, setPrefs] = useState<{ monthlySummary: boolean; weeklyReport: boolean } | null>(
    null,
  );
  const [saved, setSaved] = useState<'monthlySummary' | 'weeklyReport' | null>(null);

  useEffect(() => {
    api
      .GET('/v1/account/email-preferences')
      .then(({ data }) => setPrefs(data ?? null))
      .catch(() => undefined);
  }, []);

  if (!prefs) return null;
  const change = async (key: 'monthlySummary' | 'weeklyReport', checked: boolean) => {
    const before = prefs;
    setPrefs({ ...prefs, [key]: checked });
    setSaved(null);
    const { data } = await api
      .PUT('/v1/account/email-preferences', { body: { [key]: checked } })
      .catch(() => ({ data: undefined }));
    if (data) {
      setPrefs(data);
      setSaved(key);
    } else {
      setPrefs(before);
    }
  };
  return (
    <>
      <div className="flex flex-col gap-1 rounded-row bg-raised px-4 py-3">
        <Switch
          label={t('monthlySummary')}
          checked={prefs.monthlySummary}
          onChange={(checked: boolean) => void change('monthlySummary', checked)}
        />
        <p className="text-sm text-muted" aria-live="polite">
          {saved === 'monthlySummary' ? t('saved') : t('monthlySummaryHint')}
        </p>
      </div>
      <div className="flex flex-col gap-1 rounded-row bg-raised px-4 py-3">
        <Switch
          label={t('weeklyReport')}
          checked={prefs.weeklyReport}
          onChange={(checked: boolean) => void change('weeklyReport', checked)}
        />
        <p className="text-sm text-muted" aria-live="polite">
          {saved === 'weeklyReport' ? t('saved') : t('weeklyReportHint')}
        </p>
      </div>
    </>
  );
}
