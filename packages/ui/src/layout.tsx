import { clsx } from 'clsx';
import type { ReactNode } from 'react';

/** Narrow centred card used by every sign-in page. */
export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-md rounded-[var(--radius-card)] border border-line bg-surface p-6 shadow-sm sm:p-8">
      <h1 className="text-2xl font-bold">{title}</h1>
      {subtitle ? <p className="mt-2 text-muted">{subtitle}</p> : null}
      <div className="mt-6 flex flex-col gap-5">{children}</div>
    </div>
  );
}

/** A white panel with an optional heading and actions on the end side. */
export function Card({
  title,
  headingLevel = 2,
  actions,
  className,
  children,
}: {
  title?: ReactNode;
  headingLevel?: 2 | 3;
  actions?: ReactNode;
  className?: string;
  children?: ReactNode;
}) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  return (
    <section
      className={clsx(
        'rounded-[var(--radius-card)] border border-line bg-surface p-5 sm:p-6',
        className,
      )}
    >
      {title || actions ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          {title ? <Heading className="text-lg font-semibold">{title}</Heading> : <span />}
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/** Friendly placeholder for an empty list. */
export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[var(--radius-card)] border border-dashed border-line bg-surface px-6 py-10 text-center">
      <p className="text-lg font-semibold">{title}</p>
      {body ? <p className="max-w-md text-muted">{body}</p> : null}
      {action}
    </div>
  );
}
