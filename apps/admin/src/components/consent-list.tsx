'use client';

import type { components } from '@kcp/api-client-ts';
import { Alert, Badge, PageSpinner, SelectField, TextField } from '@kcp/ui';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatDateTime, humanize } from '@/lib/format';
import { useLoad, useUrlFilters } from '@/lib/hooks';
import { Cell, FilterBar, Pagination, Table } from './data';
import { PageHeader } from './shell';

type Person = components['schemas']['PersonRefDto'];

/** Searches can hold an email or a child's username: kept out of the URL. */
const PRIVATE_FILTERS = ['search'] as const;
const FILTERS = ['search', 'type', 'state'] as const;
const TYPES = [
  'ACCOUNT',
  'PUBLIC_LEADERBOARDS',
  'PUBLIC_PORTFOLIO',
  'HUB_WORK',
  'EARNINGS',
] as const;
type ConsentType = (typeof TYPES)[number];
const PAGE_SIZE = 25;

function PersonLink({ person }: { person: Person }) {
  return (
    <div className="flex flex-col">
      <Link
        href={`/users/${person.id}`}
        className="font-semibold whitespace-nowrap text-brand-700 underline-offset-4 hover:underline"
      >
        {person.displayName ?? person.email ?? person.username}
      </Link>
      <span className="text-xs whitespace-nowrap text-muted">
        {person.email ?? person.username}
      </span>
    </div>
  );
}

/**
 * Every consent a parent gave, and when they withdrew it. Records are never edited or
 * deleted (a database rule), so this is the evidence if a regulator asks.
 */
export function ConsentList() {
  const filters = useUrlFilters(FILTERS, PRIVATE_FILTERS);
  const { applied, page } = filters;
  const consents = useLoad(
    () =>
      api.GET('/v1/admin/consents', {
        params: {
          query: {
            search: applied.search || undefined,
            type: (applied.type as ConsentType) || undefined,
            state: (applied.state as 'active' | 'revoked') || undefined,
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
        title="Parental consent"
        description="Every consent a parent has given for a child, and when it was withdrawn. These records can’t be changed or deleted."
      />
      <FilterBar onSubmit={filters.apply} onReset={filters.reset}>
        <div className="min-w-60 flex-1">
          <TextField
            label="Search"
            placeholder="Parent email or child username"
            type="search"
            value={filters.draft.search}
            onChange={(e) => filters.setDraftValue('search', e.target.value)}
          />
        </div>
        <SelectField
          label="Consent"
          value={filters.draft.type}
          onChange={(e) => filters.setDraftValue('type', e.target.value)}
        >
          <option value="">All kinds</option>
          {TYPES.map((type) => (
            <option key={type} value={type}>
              {humanize(type)}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="State"
          value={filters.draft.state}
          onChange={(e) => filters.setDraftValue('state', e.target.value)}
        >
          <option value="">Any</option>
          <option value="active">Active</option>
          <option value="revoked">Withdrawn</option>
        </SelectField>
      </FilterBar>

      {consents.error ? <Alert tone="error">{consents.error}</Alert> : null}
      {consents.data ? (
        <>
          <Table
            caption="Consent records"
            columns={['Consent', 'Child', 'Parent', 'Given', 'Withdrawn', 'Policy', 'Method']}
            empty={consents.data.items.length === 0}
          >
            {consents.data.items.map((record) => (
              <tr key={record.id}>
                <Cell>
                  <span className="flex flex-col items-start gap-1">
                    {humanize(record.type)}
                    {record.revokedAt ? (
                      <Badge tone="neutral">Withdrawn</Badge>
                    ) : (
                      <Badge tone="success">Active</Badge>
                    )}
                  </span>
                </Cell>
                <Cell>
                  <PersonLink person={record.child} />
                </Cell>
                <Cell>
                  <PersonLink person={record.parent} />
                </Cell>
                <Cell className="whitespace-nowrap">{formatDateTime(record.grantedAt)}</Cell>
                <Cell className="whitespace-nowrap">{formatDateTime(record.revokedAt)}</Cell>
                <Cell className="whitespace-nowrap">
                  <code className="font-latin">{record.policyVersion}</code>
                </Cell>
                <Cell>{humanize(record.method)}</Cell>
              </tr>
            ))}
          </Table>
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={consents.data.total}
            onPage={filters.setPage}
          />
        </>
      ) : consents.error ? null : (
        <PageSpinner label="Loading consent records" />
      )}
    </>
  );
}
