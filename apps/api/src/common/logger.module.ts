import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { AppConfigService } from '../config/app-config.service.js';
import { logUrl } from './log-url.js';
import { assignRequestId } from './request-id.js';

@Module({
  imports: [
    LoggerModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        pinoHttp: {
          level: config.get('LOG_LEVEL'),
          genReqId: assignRequestId,
          // Keep request logs short: who asked for what, and how it went.
          serializers: {
            req: (req: { id: string; method: string; url: string }) => ({
              id: req.id,
              method: req.method,
              // Searches can hold an email or a child's username.
              url: logUrl(req.url),
            }),
            res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
          },
          // Never write credentials or tokens to the logs.
          redact: {
            paths: [
              'req.headers.authorization',
              'req.headers.cookie',
              'res.headers["set-cookie"]',
              '*.password',
              '*.refreshToken',
            ],
            censor: '[redacted]',
          },
          // Health checks run every few seconds; keep them out of the logs.
          autoLogging: {
            ignore: (req) => req.url?.startsWith('/v1/health') ?? false,
          },
          // Human-friendly output locally, JSON lines everywhere else.
          transport:
            config.get('NODE_ENV') === 'development'
              ? { target: 'pino-pretty', options: { singleLine: true } }
              : undefined,
        },
      }),
    }),
  ],
})
export class AppLoggerModule {}
