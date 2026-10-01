'use client';

import type { components } from '@kcp/api-client-ts';
import type { PictureKey } from '@kcp/shared';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { rememberKid } from './kids-on-device';
import { api, errorCode, setAccessToken, setTokenRefresher } from './api';

export type Me = components['schemas']['MeDto'];
type LoginResponse = components['schemas']['LoginResponseDto'];

type AuthState =
  | { status: 'loading' }
  /** `loggedOut`: the person pressed "Log out" (rather than a session that ended). */
  | { status: 'anonymous'; loggedOut?: boolean }
  | { status: 'authenticated'; user: Me };

export type LoginResult =
  | { ok: true; user: Me }
  | {
      ok: false;
      code?: string;
      /** A staff account: they use the admin panel. */
      staff?: boolean;
      /** Mentors and teachers: the two-factor step comes next. */
      twoFactor?: { stage: 'setup' | 'verify'; mfaToken: string };
      network?: boolean;
    };

export type TwoFactorSetup = { secret: string; otpauthUrl: string };

interface AuthContextValue {
  state: AuthState;
  /** Parents, mentors and teachers (email and password). */
  login: (email: string, password: string) => Promise<LoginResult>;
  /** Mentors and teachers, first login: a new authenticator secret. */
  setupTwoFactor: (mfaToken: string) => Promise<TwoFactorSetup | { code?: string }>;
  /** Mentors and teachers: the 6-digit code finishes the login. */
  verifyTwoFactor: (mfaToken: string, code: string) => Promise<LoginResult>;
  /** Children (the username their parent got when creating the account). */
  loginStudent: (username: string, password: string) => Promise<LoginResult>;
  /** Younger children: four pictures in order (set by the parent). */
  loginWithPictures: (username: string, pictures: PictureKey[]) => Promise<LoginResult>;
  /** A child's device, once a parent approved its code. */
  claimPairing: (pairingId: string, secret: string) => Promise<LoginResult>;
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
    (
      data: LoginResponse | undefined,
      error: unknown,
      how: 'password' | 'pictures' | 'phone' = 'password',
    ): LoginResult => {
      if (data?.status === 'authenticated' && data.accessToken && data.user) {
        setAccessToken(data.accessToken, data.expiresIn);
        schedule(data.expiresIn, () => void restore());
        setState({ status: 'authenticated', user: data.user });
        const student = data.user.student;
        if (data.user.kind === 'STUDENT' && student && data.user.username) {
          rememberKid({
            username: data.user.username,
            nickname: student.nickname,
            avatarKey: student.avatarKey,
            // A younger child's login page opens on the pictures next time.
            pictures: how === 'pictures',
          });
        }
        return { ok: true, user: data.user };
      }
      if (
        (data?.status === 'mfa_required' || data?.status === 'mfa_setup_required') &&
        data.mfaToken
      ) {
        return {
          ok: false,
          twoFactor: {
            stage: data.status === 'mfa_setup_required' ? 'setup' : 'verify',
            mfaToken: data.mfaToken,
          },
        };
      }
      const code = errorCode(error);
      return code === 'STAFF_ACCOUNT' ? { ok: false, staff: true } : { ok: false, code };
    },
    [restore],
  );

  const login = useCallback(
    async (email: string, password: string): Promise<LoginResult> => {
      try {
        const { data, error } = await api.POST('/v1/auth/login', {
          body: { email, password, app: 'web' },
        });
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

  const loginWithPictures = useCallback(
    async (username: string, pictures: PictureKey[]): Promise<LoginResult> => {
      try {
        const { data, error } = await api.POST('/v1/auth/students/picture-login', {
          body: { username, pictures },
        });
        return finish(data, error, 'pictures');
      } catch {
        return { ok: false, network: true };
      }
    },
    [finish],
  );

  const claimPairing = useCallback(
    async (pairingId: string, secret: string): Promise<LoginResult> => {
      try {
        const { data, error } = await api.POST('/v1/auth/pairing/claim', {
          body: { pairingId, secret },
        });
        return finish(data, error);
      } catch {
        return { ok: false, network: true };
      }
    },
    [finish],
  );

  const setupTwoFactor = useCallback(async (mfaToken: string) => {
    try {
      const { data, error } = await api.POST('/v1/auth/mfa/setup', { body: { mfaToken } });
      return data ?? { code: errorCode(error) };
    } catch {
      return { code: 'network' };
    }
  }, []);

  const verifyTwoFactor = useCallback(
    async (mfaToken: string, code: string): Promise<LoginResult> => {
      try {
        const { data, error } = await api.POST('/v1/auth/mfa/verify', {
          body: { mfaToken, code, app: 'web' },
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
    () => ({
      state,
      login,
      setupTwoFactor,
      verifyTwoFactor,
      loginStudent,
      loginWithPictures,
      claimPairing,
      logout,
      reloadUser,
    }),
    [
      state,
      login,
      setupTwoFactor,
      verifyTwoFactor,
      loginStudent,
      loginWithPictures,
      claimPairing,
      logout,
      reloadUser,
    ],
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

/** The part of the web app an account belongs to. */
export type Area = 'STUDENT' | 'PARENT' | 'MENTOR' | 'TEACHER';

export function areaOf(user: Pick<Me, 'kind' | 'role'>): Area {
  if (user.kind === 'STUDENT') return 'STUDENT';
  if (user.role.key === 'mentor') return 'MENTOR';
  if (user.role.key === 'teacher') return 'TEACHER';
  return 'PARENT';
}

const HOMES = {
  STUDENT: '/learn',
  PARENT: '/dashboard',
  MENTOR: '/mentor',
  TEACHER: '/teacher',
} as const satisfies Record<Area, string>;

/** Where each kind of account lands after logging in. */
export function homePath(user: Pick<Me, 'kind' | 'role'>): (typeof HOMES)[Area] {
  return HOMES[areaOf(user)];
}
