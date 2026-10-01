'use client';

import type { ReactNode } from 'react';
import { usePathname } from '@/i18n/navigation';
import { ActivityHeartbeat } from '@/features/reports/activity-heartbeat';
import { useAuth } from '@/lib/auth-provider';
import { AUTH_PATHS, AuthFrame } from './auth-frame';
import { FeedbackButton } from './feedback-button';

const SECTIONS = new Set([
  'leaderboard',
  'league',
  'friends',
  'rooms',
  'events',
  'skills',
  'badges',
  'portfolio',
]);

/**
 * A lesson or a project is a full-screen workspace with its own header (the steps,
 * "Saved", the streak): it is shown without the site's header and footer.
 */
export function isWorkspacePath(pathname: string) {
  const [first, second, third] = pathname.split('/').filter(Boolean);
  if (first !== 'learn' || !second) return false;
  if (second === 'projects') return Boolean(third);
  return !SECTIONS.has(second) && third === undefined;
}

/** The page frame: header, main content and footer; the sign-in screen; or the bare workspace. */
export function AppFrame({
  header,
  footer,
  children,
}: {
  header: ReactNode;
  footer: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const { state } = useAuth();
  if (AUTH_PATHS.includes(pathname)) {
    return (
      <main id="main" className="flex min-h-dvh flex-1 flex-col">
        <AuthFrame student={pathname === '/login/student'}>{children}</AuthFrame>
      </main>
    );
  }
  if (isWorkspacePath(pathname)) {
    return (
      <main id="main" className="flex min-h-dvh flex-1 flex-col">
        {/* Minutes learning, for the parents' weekly report. */}
        {state.status === 'authenticated' && state.user.kind === 'STUDENT' ? (
          <ActivityHeartbeat />
        ) : null}
        {children}
      </main>
    );
  }
  return (
    <>
      {header}
      <main id="main" className="flex-1 px-4 pt-4 pb-14 sm:px-6 lg:px-10">
        {children}
      </main>
      {footer}
      <FeedbackButton />
    </>
  );
}
