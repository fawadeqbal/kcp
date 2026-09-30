import {
  applyDecorators,
  createParamDecorator,
  type ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import type { Action, Subject } from '@kcp/database';
import type { AppAbility } from './ability.factory.js';
import type { AuthUser } from './auth-user.js';

export const IS_PUBLIC = Symbol('isPublic');
export const IS_AUTHENTICATED = Symbol('isAuthenticated');
export const REQUIRED_PERMISSION = Symbol('requiredPermission');

export interface RequiredPermission {
  action: Action;
  subject: Subject;
  /** Require access to every record of the subject (list and search endpoints). */
  onAll?: boolean;
}

/**
 * Every route must declare who may call it with exactly one of these. A route
 * without one is refused (fail closed), and a test fails the build.
 */

/** Anyone, signed in or not (health checks, sign-up, public reference data). */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/** Any signed-in account; the handler itself limits what they see (e.g. "my profile"). */
export const Authenticated = () =>
  applyDecorators(
    SetMetadata(IS_AUTHENTICATED, true),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({ description: 'Not signed in' }),
  );

/**
 * Signed-in accounts whose role allows the action on the subject. Record-level rules
 * (for example "only their own children") are checked again in the service with
 * the ability attached to the request.
 */
export const Can = (action: Action, subject: Subject, options: { onAll?: boolean } = {}) =>
  applyDecorators(
    SetMetadata(REQUIRED_PERMISSION, {
      action,
      subject,
      onAll: options.onAll,
    } satisfies RequiredPermission),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({ description: 'Not signed in' }),
    ApiForbiddenResponse({ description: 'Signed in, but not allowed' }),
  );

/** `@CurrentUser() user: AuthUser` */
export const CurrentUser = createParamDecorator(
  (_: unknown, host: ExecutionContext): AuthUser => host.switchToHttp().getRequest().user,
);

/** `@CurrentAbility() ability: AppAbility` — set by the policies guard. */
export const CurrentAbility = createParamDecorator(
  (_: unknown, host: ExecutionContext): AppAbility => host.switchToHttp().getRequest().ability,
);
