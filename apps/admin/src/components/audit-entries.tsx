'use client';

import type { components } from '@kcp/api-client-ts';
import Link from 'next/link';
import { formatDateTime, shortId } from '@/lib/format';
import { Cell, Table } from './data';

export type AuditEntry = components['schemas']['AuditEntryDto'];

/** Records about accounts link to the account (children are accounts too). */
const LINKED_ENTITIES = new Set(['User', 'Child']);

function Changes({ entry }: { entry: AuditEntry }) {
  const hasBefore = entry.before !== null && entry.before !== undefined;
  const hasAfter = entry.after !== null && entry.after !== undefined;
  if (!hasBefore && !hasAfter) return <span className="text-muted">—</span>;
  return (
    <details>
      <summary className="cursor-pointer font-medium text-brand-700">Details</summary>
      <div className="mt-2 grid gap-2">
        {hasBefore ? (
          <div>
            <p className="text-xs font-semibold text-muted uppercase">Before</p>
            <pre className="overflow-x-auto rounded-lg bg-canvas p-2 text-xs">
              {JSON.stringify(entry.before, null, 2)}
            </pre>
          </div>
        ) : null}
        {hasAfter ? (
          <div>
            <p className="text-xs font-semibold text-muted uppercase">After</p>
            <pre className="overflow-x-auto rounded-lg bg-canvas p-2 text-xs">
              {JSON.stringify(entry.after, null, 2)}
            </pre>
          </div>
        ) : null}
      </div>
    </details>
  );
}

export function AuditEntries({
  entries,
  caption,
  showEntity = true,
}: {
  entries: AuditEntry[];
  caption: string;
  showEntity?: boolean;
}) {
  const columns = ['When', 'Action', ...(showEntity ? ['Record'] : []), 'By', 'Changes'];
  return (
    <Table caption={caption} columns={columns} empty={entries.length === 0}>
      {entries.map((entry) => (
        <tr key={entry.id}>
          <Cell className="whitespace-nowrap">{formatDateTime(entry.createdAt)}</Cell>
          <Cell>
            <code className="font-latin font-semibold">{entry.action}</code>
          </Cell>
          {showEntity ? (
            <Cell>
              {entry.entityId && LINKED_ENTITIES.has(entry.entityType) ? (
                <Link
                  href={`/users/${entry.entityId}`}
                  className="text-brand-700 underline-offset-4 hover:underline"
                >
                  {entry.entityType} {shortId(entry.entityId)}
                </Link>
              ) : (
                <span>
                  {entry.entityType}
                  {entry.entityId ? ` ${shortId(entry.entityId)}` : ''}
                </span>
              )}
            </Cell>
          ) : null}
          <Cell>
            {entry.actor ? (
              <Link
                href={`/users/${entry.actor.id}`}
                className="break-all text-brand-700 underline-offset-4 hover:underline"
              >
                {entry.actor.email ?? entry.actor.role ?? shortId(entry.actor.id)}
              </Link>
            ) : (
              <span className="text-muted">System</span>
            )}
          </Cell>
          <Cell className="max-w-md">
            <Changes entry={entry} />
          </Cell>
        </tr>
      ))}
    </Table>
  );
}
