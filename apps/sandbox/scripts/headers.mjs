/**
 * Security headers for the sandbox. Students' code may run scripts and show
 * pictures, sounds and fonts from the web (https:), but can't call any server with
 * scripts (connect-src allows only blob: URLs the page made itself), submit forms,
 * or be embedded by any site other than the web app. Loading a picture does tell
 * its host the viewer's IP address (as on any web page): an accepted trade-off, so
 * projects can show pictures; no data from the platform is reachable here. Python
 * needs a worker and WebAssembly started from blob: URLs (blob:, worker-src blob:
 * and 'wasm-unsafe-eval').
 */
export function sandboxHeaders(frameAncestors = 'http://localhost:3001') {
  // 'self': the public portfolio page (on this domain) shows projects in the runner.
  const policy = [
    "default-src 'none'",
    "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob:",
    'worker-src blob:',
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' https: data: blob:",
    "media-src 'self' https: data: blob:",
    "font-src 'self' https: data:",
    'connect-src blob:',
    "form-action 'none'",
    "base-uri 'none'",
    `frame-ancestors 'self' ${frameAncestors}`,
  ].join('; ');
  return {
    'Content-Security-Policy': policy,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  };
}

/**
 * The public portfolio page (/portfolio/): reads the portfolio from the API, shows
 * each project in the runner (frame-src 'self'), and can't be embedded anywhere.
 */
export function portfolioHeaders(apiOrigin = 'http://localhost:3000') {
  const policy = [
    "default-src 'none'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    `connect-src 'self' ${apiOrigin}`,
    "frame-src 'self'",
    "form-action 'none'",
    "base-uri 'none'",
    "frame-ancestors 'none'",
  ].join('; ');
  return {
    'Content-Security-Policy': policy,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    'Cache-Control': 'no-cache',
  };
}

/** An origin from an env variable (the API's, the web app's), validated. */
export function originFromEnv(name, fallback) {
  const value = process.env[name] ?? fallback;
  const url = new URL(value);
  if (url.origin !== value.replace(/\/$/, '')) {
    throw new Error(`${name}: "${value}" is not an origin like https://api.example.com`);
  }
  return url.origin;
}

/**
 * Pyodide's files: the web app downloads them (so the browser caches them for the
 * app), which needs CORS. Versioned files never change; the manifest may.
 */
export function pyodideHeaders(versioned) {
  return {
    'Access-Control-Allow-Origin': '*',
    'Cross-Origin-Resource-Policy': 'cross-origin',
    'Cache-Control': versioned ? 'public, max-age=31536000, immutable' : 'no-cache',
  };
}

/** Space-separated origins from SANDBOX_FRAME_ANCESTORS, validated. */
export function frameAncestorsFromEnv(value = process.env.SANDBOX_FRAME_ANCESTORS) {
  const origins = (value ?? 'http://localhost:3001').split(/[\s,]+/).filter(Boolean);
  for (const origin of origins) {
    if (!/^https?:\/\/[a-z0-9.-]+(:\d+)?$/i.test(origin)) {
      throw new Error(
        `SANDBOX_FRAME_ANCESTORS: "${origin}" is not an origin like https://app.example.com`,
      );
    }
  }
  return origins.join(' ');
}
