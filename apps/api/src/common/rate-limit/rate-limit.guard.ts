import {
  type CanActivate,
  type ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import { RATE_LIMITS, type RateLimitRule } from './rate-limit.decorator.js';
import { RateLimiterService } from './rate-limiter.service.js';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly limiter: RateLimiterService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const rules = this.reflector.getAllAndOverride<RateLimitRule[] | undefined>(RATE_LIMITS, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!rules?.length) {
      return true;
    }
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();

    for (const rule of rules) {
      const subject = rule.key(req);
      if (!subject) {
        continue;
      }
      const result = await this.limiter.consume(rule.name, subject, rule.limit, rule.windowSeconds);
      if (!result.allowed) {
        res.setHeader('Retry-After', String(result.retryAfterSeconds));
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            error: 'TOO_MANY_REQUESTS',
            message: `Too many attempts. Try again in ${Math.ceil(result.retryAfterSeconds / 60)} minute(s).`,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }
    return true;
  }
}
