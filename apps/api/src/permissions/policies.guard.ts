import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AbilityFactory, type AppAbility, canOnAll } from './ability.factory.js';
import type { AuthUser } from './auth-user.js';
import {
  IS_AUTHENTICATED,
  IS_PUBLIC,
  REQUIRED_PERMISSION,
  type RequiredPermission,
} from './permission.decorators.js';

/** Runs after the auth guard: checks the route's @Can / @Authenticated / @Public rule. */
@Injectable()
export class PoliciesGuard implements CanActivate {
  private readonly logger = new Logger(PoliciesGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly abilities: AbilityFactory,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)) {
      return true;
    }

    const req = context
      .switchToHttp()
      .getRequest<{ user?: AuthUser; ability?: AppAbility; method: string; url: string }>();
    if (!req.user) {
      // The auth guard already rejects anonymous callers; this is a safety net.
      throw new ForbiddenException();
    }
    req.ability = await this.abilities.forUser(req.user);

    const required = this.reflector.getAllAndOverride<RequiredPermission | undefined>(
      REQUIRED_PERMISSION,
      targets,
    );
    if (required) {
      const allowed = required.onAll
        ? canOnAll(req.ability, required.action, required.subject)
        : req.ability.can(required.action, required.subject);
      if (!allowed) {
        throw new ForbiddenException('You are not allowed to do this.');
      }
      return true;
    }

    if (this.reflector.getAllAndOverride<boolean>(IS_AUTHENTICATED, targets)) {
      return true;
    }

    this.logger.error(`Route ${req.method} ${req.url} declares no access rule; refusing.`);
    throw new ForbiddenException();
  }
}
