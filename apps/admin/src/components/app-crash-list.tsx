'use client';

import { Alert, Badge, PageSpinner, SelectField } from '@kcp/ui';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { useLoad, useUrlFilters } from '@/lib/hooks';
import { Cell, FilterBar, Pagination, Table } from './data';
import { PageHeader } from './shell';

type Platform = 'android' | 'ios';

const FILTERS = ['platform'] as const;
const PLATFORMS: { value: Platform; label: string }[] = [
  { value: 'android', label: 'Android' },
  { value: 'ios', label: 'iPhone and iPad' },
];
const PAGE_SIZE = 25;

/**
 * Crash reports from the mobile app, newest first. They name no account or phone:
 * the app version, the system version and what went wrong. Kept 90 days.
 */
export function AppCrashList() {
  const filters = useUrlFilters(FILTERS);
  const { applied, page } = filters;
  const crashes = useLoad(
    () =>
      api.GET('/v1/admin/app-crashes', {
        params: {
          query: {
            platform: (applied.platform as Platform) || undefined,
            page,
            pageSize: PAGE_SIZE,
          },
        },
      }),
    filters.key,
  );

  return (
    <>
      <PageHeader
        title="App crashes"
        description="What went wrong in the mobile app. Reports name no account or phone, and are deleted after 90 days. A new app version with many reports needs a fix before more families update."
      />
      <FilterBar onSubmit={filters.apply} onReset={filters.reset}>
        <SelectField
          label="Platform"
          value={filters.draft.platform}
          onChange={(e) => filters.setDraftValue('platform', e.target.value)}
        >
          <option value="">Any</option>
          {PLATFORMS.map((platform) => (
            <option key={platform.value} value={platform.value}>
              {platform.label}
            </option>
          ))}
        </SelectField>
      </FilterBar>

      {crashes.error ? <Alert tone="error">{crashes.error}</Alert> : null}
      {crashes.data ? (
        <>
          <section aria-labelledby="crashes-week" className="flex flex-col gap-2">
            <h2 id="crashes-week" className="text-lg font-bold">
              Last 7 days, by app version
            </h2>
            {crashes.data.lastWeek.length === 0 ? (
              <p className="text-muted">No crashes in the last 7 days.</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {crashes.data.lastWeek.map((version) => (
                  <li key={version.appVersion}>
                    <Badge tone={version.count >= 10 ? 'danger' : 'neutral'}>
                      <span className="font-latin">{version.appVersion}</span>: {version.count}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <Table
            caption="Crash reports"
            columns={['Received', 'App', 'System', 'What went wrong']}
            empty={crashes.data.items.length === 0}
          >
            {crashes.data.items.map((crash) => (
              <tr key={crash.id}>
                <Cell className="whitespace-nowrap">{formatDateTime(crash.createdAt)}</Cell>
                <Cell className="whitespace-nowrap">
                  <span className="flex flex-col items-start gap-1">
                    <span className="font-latin">{crash.appVersion}</span>
                    <Badge tone={crash.fatal ? 'danger' : 'warning'}>
                      {crash.fatal ? 'App closed' : 'Error'}
                    </Badge>
                  </span>
                </Cell>
                <Cell>
                  <span className="font-latin">{crash.osVersion}</span>
                </Cell>
                <Cell className="max-w-xl">
                  <p dir="ltr" className="font-latin break-words">
                    {crash.message}
                  </p>
                  {crash.stack ? (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-sm font-semibold text-brand-text">
                        Stack trace
                      </summary>
                      <pre
                        dir="ltr"
                        className="mt-2 max-h-80 overflow-auto rounded-well bg-code-bg p-3 font-mono text-xs text-ink"
                      >
                        {crash.stack}
                      </pre>
                    </details>
                  ) : null}
                </Cell>
              </tr>
            ))}
          </Table>
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={crashes.data.total}
            onPage={filters.setPage}
          />
        </>
      ) : crashes.error ? null : (
        <PageSpinner label="Loading crash reports" />
      )}
    </>
  );
}
