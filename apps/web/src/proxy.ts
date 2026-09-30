import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

// Sends visitors without a language prefix to their preferred language (from the
// browser, or a previous visit), e.g. / → /ur.
export default createMiddleware(routing);

export const config = {
  // Everything except Next internals and files with an extension (images, fonts…).
  matcher: '/((?!_next|_vercel|.*\\..*).*)',
};
