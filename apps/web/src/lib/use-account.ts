'use client';

import { useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { homePath, type Me, useAuth } from './auth-provider';

/**
 * For pages that belong to one kind of account. Visitors who aren't signed in go to
 * the matching login page; a parent on a child's page (or the other way round) goes
 * to their own home. Returns the account once it's the right kind, otherwise null.
 */
export function useAccount(kind: Me['kind']): Me | null {
  const { state } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (state.status === 'authenticated') {
      if (state.user.kind !== kind) router.replace(homePath(state.user));
    } else if (state.status === 'anonymous' && !state.loggedOut) {
      // Signed out, or the session ended (for example a parent set a new password).
      // After "Log out" the header sends people home instead.
      router.replace(kind === 'STUDENT' ? '/login/student' : '/login');
    }
  }, [state, kind, router]);

  return state.status === 'authenticated' && state.user.kind === kind ? state.user : null;
}
