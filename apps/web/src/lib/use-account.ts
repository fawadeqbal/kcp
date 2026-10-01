'use client';

import { useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { type Area, areaOf, homePath, type Me, useAuth } from './auth-provider';

/**
 * For pages that belong to one part of the app (students, parents, mentors, teachers).
 * Visitors who aren't signed in go to the matching login page; anyone else goes to
 * their own home. Returns the account once it's the right kind, otherwise null.
 */
export function useAccount(area: Area): Me | null {
  return useAccountIn([area]);
}

/** Like useAccount, for pages several kinds of account share (e.g. a review result). */
export function useAccountIn(areas: readonly Area[]): Me | null {
  const { state } = useAuth();
  const router = useRouter();
  const key = areas.join(',');

  useEffect(() => {
    if (state.status === 'authenticated') {
      if (!key.split(',').includes(areaOf(state.user))) router.replace(homePath(state.user));
    } else if (state.status === 'anonymous' && !state.loggedOut) {
      // Signed out, or the session ended (for example a parent set a new password).
      // After "Log out" the header sends people home instead.
      router.replace(key === 'STUDENT' ? '/login/student' : '/login');
    }
  }, [state, key, router]);

  return state.status === 'authenticated' && areas.includes(areaOf(state.user)) ? state.user : null;
}
