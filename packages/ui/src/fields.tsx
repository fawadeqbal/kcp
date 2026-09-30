'use client';

import { clsx } from 'clsx';
import { Icon } from './icons.js';
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
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      {children}
      {hint && !error ? (
        <p id={`${id}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="text-sm font-semibold text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const fieldClass = (error: string | undefined, shape: string) =>
  clsx(
    'w-full border bg-raised text-start text-base text-ink caret-brand transition-colors placeholder:text-muted',
    'focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-brand/30 focus-visible:outline-none',
    error ? 'border-danger' : 'border-line hover:border-ink/45',
    shape,
  );

/** Pill-shaped text fields on a light well, with the accent ring when focused. */
export const inputClass = (error?: string) =>
  fieldClass(error, 'min-h-12 rounded-full px-4.5 py-2');

/** Several lines of text: the same field, with a softer round corner. */
export const textareaClass = (error?: string) =>
  fieldClass(error, 'min-h-24 rounded-row px-4.5 py-3 leading-relaxed');

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
          className={clsx(inputClass(error), 'pe-14')}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-1 end-1 grid w-11 place-items-center rounded-full text-lg text-muted hover:bg-ink/7 hover:text-ink"
          aria-pressed={visible}
          aria-label={visible ? hideLabel : showLabel}
          title={visible ? hideLabel : showLabel}
        >
          <Icon name={visible ? 'eyeOff' : 'eye'} />
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
      <div className="relative">
        <select
          id={id}
          {...props}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, hint, error)}
          className={clsx(inputClass(error), 'appearance-none pe-11')}
        >
          {children}
        </select>
        <Icon
          name="chevD"
          className="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 text-muted"
        />
      </div>
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
          className="mt-1 size-5 shrink-0 accent-primary"
        />
        <span>{label}</span>
      </label>
      {error ? (
        <p id={`${id}-error`} className="text-sm font-semibold text-danger" role="alert">
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
        <span id={`${id}-label`} className="font-bold">
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
          'relative mt-0.5 inline-flex h-7 w-11.5 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-45',
          checked ? 'bg-sage-600' : 'bg-sand-400',
        )}
      >
        <span
          aria-hidden
          className={clsx(
            'elev-sm absolute top-0.75 size-5.5 rounded-full bg-white transition-[inset-inline-start]',
            checked ? 'start-5.25' : 'start-0.75',
          )}
        />
      </button>
    </div>
  );
}
