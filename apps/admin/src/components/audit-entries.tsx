'use client';

import type { components } from '@kcp/api-client-ts';
import { Badge } from '@kcp/ui';
import Link from 'next/link';
import { describeAction, formatAgo, formatDateTime, shortId } from '@/lib/format';
import { Cell, Table } from './data';

export type AuditEntry = components['schemas']['AuditEntryDto'];

/** Records about accounts link to the account (children are accounts too). */
const LINKED_ENTITIES = new Set(['User', 'Child']);

/** "[Suspended] account": the action as a coloured tag and a few words. */
function ActionTag({ action }: { action: string }) {
  const { tag, tone, text } = describeAction(action);
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <Badge tone={tone}>{tag}</Badge>
      {text}
    </span>
  );
}

/** Who did it: a staff member's email, a parent's email, or the system. */
function Actor({ entry }: { entry: AuditEntry }) {
  if (!entry.actor) return <span className="text-muted">System</span>;
  return (
    <Link
      href={`/users/${entry.actor.id}`}
      className="font-semibold break-all underline-offset-4 hover:text-brand-text hover:underline"
    >
      {entry.actor.email ?? entry.actor.role ?? shortId(entry.actor.id)}
    </Link>
  );
}

/** The record an entry is about; accounts link to their page. */
function RecordLink({ entry }: { entry: AuditEntry }) {
  const label = `${entry.entityType}${entry.entityId ? ` ${shortId(entry.entityId)}` : ''}`;
  if (entry.entityId && LINKED_ENTITIES.has(entry.entityType)) {
    return (
      <Link
        href={`/users/${entry.entityId}`}
        className="font-mono text-[0.8rem] underline-offset-4 hover:text-brand-text hover:underline"
      >
        {label}
      </Link>
    );
  }
  return <span className="font-mono text-[0.8rem]">{label}</span>;
}

/** The overview's short feed: when, who, what, which record. */
export function RecentActivity({ entries }: { entries: AuditEntry[] }) {
  return (
    <Table
      bare
      caption="Recent activity"
      columns={['When', 'Who', 'What', 'Record']}
      empty={entries.length === 0}
      emptyText="Nothing has happened yet."
    >
      {entries.map((entry) => (
        <tr key={entry.id}>
          <Cell className="whitespace-nowrap text-muted">
            <time dateTime={String(entry.createdAt)} title={formatDateTime(entry.createdAt)}>
              {formatAgo(entry.createdAt)}
            </time>
          </Cell>
          <Cell>
            <Actor entry={entry} />
          </Cell>
          <Cell>
            <ActionTag action={entry.action} />
          </Cell>
          <Cell>
            <RecordLink entry={entry} />
          </Cell>
        </tr>
      ))}
    </Table>
  );
}

function Changes({ entry }: { entry: AuditEntry }) {
  const hasBefore = entry.before !== null && entry.before !== undefined;
  const hasAfter = entry.after !== null && entry.after !== undefined;
  if (!hasBefore && !hasAfter) return <span className="text-muted">—</span>;
  return (
    <details>
      <summary className="cursor-pointer font-medium text-brand-text">Details</summary>
      <div className="mt-2 grid gap-2">
        {hasBefore ? (
          <div>
            <p className="text-xs font-semibold text-muted uppercase">Before</p>
            <pre className="overflow-x-auto rounded-well bg-canvas p-3 text-xs">
              {JSON.stringify(entry.before, null, 2)}
            </pre>
          </div>
        ) : null}
        {hasAfter ? (
          <div>
            <p className="text-xs font-semibold text-muted uppercase">After</p>
            <pre className="overflow-x-auto rounded-well bg-canvas p-3 text-xs">
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
  bare = false,
}: {
  entries: AuditEntry[];
  caption: string;
  showEntity?: boolean;
  bare?: boolean;
}) {
  const columns = ['When', 'Action', ...(showEntity ? ['Record'] : []), 'By', 'Changes'];
  return (
    <Table caption={caption} columns={columns} empty={entries.length === 0} bare={bare}>
      {entries.map((entry) => (
        <tr key={entry.id}>
          <Cell className="whitespace-nowrap">{formatDateTime(entry.createdAt)}</Cell>
          <Cell>
            <ActionTag action={entry.action} />
            <code className="mt-1 block text-xs text-muted">{entry.action}</code>
          </Cell>
          {showEntity ? (
            <Cell>
              <RecordLink entry={entry} />
            </Cell>
          ) : null}
          <Cell>
            <Actor entry={entry} />
          </Cell>
          <Cell className="max-w-md">
            <Changes entry={entry} />
          </Cell>
        </tr>
      ))}
    </Table>
  );
}
