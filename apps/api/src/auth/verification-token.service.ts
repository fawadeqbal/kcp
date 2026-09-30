import { BadRequestException, Injectable } from '@nestjs/common';
import type { Prisma, VerificationPurpose } from '@kcp/database';
import { randomToken, sha256 } from '../common/crypto/tokens.js';
import { PrismaService } from '../database/prisma.service.js';

/** One-time tokens for email links (verify email, reset password). */
@Injectable()
export class VerificationTokenService {
  constructor(private readonly prisma: PrismaService) {}

  /** Issues a new token and cancels any earlier unused one for the same purpose. */
  async issue(userId: string, purpose: VerificationPurpose, ttlHours: number): Promise<string> {
    const token = randomToken();
    await this.prisma.$transaction([
      this.prisma.verificationToken.deleteMany({ where: { userId, purpose, usedAt: null } }),
      this.prisma.verificationToken.create({
        data: {
          userId,
          purpose,
          tokenHash: sha256(token),
          expiresAt: new Date(Date.now() + ttlHours * 3_600_000),
        },
      }),
    ]);
    return token;
  }

  /** Marks the token used and returns its user ID, or fails if it is unknown, used or expired. */
  async consume(
    token: string,
    purpose: VerificationPurpose,
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    const record = await tx.verificationToken.findUnique({ where: { tokenHash: sha256(token) } });
    if (
      !record ||
      record.purpose !== purpose ||
      record.usedAt ||
      record.expiresAt.getTime() <= Date.now()
    ) {
      throw new BadRequestException({
        error: 'INVALID_OR_EXPIRED_TOKEN',
        message: 'This link is invalid or has expired. Please request a new one.',
      });
    }
    const updated = await tx.verificationToken.updateMany({
      where: { id: record.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (updated.count === 0) {
      throw new BadRequestException({
        error: 'INVALID_OR_EXPIRED_TOKEN',
        message: 'This link has already been used.',
      });
    }
    return record.userId;
  }
}
