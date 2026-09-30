import type { Locale } from '@kcp/i18n';
import { API_URL } from '@/lib/config';
import type { CountryCode } from '@/lib/countries';

export const AGE_BANDS = ['AGE_9_12', 'AGE_13_16'] as const;
export type AgeBand = (typeof AGE_BANDS)[number];

/** Body of POST /v1/waitlist. */
export interface WaitlistRequest {
  email: string;
  countryCode: CountryCode;
  ageBand: AgeBand;
  languageCode: Locale;
}

export type JoinResult = 'sent' | 'tooMany' | 'invalid' | 'failed';

/** 202 Accepted: a confirmation email is on its way. */
export function joinResult(status: number): JoinResult {
  if (status >= 200 && status < 300) return 'sent';
  if (status === 429) return 'tooMany';
  if (status === 400 || status === 422) return 'invalid';
  return 'failed';
}

export type ConfirmResult = 'confirmed' | 'expired' | 'failed';

/** A link that is unknown, used or too old gets a 4xx: all mean "ask for a new one". */
export function confirmResult(status: number): ConfirmResult {
  if (status >= 200 && status < 300) return 'confirmed';
  if ([400, 404, 409, 410, 422].includes(status)) return 'expired';
  return 'failed';
}

async function post(path: string, body: unknown): Promise<number | null> {
  try {
    const response = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(body),
    });
    return response.status;
  } catch {
    // Offline, blocked or the API is down.
    return null;
  }
}

export async function joinWaitlist(request: WaitlistRequest): Promise<JoinResult> {
  const status = await post('/v1/waitlist', request);
  return status === null ? 'failed' : joinResult(status);
}

export async function confirmWaitlist(token: string): Promise<ConfirmResult> {
  const status = await post('/v1/waitlist/confirm', { token });
  return status === null ? 'failed' : confirmResult(status);
}
