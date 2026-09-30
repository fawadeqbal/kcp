import type { Locale } from '@kcp/i18n';

/*
 * Addresses the site links to. NEXT_PUBLIC_* values are fixed when the site is built
 * (see .env.example); the defaults match local development.
 */
const withoutTrailingSlash = (url: string) => url.replace(/\/+$/, '');

/** The API: waitlist, waitlist confirmation and prices per country. */
export const API_URL = withoutTrailingSlash(
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
);

/** The student and parent web app. */
export const WEB_APP_URL = withoutTrailingSlash(
  process.env.NEXT_PUBLIC_WEB_APP_URL || 'http://localhost:3001',
);

/** This site's public address: canonical links, hreflang, sitemap, robots.txt. */
export const SITE_URL = withoutTrailingSlash(
  process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3003',
);

/** A page of the web app in the same language, e.g. webAppUrl('ur', '/sign-up'). */
export function webAppUrl(locale: Locale, path: `/${string}`): string {
  return `${WEB_APP_URL}/${locale}${path}`;
}
