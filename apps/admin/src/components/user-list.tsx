'use client';

import { Alert, PageSpinner, SelectField, TextField } from '@kcp/ui';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatDate, humanize } from '@/lib/format';
import { useLoad, useUrlFilters } from '@/lib/hooks';
import { Cell, FilterBar, Pagination, StatusBadge, Table } from './data';
import { PageHeader } from './shell';

/** Searches can hold an email or a child's username: kept out of the URL. */
const PRIVATE_FILTERS = ['search'] as const;
const FILTERS = ['search', 'role', 'status'] as const;
const STATUSES = ['ACTIVE', 'PENDING_VERIFICATION', 'SUSPENDED', 'DELETED'] as const;
type Status = (typeof STATUSES)[number];
const PAGE_SIZE = 25;

export function UserList() {
  const filters = useUrlFilters(FILTERS, PRIVATE_FILTERS);
  const { applied, page } = filters;
  const roles = useLoad(() => api.GET('/v1/admin/roles'), 'roles');
  const users = useLoad(
    () =>
      api.GET('/v1/users', {
        params: {
          query: {
            search: applied.search || undefined,
            role: applied.role || undefined,
            status: (applied.status as Status) || undefined,
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
        title="Users"
        description="Parents, students and staff. Students appear with their nickname and username only."
      />
      <FilterBar onSubmit={filters.apply} onReset={filters.reset}>
        <div className="min-w-60 flex-1">
          <TextField
            label="Search"
            placeholder="Email, username or name"
            type="search"
            value={filters.draft.search}
            onChange={(e) => filters.setDraftValue('search', e.target.value)}
          />
        </div>
        <SelectField
          label="Role"
          value={filters.draft.role}
          onChange={(e) => filters.setDraftValue('role', e.target.value)}
        >
          <option value="">All roles</option>
          {roles.data?.map((role) => (
            <option key={role.key} value={role.key}>
              {role.name} ({role.userCount})
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Status"
          value={filters.draft.status}
          onChange={(e) => filters.setDraftValue('status', e.target.value)}
        >
          <option value="">Any status</option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {humanize(status)}
            </option>
          ))}
        </SelectField>
      </FilterBar>

      {users.error ? <Alert tone="error">{users.error}</Alert> : null}
      {users.data ? (
        <>
          <Table
            caption="Users"
            columns={['Name', 'Login', 'Role', 'Status', 'Country', 'Joined', 'Last login']}
            empty={users.data.items.length === 0}
          >
            {users.data.items.map((user) => (
              <tr key={user.id} className="hover:bg-canvas/60">
                <Cell>
                  <Link
                    href={`/users/${user.id}`}
                    className="font-semibold text-brand-700 underline-offset-4 hover:underline"
                  >
                    {user.displayName ?? '(no name)'}
                  </Link>
                </Cell>
                <Cell className="whitespace-nowrap">{user.email ?? user.username}</Cell>
                <Cell>{user.role.name}</Cell>
                <Cell>
                  <StatusBadge status={user.status} />
                </Cell>
                <Cell>{user.countryCode ?? '—'}</Cell>
                <Cell className="whitespace-nowrap">{formatDate(user.createdAt)}</Cell>
                <Cell className="whitespace-nowrap">{formatDate(user.lastLoginAt)}</Cell>
              </tr>
            ))}
          </Table>
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={users.data.total}
            onPage={filters.setPage}
          />
        </>
      ) : users.error ? null : (
        <PageSpinner label="Loading users" />
      )}
    </>
  );
}
