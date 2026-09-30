'use client';

import type { components } from '@kcp/api-client-ts';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { api, errorCode, setAccessToken, setTokenRefresher } from './api';

export type Me = components['schemas']['MeDto'];
type LoginResponse = components['schemas']['LoginResponseDto'];

type AuthState =
  | { status: 'loading' }
  /** `loggedOut`: the person pressed "Log out" (rather than a session that ended). */
  | { status: 'anonymous'; loggedOut?: boolean }
  | { status: 'authenticated'; user: Me };

export type LoginResult =
  { ok: true; user: Me } | { ok: false; code?: string; staff?: boolean; network?: boolean };

interface AuthContextValue {
  state: AuthState;
  /** Parents (email and password). */
  login: (email: string, password: string) => Promise<LoginResult>;
  /** Children (the username their parent got when creating the account). */
  loginStudent: (username: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  /** Reads the account again (after it changed, e.g. new terms accepted). */
  reloadUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface Session {
  user: Me;
  expiresIn?: number;
}

// One refresh at a time: React may run effects twice, and a refresh token works once.
let refreshing: Promise<Session | null> | null = null;
let refreshTimer: ReturnType<typeof setTimeout> | undefined;

function schedule(expiresIn: number | undefined, onRefresh: () => void) {
  clearTimeout(refreshTimer);
  if (expiresIn) {
    // Renew a minute before the access token expires.
    refreshTimer = setTimeout(onRefresh, Math.max(30, expiresIn - 60) * 1000);
  }
}

async function refreshSession(): Promise<Session | null> {
  refreshing ??= (async () => {
    try {
      const { data } = await api.POST('/v1/auth/refresh', { body: {} });
      if (data?.status === 'authenticated' && data.accessToken && data.user) {
        setAccessToken(data.accessToken, data.expiresIn);
        return { user: data.user, expiresIn: data.expiresIn };
      }
    } catch {
      // Network error: treat as signed out.
    }
    setAccessToken(null);
    return null;
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

/**
 * Keeps parents and children signed in: the access token lives only in memory, and
 * the httpOnly refresh cookie restores the session on reload.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  const restore = useCallback(async () => {
    const session = await refreshSession();
    if (session) {
      schedule(session.expiresIn, () => void restore());
      setState({ status: 'authenticated', user: session.user });
    } else {
      setState({ status: 'anonymous' });
    }
  }, []);

  useEffect(() => {
    void restore();
    setTokenRefresher(restore);
    return () => {
      clearTimeout(refreshTimer);
      setTokenRefresher(null);
    };
  }, [restore]);

  const finish = useCallback(
    (data: LoginResponse | undefined, error: unknown): LoginResult => {
      if (data?.status === 'authenticated' && data.accessToken && data.user) {
        setAccessToken(data.accessToken, data.expiresIn);
        schedule(data.expiresIn, () => void restore());
        setState({ status: 'authenticated', user: data.user });
        return { ok: true, user: data.user };
      }
      if (data?.status === 'mfa_required' || data?.status === 'mfa_setup_required') {
        return { ok: false, staff: true };
      }
      return { ok: false, code: errorCode(error) };
    },
    [restore],
  );

  const login = useCallback(
    async (email: string, password: string): Promise<LoginResult> => {
      try {
        const { data, error } = await api.POST('/v1/auth/login', { body: { email, password } });
        return finish(data, error);
      } catch {
        return { ok: false, network: true };
      }
    },
    [finish],
  );

  const loginStudent = useCallback(
    async (username: string, password: string): Promise<LoginResult> => {
      try {
        const { data, error } = await api.POST('/v1/auth/students/login', {
          body: { username, password },
        });
        return finish(data, error);
      } catch {
        return { ok: false, network: true };
      }
    },
    [finish],
  );

  const logout = useCallback(async () => {
    clearTimeout(refreshTimer);
    try {
      await api.POST('/v1/auth/logout', { body: {} });
    } finally {
      setAccessToken(null);
      setState({ status: 'anonymous', loggedOut: true });
    }
  }, []);

  const reloadUser = useCallback(async () => {
    const { data } = await api.GET('/v1/auth/me');
    if (data) setState({ status: 'authenticated', user: data });
  }, []);

  const value = useMemo(
    () => ({ state, login, loginStudent, logout, reloadUser }),
    [state, login, loginStudent, logout, reloadUser],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return value;
}

/** Where each kind of account lands after logging in. */
export function homePath(user: Pick<Me, 'kind'>): '/learn' | '/dashboard' {
  return user.kind === 'STUDENT' ? '/learn' : '/dashboard';
}
