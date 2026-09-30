import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, type OpenAPIObject, SwaggerModule } from '@nestjs/swagger';

/**
 * The OpenAPI document is the contract between the API and every client.
 * `pnpm api:client` exports it and regenerates the TypeScript client; CI fails
 * if the committed client is out of date.
 */
export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('Kids Coding Platform API')
    .setDescription(
      'One API for the student and parent web app, the admin panel, the marketing site ' +
        'and the Flutter app. Every route checks the caller’s role.',
    )
    .setVersion('v1')
    .addBearerAuth()
    .build();
  return SwaggerModule.createDocument(app, config, {
    operationIdFactory: (controllerKey, methodKey) =>
      `${controllerKey.replace(/Controller$/, '')}_${methodKey}`,
  });
}

/** Interactive docs at /docs and the raw document at /docs-json (not in production by default). */
export function setupSwagger(app: INestApplication): void {
  SwaggerModule.setup('docs', app, () => buildOpenApiDocument(app), {
    jsonDocumentUrl: 'docs-json',
  });
}
