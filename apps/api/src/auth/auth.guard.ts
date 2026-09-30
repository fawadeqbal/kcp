import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { AuthUser } from '../permissions/auth-user.js';
import { IS_PUBLIC } from '../permissions/permission.decorators.js';
import { AccessTokenService } from './access-token.service.js';
import { SessionService } from './session.service.js';

/** Global guard: every route needs a valid access token unless it is marked @Public(). */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: AccessTokenService,
    private readonly sessions: SessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
        context.getHandler(),
        context.getClass(),
      ])
    ) {
      return true;
    }
    const req = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : undefined;
    if (!token) {
      throw new UnauthorizedException('Please log in.');
    }
    const claims = await this.tokens.verifyAccess(token);
    const user = await this.sessions.validate(claims.sid, claims.sub);
    if (!user) {
      throw new UnauthorizedException('Your session has ended. Please log in again.');
    }
    req.user = user;
    return true;
  }
}
