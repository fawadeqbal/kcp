/*
 * HTTP security headers for every page of the web app (used by next.config.ts, so it
 * imports nothing else).
 */

export interface CspOptions {
  /** The API, e.g. "https://api.example.com" (calls and the checkout redirect). */
  apiUrl: string;
  /** The code sandbox on its own domain (framed, and Python's files fetched from it). */
  sandboxUrl: string;
  /** Development needs eval (React's error overlay). */
  dev: boolean;
}

const VIDEO_FRAMES = ['https://www.youtube-nocookie.com', 'https://iframe.videodelivery.net'];

/**
 * The Content-Security-Policy of the web app.
 *
 * script-src allows 'unsafe-inline' because Next.js inlines the small scripts every
 * page needs to start (`self.__next_f.push(…)`), and nonces would make every page
 * render on each request instead of being prebuilt (slower for families on slow
 * connections, and no CDN caching). What keeps this tight: scripts only from this
 * site, no eval, the network only to this site, the API (and its WebSocket for the
 * rooms) and the sandbox, frames only
 * from the sandbox and the two video players, no plugins, no <base> tricks, no
 * forms to other sites, and never framed by anyone. Children's code never runs here:
 * it runs in the sandbox, on another domain. The admin panel (staff) uses nonces.
 */
export function contentSecurityPolicy({ apiUrl, sandboxUrl, dev }: CspOptions): string {
  const api = new URL(apiUrl).origin;
  // The rooms' live connection (Socket.IO over a WebSocket to the API).
  const socket = api.replace(/^http/, 'ws');
  const sandbox = new URL(sandboxUrl).origin;
  const https = api.startsWith('https:');
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ''}`,
    // The code editor adds its own <style> elements.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self' ${api} ${socket} ${sandbox}`,
    `frame-src ${sandbox} ${VIDEO_FRAMES.join(' ')}`,
    "worker-src 'none'",
    "media-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(https ? ['upgrade-insecure-requests'] : []),
  ].join('; ');
}

export function securityHeaders(options: CspOptions): { key: string; value: string }[] {
  return [
    { key: 'Content-Security-Policy', value: contentSecurityPolicy(options) },
    // Browsers ignore it over plain http (local development).
    { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  ];
}
