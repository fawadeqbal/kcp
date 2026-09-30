import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module.js';
import { API_PREFIX, configureApp } from './app.setup.js';
import { AppConfigService } from './config/app-config.service.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    bodyParser: false,
  });
  configureApp(app);

  const config = app.get(AppConfigService);
  const port = config.get('API_PORT');
  await app.listen(port, '0.0.0.0');

  const docs = config.get('SWAGGER_ENABLED') ? ` · docs at http://localhost:${port}/docs` : '';
  app.get(Logger).log(`API ready on http://localhost:${port}/${API_PREFIX}${docs}`, 'Bootstrap');
}

await bootstrap();
