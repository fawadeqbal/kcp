import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants.js';
import { DiscoveryModule, DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { AppModule } from '../app.module.js';
import { IS_AUTHENTICATED, IS_PUBLIC, REQUIRED_PERMISSION } from './permission.decorators.js';

/**
 * Every route must say who may call it: @Public(), @Authenticated() or @Can(...).
 * The policies guard refuses routes without one; this test catches them before
 * they ship. Public routes are listed explicitly so opening one up is a visible change.
 */
const EXPECTED_PUBLIC_ROUTES = [
  'GET /health/live',
  'GET /health/ready',
  'GET /health/storage',
  'POST /auth/parents/sign-up',
  'POST /auth/email/verify',
  'POST /auth/email/resend',
  'POST /auth/password/forgot',
  'POST /auth/password/reset',
  'POST /auth/login',
  'POST /auth/students/login',
  // Young learners: picture passwords, and a device a parent signs in from their own
  // phone (the device holds a secret; the parent approves with their own session).
  'POST /auth/students/picture-login',
  'POST /auth/pairing',
  'POST /auth/pairing/status',
  'POST /auth/pairing/claim',
  'POST /auth/mfa/setup',
  'POST /auth/mfa/verify',
  'POST /auth/refresh',
  'POST /auth/logout',
  'GET /languages',
  'GET /countries',
  'GET /countries/:code/regions',
  // A portfolio opened with the link a parent shared (only while "Public projects" is on).
  'GET /shared/portfolios/:token',
  // Prices for the marketing site; Stripe's webhooks (signed); the mock of Stripe
  // Checkout (404 unless the mock is on, never in production).
  'GET /public/pricing',
  'POST /payments/webhooks/stripe',
  'GET /payments/mock-stripe/checkout/:id',
  'POST /payments/mock-stripe/checkout/:id/pay',
  'POST /payments/mock-stripe/checkout/:id/cancel',
  // The marketing site's waitlist (double opt-in).
  'POST /waitlist',
  'POST /waitlist/confirm',
  // A parent confirms under-13 consent from the link in their email (email plus).
  'POST /parental-consent/confirm',
  // Anyone can check a certificate by the code printed on it.
  'GET /public/certificates/:code',
  // The mobile app: crash reports (it may crash before anyone signs in), and turning
  // off notifications to a phone at logout (the push token itself is the proof).
  'POST /app/crashes',
  'POST /devices/remove',
].toSorted();

interface Route {
  name: string;
  access: 'public' | 'authenticated' | 'permission' | 'none';
}

async function collectRoutes(): Promise<Route[]> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule, DiscoveryModule],
  }).compile();
  const discovery = moduleRef.get(DiscoveryService);
  const scanner = moduleRef.get(MetadataScanner);
  const reflector = moduleRef.get(Reflector);
  const routes: Route[] = [];

  for (const wrapper of discovery.getControllers()) {
    const instance = wrapper.instance as object | undefined;
    if (!instance) continue;
    const controllerClass = instance.constructor;
    const base = String(Reflect.getMetadata(PATH_METADATA, controllerClass) ?? '');
    const proto = Object.getPrototypeOf(instance) as Record<string, unknown>;

    for (const methodName of scanner.getAllMethodNames(proto)) {
      const handler = proto[methodName] as () => unknown;
      const path = Reflect.getMetadata(PATH_METADATA, handler) as string | undefined;
      if (path === undefined) continue;
      const method = RequestMethod[Reflect.getMetadata(METHOD_METADATA, handler) as number];
      const fullPath = `/${[base, path].filter((p) => p && p !== '/').join('/')}`.replace(
        /\/+/g,
        '/',
      );
      const targets = [handler, controllerClass];
      const access = reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)
        ? 'public'
        : reflector.getAllAndOverride(REQUIRED_PERMISSION, targets)
          ? 'permission'
          : reflector.getAllAndOverride<boolean>(IS_AUTHENTICATED, targets)
            ? 'authenticated'
            : 'none';
      routes.push({ name: `${method} ${fullPath}`, access });
    }
  }
  await moduleRef.close();
  return routes;
}

describe('route access rules', () => {
  let routes: Route[];

  beforeAll(async () => {
    routes = await collectRoutes();
  });

  it('finds the routes', () => {
    expect(routes.length).toBeGreaterThan(10);
  });

  it('gives every route an access rule', () => {
    const missing = routes.filter((r) => r.access === 'none').map((r) => r.name);
    expect(missing).toEqual([]);
  });

  it('only opens the expected routes to the public', () => {
    const publicRoutes = routes
      .filter((r) => r.access === 'public')
      .map((r) => r.name)
      .toSorted();
    expect(publicRoutes).toEqual(EXPECTED_PUBLIC_ROUTES);
  });
});
