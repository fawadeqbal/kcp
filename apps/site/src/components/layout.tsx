import { Icon } from '@kcp/ui';
import { clsx } from 'clsx';
import type { ReactNode } from 'react';

const WIDTHS = {
  page: 'max-w-[80rem]',
  text: 'max-w-4xl',
  // About 70 characters a line, for articles.
  article: 'max-w-3xl',
  narrow: 'max-w-2xl',
} as const;

/** Page width and side padding (16px on phones, 56px on wide screens). */
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
    <div className={clsx('mx-auto w-full px-4 sm:px-6 lg:px-14', WIDTHS[width], className)}>
      {children}
    </div>
  );
}

/**
 * The top of an inner page: its one <h1>, a short introduction and optional extras, on
 * a rounded terracotta-tinted panel with two soft circles.
 */
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
    <div className="px-2 sm:px-4">
      <div className="relative mx-auto max-w-[80rem] overflow-hidden rounded-[2.5rem] bg-brand-100 sm:rounded-[3rem]">
        <span
          aria-hidden="true"
          className="absolute -end-16 -top-24 size-72 rounded-full bg-brand-200"
        />
        <span
          aria-hidden="true"
          className="absolute -bottom-20 end-40 size-40 rounded-full bg-sage-200 max-md:hidden"
        />
        <Container className="relative py-12 sm:py-16">
          <h1 className="max-w-3xl text-4xl text-balance sm:text-5xl">{title}</h1>
          {subtitle ? <p className="mt-4 max-w-2xl text-lg text-brand-900">{subtitle}</p> : null}
          {children}
        </Container>
      </div>
    </div>
  );
}

/**
 * A band of the page with an <h2>, an optional introduction and content. `surface` and
 * `sage` bands are rounded panels set in from the page edges.
 */
export function Section({
  id,
  title,
  subtitle,
  tone = 'canvas',
  aside,
  children,
}: {
  /** Used for the heading id (aria-labelledby). */
  id: string;
  title: ReactNode;
  subtitle?: ReactNode;
  tone?: 'canvas' | 'surface' | 'sage';
  /** Under the introduction, e.g. a "more" link. */
  aside?: ReactNode;
  children: ReactNode;
}) {
  const band = tone !== 'canvas';
  const content = (
    <Container className={band ? 'py-12 sm:py-16' : undefined}>
      <div className="max-w-2xl">
        <h2
          id={`${id}-title`}
          className={clsx(
            'text-4xl text-balance sm:text-[2.5rem]',
            tone === 'sage' && 'text-sage-900',
          )}
        >
          {title}
        </h2>
        {subtitle ? (
          <p className={clsx('mt-2 text-lg', tone === 'sage' ? 'text-sage-800' : 'text-muted')}>
            {subtitle}
          </p>
        ) : null}
        {aside ? <div className="mt-4">{aside}</div> : null}
      </div>
      <div className="mt-8">{children}</div>
    </Container>
  );
  return (
    <section
      aria-labelledby={`${id}-title`}
      className={band ? 'px-2 py-6 sm:px-4 sm:py-8' : 'py-12 sm:py-18'}
    >
      {band ? (
        <div
          className={clsx(
            'mx-auto max-w-[80rem] rounded-[2.5rem] sm:rounded-[3rem]',
            tone === 'surface' ? 'bg-surface' : 'bg-sage-100',
          )}
        >
          {content}
        </div>
      ) : (
        content
      )}
    </section>
  );
}

/** A round, tinted holder for an icon. */
export function IconBadge({
  children,
  tone = 'brand',
  size = 'md',
}: {
  children: ReactNode;
  /** `sageSolid`: a filled sage disc (the safety promises). */
  tone?: 'brand' | 'sage' | 'sageSolid' | 'accent' | 'success';
  size?: 'sm' | 'md' | 'lg';
}) {
  return (
    <span
      className={clsx(
        'inline-flex shrink-0 items-center justify-center rounded-full',
        size === 'sm' && 'size-9 [&>svg]:size-4',
        size === 'md' && 'size-11 [&>svg]:size-5',
        size === 'lg' && 'size-13 [&>svg]:size-5.5',
        (tone === 'brand' || tone === 'accent') && 'bg-brand-100 text-brand-text',
        (tone === 'sage' || tone === 'success') && 'bg-sage-100 text-sage-text',
        tone === 'sageSolid' && 'bg-sage text-on-primary',
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
          <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-sage-100 text-sage-text">
            <Icon name="check" className="text-sm" />
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
