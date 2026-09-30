/*
 * HTTP security headers for every response of the site (used by next.config.ts).
 * Kept free of other imports so the Next config can load it.
 */

export interface CspOptions {
  /** The API origin the waitlist form posts to, e.g. "https://api.example.com". */
  apiUrl: string;
  /** Development needs eval (React's error overlay) and inline styles (CSS hot reload). */
  dev: boolean;
  /** Upgrade http:// requests to https:// (only when the site itself is served over https). */
  upgradeInsecureRequests: boolean;
}

/**
 * A strict Content-Security-Policy for a statically rendered Next.js site.
 *
 * script-src uses 'unsafe-inline' on purpose. Next.js inlines small scripts in every page
 * (the React Server Components payload, `self.__next_f.push(…)`) that hydration needs. The
 * alternative, a per-request nonce, only works when every page is rendered on demand, which
 * would give up static pages and CDN caching for the whole site. What keeps the risk low:
 * no third-party scripts at all (only 'self'), no eval in production, no plugins
 * (object-src 'none'), no <base> hijacking, forms and fetches only to ourselves and the API,
 * and no content that can inject HTML (blog posts are Markdown-only MDX, see lib/mdx-safety).
 * Revisit if pages become dynamic anyway: then switch to nonces with 'strict-dynamic'.
 */
export function contentSecurityPolicy({
  apiUrl,
  dev,
  upgradeInsecureRequests,
}: CspOptions): string {
  const apiOrigin = new URL(apiUrl).origin;
  const directives: string[] = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ''}`,
    `style-src 'self'${dev ? " 'unsafe-inline'" : ''}`,
    "img-src 'self' data:",
    "font-src 'self'",
    `connect-src 'self' ${apiOrigin}`,
    "media-src 'none'",
    "object-src 'none'",
    "frame-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];
  if (upgradeInsecureRequests) directives.push('upgrade-insecure-requests');
  return directives.join('; ');
}

export function securityHeaders(options: CspOptions): { key: string; value: string }[] {
  return [
    { key: 'Content-Security-Policy', value: contentSecurityPolicy(options) },
    // Browsers ignore it over plain http (local development).
    { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  ];
}
