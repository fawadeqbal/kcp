import { Logger } from '@nestjs/common';
import { type OnGatewayConnection, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { Namespace, Socket } from 'socket.io';
import { AccessTokenService } from '../auth/access-token.service.js';
import { SessionService } from '../auth/session.service.js';
import { PrismaService } from '../database/prisma.service.js';
import type { ChatMessageDto } from './chat.dto.js';

/**
 * Live rooms: members connect with their access token (`auth: { token }`) and receive
 * new messages ("message") and removed ones ("hidden") for every room they're in.
 * Sending goes through the HTTP API (filtered, rate-limited and stored first).
 */
@WebSocketGateway({ namespace: '/chat', path: '/socket.io' })
export class ChatGateway implements OnGatewayConnection {
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer() server!: Namespace;

  constructor(
    private readonly tokens: AccessTokenService,
    private readonly sessions: SessionService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(socket: Socket): Promise<void> {
    try {
      const token = (socket.handshake.auth as { token?: unknown } | undefined)?.token;
      if (typeof token !== 'string') throw new Error('no token');
      const claims = await this.tokens.verifyAccess(token);
      const user = await this.sessions.validate(claims.sid, claims.sub);
      if (!user) throw new Error('session ended');
      socket.data = { userId: user.id };
      await socket.join(`user:${user.id}`);
      const rooms = await this.prisma.chatMember.findMany({
        where: { userId: user.id, room: { isArchived: false } },
        select: { roomId: true },
      });
      for (const { roomId } of rooms) await socket.join(`room:${roomId}`);
      socket.emit('ready', { rooms: rooms.map((r) => r.roomId) });
    } catch (error) {
      this.logger.debug(`Room connection refused: ${(error as Error).message}`);
      socket.emit('refused');
      socket.disconnect(true);
    }
  }

  private get live(): boolean {
    return Boolean(this.server);
  }

  message(message: ChatMessageDto) {
    if (this.live) this.server.to(`room:${message.roomId}`).emit('message', message);
  }

  hidden(roomId: string, messageId: string) {
    if (this.live) this.server.to(`room:${roomId}`).emit('hidden', { roomId, messageId });
  }

  /** A member joins (or leaves) a room: their open connections follow. */
  join(userId: string, roomId: string) {
    if (this.live) this.server.in(`user:${userId}`).socketsJoin(`room:${roomId}`);
  }

  leave(userId: string, roomId: string) {
    if (this.live) this.server.in(`user:${userId}`).socketsLeave(`room:${roomId}`);
  }
}
