import type { Prisma } from '@kcp/database';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import type { Redis } from 'ioredis';
import { PrismaService } from '../database/prisma.service.js';
import { REDIS } from '../redis/redis.constants.js';

export type SchoolPremiumResult = 'granted' | 'already' | 'no-licence' | 'seats-full';

const LOCK_SECONDS = 10 * 60;

type Db = PrismaService | Prisma.TransactionClient;

/**
 * Premium paid by a school: a student in one of the school's classes gets a premium
 * grant (source SCHOOL) from the school's paid licence, until it ends, while seats are
 * left. Leaving the school's last class, or a cancelled licence, takes it back. An
 * hourly job hands out seats of licences that started since they were paid (next
 * year's licence, paid early) and to students whose earlier grant ended.
 */
@Injectable()
export class SchoolPremiumService {
  private readonly logger = new Logger(SchoolPremiumService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  /** The school's paid licence that runs now (the one that lasts longest). */
  async activeLicense(schoolId: string, now = new Date(), db: Db = this.prisma) {
    return db.schoolLicense.findFirst({
      where: {
        schoolId,
        paidAt: { not: null },
        cancelledAt: null,
        startsAt: { lte: now },
        endsAt: { gt: now },
      },
      orderBy: { endsAt: 'desc' },
    });
  }

  /** Students with premium from a licence now. */
  async seatsUsed(licenseId: string, now = new Date(), db: Db = this.prisma): Promise<number> {
    return db.premiumGrant.count({
      where: { licenseId, revokedAt: null, endsAt: { gt: now } },
    });
  }

  /** The seats of the school's licence now, or null without one. */
  async seats(schoolId: string, now = new Date()) {
    const license = await this.activeLicense(schoolId, now);
    if (!license) return null;
    return {
      total: license.seats,
      used: await this.seatsUsed(license.id, now),
      endsAt: license.endsAt,
    };
  }

  /** Students with a live grant from any of the school's licences. */
  async covered(
    schoolId: string,
    userIds: string[],
    now = new Date(),
    db: Db = this.prisma,
  ): Promise<Set<string>> {
    if (userIds.length === 0) return new Set();
    const grants = await db.premiumGrant.findMany({
      where: {
        userId: { in: userIds },
        revokedAt: null,
        endsAt: { gt: now },
        license: { schoolId },
      },
      select: { userId: true },
    });
    return new Set(grants.map((g) => g.userId));
  }

  /**
   * Gives a student premium from the school's licence, if one runs and a seat is free.
   * The licence row is locked while seats are counted, so two approvals at the same
   * moment can't both take the last seat (or give one student two grants).
   */
  async grantFor(userId: string, schoolId: string, now = new Date()): Promise<SchoolPremiumResult> {
    return this.prisma.$transaction(async (tx) => {
      const license = await this.activeLicense(schoolId, now, tx);
      if (!license) return 'no-licence';
      await tx.$queryRaw`SELECT id FROM school_licenses WHERE id = ${license.id}::uuid FOR UPDATE`;
      if ((await this.covered(schoolId, [userId], now, tx)).size) return 'already';
      if ((await this.seatsUsed(license.id, now, tx)) >= license.seats) return 'seats-full';
      await tx.premiumGrant.create({
        data: {
          userId,
          source: 'SCHOOL',
          licenseId: license.id,
          reason: `School licence ${license.invoiceNumber}`,
          startsAt: now,
          endsAt: license.endsAt,
        },
      });
      return 'granted';
    });
  }

  /** Takes the school's premium back, unless the student is still in another of its classes. */
  async revokeFor(userId: string, schoolId: string, now = new Date()) {
    const still = await this.prisma.classMember.count({
      where: { userId, status: 'APPROVED', class: { schoolId, archivedAt: null } },
    });
    if (still > 0) return;
    await this.prisma.premiumGrant.updateMany({
      where: { userId, revokedAt: null, endsAt: { gt: now }, license: { schoolId } },
      data: { revokedAt: now },
    });
  }

  /** A licence was paid (or started): the school's students get premium, first come first served. */
  async licensePaid(schoolId: string, now = new Date()) {
    const members = await this.prisma.classMember.findMany({
      where: { status: 'APPROVED', class: { schoolId, archivedAt: null } },
      orderBy: { approvedAt: 'asc' },
      select: { userId: true },
    });
    let granted = 0;
    for (const userId of new Set(members.map((m) => m.userId))) {
      const result = await this.grantFor(userId, schoolId, now);
      if (result === 'granted') granted += 1;
      if (result === 'seats-full' || result === 'no-licence') break;
    }
    return granted;
  }

  /** A licence was cancelled: its grants end now. */
  async licenseCancelled(licenseId: string, now = new Date()) {
    await this.prisma.premiumGrant.updateMany({
      where: { licenseId, revokedAt: null, endsAt: { gt: now } },
      data: { revokedAt: now },
    });
  }

  /** Every school with a paid licence running now: hand out its free seats. */
  async grantRunningLicenses(now = new Date()) {
    const schools = await this.prisma.schoolLicense.findMany({
      where: {
        paidAt: { not: null },
        cancelledAt: null,
        startsAt: { lte: now },
        endsAt: { gt: now },
      },
      select: { schoolId: true },
      distinct: ['schoolId'],
    });
    let granted = 0;
    for (const { schoolId } of schools) granted += await this.licensePaid(schoolId, now);
    return granted;
  }

  @Cron('17 * * * *', { name: 'school-licences', timeZone: 'UTC' })
  async grantScheduled() {
    try {
      if (this.redis.status === 'wait') await this.redis.connect();
      if (!(await this.redis.set('schooljob:licences', '1', 'EX', LOCK_SECONDS, 'NX'))) return;
      try {
        const granted = await this.grantRunningLicenses();
        if (granted) this.logger.log(`School licences: premium for ${granted} more students`);
      } finally {
        await this.redis.del('schooljob:licences');
      }
    } catch (error) {
      this.logger.error(`School licence job failed: ${(error as Error).message}`);
    }
  }
}
