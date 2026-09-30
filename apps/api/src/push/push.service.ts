import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../config/app-config.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { FcmClient, InvalidTokenError, parseServiceAccount } from './fcm.js';
import {
  PUSH_ROUTES,
  type PushKind,
  type PushLanguage,
  renderPush,
  toPushLanguage,
} from './push-copy.js';

export type PushParams = Record<string, string | number>;

export interface SentPush {
  userId: string;
  token: string;
  kind: PushKind;
  language: PushLanguage;
  title: string;
  body: string;
  data: Record<string, string>;
}

export interface PushInput {
  kind: PushKind;
  /** The values in the text; a function when they depend on the language (dates). */
  params: PushParams | ((language: PushLanguage) => PushParams);
  /** Extra data for the app (strings only), e.g. which child it is about. */
  data?: Record<string, string>;
}

const BATCH = 20;

/**
 * Push notifications to the mobile app. They go only to phones still signed in
 * (each token belongs to the phone's session: logging out there, signing out
 * everywhere or a password reset stops them), in the language the app is set to.
 * Without Firebase configured, they are only logged.
 */
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private readonly fcm: FcmClient | undefined;
  private readonly transport: 'fcm' | 'log' | 'memory';
  /** Notifications kept by the memory transport (tests only). */
  readonly outbox: SentPush[] = [];

  constructor(
    private readonly prisma: PrismaService,
    config: AppConfigService,
  ) {
    this.transport = config.get('PUSH_TRANSPORT');
    const account = config.get('FIREBASE_SERVICE_ACCOUNT');
    if (this.transport === 'fcm' && account) {
      this.fcm = new FcmClient(parseServiceAccount(account));
    }
  }

  /**
   * Sends to every signed-in phone of these accounts. Returns how many went out.
   * Never throws: a notification is a nice extra, never a reason for a job to fail.
   */
  async sendToUsers(userIds: string[], input: PushInput, now = new Date()): Promise<number> {
    if (userIds.length === 0) return 0;
    try {
      return await this.send(userIds, input, now);
    } catch (error) {
      this.logger.warn(`Push "${input.kind}" not sent: ${(error as Error).message}`);
      return 0;
    }
  }

  private async send(userIds: string[], input: PushInput, now: Date): Promise<number> {
    const devices = await this.prisma.deviceToken.findMany({
      where: {
        userId: { in: [...new Set(userIds)] },
        user: { status: 'ACTIVE' },
        // Only while the phone's own sign-in lasts (not after logging out there).
        session: { revokedAt: null, expiresAt: { gt: now } },
      },
      select: { id: true, userId: true, token: true, languageCode: true },
    });
    let sent = 0;
    for (let i = 0; i < devices.length; i += BATCH) {
      const results = await Promise.all(
        devices.slice(i, i + BATCH).map((device) => this.sendOne(device, input)),
      );
      sent += results.filter(Boolean).length;
    }
    return sent;
  }

  private async sendOne(
    device: { id: string; userId: string; token: string; languageCode: string },
    input: PushInput,
  ): Promise<boolean> {
    const language = toPushLanguage(device.languageCode);
    const params = typeof input.params === 'function' ? input.params(language) : input.params;
    const { title, body } = renderPush(input.kind, language, params);
    const data = { ...input.data, type: input.kind, route: PUSH_ROUTES[input.kind] };
    try {
      switch (this.transport) {
        case 'memory':
          this.outbox.push({
            userId: device.userId,
            token: device.token,
            kind: input.kind,
            language,
            title,
            body,
            data,
          });
          break;
        case 'log':
          // No Firebase yet: note it (never the token, it works like an address).
          this.logger.log(`Push "${input.kind}" (${language}) not sent: Firebase isn't set up`);
          break;
        case 'fcm':
          await this.fcm!.send({ token: device.token, title, body, data });
          break;
      }
      return true;
    } catch (error) {
      if (error instanceof InvalidTokenError) {
        // The app was removed or got a new token: forget this one.
        await this.prisma.deviceToken.deleteMany({ where: { id: device.id } });
        return false;
      }
      this.logger.warn(`Push "${input.kind}" not sent: ${(error as Error).message}`);
      return false;
    }
  }
}
