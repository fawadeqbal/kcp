'use client';

import { Alert, buttonClass, Card, Icon, inputClass, PageSpinner } from '@kcp/ui';
import { clsx } from 'clsx';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { canOnAll } from '@/lib/ability';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { handOffSearch, useLoad } from '@/lib/hooks';
import { RecentActivity } from './audit-entries';
import { firstPage, PageHeader } from './shell';

function Stat({
  label,
  value,
  detail,
  tone = 'surface',
}: {
  label: string;
  value: number;
  detail?: string;
  tone?: 'surface' | 'sage';
}) {
  return (
    <div
      className={clsx(
        'flex flex-col gap-0.5 rounded-inner px-5 py-4.5',
        tone === 'sage' ? 'bg-sage-100 text-sage-900' : 'bg-surface',
      )}
    >
      <p
        className={clsx('text-sm font-semibold', tone === 'sage' ? 'text-sage-800' : 'text-muted')}
      >
        {label}
      </p>
      <p className="font-display text-[2.125rem] leading-tight">{value.toLocaleString('en')}</p>
      {detail ? (
        <p className={clsx('text-xs', tone === 'sage' ? 'text-sage-800' : 'text-muted')}>
          {detail}
        </p>
      ) : null}
    </div>
  );
}

/** Opens the user list with this search applied (the search never goes in the URL). */
function FindUser() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  return (
    <form
      role="search"
      className="relative w-full sm:w-72"
      onSubmit={(event) => {
        event.preventDefault();
        handOffSearch('/users', { search: search.trim() });
        router.push('/users');
      }}
    >
      <Icon
        name="search"
        className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-muted"
      />
      <input
        type="search"
        aria-label="Find a user"
        placeholder="Find a user, email or username"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className={clsx(inputClass(), 'ps-10!')}
      />
    </form>
  );
}

export function Overview() {
  const { state } = useAuth();
  const router = useRouter();
  const allowed = state.status === 'authenticated' && canOnAll(state.ability, 'read', 'User');
  useEffect(() => {
    // Staff who can't see accounts (content creators) start on their own first page.
    if (state.status === 'authenticated' && !allowed) router.replace(firstPage(state.ability));
  }, [state, allowed, router]);
  if (!allowed) return <PageSpinner label="Loading" />;
  return <OverviewPanel />;
}

function OverviewPanel() {
  const { state } = useAuth();
  const { data, error } = useLoad(() => api.GET('/v1/admin/overview'), 'overview');
  const canReadAudit = state.status === 'authenticated' && state.ability.can('read', 'AuditLog');
  const canReadFeedback = state.status === 'authenticated' && state.ability.can('read', 'Feedback');

  if (error) return <Alert tone="error">{error}</Alert>;
  if (!data) return <PageSpinner label="Loading" />;

  const { parents, students } = data;
  return (
    <>
      <PageHeader
        title="Overview"
        description="Accounts and activity across the platform."
        actions={<FindUser />}
      />
      {data.openSafetyReports > 0 ? (
        <div
          role="status"
          className="flex flex-wrap items-center gap-3.5 rounded-row bg-danger-soft px-4.5 py-3.5 text-danger-text"
        >
          <span
            aria-hidden="true"
            className="grid size-8.5 shrink-0 place-items-center rounded-full bg-danger text-base text-on-danger"
          >
            <Icon name="alert" />
          </span>
          <p className="min-w-0 flex-1 text-sm">
            <strong>
              {data.openSafetyReports === 1
                ? '1 safety report from a family is waiting.'
                : `${data.openSafetyReports} safety reports from families are waiting.`}
            </strong>{' '}
            Follow the safety incident runbook.
          </p>
          {canReadFeedback ? (
            <Link href="/feedback?status=NEW" className={buttonClass('danger', 'sm')}>
              Open the feedback inbox
            </Link>
          ) : null}
        </div>
      ) : null}
      <section
        aria-label="Numbers"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
      >
        <Stat
          label="Parents"
          value={parents.active}
          detail={`${parents.pendingVerification} waiting for email · ${parents.suspended} suspended`}
        />
        <Stat label="Students" value={students.active} detail={`${students.suspended} suspended`} />
        <Stat label="Staff" value={data.staff} />
        <Stat
          label="Child accounts added"
          value={data.childrenCreatedLast7Days}
          detail="Last 7 days"
          tone="sage"
        />
        <Stat
          label="Consent changes"
          value={data.consentChangesLast7Days}
          detail="Sharing on or off, last 7 days"
        />
      </section>
      {canReadAudit ? (
        <Card
          title="Recent activity"
          actions={
            <Link
              href="/audit"
              className="flex items-center gap-1.5 text-sm font-bold text-brand-text underline-offset-4 hover:underline"
            >
              Full audit log
              <Icon name="arrow" />
            </Link>
          }
        >
          <RecentActivity entries={data.recentActivity} />
        </Card>
      ) : null}
    </>
  );
}
