import { type NextRequest, NextResponse } from 'next/server';
import { adminContentSecurityPolicy } from './lib/csp';

/**
 * A fresh nonce for every page: Next.js puts it on its own scripts (it reads it from
 * the Content-Security-Policy request header), and the browser runs no other script.
 */
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const csp = adminContentSecurityPolicy({
    nonce,
    apiUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000',
    webAppUrl: process.env.NEXT_PUBLIC_WEB_APP_URL ?? 'http://localhost:3001',
    dev: process.env.NODE_ENV === 'development',
  });
  const headers = new Headers(request.headers);
  headers.set('x-nonce', nonce);
  headers.set('Content-Security-Policy', csp);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  matcher: [
    {
      // Pages only: not Next's static files, and not prefetches.
      source: '/((?!_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
