import { LOCALES } from '@kcp/i18n';
import { countryFromSlug, countrySlug } from './countries';

/** Pages that exist in every language, without the language prefix ('' is the home page). */
export const STATIC_PATHS = [
  '',
  '/how-it-works',
  '/tracks',
  '/safety',
  '/about',
  '/faq',
  '/pricing',
  '/blog',
  '/waitlist',
  '/hire',
] as const;

const PRICING_PATH = new RegExp(`^/(${LOCALES.join('|')})/pricing/?$`);

/**
 * /en/pricing?country=ae → /en/pricing/ae. The pricing pages are static, so the choice
 * made in the query string (e.g. by a link from the web app) becomes a page of its own.
 * Returns null when there is nothing to redirect.
 */
export function pricingRedirect(pathname: string, search: URLSearchParams): string | null {
  const locale = PRICING_PATH.exec(pathname)?.[1];
  if (!locale) return null;
  const country = countryFromSlug(search.get('country'));
  return country ? `/${locale}/pricing/${countrySlug(country)}` : null;
}
