import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

/** Who made a request and from where — recorded in audit logs and sessions. */
export interface RequestContext {
  ip: string | undefined;
  userAgent: string | undefined;
  requestId: string | undefined;
}

export function requestContextFrom(req: Request & { id?: unknown }): RequestContext {
  return {
    ip: req.ip,
    userAgent: req.headers['user-agent']?.slice(0, 512),
    requestId: typeof req.id === 'string' ? req.id : undefined,
  };
}

/** Controller parameter decorator: `@ReqContext() ctx: RequestContext`. */
export const ReqContext = createParamDecorator((_: unknown, host: ExecutionContext) =>
  requestContextFrom(host.switchToHttp().getRequest()),
);
