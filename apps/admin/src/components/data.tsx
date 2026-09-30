'use client';

import { Badge, Button } from '@kcp/ui';
import { clsx } from 'clsx';
import type { ReactNode } from 'react';
import { humanize, pageSummary, statusTone } from '@/lib/format';

/** A responsive table: scrolls sideways on small screens instead of squashing columns. */
export function Table({
  caption,
  columns,
  children,
  empty,
  emptyText = 'Nothing matches these filters.',
}: {
  caption: string;
  columns: string[];
  children: ReactNode;
  empty?: boolean;
  emptyText?: string;
}) {
  return (
    <div className="overflow-x-auto rounded-[var(--radius-card)] border border-line bg-surface">
      <table className="w-full min-w-[40rem] border-collapse text-start text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-canvas text-muted">
          <tr>
            {columns.map((column) => (
              <th key={column} scope="col" className="px-4 py-3 text-start font-semibold">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {empty ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-muted">
                {emptyText}
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  );
}

export function Cell({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={clsx('px-4 py-3 align-top', className)}>{children}</td>;
}

export function Pagination({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
}) {
  const last = Math.max(1, Math.ceil(total / pageSize));
  return (
    <nav aria-label="Pages" className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted" aria-live="polite">
        {pageSummary(page, pageSize, total)}
      </p>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={page >= last}
          onClick={() => onPage(page + 1)}
        >
          Next
        </Button>
      </div>
    </nav>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={statusTone(status)}>{humanize(status)}</Badge>;
}

/** Filters above a list. Submitting applies them (and goes back to page 1). */
export function FilterBar({
  onSubmit,
  onReset,
  children,
}: {
  onSubmit: () => void;
  onReset: () => void;
  children: ReactNode;
}) {
  return (
    <form
      role="search"
      className="flex flex-wrap items-end gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      {children}
      <div className="flex gap-2">
        <Button type="submit">Apply</Button>
        <Button variant="ghost" onClick={onReset}>
          Clear
        </Button>
      </div>
    </form>
  );
}

/** Label and value pairs, e.g. on a user's page. */
export function Details({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[auto_1fr]">
      {items.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-muted">{label}</dt>
          <dd className="min-w-0 break-words">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
