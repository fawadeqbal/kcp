import { ForbiddenException, Injectable } from '@nestjs/common';
import { ROLE_KEYS } from '@kcp/database';
import { PrismaService } from '../database/prisma.service.js';
import type { AuthUser } from '../permissions/auth-user.js';
import type { RegisterDeviceDto } from './dto/devices.dto.js';

/** Phones kept per account; registering another forgets the one seen longest ago. */
export const MAX_DEVICES_PER_ACCOUNT = 10;

/** The phones the mobile app registered for push notifications. */
@Injectable()
export class DevicesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registers (or refreshes) this phone for the signed-in student or parent. A phone
   * belongs to one account at a time: a token already registered moves over (the
   * same phone, now signed in as a brother or sister). Knowing a phone's token is
   * needed for that, and the token never leaves that phone and our API.
   */
  async register(user: AuthUser, dto: RegisterDeviceDto, now = new Date()): Promise<void> {
    if (user.roleKey !== ROLE_KEYS.STUDENT && user.roleKey !== ROLE_KEYS.PARENT) {
      throw new ForbiddenException({
        error: 'NOT_FAMILY',
        message: 'Only students and parents get notifications on their phone.',
      });
    }
    const platform = dto.platform === 'ios' ? 'IOS' : 'ANDROID';
    // Tied to this sign-in: signing out (or out everywhere) stops the notifications.
    const link = { userId: user.id, sessionId: user.sessionId };
    await this.prisma.deviceToken.upsert({
      where: { token: dto.token },
      create: { ...link, token: dto.token, platform, languageCode: dto.language, lastSeenAt: now },
      update: { ...link, platform, languageCode: dto.language, lastSeenAt: now },
    });
    const extra = await this.prisma.deviceToken.findMany({
      where: { userId: user.id },
      orderBy: { lastSeenAt: 'desc' },
      skip: MAX_DEVICES_PER_ACCOUNT,
      select: { id: true },
    });
    if (extra.length) {
      await this.prisma.deviceToken.deleteMany({ where: { id: { in: extra.map((d) => d.id) } } });
    }
  }

  /**
   * Stops notifications to a phone (the app calls it when someone logs out). Knowing
   * the token is enough: it only ever stops notifications, and it works after the
   * session has ended too.
   */
  async remove(token: string): Promise<void> {
    await this.prisma.deviceToken.deleteMany({ where: { token } });
  }
}
