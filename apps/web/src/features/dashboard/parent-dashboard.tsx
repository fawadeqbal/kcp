'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Alert, buttonClass, Card, EmptyState, PageSpinner, Switch } from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { useAccount } from '@/lib/use-account';
import { isolate } from '../auth/validation';
import { type Child, ChildCard } from '../children/child-card';

export function ParentDashboard() {
  const t = useTranslations('dashboard');
  const user = useAccount('ADULT');
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
    <Link href="/children/new" className={buttonClass('primary')}>
      {t('addChild')}
    </Link>
  );

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <section>
        <h1 className="text-3xl font-bold">{t('greeting', { name: user.displayName ?? '' })}</h1>
        <p className="mt-2 max-w-2xl text-muted">{t('subtitle')}</p>
      </section>

      <section aria-labelledby="children-heading" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="children-heading" className="text-2xl font-bold">
            {t('childrenTitle')}
          </h2>
          {children?.length ? addChild : null}
        </div>
        {notice ? <Alert tone="success">{notice}</Alert> : null}
        {failed ? (
          <Alert tone="error">{t('loadFailed')}</Alert>
        ) : children === null ? (
          <PageSpinner />
        ) : children.length === 0 ? (
          <EmptyState title={t('emptyTitle')} body={t('emptyBody')} action={addChild} />
        ) : (
          <div className="flex flex-col gap-4">
            {children.map((child) => (
              <ChildCard key={child.id} child={child} onChange={replace} onDeleted={remove} />
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card title={t('billingTitle')}>
          <p className="text-muted">{t('billingBody')}</p>
          <Link
            href="/billing"
            className="mt-3 inline-block font-semibold text-brand-700 underline underline-offset-4"
          >
            {t('billingLink')}
          </Link>
        </Card>
        <Card title={t('safetyTitle')}>
          <p className="text-muted">{t('safetyBody')}</p>
        </Card>
        <Card title={t('accountTitle')}>
          <p className="text-muted">{t('accountEmail', { email: isolate(user.email ?? '') })}</p>
          <Link
            href="/account"
            className="mt-3 inline-block font-semibold text-brand-700 underline underline-offset-4"
          >
            {t('accountSettings')}
          </Link>
          <MonthlySummarySwitch />
        </Card>
      </div>
    </div>
  );
}

/** The monthly progress email: on unless the parent switches it off. */
function MonthlySummarySwitch() {
  const t = useTranslations('dashboard');
  const [on, setOn] = useState<boolean | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api
      .GET('/v1/account/email-preferences')
      .then(({ data }) => setOn(data?.monthlySummary ?? null))
      .catch(() => undefined);
  }, []);

  if (on === null) return null;
  return (
    <div className="mt-4 flex flex-col gap-1">
      <Switch
        label={t('monthlySummary')}
        checked={on}
        onChange={async (checked: boolean) => {
          setOn(checked);
          setSaved(false);
          const { data } = await api
            .PUT('/v1/account/email-preferences', { body: { monthlySummary: checked } })
            .catch(() => ({ data: undefined }));
          if (data) setSaved(true);
          else setOn(!checked);
        }}
      />
      <p className="text-sm text-muted" aria-live="polite">
        {saved ? t('saved') : t('monthlySummaryHint')}
      </p>
    </div>
  );
}
