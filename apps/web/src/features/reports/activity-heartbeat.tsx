'use client';

import { ACTIVITY_HEARTBEAT_SECONDS } from '@kcp/shared';
import { useEffect } from 'react';
import { api } from '@/lib/api';

/** Counts as working only with a key, click or touch in the last two minutes. */
const IDLE_MS = 2 * 60 * 1000;

/**
 * While a student has a lesson, project or practice open (the tab showing, and they
 * did something recently), tells the API once a minute: the minutes parents see in the
 * weekly report.
 */
export function ActivityHeartbeat() {
  useEffect(() => {
    let lastInput = Date.now();
    const input = () => {
      lastInput = Date.now();
    };
    const events = ['keydown', 'pointerdown', 'touchstart', 'wheel'] as const;
    for (const name of events) window.addEventListener(name, input, { passive: true });
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible' || Date.now() - lastInput > IDLE_MS) return;
      void api.POST('/v1/activity/heartbeat').catch(() => undefined);
    }, ACTIVITY_HEARTBEAT_SECONDS * 1000);
    return () => {
      window.clearInterval(timer);
      for (const name of events) window.removeEventListener(name, input);
    };
  }, []);
  return null;
}
