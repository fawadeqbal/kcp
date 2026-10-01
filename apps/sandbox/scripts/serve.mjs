/**
 * A small static server for dist/ with the sandbox's security headers. Used for
 * local development and the browser tests; production uses a static host.
 */
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  frameAncestorsFromEnv,
  isSitePage,
  originFromEnv,
  portfolioHeaders,
  pyodideHeaders,
  sandboxHeaders,
} from './headers.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
  '.zip': 'application/zip',
  '.svg': 'image/svg+xml',
  '.css': 'text/css; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

/** Pyodide's files (dist/pyodide/…): CORS, and long caching for versioned ones. */
function extraHeaders(pathname) {
  if (!pathname.startsWith('/pyodide/')) return { 'Cache-Control': 'no-cache' };
  return pyodideHeaders(pathname !== '/pyodide/manifest.json');
}

export function serveSandbox(port = Number(process.env.SANDBOX_PORT ?? 3004)) {
  const headers = sandboxHeaders(frameAncestorsFromEnv());
  const portfolio = portfolioHeaders(originFromEnv('SANDBOX_API_URL', 'http://localhost:3000'));
  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const file = path.join(
      root,
      path.normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, ''),
    );
    const target =
      url.pathname === '/'
        ? path.join(root, 'index.html')
        : url.pathname.endsWith('/')
          ? path.join(file, 'index.html')
          : file;
    if (!target.startsWith(root) || path.basename(target) === '_headers') {
      res.writeHead(404).end();
      return;
    }
    try {
      if (!(await stat(target)).isFile()) throw new Error('not a file');
      const { size } = await stat(target);
      res.writeHead(200, {
        ...(isSitePage(url.pathname) ? portfolio : headers),
        ...extraHeaders(url.pathname),
        'Content-Type': TYPES[path.extname(target)] ?? 'application/octet-stream',
        'Content-Length': size,
      });
      createReadStream(target).pipe(res);
    } catch {
      res.writeHead(404, headers).end('Not found');
    }
  });
  server.listen(port, () => console.info(`Sandbox on http://localhost:${port}`));
  const stop = () => server.close(() => process.exit(0));
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
  return server;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) serveSandbox();
