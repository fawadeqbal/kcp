import { clsx } from 'clsx';
import type { ReactNode } from 'react';
import { Icon, type IconName } from './icons.js';

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
      <span className="size-9 animate-spin rounded-full border-4 border-brand-200 border-t-brand" />
      {label ? <span className="sr-only">{label}</span> : null}
    </div>
  );
}

export type Tone = 'info' | 'success' | 'warning' | 'error';

const TONE_ICON: Record<Tone, IconName> = {
  info: 'info',
  success: 'check',
  warning: 'lightbulb',
  error: 'alert',
};

/**
 * A coloured message: a soft, rounded panel with an icon. It announces itself to
 * screen readers; pass `live={false}` when it sits inside a live region of its own
 * that is always on the page.
 */
export function Alert({
  tone = 'info',
  live = true,
  icon,
  children,
}: {
  tone?: Tone;
  live?: boolean;
  /** Another icon than the tone's own, or `false` for none. */
  icon?: IconName | false;
  children: ReactNode;
}) {
  const name = icon === undefined ? TONE_ICON[tone] : icon;
  return (
    <div
      role={live ? (tone === 'error' ? 'alert' : 'status') : undefined}
      className={clsx(
        'flex items-start gap-3 rounded-row px-4 py-3',
        tone === 'info' && 'bg-brand-100 text-brand-800',
        tone === 'success' && 'bg-sage-100 text-sage-800',
        tone === 'warning' && 'bg-warn-soft text-warn-text',
        tone === 'error' && 'bg-danger-soft text-danger-text',
      )}
    >
      {name ? <Icon name={name} className="mt-[0.2em] text-[1.1em]" /> : null}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export type BadgeTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger';

/** A small pill label ("Done", "Premium"), tinted from the ramps. */
export function Badge({
  tone = 'neutral',
  icon,
  children,
}: {
  tone?: BadgeTone;
  icon?: IconName;
  children: ReactNode;
}) {
  return (
    <span
      className={clsx(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[0.8rem] font-bold',
        tone === 'neutral' && 'bg-sand-200 text-sand-800',
        tone === 'brand' && 'bg-brand-100 text-brand-800',
        tone === 'success' && 'bg-sage-100 text-sage-800',
        tone === 'warning' && 'bg-warn-soft text-warn-text',
        tone === 'danger' && 'bg-danger-soft text-danger-text',
      )}
    >
      {icon ? <Icon name={icon} className="text-[0.9em]" /> : null}
      {children}
    </span>
  );
}
