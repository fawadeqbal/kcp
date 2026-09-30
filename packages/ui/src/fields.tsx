'use client';

import { clsx } from 'clsx';
import {
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  useId,
  useState,
} from 'react';

/*
 * Accessible form fields. They only use logical spacing (ms/me/ps/pe, start/end),
 * so every screen mirrors correctly in Arabic and Urdu.
 */

export interface FieldProps {
  label: string;
  hint?: ReactNode;
  error?: string;
}

function describedBy(id: string, hint?: ReactNode, error?: string) {
  return error ? `${id}-error` : hint ? `${id}-hint` : undefined;
}

function FieldShell({
  id,
  label,
  hint,
  error,
  children,
}: FieldProps & { id: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-medium">
        {label}
      </label>
      {children}
      {hint && !error ? (
        <p id={`${id}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export const inputClass = (error?: string) =>
  clsx(
    'min-h-11 w-full rounded-xl border bg-surface px-3.5 py-2 text-start text-base',
    error ? 'border-danger' : 'border-line focus:border-brand-500',
  );

export function TextField({
  label,
  hint,
  error,
  className,
  ...props
}: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <input
        id={id}
        {...props}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={clsx(inputClass(error), className)}
      />
    </FieldShell>
  );
}

export type PasswordFieldProps = FieldProps &
  InputHTMLAttributes<HTMLInputElement> & {
    /** Button text, e.g. "Show password" — passed in so the field works in every language. */
    showLabel: string;
    hideLabel: string;
  };

export function PasswordField({
  label,
  hint,
  error,
  showLabel,
  hideLabel,
  ...props
}: PasswordFieldProps) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <div className="relative">
        <input
          id={id}
          {...props}
          type={visible ? 'text' : 'password'}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, hint, error)}
          className={clsx(inputClass(error), 'pe-24')}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-1 end-1 rounded-lg px-3 text-sm font-medium text-brand-700 hover:bg-brand-50"
          aria-pressed={visible}
        >
          {visible ? hideLabel : showLabel}
        </button>
      </div>
    </FieldShell>
  );
}

export function SelectField({
  label,
  hint,
  error,
  children,
  ...props
}: FieldProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <select
        id={id}
        {...props}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={inputClass(error)}
      >
        {children}
      </select>
    </FieldShell>
  );
}

export function Checkbox({
  label,
  error,
  ...props
}: { label: ReactNode; error?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="flex items-start gap-3">
        <input
          id={id}
          type="checkbox"
          {...props}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="mt-1.5 size-5 shrink-0 accent-brand-600"
        />
        <span>{label}</span>
      </label>
      {error ? (
        <p id={`${id}-error`} className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * An on/off setting that takes effect immediately (unlike a checkbox in a form).
 * Screen readers announce it as a switch with its label and description.
 */
export function Switch({
  label,
  description,
  checked,
  onChange,
  disabled,
  busy,
}: {
  label: string;
  description?: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  busy?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex flex-col gap-0.5">
        <span id={`${id}-label`} className="font-medium">
          {label}
        </span>
        {description ? (
          <span id={`${id}-description`} className="text-sm text-muted">
            {description}
          </span>
        ) : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        aria-describedby={description ? `${id}-description` : undefined}
        aria-busy={busy || undefined}
        disabled={disabled || busy}
        onClick={() => onChange(!checked)}
        className={clsx(
          'relative mt-1 inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60',
          checked ? 'bg-brand-600' : 'bg-muted/40',
        )}
      >
        <span
          aria-hidden
          className={clsx(
            'absolute top-1 size-5 rounded-full bg-white shadow transition-[inset-inline-start]',
            checked ? 'start-6' : 'start-1',
          )}
        />
      </button>
    </div>
  );
}
