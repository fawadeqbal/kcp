import { randomUUID } from 'node:crypto';
import {
  type Action,
  permissionMatrix,
  ROLE_KEYS,
  type RoleKey,
  type Subject,
} from '@kcp/database';
import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants.js';
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import {
  type AppRawRule,
  buildAbility,
  canOnAll,
  rulesForUser,
} from '../src/permissions/ability.factory.js';
import {
  IS_AUTHENTICATED,
  IS_PUBLIC,
  REQUIRED_PERMISSION,
} from '../src/permissions/permission.decorators.js';
import {
  createTestApp,
  resetRateLimits,
  signUpAndLogin,
  staffLogin,
  type TestContext,
  webTwoFactorLogin,
} from './helpers.js';
import { auth, family } from './learning-fixture.js';

/**
 * A permission test on every route, generated from the routes themselves: each one
 * is called without a token (401 unless it's public), and as every role whose rules
 * don't allow it (403). Guards run before anything else, so nothing is changed by
 * these calls. A new route is covered automatically.
 */

interface Route {
  method: string;
  path: string;
  access: 'public' | 'authenticated' | 'permission';
  permission?: { action: Action; subject: Subject; onAll?: boolean };
}

function collectRoutes(t: TestContext): Route[] {
  const discovery = t.app.get(DiscoveryService);
  const scanner = t.app.get(MetadataScanner);
  const reflector = t.app.get(Reflector);
  const routes: Route[] = [];
  for (const wrapper of discovery.getControllers()) {
    const instance = wrapper.instance as object | undefined;
    if (!instance) continue;
    const controllerClass = instance.constructor;
    const base = String(Reflect.getMetadata(PATH_METADATA, controllerClass) ?? '');
    const proto = Object.getPrototypeOf(instance) as Record<string, unknown>;
    for (const name of scanner.getAllMethodNames(proto)) {
      const handler = proto[name] as () => unknown;
      const path = Reflect.getMetadata(PATH_METADATA, handler) as string | undefined;
      if (path === undefined) continue;
      const method = RequestMethod[Reflect.getMetadata(METHOD_METADATA, handler) as number];
      const targets = [handler, controllerClass];
      const permission = reflector.getAllAndOverride<Route['permission']>(
        REQUIRED_PERMISSION,
        targets,
      );
      routes.push({
        method: method!,
        path: `/v1/${[base, path].filter((p) => p && p !== '/').join('/')}`.replace(/\/+/g, '/'),
        access: reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)
          ? 'public'
          : permission
            ? 'permission'
            : reflector.getAllAndOverride<boolean>(IS_AUTHENTICATED, targets)
              ? 'authenticated'
              : 'permission',
        ...(permission ? { permission } : {}),
      });
    }
  }
  return routes;
}

/** Any value works for path parameters: guards answer before they're read. */
const concrete = (path: string) => path.replace(/:\w+/g, () => randomUUID());

const ROLES: RoleKey[] = [
  ROLE_KEYS.STUDENT,
  ROLE_KEYS.PARENT,
  ROLE_KEYS.MENTOR,
  ROLE_KEYS.TEACHER,
  ROLE_KEYS.CONTENT_CREATOR,
  ROLE_KEYS.MODERATOR,
  ROLE_KEYS.ADMIN,
];

describe('permissions on every route (e2e)', () => {
  let t: TestContext;
  let routes: Route[];
  const tokens = new Map<RoleKey, string>();

  beforeAll(async () => {
    t = await createTestApp();
    routes = collectRoutes(t);
    const { student } = await family(t);
    tokens.set(ROLE_KEYS.STUDENT, student);
    tokens.set(ROLE_KEYS.PARENT, (await signUpAndLogin(t)).accessToken);
    // Mentors and teachers aren't staff (no admin panel): they sign in to the web app,
    // with a two-factor code.
    tokens.set(ROLE_KEYS.MENTOR, (await webTwoFactorLogin(t, ROLE_KEYS.MENTOR)).token);
    tokens.set(ROLE_KEYS.TEACHER, (await webTwoFactorLogin(t, ROLE_KEYS.TEACHER)).token);
    for (const role of [ROLE_KEYS.CONTENT_CREATOR, ROLE_KEYS.MODERATOR, ROLE_KEYS.ADMIN]) {
      tokens.set(role, (await staffLogin(t, role)).token);
    }
  });

  afterAll(async () => {
    await t.app.close();
  });

  const call = (route: Route, token?: string) => {
    const method = route.method.toLowerCase() as 'get' | 'post' | 'put' | 'patch' | 'delete';
    const agent = t.http();
    const request = agent[method](concrete(route.path));
    return (token ? request.set(auth(token)) : request).send({});
  };

  it('finds the routes', () => {
    expect(routes.length).toBeGreaterThan(100);
    // Every public route is listed in src/permissions/route-access.spec.ts.
    expect(routes.filter((r) => r.access === 'public').length).toBeLessThan(40);
  });

  it('refuses every route that is not public without a token (401)', async () => {
    const wrong: string[] = [];
    for (const [i, route] of routes.filter((r) => r.access !== 'public').entries()) {
      if (i % 20 === 0) await resetRateLimits(t.redis);
      const res = await call(route);
      if (res.status !== 401) wrong.push(`${route.method} ${route.path} → ${res.status}`);
    }
    expect(wrong).toEqual([]);
  });

  it.each(ROLES)('refuses %s every route its rules do not allow (403)', async (role) => {
    const ability = buildAbility(rulesForUser(permissionMatrix[role] as AppRawRule[], 'me'));
    const denied = routes.filter(
      (route) =>
        route.permission &&
        !(route.permission.onAll
          ? canOnAll(ability, route.permission.action, route.permission.subject)
          : ability.can(route.permission.action, route.permission.subject)),
    );
    if (role !== ROLE_KEYS.ADMIN) expect(denied.length).toBeGreaterThan(0);
    const wrong: string[] = [];
    for (const [i, route] of denied.entries()) {
      if (i % 20 === 0) await resetRateLimits(t.redis);
      const res = await call(route, tokens.get(role));
      if (res.status !== 403) wrong.push(`${route.method} ${route.path} → ${res.status}`);
    }
    expect(wrong).toEqual([]);
  });

  it('keeps every staff route (/admin) away from families', () => {
    const families = ['student', 'parent'].map((role) =>
      buildAbility(rulesForUser(permissionMatrix[role as RoleKey] as AppRawRule[], 'me')),
    );
    const allows = (ability: (typeof families)[number], permission: Route['permission']) =>
      permission!.onAll
        ? canOnAll(ability, permission!.action, permission!.subject)
        : ability.can(permission!.action, permission!.subject);
    const open = routes.filter(
      (route) =>
        route.path.startsWith('/v1/admin/') &&
        (!route.permission || families.some((ability) => allows(ability, route.permission))),
    );
    expect(open.map((r) => `${r.method} ${r.path}`)).toEqual([]);
  });
});
