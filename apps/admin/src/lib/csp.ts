/*
 * The admin panel's Content-Security-Policy (set per request in src/proxy.ts). Staff
 * see children's and families' data, so scripts need this request's nonce: an
 * injected <script> can't run, and nothing loads from anywhere but here and the API.
 */

export interface AdminCspOptions {
  nonce: string;
  apiUrl: string;
  webAppUrl: string;
  dev: boolean;
}

export function adminContentSecurityPolicy({ nonce, apiUrl, dev }: AdminCspOptions): string {
  const api = new URL(apiUrl).origin;
  return [
    "default-src 'self'",
    // 'strict-dynamic': scripts the nonce'd ones load may run too (Next's chunks).
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ''}`,
    // Style attributes (React's style prop) can't carry a nonce.
    "style-src 'self' 'unsafe-inline'",
    // QR codes for two-factor setup are data: URLs.
    "img-src 'self' data:",
    "font-src 'self' data:",
    `connect-src 'self' ${api}`,
    "frame-src 'none'",
    "worker-src 'none'",
    "media-src 'none'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(api.startsWith('https:') ? ['upgrade-insecure-requests'] : []),
  ].join('; ');
}
