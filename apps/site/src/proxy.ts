import createMiddleware from 'next-intl/middleware';
import { type NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';
import { pricingRedirect } from './lib/routes';

const handleLanguage = createMiddleware(routing);

/**
 * Sends visitors without a language prefix to their preferred language (from the browser,
 * or a previous visit), e.g. / → /ur, and /en/pricing?country=ae to /en/pricing/ae.
 */
export default function proxy(request: NextRequest) {
  const pricing = pricingRedirect(request.nextUrl.pathname, request.nextUrl.searchParams);
  if (pricing) return NextResponse.redirect(new URL(pricing, request.url));
  return handleLanguage(request);
}

export const config = {
  // Everything except Next internals and files with an extension (sitemap.xml, fonts…).
  matcher: '/((?!_next|_vercel|.*\\..*).*)',
};
