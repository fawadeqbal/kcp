import { Injectable } from '@nestjs/common';
import type { Prisma } from '@kcp/database';
import type { RequestContext } from '../common/request-context.js';
import { PrismaService } from '../database/prisma.service.js';

export interface AuditActor {
  id: string;
  roleKey: string;
}

export interface AuditEntry {
  /** Who did it; null for the system or an anonymous caller. */
  actor: AuditActor | null;
  /** Dotted verb, e.g. "user.suspend", "auth.password_reset". */
  action: string;
  entityType: string;
  entityId?: string;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
  context?: RequestContext;
}

type Db = Pick<PrismaService, 'auditLog'> | Prisma.TransactionClient;

/**
 * Writes to the append-only audit log. Pass the transaction client when the change
 * and its audit entry must succeed or fail together.
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry, db: Db = this.prisma): Promise<void> {
    await db.auditLog.create({
      data: {
        actorId: entry.actor?.id ?? null,
        actorRole: entry.actor?.roleKey ?? null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        before: entry.before,
        after: entry.after,
        ipAddress: entry.context?.ip ?? null,
        userAgent: entry.context?.userAgent ?? null,
        requestId: entry.context?.requestId ?? null,
      },
    });
  }
}
