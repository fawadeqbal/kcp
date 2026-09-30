/**
 * Query parameters that can hold personal data (a parent's email, a child's username)
 * or secrets. Their values never reach the logs.
 */
const SENSITIVE_PARAMS = new Set(['search', 'email', 'username', 'token', 'code']);

/** Paths whose last part is a secret: a shared portfolio's link, a certificate's code. */
const SECRET_PATHS = /^(\/v1\/(?:shared\/portfolios|public\/certificates)\/)[^/?#]+/;

/** The request URL as logged: path and query, with sensitive values replaced. */
export function logUrl(rawUrl: string): string {
  const url = rawUrl.replace(SECRET_PATHS, '$1[redacted]');
  const queryStart = url.indexOf('?');
  if (queryStart === -1) return url;
  const params = new URLSearchParams(url.slice(queryStart + 1));
  for (const key of params.keys()) {
    if (SENSITIVE_PARAMS.has(key.toLowerCase())) params.set(key, '[redacted]');
  }
  return `${url.slice(0, queryStart)}?${params.toString()}`;
}

/** A share page of the web app: /p/<token>, with or without a language prefix. */
const WEB_SHARE_PAGE = /^((?:\/[a-z]{2})?\/p\/)[^/?#]+/;

/** A web app page path as stored (e.g. with feedback): share links' secrets removed. */
export function safePagePath(path: string): string {
  return path.replace(WEB_SHARE_PAGE, '$1[link]');
}
