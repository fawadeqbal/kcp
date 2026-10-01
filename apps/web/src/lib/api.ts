import { type ApiClient, createApiClient } from '@kcp/api-client-ts';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

let accessToken: string | null = null;
let expiresAt = 0;
let refresher: (() => Promise<unknown>) | null = null;

/** Set by the auth provider; attached to every API call as a Bearer token. */
export function setAccessToken(token: string | null, expiresIn?: number): void {
  accessToken = token;
  expiresAt = token && expiresIn ? Date.now() + expiresIn * 1000 : 0;
}

/** Lets API calls renew an expired token first (after the laptop slept, for example). */
export function setTokenRefresher(refresh: (() => Promise<unknown>) | null): void {
  refresher = refresh;
}

/** The current access token (for the rooms' live connection), renewed first if it's stale. */
export async function freshAccessToken(): Promise<string | null> {
  const expired = expiresAt > 0 && Date.now() > expiresAt - 15_000;
  if (accessToken && expired && refresher) await refresher().catch(() => undefined);
  return accessToken;
}

export const api: ApiClient = createApiClient({ baseUrl: API_URL });

api.use({
  async onRequest({ request, schemaPath }) {
    const expired = expiresAt > 0 && Date.now() > expiresAt - 15_000;
    if (accessToken && expired && refresher && !schemaPath.startsWith('/v1/auth/')) {
      await refresher();
    }
    if (accessToken && !request.headers.has('Authorization')) {
      request.headers.set('Authorization', `Bearer ${accessToken}`);
    }
    return request;
  },
});

/** The machine-readable code in an API error body, e.g. "INVALID_CREDENTIALS". */
export function errorCode(error: unknown): string | undefined {
  if (error && typeof error === 'object' && 'error' in error) {
    const code = (error as { error?: unknown }).error;
    return typeof code === 'string' ? code : undefined;
  }
  return undefined;
}
