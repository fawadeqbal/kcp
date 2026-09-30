'use client';

import { Alert, Button, PageSpinner, SelectField } from '@kcp/ui';
import { useState } from 'react';
import { api, errorCode } from '@/lib/api';
import { errorMessage, NETWORK_ERROR } from '@/lib/errors';
import { formatDate, formatDateTime } from '@/lib/format';
import { useLoad, useUrlFilters } from '@/lib/hooks';
import { byDay, daysBetween, EMPTY, type NumberKey } from '@/lib/metrics';
import { Cell, FilterBar, Table } from './data';
import { PageHeader } from './shell';

const FILTERS = ['days', 'country'] as const;
const PERIODS = [7, 14, 30, 90] as const;
const DEFAULT_DAYS = 14;

/**
 * The five numbers the pilot is judged on (implementation plan, "Pilot tools").
 * Counts add up over the period; "weekly active" and "paying" are head counts on the
 * last day, so they don't.
 */
const NUMBERS: { key: NumberKey; label: string; help: string; period: 'sum' | 'last' }[] = [
  {
    key: 'signUps',
    label: 'New families',
    help: 'Parents who added their first child',
    period: 'sum',
  },
  {
    key: 'firstProjects',
    label: 'First projects shipped',
    help: 'Students who shipped their first project',
    period: 'sum',
  },
  {
    key: 'weeklyActive',
    label: 'Weekly active students',
    help: 'Students who earned XP in the 7 days up to the last day',
    period: 'last',
  },
  {
    key: 'payingParents',
    label: 'Paying parents',
    help: 'Parents with a paid plan on the last day',
    period: 'last',
  },
  {
    key: 'cancellations',
    label: 'Cancellations',
    help: 'Plans cancelled by parents',
    period: 'sum',
  },
];

function Stat({ label, value, help }: { label: string; value: number; help: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-inner bg-surface px-5 py-4.5">
      <p className="text-sm font-semibold text-muted">{label}</p>
      <p className="font-display text-[2.125rem] leading-tight">{value.toLocaleString('en')}</p>
      <p className="text-xs text-muted">{help}</p>
    </div>
  );
}

export function PilotNumbers() {
  const filters = useUrlFilters(FILTERS);
  const days = Number(filters.applied.days) || DEFAULT_DAYS;
  const country = filters.applied.country ?? '';
  const metrics = useLoad(
    () => api.GET('/v1/admin/metrics', { params: { query: { days } } }),
    String(days),
  );
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  async function refresh() {
    setRefreshing(true);
    setRefreshError(null);
    try {
      const { error, response } = await api.POST('/v1/admin/metrics/refresh', {
        params: { query: { days } },
      });
      if (response.ok) metrics.reload();
      else setRefreshError(errorMessage(errorCode(error), response.status));
    } catch {
      setRefreshError(NETWORK_ERROR);
    } finally {
      setRefreshing(false);
    }
  }

  const data = metrics.data;
  const perDay = data ? byDay(data.rows, country) : null;
  const dayList = data ? daysBetween(data.from, data.to) : [];
  const totals = { ...EMPTY };
  if (perDay && data) {
    for (const { key, period } of NUMBERS) {
      totals[key] =
        period === 'last'
          ? (perDay.get(data.to)?.[key] ?? 0)
          : dayList.reduce((sum, day) => sum + (perDay.get(day)?.[key] ?? 0), 0);
    }
  }

  return (
    <>
      <PageHeader
        title="Pilot numbers"
        description="The five numbers the pilot is judged on, per day (UTC) and country. Worked out every night at 00:15 UTC; today's are worked out when you open this page."
      />
      <FilterBar onSubmit={filters.apply} onReset={filters.reset}>
        <SelectField
          label="Period"
          value={filters.draft.days || String(DEFAULT_DAYS)}
          onChange={(e) => filters.setDraftValue('days', e.target.value)}
        >
          {PERIODS.map((period) => (
            <option key={period} value={String(period)}>
              Last {period} days
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Country"
          value={filters.draft.country}
          onChange={(e) => filters.setDraftValue('country', e.target.value)}
        >
          <option value="">All countries</option>
          {(data?.countries ?? []).map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </SelectField>
      </FilterBar>

      {metrics.error ? <Alert tone="error">{metrics.error}</Alert> : null}
      {data && perDay ? (
        <>
          <section
            aria-label={`Totals, last ${days} days`}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
          >
            {NUMBERS.map((number) => (
              <Stat
                key={number.key}
                label={number.label}
                value={totals[number.key]}
                help={number.help}
              />
            ))}
          </section>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted">
              {formatDate(data.from)} – {formatDate(data.to)}
              {country ? ` · ${country}` : ' · all countries'} · last worked out{' '}
              {formatDateTime(data.computedAt)}
            </p>
            <Button variant="secondary" size="sm" onClick={refresh} loading={refreshing}>
              Work out again
            </Button>
          </div>
          {refreshError ? <Alert tone="error">{refreshError}</Alert> : null}
          <Table
            caption="The five numbers per day"
            columns={['Day', ...NUMBERS.map((n) => n.label)]}
          >
            {dayList.map((day) => {
              const values = perDay.get(day) ?? EMPTY;
              return (
                <tr key={day}>
                  <Cell className="whitespace-nowrap">{formatDate(day)}</Cell>
                  {NUMBERS.map(({ key }) => (
                    <Cell key={key} className={values[key] ? 'font-semibold' : 'text-muted'}>
                      {values[key].toLocaleString('en')}
                    </Cell>
                  ))}
                </tr>
              );
            })}
          </Table>
        </>
      ) : metrics.error ? null : (
        <PageSpinner label="Loading the numbers" />
      )}
    </>
  );
}
