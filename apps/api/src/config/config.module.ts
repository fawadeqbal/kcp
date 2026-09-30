import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppConfigService } from './app-config.service.js';
import { validateEnv } from './env.js';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      // One .env at the repository root (the API runs with apps/api as its working
      // directory). Real environment variables always win over the file.
      envFilePath: ['.env', '../../.env'],
      validate: validateEnv,
      cache: true,
    }),
  ],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class AppConfigModule {}
