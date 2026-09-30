import { clsx } from 'clsx';
import type { ReactNode } from 'react';

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={clsx(
        'inline-block animate-spin rounded-full border-2 border-current border-e-transparent',
        className ?? 'size-5',
      )}
      aria-hidden
    />
  );
}

/** Centred spinner for a page or panel that is still loading. */
export function PageSpinner({ label }: { label?: string }) {
  return (
    <div className="flex justify-center py-16" role="status" aria-busy="true">
      <span className="size-8 animate-spin rounded-full border-4 border-brand-100 border-t-brand-600" />
      {label ? <span className="sr-only">{label}</span> : null}
    </div>
  );
}

export type Tone = 'info' | 'success' | 'warning' | 'error';

/**
 * A coloured message. It announces itself to screen readers; pass `live={false}`
 * when it sits inside a live region of its own that is always on the page.
 */
export function Alert({
  tone = 'info',
  live = true,
  children,
}: {
  tone?: Tone;
  live?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      role={live ? (tone === 'error' ? 'alert' : 'status') : undefined}
      className={clsx(
        'rounded-xl border px-4 py-3',
        tone === 'info' && 'border-brand-100 bg-brand-50 text-ink',
        tone === 'success' && 'border-success/30 bg-success/10 text-success',
        tone === 'warning' && 'border-warning/30 bg-warning/10 text-warning',
        tone === 'error' && 'border-danger/30 bg-danger/10 text-danger',
      )}
    >
      {children}
    </div>
  );
}

export function Badge({
  tone = 'neutral',
  children,
}: {
  tone?: 'neutral' | 'brand' | 'success' | 'warning' | 'danger';
  children: ReactNode;
}) {
  return (
    <span
      className={clsx(
        'inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-sm font-medium',
        tone === 'neutral' && 'bg-line/60 text-ink',
        tone === 'brand' && 'bg-brand-50 text-brand-700',
        tone === 'success' && 'bg-success/10 text-success',
        tone === 'warning' && 'bg-warning/10 text-warning',
        tone === 'danger' && 'bg-danger/10 text-danger',
      )}
    >
      {children}
    </span>
  );
}
