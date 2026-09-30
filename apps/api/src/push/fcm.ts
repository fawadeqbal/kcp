import { createSign } from 'node:crypto';

/**
 * Firebase Cloud Messaging (HTTP v1), with the Google service account the Firebase
 * console gives. No SDK: an OAuth token from a signed JWT, then one POST per phone.
 */

export interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
  token_uri?: string;
}

export interface FcmMessage {
  token: string;
  title: string;
  body: string;
  data: Record<string, string>;
}

/** The phone's token no longer works (app removed, or a new token): forget it. */
export class InvalidTokenError extends Error {}

const SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';

/** Reads the service account from JSON, or from base64-encoded JSON. */
export function parseServiceAccount(value: string): ServiceAccount {
  const text = value.trim().startsWith('{') ? value : Buffer.from(value, 'base64').toString('utf8');
  const account = JSON.parse(text) as Partial<ServiceAccount>;
  if (!account.project_id || !account.client_email || !account.private_key) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT needs project_id, client_email and private_key');
  }
  return account as ServiceAccount;
}

const base64url = (input: Buffer | string) => Buffer.from(input).toString('base64url');

export function signedJwt(account: ServiceAccount, now = Date.now()): string {
  const iat = Math.floor(now / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64url(
    JSON.stringify({
      iss: account.client_email,
      scope: SCOPE,
      aud: account.token_uri ?? 'https://oauth2.googleapis.com/token',
      iat,
      exp: iat + 3600,
    }),
  );
  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${claims}`);
  return `${header}.${claims}.${base64url(signer.sign(account.private_key))}`;
}

export class FcmClient {
  private token: { value: string; expiresAt: number } | null = null;
  /** The OAuth request under way, shared by sends that start together. */
  private pending: Promise<string> | null = null;

  constructor(
    private readonly account: ServiceAccount,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  private accessToken(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now() + 60_000) {
      return Promise.resolve(this.token.value);
    }
    this.pending ??= this.fetchAccessToken().finally(() => {
      this.pending = null;
    });
    return this.pending;
  }

  private async fetchAccessToken(): Promise<string> {
    const response = await this.fetcher(
      this.account.token_uri ?? 'https://oauth2.googleapis.com/token',
      {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: signedJwt(this.account),
        }),
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (!response.ok) throw new Error(`Google OAuth answered ${response.status}`);
    const data = (await response.json()) as { access_token: string; expires_in: number };
    this.token = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
    return data.access_token;
  }

  async send(message: FcmMessage): Promise<void> {
    const response = await this.fetcher(
      `https://fcm.googleapis.com/v1/projects/${this.account.project_id}/messages:send`,
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${await this.accessToken()}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            token: message.token,
            notification: { title: message.title, body: message.body },
            data: message.data,
            android: { priority: 'normal', notification: { channel_id: 'reminders' } },
            apns: { payload: { aps: { sound: 'default' } } },
          },
        }),
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (response.ok) return;
    const detail = await response.text();
    if (response.status === 404 || /UNREGISTERED|registration-token-not-registered/.test(detail)) {
      throw new InvalidTokenError(detail.slice(0, 200));
    }
    if (response.status === 400 && /INVALID_ARGUMENT/.test(detail) && /token/i.test(detail)) {
      throw new InvalidTokenError(detail.slice(0, 200));
    }
    throw new Error(`FCM answered ${response.status}: ${detail.slice(0, 200)}`);
  }
}
