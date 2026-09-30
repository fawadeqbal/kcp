'use client';

import type { components } from '@kcp/api-client-ts';
import { Alert, Badge, Button, PageSpinner, SelectField } from '@kcp/ui';
import Link from 'next/link';
import { useState } from 'react';
import { api, errorCode } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { errorMessage, NETWORK_ERROR } from '@/lib/errors';
import { formatDateTime, humanize } from '@/lib/format';
import { useLoad, useUrlFilters } from '@/lib/hooks';
import { Cell, FilterBar, Pagination, Table } from './data';
import { PageHeader } from './shell';

type Item = components['schemas']['FeedbackItemDto'];
type Status = Item['status'];

const FILTERS = ['status'] as const;
const STATUSES = ['NEW', 'READ', 'DONE'] as const satisfies Status[];
const PAGE_SIZE = 25;

const KIND_LABELS: Record<Item['kind'], string> = {
  SAFETY: 'Safety report',
  BUG: 'Something broken',
  IDEA: 'Idea',
  PRAISE: 'Praise',
  OTHER: 'Other',
};
const KIND_TONES = {
  SAFETY: 'danger',
  BUG: 'warning',
  IDEA: 'brand',
  PRAISE: 'success',
  OTHER: 'neutral',
} as const;
const STATUS_TONES = { NEW: 'warning', READ: 'neutral', DONE: 'success' } as const;

/** What a message can move to next, as buttons. */
const NEXT: Record<Status, { status: Status; label: string }[]> = {
  NEW: [
    { status: 'READ', label: 'Mark read' },
    { status: 'DONE', label: 'Mark done' },
  ],
  READ: [
    { status: 'DONE', label: 'Mark done' },
    { status: 'NEW', label: 'Mark unread' },
  ],
  DONE: [{ status: 'READ', label: 'Reopen' }],
};

/** Everything families sent with the feedback button, newest first. */
export function FeedbackList() {
  const { state } = useAuth();
  const filters = useUrlFilters(FILTERS);
  const { applied, page } = filters;
  const feedback = useLoad(
    () =>
      api.GET('/v1/admin/feedback', {
        params: {
          query: { status: (applied.status as Status) || undefined, page, pageSize: PAGE_SIZE },
        },
      }),
    filters.key,
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ability = state.status === 'authenticated' ? state.ability : null;
  const canUpdate = ability?.can('update', 'Feedback', 'status') ?? false;
  const canOpenUsers = ability?.can('read', 'User') ?? false;

  async function setStatus(item: Item, status: Status) {
    setBusy(item.id);
    setError(null);
    try {
      const { error: apiError, response } = await api.PATCH('/v1/admin/feedback/{id}', {
        params: { path: { id: item.id } },
        body: { status },
      });
      if (response.ok) feedback.reload();
      else setError(errorMessage(errorCode(apiError), response.status));
    } catch {
      setError(NETWORK_ERROR);
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Feedback"
        description="Messages sent with the feedback button by parents and students. Safety reports come first: read new messages every day during the pilot."
      />
      <FilterBar onSubmit={filters.apply} onReset={filters.reset}>
        <SelectField
          label="Status"
          value={filters.draft.status}
          onChange={(e) => filters.setDraftValue('status', e.target.value)}
        >
          <option value="">Any</option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {humanize(status)}
            </option>
          ))}
        </SelectField>
      </FilterBar>

      {feedback.error ? <Alert tone="error">{feedback.error}</Alert> : null}
      {error ? <Alert tone="error">{error}</Alert> : null}
      {feedback.data ? (
        <>
          <p className="text-sm font-medium" aria-live="polite">
            {feedback.data.unread === 0
              ? 'No new messages.'
              : `${feedback.data.unread} new ${feedback.data.unread === 1 ? 'message' : 'messages'}`}
          </p>
          <Table
            caption="Feedback messages"
            columns={['Received', 'About', 'Message', 'From', 'Status']}
            empty={feedback.data.items.length === 0}
          >
            {feedback.data.items.map((item) => (
              <tr key={item.id} className={item.status === 'NEW' ? 'bg-warn-soft/40' : undefined}>
                <Cell className="whitespace-nowrap">{formatDateTime(item.createdAt)}</Cell>
                <Cell>
                  <Badge tone={KIND_TONES[item.kind]}>{KIND_LABELS[item.kind]}</Badge>
                </Cell>
                <Cell className="max-w-md">
                  <p
                    dir="auto"
                    lang={item.languageCode}
                    className="break-words whitespace-pre-wrap"
                  >
                    {item.message}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {item.languageCode.toUpperCase()}
                    {item.pagePath ? (
                      <>
                        {' · '}
                        <code className="font-latin break-all">{item.pagePath}</code>
                      </>
                    ) : null}
                  </p>
                </Cell>
                <Cell>
                  {item.sender ? (
                    <span className="flex flex-col">
                      {canOpenUsers ? (
                        <Link
                          href={`/users/${item.sender.id}`}
                          className="font-semibold text-brand-text underline-offset-4 hover:underline"
                        >
                          {item.sender.name ?? 'Unnamed'}
                        </Link>
                      ) : (
                        <span className="font-semibold">{item.sender.name ?? 'Unnamed'}</span>
                      )}
                      <span className="text-xs text-muted">{humanize(item.sender.roleKey)}</span>
                    </span>
                  ) : (
                    <span className="text-muted">Deleted account</span>
                  )}
                </Cell>
                <Cell>
                  <span className="flex flex-col items-start gap-2">
                    <Badge tone={STATUS_TONES[item.status]}>{humanize(item.status)}</Badge>
                    {canUpdate ? (
                      <span className="flex gap-2 whitespace-nowrap">
                        {NEXT[item.status].map((next) => (
                          <Button
                            key={next.status}
                            size="sm"
                            variant="secondary"
                            disabled={busy === item.id}
                            onClick={() => void setStatus(item, next.status)}
                            aria-label={`${next.label}: message from ${formatDateTime(item.createdAt)}`}
                          >
                            {next.label}
                          </Button>
                        ))}
                      </span>
                    ) : null}
                  </span>
                </Cell>
              </tr>
            ))}
          </Table>
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={feedback.data.total}
            onPage={filters.setPage}
          />
        </>
      ) : feedback.error ? null : (
        <PageSpinner label="Loading feedback" />
      )}
    </>
  );
}
