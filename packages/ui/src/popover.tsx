'use client';

import { clsx } from 'clsx';
import { type ReactNode, useEffect, useId, useRef, useState } from 'react';

/**
 * A button that opens a small panel under it (the language menu, the notifications,
 * the student's menu). The panel closes on Escape (focus goes back to the button),
 * on a click outside, and when one of its links is followed.
 */
export function Popover({
  label,
  button,
  buttonClassName,
  panelClassName,
  panelLabel,
  children,
}: {
  /** The button's accessible name. */
  label: string;
  button: ReactNode;
  buttonClassName: string;
  panelClassName?: string;
  /** Names the panel as a region (for panels that aren't a plain list of links). */
  panelLabel?: string;
  children: ReactNode | ((close: () => void) => ReactNode);
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const wrapper = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    const onClick = (event: MouseEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  const close = () => setOpen(false);
  return (
    <div ref={wrapper} className="relative">
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
        className={buttonClassName}
      >
        {button}
      </button>
      {open ? (
        <div
          id={panelId}
          role={panelLabel ? 'region' : undefined}
          aria-label={panelLabel}
          className={clsx(
            'elev-lg absolute end-0 z-30 mt-2 rounded-panel bg-surface p-2.5 text-ink',
            panelClassName,
          )}
        >
          {typeof children === 'function' ? children(close) : children}
        </div>
      ) : null}
    </div>
  );
}
