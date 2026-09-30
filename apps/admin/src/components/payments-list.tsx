'use client';

import { Alert, Badge, PageSpinner, SelectField, TextField } from '@kcp/ui';
import Link from 'next/link';
import { useState } from 'react';
import { api } from '@/lib/api';
import { formatDate, formatDateTime, formatMoney, humanize } from '@/lib/format';
import { useLoad, useUrlFilters } from '@/lib/hooks';
import { Cell, FilterBar, Pagination, Table } from './data';
import { PageHeader } from './shell';

const PRIVATE_FILTERS = ['search'] as const;
const FILTERS = ['search', 'status', 'provider'] as const;
const SUBSCRIPTION_STATUSES = ['ACTIVE', 'PAST_DUE', 'CANCELED'] as const;
const PAYMENT_STATUSES = [
  'SUCCEEDED',
  'PARTIALLY_REFUNDED',
  'REFUNDED',
  'FAILED',
  'PENDING',
] as const;
const PAGE_SIZE = 25;

const tone = (status: string) =>
  status === 'ACTIVE' || status === 'SUCCEEDED'
    ? 'success'
    : status === 'PAST_DUE' || status === 'PARTIALLY_REFUNDED'
      ? 'warning'
      : status === 'REFUNDED' || status === 'FAILED'
        ? 'danger'
        : 'neutral';

/** Every family's plans and payments. Refunds and manual payments are on a parent's page. */
export function PaymentsList() {
  const [view, setView] = useState<'subscriptions' | 'payments'>('subscriptions');
  const filters = useUrlFilters(FILTERS, PRIVATE_FILTERS);
  const { applied, page } = filters;
  const query = {
    search: applied.search || undefined,
    provider: (applied.provider as 'MANUAL' | 'STRIPE') || undefined,
    page,
  };
  const subscriptions = useLoad(
    () =>
      api.GET('/v1/admin/billing/subscriptions', {
        params: {
          query: {
            ...query,
            subscriptionStatus:
              (applied.status as (typeof SUBSCRIPTION_STATUSES)[number]) || undefined,
          },
        },
      }),
    `s|${filters.key}|${view}`,
  );
  const payments = useLoad(
    () =>
      api.GET('/v1/admin/billing/payments', {
        params: {
          query: {
            ...query,
            paymentStatus: (applied.status as (typeof PAYMENT_STATUSES)[number]) || undefined,
          },
        },
      }),
    `p|${filters.key}|${view}`,
  );
  const statuses = view === 'subscriptions' ? SUBSCRIPTION_STATUSES : PAYMENT_STATUSES;
  const data = view === 'subscriptions' ? subscriptions : payments;

  return (
    <>
      <PageHeader
        title="Payments"
        description="Families’ plans (card plans through Stripe, and manual ones) and every payment. To record a manual payment, refund or end a plan, open the parent’s page."
      />
      <div role="tablist" aria-label="Show" className="flex gap-2">
        {(['subscriptions', 'payments'] as const).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={view === key}
            onClick={() => {
              setView(key);
              filters.reset();
            }}
            className={
              view === key
                ? 'rounded-full bg-primary px-4 py-2 font-semibold text-on-primary'
                : 'rounded-full border border-line bg-surface px-4 py-2 font-semibold'
            }
          >
            {key === 'subscriptions' ? 'Plans' : 'Payments'}
          </button>
        ))}
      </div>
      <FilterBar onSubmit={filters.apply} onReset={filters.reset}>
        <div className="min-w-60 flex-1">
          <TextField
            label="Parent’s email"
            type="search"
            value={filters.draft.search}
            onChange={(e) => filters.setDraftValue('search', e.target.value)}
          />
        </div>
        <SelectField
          label="Status"
          value={filters.draft.status}
          onChange={(e) => filters.setDraftValue('status', e.target.value)}
        >
          <option value="">Any status</option>
          {statuses.map((status) => (
            <option key={status} value={status}>
              {humanize(status)}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Paid with"
          value={filters.draft.provider}
          onChange={(e) => filters.setDraftValue('provider', e.target.value)}
        >
          <option value="">Card or manual</option>
          <option value="STRIPE">Card (Stripe)</option>
          <option value="MANUAL">Manual</option>
        </SelectField>
      </FilterBar>

      {data.error ? <Alert tone="error">{data.error}</Alert> : null}
      {view === 'subscriptions' && subscriptions.data ? (
        <>
          <Table
            caption="Plans"
            columns={['Parent', 'Plan', 'Status', 'Children', 'Price', 'Period ends', 'Started']}
            empty={subscriptions.data.items.length === 0}
          >
            {subscriptions.data.items.map((s) => (
              <tr key={s.id}>
                <Cell>
                  <Link
                    href={`/users/${s.parentId}`}
                    className="font-semibold break-all text-brand-text underline-offset-4 hover:underline"
                  >
                    {s.parentEmail ?? 'Deleted parent'}
                  </Link>
                </Cell>
                <Cell>
                  {humanize(s.planKey)} · {s.provider === 'STRIPE' ? 'card' : 'manual'}
                </Cell>
                <Cell>
                  <Badge tone={tone(s.status)}>{humanize(s.status)}</Badge>
                  {s.cancelAtPeriodEnd && s.status !== 'CANCELED' ? (
                    <span className="ms-2 text-sm text-muted">cancelled</span>
                  ) : null}
                </Cell>
                <Cell>{s.children}</Cell>
                <Cell className="whitespace-nowrap">{formatMoney(s.amountMinor, s.currency)}</Cell>
                <Cell className="whitespace-nowrap">{formatDate(s.currentPeriodEnd)}</Cell>
                <Cell className="whitespace-nowrap">{formatDate(s.createdAt)}</Cell>
              </tr>
            ))}
          </Table>
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={subscriptions.data.total}
            onPage={filters.setPage}
          />
        </>
      ) : null}
      {view === 'payments' && payments.data ? (
        <>
          <Table
            caption="Payments"
            columns={['Parent', 'Amount', 'Status', 'Paid with', 'Invoice', 'Date']}
            empty={payments.data.items.length === 0}
          >
            {payments.data.items.map((p) => (
              <tr key={p.id}>
                <Cell>
                  <Link
                    href={`/users/${p.parentId}`}
                    className="font-semibold break-all text-brand-text underline-offset-4 hover:underline"
                  >
                    {p.parentEmail ?? 'Deleted parent'}
                  </Link>
                </Cell>
                <Cell className="whitespace-nowrap">
                  {formatMoney(p.amountMinor, p.currency)}
                  {p.refundedMinor ? (
                    <span className="block text-sm text-muted">
                      {formatMoney(p.refundedMinor, p.currency)} refunded
                    </span>
                  ) : null}
                </Cell>
                <Cell>
                  <Badge tone={tone(p.status)}>{humanize(p.status)}</Badge>
                </Cell>
                <Cell>
                  {p.provider === 'STRIPE' ? 'Card' : (p.method ?? 'Manual')}
                  {p.reference ? (
                    <span className="block text-sm break-all text-muted">{p.reference}</span>
                  ) : null}
                </Cell>
                <Cell className="font-latin">{p.invoiceNumber ?? '—'}</Cell>
                <Cell className="whitespace-nowrap">{formatDateTime(p.paidAt ?? p.createdAt)}</Cell>
              </tr>
            ))}
          </Table>
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={payments.data.total}
            onPage={filters.setPage}
          />
        </>
      ) : null}
      {!data.data && !data.error ? <PageSpinner label="Loading" /> : null}
    </>
  );
}
