import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { AppConfigService } from '../src/config/app-config.service.js';

describe('API (e2e, real PostgreSQL and Redis)', () => {
  let app: NestExpressApplication;
  let allowedOrigins: string[];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>({
      bufferLogs: true,
      bodyParser: false,
    });
    configureApp(app, { swagger: true });
    await app.init();
    allowedOrigins = app.get(AppConfigService).get('CORS_ORIGINS');
  });

  afterAll(async () => {
    await app.close();
  });

  describe('health', () => {
    it('GET /v1/health/live answers without touching dependencies', async () => {
      const res = await request(app.getHttpServer()).get('/v1/health/live').expect(200);
      expect(res.body).toMatchObject({ status: 'ok' });
      expect(res.headers['x-request-id']).toBeTruthy();
    });

    it('GET /v1/health/ready confirms PostgreSQL and Redis are reachable', async () => {
      const res = await request(app.getHttpServer()).get('/v1/health/ready').expect(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.details.database.status).toBe('up');
      expect(res.body.details.redis.status).toBe('up');
    });

    it('GET /v1/health/storage confirms the file storage is reachable', async () => {
      const res = await request(app.getHttpServer()).get('/v1/health/storage').expect(200);
      expect(res.body.details.storage.status).toBe('up');
    });
  });

  describe('errors and tracing', () => {
    it('returns the standard error shape with the request ID', async () => {
      const res = await request(app.getHttpServer()).get('/v1/does-not-exist').expect(404);
      expect(res.body).toMatchObject({
        statusCode: 404,
        error: 'Not Found',
        path: '/v1/does-not-exist',
        requestId: res.headers['x-request-id'],
      });
    });

    it('keeps a safe incoming request ID and replaces an unsafe one', async () => {
      const safe = await request(app.getHttpServer())
        .get('/v1/health/live')
        .set('x-request-id', 'trace-abc-12345');
      expect(safe.headers['x-request-id']).toBe('trace-abc-12345');

      const unsafe = await request(app.getHttpServer())
        .get('/v1/health/live')
        .set('x-request-id', 'bad id <script>');
      expect(unsafe.headers['x-request-id']).not.toBe('bad id <script>');
    });

    it('does not serve routes outside the /v1 prefix', async () => {
      await request(app.getHttpServer()).get('/health/live').expect(404);
    });
  });

  describe('security', () => {
    it('sends security headers', async () => {
      const res = await request(app.getHttpServer()).get('/v1/health/live');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['strict-transport-security']).toBeDefined();
      expect(res.headers['x-powered-by']).toBeUndefined();
    });

    it('allows only configured browser origins', async () => {
      const allowed = allowedOrigins[0];
      if (allowed) {
        const ok = await request(app.getHttpServer()).get('/v1/health/live').set('Origin', allowed);
        expect(ok.headers['access-control-allow-origin']).toBe(allowed);
      }
      const blocked = await request(app.getHttpServer())
        .get('/v1/health/live')
        .set('Origin', 'https://evil.example.com');
      expect(blocked.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  describe('API docs', () => {
    it('serves the OpenAPI document with the health routes', async () => {
      const res = await request(app.getHttpServer()).get('/docs-json').expect(200);
      expect(Object.keys(res.body.paths)).toEqual(
        expect.arrayContaining(['/v1/health/live', '/v1/health/ready']),
      );
    });
  });
});
