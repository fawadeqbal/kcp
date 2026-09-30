import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { type NextFunction, raw, type Request, type Response } from 'express';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AllExceptionsFilter } from './common/all-exceptions.filter.js';
import { REQUEST_ID_HEADER } from './common/request-id.js';
import { AppConfigService } from './config/app-config.service.js';
import { setupSwagger } from './openapi/openapi.js';

/** Every route lives under /v1. A breaking change gets /v2, never a silent change. */
export const API_PREFIX = 'v1';

/**
 * Largest JSON body the API accepts. Students' code is the biggest input: three
 * files of MAX_CODE_FILE_LENGTH characters fit, even in Arabic or Urdu.
 */
export const BODY_LIMIT = '512kb';

export interface ConfigureAppOptions {
  /** Mount Swagger UI at /docs (defaults to the SWAGGER_ENABLED setting). */
  swagger?: boolean;
}

/**
 * Applies the same middleware, pipes and filters everywhere the app runs:
 * the server (main.ts), end-to-end tests and the OpenAPI export.
 */
export function configureApp(app: NestExpressApplication, options: ConfigureAppOptions = {}): void {
  const config = app.get(AppConfigService);

  app.useLogger(app.get(Logger));
  app.enableShutdownHooks();

  // Behind Cloudflare and the hosting load balancer: trust exactly that many proxy
  // hops (TRUST_PROXY_HOPS), so rate limits and audit logs see the real client IP and
  // a client can't pick its own by sending X-Forwarded-For.
  app.set('trust proxy', config.get('TRUST_PROXY_HOPS'));

  app.setGlobalPrefix(API_PREFIX);
  // Stripe signs the exact bytes it sends: its webhooks keep their raw body.
  app.use(`/${API_PREFIX}/payments/webhooks`, raw({ type: '*/*', limit: '1mb' }));
  // A shared portfolio is read by the page on the user-content domain (apps/sandbox),
  // without cookies: any origin may read it, errors included ("this link stopped
  // working" must not look like a network failure). Like every answer below, it is
  // never cached, so a link the parent stops stops everywhere at once.
  app.use(
    `/${API_PREFIX}/shared/portfolios`,
    (_req: Request, res: Response, next: NextFunction) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      next();
    },
  );
  // Answers about accounts, children and payments must never sit in a shared or
  // browser cache. Routes that are safe to cache (reference data, prices) say so.
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  // JSON only (the app is created with bodyParser: false): no form posts, which a
  // page on another site could send with the browser's cookies.
  app.useBodyParser('json', { limit: BODY_LIMIT });
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: config.get('CORS_ORIGINS'),
    credentials: true,
    exposedHeaders: [REQUEST_ID_HEADER],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  if (options.swagger ?? config.get('SWAGGER_ENABLED')) {
    setupSwagger(app);
  }
}
