'use client';

import { clsx } from 'clsx';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Icon } from './ui';

/**
 * Shows one part of a page (a preview, a shipped project) on the whole screen, and back.
 * It uses the browser's full-screen mode where there is one (Esc also leaves it); where
 * there isn't (Safari on iPhone), the part covers the window instead, and Esc or the
 * button closes it. The part is never moved in the page, so a running preview keeps
 * running.
 *
 * Put `ref` on the part, and style it with `active` (see `FULL_SCREEN_CLASS`).
 */
export function useFullScreen<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  /** In the browser's full-screen mode. */
  const [native, setNative] = useState(false);
  /** Covering the window (no full-screen mode). */
  const [covering, setCovering] = useState(false);

  useEffect(() => {
    const onChange = () =>
      setNative(ref.current !== null && document.fullscreenElement === ref.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  useEffect(() => {
    if (!covering) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setCovering(false);
    };
    // The page behind stays still while the part covers it.
    const root = document.documentElement;
    const overflow = root.style.overflow;
    root.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    return () => {
      root.style.overflow = overflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [covering]);

  const enter = useCallback(async () => {
    const node = ref.current;
    if (!node) return;
    if (document.fullscreenEnabled && typeof node.requestFullscreen === 'function') {
      try {
        await node.requestFullscreen();
        return;
      } catch {
        // Refused (or not allowed here): cover the window instead.
      }
    }
    setCovering(true);
  }, []);

  const exit = useCallback(() => {
    if (document.fullscreenElement === ref.current) void document.exitFullscreen();
    setCovering(false);
  }, []);

  const active = native || covering;
  const toggle = useCallback(() => (active ? exit() : void enter()), [active, enter, exit]);
  return { ref, active, toggle };
}

/**
 * The part's place while it fills the screen: the whole window. Keep size, position and
 * rounded corners out of the part's other classes while it is full screen (they would
 * compete with these).
 */
export const FULL_SCREEN_CLASS = 'fixed inset-0 z-50 h-dvh w-full';

/**
 * "Full screen" / "Exit full screen". `compact` shows only the icon on narrow boxes
 * (the name is still read out), for tight rows like the preview's tabs.
 */
export function FullScreenButton({
  active,
  onToggle,
  compact = false,
  className,
}: {
  active: boolean;
  onToggle: () => void;
  compact?: boolean;
  className?: string;
}) {
  const t = useTranslations('lesson');
  const label = active ? t('exitFullScreen') : t('fullScreen');
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={onToggle}
      title={label}
      className={clsx('shrink-0', compact && '@max-sm:px-2.5', className)}
    >
      <Icon name={active ? 'minimize' : 'maximize'} />
      <span className={clsx(compact && '@max-sm:sr-only')}>{label}</span>
    </Button>
  );
}
