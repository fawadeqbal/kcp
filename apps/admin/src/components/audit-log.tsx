'use client';

import { Alert, PageSpinner, SelectField, TextField } from '@kcp/ui';
import { api } from '@/lib/api';
import { useLoad, useUrlFilters } from '@/lib/hooks';
import { AuditEntries } from './audit-entries';
import { FilterBar, Pagination } from './data';
import { PageHeader } from './shell';

const FILTERS = ['action', 'entityType', 'entityId', 'actorId'] as const;
const ENTITY_TYPES = ['User', 'Child', 'ConsentRecord', 'FeatureFlag', 'Role'] as const;
const UUID = /^[0-9a-f-]{36}$/i;
const PAGE_SIZE = 50;

/** Everything staff and parents changed, newest first. Entries can't be edited or deleted. */
export function AuditLog() {
  const filters = useUrlFilters(FILTERS);
  const { applied, page } = filters;
  const invalidId = [applied.entityId, applied.actorId].some((id) => id && !UUID.test(id));
  const entries = useLoad(
    () =>
      api.GET('/v1/admin/audit-logs', {
        params: {
          query: {
            action: applied.action || undefined,
            entityType: applied.entityType || undefined,
            entityId: applied.entityId || undefined,
            actorId: applied.actorId || undefined,
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
        title="Audit log"
        description="Every change made by staff and parents, newest first. Entries can’t be edited or deleted."
      />
      <FilterBar onSubmit={filters.apply} onReset={filters.reset}>
        <div className="min-w-56 flex-1">
          <TextField
            label="Action"
            placeholder="user.suspend, or a prefix like child."
            value={filters.draft.action}
            onChange={(e) => filters.setDraftValue('action', e.target.value)}
          />
        </div>
        <SelectField
          label="Record type"
          value={filters.draft.entityType}
          onChange={(e) => filters.setDraftValue('entityType', e.target.value)}
        >
          <option value="">All</option>
          {ENTITY_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </SelectField>
        <div className="min-w-56 flex-1">
          <TextField
            label="Done by (account ID)"
            placeholder="0190a1b2-…"
            value={filters.draft.actorId}
            onChange={(e) => filters.setDraftValue('actorId', e.target.value)}
          />
        </div>
      </FilterBar>

      {invalidId ? (
        <Alert tone="error">Account IDs look like 0190a1b2-…; copy one from a user’s page.</Alert>
      ) : entries.error ? (
        <Alert tone="error">{entries.error}</Alert>
      ) : null}
      {entries.data && !invalidId ? (
        <>
          <AuditEntries entries={entries.data.items} caption="Audit log entries" />
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={entries.data.total}
            onPage={filters.setPage}
          />
        </>
      ) : entries.error || invalidId ? null : (
        <PageSpinner label="Loading the audit log" />
      )}
    </>
  );
}
