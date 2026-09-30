import { clsx } from 'clsx';

/*
 * No 'use client' here: server components style links with buttonClass too.
 */

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft' | 'sage';
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * Pill buttons in the display face. `primary` is the one main action on a screen;
 * `secondary` is outlined; `ghost` reads like a link; `soft` is a terracotta tint;
 * `sage` is the calm, parents' second voice; `danger` deletes.
 * Links styled as buttons use the same classes (`buttonClass`).
 */
export const buttonClass = (variant: ButtonVariant = 'primary', size: ButtonSize = 'md') =>
  clsx(
    'font-display inline-flex items-center justify-center gap-2 rounded-full text-center leading-tight transition-colors',
    'disabled:cursor-not-allowed disabled:opacity-45 aria-disabled:cursor-not-allowed aria-disabled:opacity-45',
    size === 'sm' && 'min-h-9 text-sm',
    size === 'md' && 'min-h-11 text-[0.95rem]',
    size === 'lg' && 'min-h-14 text-[1.05rem]',
    // A ghost button hugs its words; the others get room on both sides.
    variant === 'ghost' ? 'px-2' : { sm: 'px-3.5', md: 'px-5', lg: 'px-7' }[size],
    variant === 'primary' &&
      'bg-primary text-on-primary hover:bg-primary-hover active:bg-primary-active',
    variant === 'secondary' && 'border border-line text-ink hover:bg-ink/7 active:bg-ink/14',
    variant === 'ghost' && 'text-brand-text hover:bg-brand/10 active:bg-brand/18',
    variant === 'soft' && 'bg-brand-100 text-brand-800 hover:bg-brand-200 active:bg-brand-300',
    variant === 'sage' && 'bg-sage-700 text-sage-100 hover:bg-sage-800 active:bg-sage-900',
    variant === 'danger' && 'bg-danger text-on-danger hover:bg-danger/90 active:bg-danger/80',
  );
