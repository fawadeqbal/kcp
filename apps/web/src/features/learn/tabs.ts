import type { KeyboardEvent } from 'react';

/**
 * Arrow keys, Home and End for a row of tabs (the WAI-ARIA tabs pattern, where
 * moving to a tab also selects it). Left and right swap in Arabic and Urdu.
 */
export function onTabKeyDown(
  event: KeyboardEvent<HTMLElement>,
  count: number,
  current: number,
  select: (index: number) => void,
) {
  const rtl = getComputedStyle(event.currentTarget).direction === 'rtl';
  let next: number | undefined;
  if (event.key === 'ArrowRight') next = current + (rtl ? -1 : 1);
  else if (event.key === 'ArrowLeft') next = current + (rtl ? 1 : -1);
  else if (event.key === 'Home') next = 0;
  else if (event.key === 'End') next = count - 1;
  if (next === undefined) return;
  event.preventDefault();
  next = (next + count) % count;
  select(next);
  const tabs = event.currentTarget
    .closest('[role="tablist"]')
    ?.querySelectorAll<HTMLElement>('[role="tab"]');
  tabs?.[next]?.focus();
}
