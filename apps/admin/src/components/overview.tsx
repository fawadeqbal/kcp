'use client';

import { Alert, Card, PageSpinner } from '@kcp/ui';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useLoad } from '@/lib/hooks';
import { AuditEntries } from './audit-entries';
import { PageHeader } from './shell';

function Stat({ label, value, detail }: { label: string; value: number; detail?: string }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className="mt-1 text-3xl font-bold">{value.toLocaleString('en')}</p>
      {detail ? <p className="mt-1 text-sm text-muted">{detail}</p> : null}
    </div>
  );
}

export function Overview() {
  const { state } = useAuth();
  const { data, error } = useLoad(() => api.GET('/v1/admin/overview'), 'overview');
  const canReadAudit = state.status === 'authenticated' && state.ability.can('read', 'AuditLog');

  if (error) return <Alert tone="error">{error}</Alert>;
  if (!data) return <PageSpinner label="Loading" />;

  const { parents, students } = data;
  return (
    <>
      <PageHeader title="Overview" description="Accounts and activity across the platform." />
      {data.openSafetyReports > 0 ? (
        <div className="mb-6">
          <Alert tone="error">
            {data.openSafetyReports === 1
              ? '1 safety report from a family is waiting.'
              : `${data.openSafetyReports} safety reports from families are waiting.`}{' '}
            <Link
              href="/feedback?status=NEW"
              className="font-semibold underline underline-offset-4"
            >
              Open the feedback inbox
            </Link>{' '}
            and follow the safety incident runbook.
          </Alert>
        </div>
      ) : null}
      <section aria-label="Numbers" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat
          label="Parents"
          value={parents.active}
          detail={`${parents.pendingVerification} waiting for email confirmation · ${parents.suspended} suspended`}
        />
        <Stat label="Students" value={students.active} detail={`${students.suspended} suspended`} />
        <Stat label="Staff" value={data.staff} />
        <Stat
          label="Child accounts added"
          value={data.childrenCreatedLast7Days}
          detail="Last 7 days"
        />
        <Stat
          label="Consent changes"
          value={data.consentChangesLast7Days}
          detail="Parents switching sharing on or off, last 7 days"
        />
      </section>
      {canReadAudit ? (
        <Card
          title="Recent activity"
          actions={
            <Link
              href="/audit"
              className="font-semibold text-brand-700 underline-offset-4 hover:underline"
            >
              Full audit log
            </Link>
          }
        >
          <AuditEntries entries={data.recentActivity} caption="Recent activity" />
        </Card>
      ) : null}
    </>
  );
}
