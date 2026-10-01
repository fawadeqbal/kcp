import type { Locale } from '@kcp/i18n';
import type { Page, Route } from '@playwright/test';
import ar from '../messages/ar.json' with { type: 'json' };
import en from '../messages/en.json' with { type: 'json' };
import ur from '../messages/ur.json' with { type: 'json' };

export type Messages = typeof en;
export const MESSAGES: Record<Locale, Messages> = { en, ar, ur };
export const LOCALES = ['en', 'ar', 'ur'] as const satisfies readonly Locale[];

/** Every kind of page, without the language prefix. */
export const PAGES = [
  '',
  '/how-it-works',
  '/tracks',
  '/safety',
  '/about',
  '/faq',
  '/pricing',
  '/pricing/sa',
  '/blog',
  '/blog/parents-first',
  '/waitlist',
  '/waitlist/confirm',
  '/hire',
  '/hire/confirm',
] as const;

/**
 * Collects errors from the browser console and the page, e.g. a script blocked by the
 * Content-Security-Policy or a failed hydration. Tests expect the list to stay empty.
 */
export function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type, accept',
};

/**
 * Answers the site's calls to the API in the browser, instead of a real API.
 * `answer` gets the JSON body and returns the HTTP status to reply with.
 */
export async function mockApi(
  page: Page,
  path:
    | '/v1/waitlist'
    | '/v1/waitlist/confirm'
    | '/v1/public/hub/intake'
    | '/v1/public/hub/intake/confirm',
  answer: (body: unknown) => number,
) {
  await page.route(`**${path}`, async (route: Route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: CORS });
      return;
    }
    const status = answer(request.postDataJSON());
    await route.fulfill({
      status,
      headers: CORS,
      contentType: 'application/json',
      body: JSON.stringify(status < 300 ? { status: 'ok' } : { error: 'ERROR' }),
    });
  });
}
