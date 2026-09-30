'use client';

import { clsx } from 'clsx';
import type { ButtonHTMLAttributes } from 'react';
import { Spinner } from './feedback.js';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export const buttonClass = (variant: ButtonVariant = 'primary', size: 'md' | 'sm' = 'md') =>
  clsx(
    'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60',
    size === 'md' ? 'min-h-11 px-5' : 'min-h-9 px-3.5 text-sm',
    variant === 'primary' && 'bg-brand-600 text-white hover:bg-brand-700',
    variant === 'secondary' && 'border border-line bg-surface text-ink hover:bg-brand-50',
    variant === 'ghost' && 'text-brand-700 underline-offset-4 hover:underline',
    variant === 'danger' && 'bg-danger text-white hover:bg-danger/90',
  );

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  loading,
  children,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: 'md' | 'sm';
  loading?: boolean;
}) {
  return (
    <button
      type={type}
      {...props}
      disabled={props.disabled || loading}
      aria-busy={loading || undefined}
      className={clsx(buttonClass(variant, size), className)}
    >
      {loading ? <Spinner className="size-4" /> : null}
      {children}
    </button>
  );
}
