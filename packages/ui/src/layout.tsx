import { clsx } from 'clsx';
import type { ReactNode } from 'react';
import { Icon, type IconName } from './icons.js';

/**
 * The content of a sign-in page (log in, sign up, reset password…): a big title and
 * the form, on the page's own ground beside the picture panel.
 */
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
    <div className="mx-auto w-full max-w-md">
      <h1 className="text-4xl sm:text-[2.5rem]">{title}</h1>
      {subtitle ? <p className="mt-2 text-muted">{subtitle}</p> : null}
      <div className="mt-7 flex flex-col gap-5">{children}</div>
    </div>
  );
}

/** A sand panel with an optional heading and actions on the end side. */
export function Card({
  title,
  headingLevel = 2,
  actions,
  kicker,
  tone = 'surface',
  className,
  children,
}: {
  title?: ReactNode;
  headingLevel?: 2 | 3;
  actions?: ReactNode;
  /** A small uppercase line above the title ("Module 1"). */
  kicker?: ReactNode;
  /** `raised` for a card inside a card; `brand` and `sage` for tinted ones. */
  tone?: 'surface' | 'raised' | 'brand' | 'sage';
  className?: string;
  children?: ReactNode;
}) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  return (
    <section
      className={clsx(
        'p-5 sm:p-6',
        tone === 'raised' ? 'rounded-inner bg-raised' : 'rounded-card',
        tone === 'surface' && 'bg-surface',
        tone === 'brand' && 'bg-brand-100',
        tone === 'sage' && 'bg-sage-100',
        className,
      )}
    >
      {title || actions || kicker ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            {kicker ? <Kicker>{kicker}</Kicker> : null}
            {title ? (
              <Heading className={headingLevel === 2 ? 'text-2xl' : 'text-xl'}>{title}</Heading>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/** The small uppercase label above a title ("PICK UP WHERE YOU LEFT OFF"). */
export function Kicker({
  tone = 'brand',
  children,
}: {
  tone?: 'brand' | 'sage';
  children: ReactNode;
}) {
  return (
    <p
      className={clsx(
        'text-xs font-bold tracking-[0.1em] uppercase',
        tone === 'brand' ? 'text-brand-text' : 'text-sage-text',
      )}
    >
      {children}
    </p>
  );
}

/** A section title with an optional line of detail beside it ("Builder · 8 lessons"). */
export function SectionHeading({
  id,
  level = 2,
  detail,
  children,
}: {
  id?: string;
  level?: 1 | 2;
  detail?: ReactNode;
  children: ReactNode;
}) {
  const Heading = level === 1 ? 'h1' : 'h2';
  return (
    <div className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1">
      <Heading id={id} className={level === 1 ? 'text-4xl' : 'text-3xl'}>
        {children}
      </Heading>
      {detail ? <span className="text-muted">{detail}</span> : null}
    </div>
  );
}

/** An icon on a round, tinted disc (lists of promises, cards of steps). */
export function IconBubble({
  icon,
  tone = 'brand',
  size = 'md',
  className,
}: {
  icon: IconName;
  tone?: 'brand' | 'sage' | 'solid' | 'sageSolid' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={clsx(
        'grid shrink-0 place-items-center rounded-full',
        size === 'sm' && 'size-9 text-base',
        size === 'md' && 'size-11 text-xl',
        size === 'lg' && 'size-13 text-[1.4rem]',
        tone === 'brand' && 'bg-brand-100 text-brand-text',
        tone === 'sage' && 'bg-sage-100 text-sage-text',
        tone === 'solid' && 'bg-brand text-on-primary',
        tone === 'sageSolid' && 'bg-sage text-on-primary',
        tone === 'neutral' && 'bg-sand-200 text-ink',
        className,
      )}
    >
      <Icon name={icon} />
    </span>
  );
}

/** A rounded progress bar with an accessible name and value. */
export function Meter({
  value,
  max,
  label,
  tone = 'brand',
  track = 'neutral',
  className,
}: {
  value: number;
  max: number;
  label: string;
  tone?: 'brand' | 'sage';
  /** The empty part: neutral, or a terracotta tint on terracotta cards. */
  track?: 'neutral' | 'brand';
  className?: string;
}) {
  const percent = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 100;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.min(value, max)}
      className={clsx(
        'h-3 overflow-hidden rounded-full',
        track === 'brand' ? 'bg-brand-200' : 'bg-track',
        className,
      )}
    >
      <div
        className={clsx(
          'h-full rounded-full motion-safe:transition-[width]',
          tone === 'brand' ? 'bg-brand' : 'bg-sage',
        )}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

/** Friendly placeholder for an empty list. */
export function EmptyState({
  title,
  body,
  action,
  icon = 'sparkle',
}: {
  title: string;
  body?: ReactNode;
  action?: ReactNode;
  icon?: IconName;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border-2 border-dashed border-line px-6 py-10 text-center">
      <IconBubble icon={icon} />
      <p className="font-display text-xl">{title}</p>
      {body ? <p className="max-w-md text-muted">{body}</p> : null}
      {action}
    </div>
  );
}
