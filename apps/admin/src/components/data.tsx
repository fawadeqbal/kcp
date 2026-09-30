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
  bare = false,
}: {
  caption: string;
  columns: string[];
  children: ReactNode;
  empty?: boolean;
  emptyText?: string;
  /** Inside a card already: no panel of its own. */
  bare?: boolean;
}) {
  return (
    <div className={clsx('overflow-x-auto', !bare && 'rounded-card bg-surface px-3 py-2 sm:px-4')}>
      <table className="w-full min-w-[40rem] border-collapse text-start text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="border-b border-line text-xs tracking-[0.08em] text-muted uppercase">
          <tr>
            {columns.map((column) => (
              <th key={column} scope="col" className="px-2 py-2.5 text-start font-bold">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {empty ? (
            <tr>
              <td colSpan={columns.length} className="px-2 py-10 text-center text-muted">
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
  return <td className={clsx('px-2 py-3 align-top', className)}>{children}</td>;
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
      className="flex flex-wrap items-end gap-4 rounded-card bg-surface p-5"
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
          <dt className="text-sm font-semibold text-muted">{label}</dt>
          <dd className="min-w-0 break-words">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
