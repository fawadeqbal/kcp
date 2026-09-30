import { clsx } from 'clsx';
import type { ReactNode } from 'react';

const WIDTHS = {
  page: 'max-w-6xl',
  text: 'max-w-4xl',
  // About 70 characters a line, for articles.
  article: 'max-w-3xl',
  narrow: 'max-w-2xl',
} as const;

/** Page width and side padding (16px on phones). */
export function Container({
  width = 'page',
  className,
  children,
}: {
  width?: keyof typeof WIDTHS;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={clsx('mx-auto w-full px-4 sm:px-6', WIDTHS[width], className)}>{children}</div>
  );
}

/** The top of an inner page: its one <h1>, a short introduction and optional extras. */
export function PageIntro({
  title,
  subtitle,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="border-b border-line bg-brand-50">
      <Container className="py-12 sm:py-16">
        <h1 className="max-w-3xl text-3xl font-bold text-balance sm:text-4xl">{title}</h1>
        {subtitle ? <p className="mt-4 max-w-2xl text-lg text-muted">{subtitle}</p> : null}
        {children}
      </Container>
    </div>
  );
}

/** A band of the page with an <h2>, an optional introduction and content. */
export function Section({
  id,
  title,
  subtitle,
  tone = 'canvas',
  children,
}: {
  /** Used for the heading id (aria-labelledby). */
  id: string;
  title: ReactNode;
  subtitle?: ReactNode;
  tone?: 'canvas' | 'surface';
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={`${id}-title`}
      className={clsx('py-14 sm:py-20', tone === 'surface' && 'border-y border-line bg-surface')}
    >
      <Container>
        <div className="max-w-2xl">
          <h2 id={`${id}-title`} className="text-2xl font-bold text-balance sm:text-3xl">
            {title}
          </h2>
          {subtitle ? <p className="mt-3 text-lg text-muted">{subtitle}</p> : null}
        </div>
        <div className="mt-8 sm:mt-10">{children}</div>
      </Container>
    </section>
  );
}

/** A round, tinted holder for an icon. */
export function IconBadge({
  children,
  tone = 'brand',
}: {
  children: ReactNode;
  tone?: 'brand' | 'accent' | 'success';
}) {
  return (
    <span
      className={clsx(
        'inline-flex size-11 shrink-0 items-center justify-center rounded-full',
        tone === 'brand' && 'bg-brand-100 text-brand-700',
        tone === 'accent' && 'bg-accent/20 text-warning',
        tone === 'success' && 'bg-success/10 text-success',
      )}
    >
      {children}
    </span>
  );
}

/** A list with check marks in front of each item. */
export function CheckList({ items, className }: { items: ReactNode[]; className?: string }) {
  return (
    <ul className={clsx('flex flex-col gap-3', className)}>
      {items.map((item, index) => (
        <li key={index} className="flex items-start gap-3">
          <span className="mt-1 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="size-3.5">
              <path
                d="M20 6 9 17l-5-5"
                fill="none"
                stroke="currentColor"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
