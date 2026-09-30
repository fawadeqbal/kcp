import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

export const REQUEST_ID_HEADER = 'x-request-id';

// Accept a caller's request ID only if it looks safe to log and echo back.
const SAFE_REQUEST_ID = /^[\w.-]{8,128}$/;

/**
 * Reuses the incoming X-Request-Id (for tracing across services) or creates one,
 * and always echoes it on the response so users can quote it in bug reports.
 */
export function assignRequestId(req: IncomingMessage, res: ServerResponse): string {
  const incoming = req.headers[REQUEST_ID_HEADER];
  const id =
    typeof incoming === 'string' && SAFE_REQUEST_ID.test(incoming) ? incoming : randomUUID();
  res.setHeader(REQUEST_ID_HEADER, id);
  return id;
}
