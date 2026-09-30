import { GoneException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import type { Redis } from 'ioredis';
import { randomToken, sha256 } from '../common/crypto/tokens.js';
import { AppConfigService } from '../config/app-config.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { MailService } from '../mail/mail.service.js';
import { toMailLanguage } from '../mail/templates.js';
import { REDIS } from '../redis/redis.constants.js';
import type { JoinWaitlistDto, WaitlistSummaryDto } from './waitlist.dto.js';

const LINK_DAYS = 7;
/** Unconfirmed addresses are forgotten after this long. */
const PENDING_KEEP_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
/** New answers from a confirmed address, waiting for the link in the email (Redis). */
const PENDING_UPDATE_PREFIX = 'waitlist:update:';

/**
 * The marketing site's waitlist, with double opt-in: an address counts only once its
 * owner clicks the link we send. The answer never says whether an address was
 * already on the list.
 */
@Injectable()
export class WaitlistService {
  private readonly logger = new Logger(WaitlistService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: AppConfigService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  async join(dto: JoinWaitlistDto): Promise<void> {
    const existing = await this.prisma.waitlistEntry.findUnique({ where: { email: dto.email } });
    if (existing?.confirmedAt) {
      // Already confirmed: new answers apply only once the inbox owner clicks the link
      // (anyone can type someone else's address).
      const token = randomToken();
      await this.redis.set(
        `${PENDING_UPDATE_PREFIX}${sha256(token)}`,
        JSON.stringify({
          email: dto.email,
          countryCode: dto.countryCode,
          ageBand: dto.ageBand,
          languageCode: dto.languageCode,
        }),
        'EX',
        LINK_DAYS * 24 * 60 * 60,
      );
      await this.sendLink(dto.email, dto.languageCode, token);
      return;
    }
    const token = randomToken();
    const data = {
      countryCode: dto.countryCode,
      ageBand: dto.ageBand,
      languageCode: dto.languageCode,
      tokenHash: sha256(token),
      tokenExpiresAt: new Date(Date.now() + LINK_DAYS * DAY_MS),
    };
    await this.prisma.waitlistEntry.upsert({
      where: { email: dto.email },
      create: { email: dto.email, ...data },
      update: data,
    });
    await this.sendLink(dto.email, dto.languageCode, token);
  }

  private async sendLink(email: string, languageCode: string, token: string) {
    const language = toMailLanguage(languageCode);
    try {
      await this.mail.send({
        to: email,
        template: 'waitlistConfirm',
        language,
        params: {
          name: '',
          actionUrl: `${this.config.get('SITE_URL')}/${language}/waitlist/confirm?token=${encodeURIComponent(token)}`,
        },
      });
    } catch (error) {
      this.logger.warn(`Waitlist email not sent: ${(error as Error).message}`);
    }
  }

  async confirm(token: string): Promise<void> {
    const entry = await this.prisma.waitlistEntry.findUnique({
      where: { tokenHash: sha256(token) },
    });
    if (!entry) {
      // New answers from someone already on the list, confirmed now.
      const key = `${PENDING_UPDATE_PREFIX}${sha256(token)}`;
      const pending = await this.redis.getdel(key);
      if (pending) {
        const update = JSON.parse(pending) as Pick<
          JoinWaitlistDto,
          'email' | 'countryCode' | 'ageBand' | 'languageCode'
        >;
        await this.prisma.waitlistEntry.updateMany({
          where: { email: update.email, confirmedAt: { not: null } },
          data: {
            countryCode: update.countryCode,
            ageBand: update.ageBand,
            languageCode: update.languageCode,
          },
        });
        return;
      }
      throw new NotFoundException({ error: 'INVALID_TOKEN', message: 'Unknown link.' });
    }
    if (!entry.tokenExpiresAt || entry.tokenExpiresAt < new Date()) {
      throw new GoneException({ error: 'TOKEN_EXPIRED', message: 'This link has expired.' });
    }
    await this.prisma.waitlistEntry.update({
      where: { id: entry.id },
      data: { confirmedAt: new Date(), tokenHash: null, tokenExpiresAt: null },
    });
  }

  async summary(): Promise<WaitlistSummaryDto> {
    const [groups, latest] = await Promise.all([
      this.prisma.waitlistEntry.groupBy({
        by: ['countryCode', 'confirmedAt'],
        _count: { _all: true },
      }),
      this.prisma.waitlistEntry.findMany({
        where: { confirmedAt: { not: null } },
        orderBy: { confirmedAt: 'desc' },
        take: 50,
      }),
    ]);
    const byCountry = new Map<string, { confirmed: number; pending: number }>();
    for (const group of groups) {
      const counts = byCountry.get(group.countryCode) ?? { confirmed: 0, pending: 0 };
      if (group.confirmedAt) counts.confirmed += group._count._all;
      else counts.pending += group._count._all;
      byCountry.set(group.countryCode, counts);
    }
    return {
      countries: [...byCountry]
        .map(([countryCode, counts]) => ({ countryCode, ...counts }))
        .toSorted((a, b) => b.confirmed - a.confirmed),
      latest: latest.map((e) => ({
        email: e.email,
        countryCode: e.countryCode,
        ageBand: e.ageBand,
        languageCode: e.languageCode,
        confirmedAt: e.confirmedAt,
      })),
    };
  }

  /** Nightly: addresses never confirmed are removed after PENDING_KEEP_DAYS. */
  @Cron('40 3 * * *', { name: 'waitlist-cleanup', timeZone: 'UTC' })
  async forgetUnconfirmed(now = new Date()): Promise<number> {
    try {
      const removed = await this.prisma.waitlistEntry.deleteMany({
        where: {
          confirmedAt: null,
          createdAt: { lt: new Date(now.getTime() - PENDING_KEEP_DAYS * DAY_MS) },
        },
      });
      return removed.count;
    } catch (error) {
      this.logger.error(`Waitlist cleanup failed: ${(error as Error).message}`);
      return 0;
    }
  }
}
