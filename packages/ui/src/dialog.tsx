'use client';

import { type ReactNode, useEffect, useId, useRef } from 'react';

/**
 * A modal dialog built on the native <dialog> element: it traps focus, closes on
 * Escape and returns focus to the button that opened it.
 */
export function Dialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-[var(--radius-card)] border border-line bg-surface p-0 text-ink shadow-xl"
    >
      {open ? (
        <div className="flex flex-col gap-4 p-6">
          <h2 id={titleId} className="text-xl font-bold">
            {title}
          </h2>
          {children}
        </div>
      ) : null}
    </dialog>
  );
}
