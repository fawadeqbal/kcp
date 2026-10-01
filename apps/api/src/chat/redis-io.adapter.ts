import type { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import type { Server, ServerOptions } from 'socket.io';
import { AppConfigService } from '../config/app-config.service.js';

/**
 * Socket.IO for the rooms, with the Redis adapter so a message sent to one API server
 * reaches members connected to another. Allowed origins are the apps' (CORS_ORIGINS).
 */
export class RedisIoAdapter extends IoAdapter {
  private readonly clients: Redis[] = [];

  constructor(private readonly context: INestApplicationContext) {
    super(context);
  }

  override createIOServer(port: number, options?: ServerOptions): Server {
    const config = this.context.get(AppConfigService);
    const server = super.createIOServer(port, {
      ...options,
      cors: { origin: config.get('CORS_ORIGINS'), credentials: true },
      // Messages are small; nothing big comes in over the socket (sending is HTTP).
      maxHttpBufferSize: 16 * 1024,
    } as ServerOptions) as Server;
    const pub = new Redis(config.get('REDIS_URL'), { maxRetriesPerRequest: 2 });
    const sub = pub.duplicate();
    pub.on('error', () => undefined);
    sub.on('error', () => undefined);
    this.clients.push(pub, sub);
    server.adapter(createAdapter(pub, sub));
    return server;
  }

  override async close(server: Server): Promise<void> {
    await super.close(server);
    await Promise.all(this.clients.map((client) => client.quit().catch(() => undefined)));
  }
}
