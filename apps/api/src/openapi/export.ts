/**
 * Writes the OpenAPI document to a file without starting the server or touching
 * the database. Used by `pnpm api:client`.
 *
 *   node dist/openapi/export.js <output-file>
 */
import { writeFileSync } from 'node:fs';
import path from 'node:path';

const output = process.argv[2];
if (!output) {
  console.error('Usage: node dist/openapi/export.js <output-file>');
  process.exit(1);
}

// Placeholders so configuration validation passes; nothing connects to them.
process.env['DATABASE_URL'] ??= 'postgresql://openapi:openapi@127.0.0.1:5432/openapi';
process.env['REDIS_URL'] ??= 'redis://127.0.0.1:6379';
process.env['JWT_ACCESS_SECRET'] ??= 'openapi-export-placeholder-secret-0000000000';
process.env['ENCRYPTION_KEY'] ??= Buffer.alloc(32).toString('base64');
process.env['MAIL_TRANSPORT'] = 'memory';
process.env['LOG_LEVEL'] = 'silent';

// Imported after the environment is prepared, because ConfigModule validates on import.
const { NestFactory } = await import('@nestjs/core');
const { AppModule } = await import('../app.module.js');
const { configureApp } = await import('../app.setup.js');
const { buildOpenApiDocument } = await import('./openapi.js');

const app = await NestFactory.create<import('@nestjs/platform-express').NestExpressApplication>(
  AppModule,
  { logger: false, bodyParser: false },
);
configureApp(app, { swagger: false });
const document = buildOpenApiDocument(app);
await app.close();

const target = path.resolve(output);
writeFileSync(target, `${JSON.stringify(document, null, 2)}\n`);
console.info(`OpenAPI document written to ${target}`);
