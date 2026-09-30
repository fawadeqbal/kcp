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
import { type AdminAbility, abilityFrom } from './ability';
import { api, errorCode, setAccessToken, setTokenRefresher } from './api';

export type Me = components['schemas']['MeDto'];
type LoginResponse = components['schemas']['LoginResponseDto'];

type AuthState =
  | { status: 'loading' }
  | { status: 'anonymous' }
  | { status: 'authenticated'; user: Me; ability: AdminAbility };

/** What the login form does next. */
export type StepResult =
  | { next: 'done' }
  | { next: 'code' | 'setup'; mfaToken: string }
  | { next: 'error'; code?: string; network?: boolean };

interface AuthContextValue {
  state: AuthState;
  /** Step 1: email and password. Staff always continue to a two-factor step. */
  login: (email: string, password: string) => Promise<StepResult>;
  /** First login only: a new authenticator secret. */
  setupTwoFactor: (mfaToken: string) => Promise<{ secret: string; otpauthUrl: string } | null>;
  /** Step 2: the 6-digit code. */
  verify: (mfaToken: string, code: string) => Promise<StepResult>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// The admin panel has its own refresh cookie (kcp_admin_refresh), separate from the web app's.
const APP = 'admin' as const;

let refreshing: Promise<LoginResponse | null> | null = null;
let refreshTimer: ReturnType<typeof setTimeout> | undefined;

function schedule(expiresIn: number | undefined, onRefresh: () => void) {
  clearTimeout(refreshTimer);
  if (expiresIn) {
    refreshTimer = setTimeout(onRefresh, Math.max(30, expiresIn - 60) * 1000);
  }
}

async function refreshSession(): Promise<LoginResponse | null> {
  refreshing ??= (async () => {
    try {
      const { data } = await api.POST('/v1/auth/refresh', { body: { app: APP } });
      if (data?.status === 'authenticated' && data.accessToken && data.user?.role.isStaff) {
        setAccessToken(data.accessToken, data.expiresIn);
        return data;
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  const signedIn = useCallback((data: LoginResponse, onRefresh: () => void) => {
    if (!data.user || !data.accessToken) return;
    setAccessToken(data.accessToken, data.expiresIn);
    schedule(data.expiresIn, onRefresh);
    setState({ status: 'authenticated', user: data.user, ability: abilityFrom(data.user.rules) });
  }, []);

  const restore = useCallback(async () => {
    const session = await refreshSession();
    if (session) signedIn(session, () => void restore());
    else setState({ status: 'anonymous' });
  }, [signedIn]);

  useEffect(() => {
    void restore();
    setTokenRefresher(restore);
    return () => {
      clearTimeout(refreshTimer);
      setTokenRefresher(null);
    };
  }, [restore]);

  const login = useCallback(async (email: string, password: string): Promise<StepResult> => {
    try {
      const { data, error } = await api.POST('/v1/auth/login', {
        body: { email, password, app: APP },
      });
      if (data?.mfaToken && data.status === 'mfa_required') {
        return { next: 'code', mfaToken: data.mfaToken };
      }
      if (data?.mfaToken && data.status === 'mfa_setup_required') {
        return { next: 'setup', mfaToken: data.mfaToken };
      }
      // Staff always need a second step; anything else is refused by the API.
      return { next: 'error', code: errorCode(error) };
    } catch {
      return { next: 'error', network: true };
    }
  }, []);

  const setupTwoFactor = useCallback(async (mfaToken: string) => {
    try {
      const { data } = await api.POST('/v1/auth/mfa/setup', { body: { mfaToken } });
      return data ?? null;
    } catch {
      return null;
    }
  }, []);

  const verify = useCallback(
    async (mfaToken: string, code: string): Promise<StepResult> => {
      try {
        const { data, error } = await api.POST('/v1/auth/mfa/verify', {
          body: { mfaToken, code, app: APP },
        });
        if (data?.status === 'authenticated') {
          signedIn(data, () => void restore());
          return { next: 'done' };
        }
        return { next: 'error', code: errorCode(error) };
      } catch {
        return { next: 'error', network: true };
      }
    },
    [signedIn, restore],
  );

  const logout = useCallback(async () => {
    clearTimeout(refreshTimer);
    try {
      await api.POST('/v1/auth/logout', { body: { app: APP } });
    } finally {
      setAccessToken(null);
      setState({ status: 'anonymous' });
    }
  }, []);

  const value = useMemo(
    () => ({ state, login, setupTwoFactor, verify, logout }),
    [state, login, setupTwoFactor, verify, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}
