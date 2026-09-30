import { createHash } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import type { Redis } from 'ioredis';
import { PrismaService } from '../database/prisma.service.js';
import { REDIS } from '../redis/redis.constants.js';
import type { AppCrashListDto, AppCrashQueryDto, ReportCrashDto } from './dto/app-crash.dto.js';

/** Crash reports are kept this long. */
export const CRASH_KEEP_DAYS = 90;
/** At most this many reports are kept per hour, from everyone together. */
export const CRASH_REPORTS_PER_HOUR = 500;
const HOUR_SECONDS = 60 * 60;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Takes out anything that could name a person, in case an error message carried it:
 * email addresses, long tokens and numbers, and query strings of URLs.
 */
export function scrubCrashText(text: string): string {
  return (
    text
      .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, '[email]')
      .replace(
        /\b(Bearer|token|password|refreshToken|accessToken)(["':=\s]+)[^\s"',}]+/gi,
        '$1$2[hidden]',
      )
      .replace(/(https?:\/\/[^\s?#"']+)\?[^\s"']*/g, '$1?[query]')
      // Long runs of letters and digits (tokens, IDs); plain long names are kept.
      .replace(/\b(?=[\w-]*\d)(?=[\w-]*[A-Za-z])[\w-]{32,}\b/g, '[id]')
      .replace(/\b\d{7,}\b/g, '[number]')
  );
}

/**
 * First-party crash reporting for the mobile app: no crash-reporting SDK (store rules
 * for children's apps), no account or device in the reports. Staff read them in the
 * admin panel.
 */
@Injectable()
export class AppCrashesService {
  private readonly logger = new Logger(AppCrashesService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  /**
   * Keeps a report, unless the same crash (version, message, top of the stack) was
   * kept in the last hour, or the hour's budget is spent: the endpoint is public,
   * so a flood can't fill the database.
   */
  async report(dto: ReportCrashDto, now = new Date()): Promise<void> {
    const message = scrubCrashText(dto.message);
    const stack = scrubCrashText(dto.stack);
    const fingerprint = createHash('sha256')
      .update([dto.platform, dto.appVersion, message, stack.split('\n', 2)[0] ?? ''].join('\n'))
      .digest('hex');
    try {
      if (this.redis.status === 'wait') await this.redis.connect();
      if (!(await this.redis.set(`crash:seen:${fingerprint}`, '1', 'EX', HOUR_SECONDS, 'NX'))) {
        return;
      }
      const hourKey = `crash:hour:${now.toISOString().slice(0, 13)}`;
      const count = await this.redis.incr(hourKey);
      if (count === 1) await this.redis.expire(hourKey, 2 * HOUR_SECONDS);
      if (count > CRASH_REPORTS_PER_HOUR) return;
    } catch (error) {
      // Without Redis, keep the report: losing crash reports is worse.
      this.logger.warn(`Crash report limits unavailable: ${(error as Error).message}`);
    }
    await this.prisma.appCrash.create({
      data: {
        appVersion: dto.appVersion,
        platform: dto.platform,
        osVersion: scrubCrashText(dto.osVersion),
        fatal: dto.fatal,
        message,
        stack,
      },
    });
  }

  async list(query: AppCrashQueryDto, now = new Date()): Promise<AppCrashListDto> {
    const where = query.platform ? { platform: query.platform } : {};
    const [rows, total, lastWeek] = await Promise.all([
      this.prisma.appCrash.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.appCrash.count({ where }),
      this.prisma.appCrash.groupBy({
        by: ['appVersion'],
        where: { ...where, createdAt: { gte: new Date(now.getTime() - 7 * DAY_MS) } },
        _count: { _all: true },
        orderBy: { _count: { appVersion: 'desc' } },
        take: 10,
      }),
    ]);
    return {
      items: rows,
      total,
      page: query.page,
      pageSize: query.pageSize,
      lastWeek: lastWeek.map((row) => ({ appVersion: row.appVersion, count: row._count._all })),
    };
  }

  @Cron('50 3 * * *', { name: 'app-crash-cleanup', timeZone: 'UTC' })
  async cleanupScheduled() {
    try {
      if (this.redis.status === 'wait') await this.redis.connect();
      if (!(await this.redis.set('crashjob:cleanup', '1', 'EX', 30 * 60, 'NX'))) return;
      const removed = await this.purgeOld();
      if (removed)
        this.logger.log(`Deleted ${removed} crash reports older than ${CRASH_KEEP_DAYS} days`);
    } catch (error) {
      this.logger.error(`Crash report cleanup failed: ${(error as Error).message}`);
    }
  }

  async purgeOld(now = new Date()): Promise<number> {
    const { count } = await this.prisma.appCrash.deleteMany({
      where: { createdAt: { lt: new Date(now.getTime() - CRASH_KEEP_DAYS * DAY_MS) } },
    });
    return count;
  }
}
