'use client';

import { clsx } from 'clsx';
import type { ButtonHTMLAttributes } from 'react';
import { type ButtonSize, type ButtonVariant, buttonClass } from './button-class.js';
import { Spinner } from './feedback.js';

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
  size?: ButtonSize;
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
