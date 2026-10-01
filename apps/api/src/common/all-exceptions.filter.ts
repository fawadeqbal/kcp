import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { logUrl } from './log-url.js';

/** The one error shape every client (web, admin, Flutter) can rely on. */
export interface ErrorBody {
  statusCode: number;
  error: string;
  message: string | string[];
  /** A few plain values some errors carry for the apps (e.g. why a message was refused). */
  details?: Record<string, string | number | boolean | null>;
  requestId?: string;
  path: string;
  timestamp: string;
}

/** `details` only when it is a small object of plain values (never nested data). */
function plainDetails(value: unknown): ErrorBody['details'] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const entries = Object.entries(value);
  if (entries.length > 8) return undefined;
  const plain = entries.every(
    ([, v]) => v === null || ['string', 'number', 'boolean'].includes(typeof v),
  );
  return plain ? (value as ErrorBody['details']) : undefined;
}

const isTooLarge = (exception: unknown) =>
  (exception as { type?: unknown } | null)?.type === 'entity.too.large';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request & { id?: string }>();
    const res = ctx.getResponse<Response>();

    let status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: string | string[] = 'Internal server error';
    let error = 'Internal Server Error';
    let details: ErrorBody['details'];
    if (isTooLarge(exception)) {
      // From the body parser: a request over the size limit is the caller's mistake.
      status = HttpStatus.PAYLOAD_TOO_LARGE;
      error = 'PAYLOAD_TOO_LARGE';
      message = 'The request is too large.';
    } else if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (typeof response === 'string') {
        message = response;
        error = exception.name;
      } else {
        const body = response as { message?: unknown; error?: unknown; details?: unknown };
        // Only plain strings reach the client: some libraries (health checks) put
        // internal details in these fields.
        message =
          typeof body.message === 'string' ||
          (Array.isArray(body.message) && body.message.every((m) => typeof m === 'string'))
            ? (body.message as string | string[])
            : exception.message;
        error = typeof body.error === 'string' ? body.error : exception.name;
        details = plainDetails(body.details);
      }
    }

    if (status >= 500) {
      // Unexpected failures are logged with the stack; details never reach the client.
      this.logger.error(
        { err: exception, requestId: req.id },
        `Unhandled error on ${req.method} ${logUrl(req.originalUrl ?? req.url)}`,
      );
    }

    const body: ErrorBody = {
      statusCode: status,
      error,
      message,
      ...(details && status < 500 ? { details } : {}),
      requestId: req.id,
      path: req.originalUrl ?? req.url,
      timestamp: new Date().toISOString(),
    };
    res.status(status).json(body);
  }
}
