import type { Locale } from '@kcp/i18n';
import { cache } from 'react';
import { API_URL } from '@/lib/config';

export const BUDGETS = ['UNDER_500', 'FROM_500', 'FROM_2000', 'FROM_5000', 'UNSURE'] as const;
export type Budget = (typeof BUDGETS)[number];

/** Body of POST /v1/public/hub/intake. `website` is the honeypot (people leave it empty). */
export interface HireRequest {
  contactName: string;
  contactEmail: string;
  company: string;
  countryCode?: string;
  languageCode: Locale;
  title: string;
  brief: string;
  budget: Budget;
  deadline?: string;
  website: string;
}

export type SendResult = 'sent' | 'tooMany' | 'invalid' | 'failed';
export type ConfirmResult = 'confirmed' | 'expired' | 'failed';

async function post(path: string, body: unknown): Promise<number | null> {
  try {
    const response = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(body),
    });
    return response.status;
  } catch {
    return null;
  }
}

export async function sendHireRequest(request: HireRequest): Promise<SendResult> {
  const status = await post('/v1/public/hub/intake', request);
  if (status === null) return 'failed';
  if (status >= 200 && status < 300) return 'sent';
  if (status === 429) return 'tooMany';
  if (status === 400 || status === 422) return 'invalid';
  return 'failed';
}

export async function confirmHireRequest(token: string): Promise<ConfirmResult> {
  const status = await post('/v1/public/hub/intake/confirm', { token });
  if (status === null) return 'failed';
  if (status >= 200 && status < 300) return 'confirmed';
  if ([400, 404, 409, 410, 422].includes(status)) return 'expired';
  return 'failed';
}

export interface HubStats {
  projectsCompleted: number;
  studentsEarning: number;
  earned: { currency: string; amountMinor: number }[];
}

export interface HubStory {
  id: string;
  firstName: string;
  countryCode: string | null;
  headline: string;
  body: string;
}

async function get<T>(path: string, seconds: number): Promise<T | null> {
  try {
    const response = await fetch(`${API_URL}${path}`, {
      headers: { accept: 'application/json' },
      next: { revalidate: seconds },
      signal: AbortSignal.timeout(5_000),
    });
    return response.ok ? ((await response.json()) as T) : null;
  } catch {
    return null;
  }
}

/** The hub in numbers (cached for 5 minutes; nothing shown when the API is away). */
export const getHubStats = cache(async (): Promise<HubStats | null> => {
  const stats = await get<HubStats>('/v1/public/hub/stats', 300);
  return stats && typeof stats.projectsCompleted === 'number' ? stats : null;
});

/** Published stories in this language (a minute at most: a parent can take one back). */
export const getHubStories = cache(async (locale: Locale): Promise<HubStory[]> => {
  const stories = await get<HubStory[]>(`/v1/public/hub/stories?lang=${locale}`, 60);
  return Array.isArray(stories) ? stories : [];
});
