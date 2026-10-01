import type { HubTimeEntry, Prisma } from '@kcp/database';
import {
  type HubRules,
  hubWeekAt,
  hubWindowEnd,
  hubWorkAllowedAt,
  nextHubWindow,
} from '@kcp/shared';
import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  type OnModuleInit,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import type { Redis } from 'ioredis';
import { PrismaService } from '../database/prisma.service.js';
import type { AuthUser } from '../permissions/auth-user.js';
import { REDIS } from '../redis/redis.constants.js';
import { HubEligibilityService } from './eligibility.service.js';
import { COUNTRY_HUB_SELECT, rulesOf } from './hub-rules.js';

const MINUTE = 60_000;
const LOCK_SECONDS = 4 * 60;

type Db = PrismaService | Prisma.TransactionClient;

export interface TimeUsage {
  weekKey: string;
  capMinutes: number;
  usedMinutes: number;
  leftMinutes: number;
  /** Hub work is allowed right now (outside school hours, inside the day). */
  allowedNow: boolean;
  /** When the allowed time going on now ends. */
  windowEnd: Date | null;
  /** The next time hub work is allowed. */
  nextWindow: Date | null;
  running: (HubTimeEntry & { stopsAt: Date }) | null;
}

/** Whole minutes between two moments. */
const minutesBetween = (from: Date, to: Date) =>
  Math.max(0, Math.floor((to.getTime() - from.getTime()) / MINUTE));

/**
 * Hub time: a timer per student, kept inside their country's rules by the system —
 * it can't start outside the allowed hours or with no time left this week, and it
 * stops by itself (counting only allowed minutes) when the allowed time ends or the
 * weekly cap is reached. While it runs, the student may send code to the project's
 * repository; at no other time.
 */
@Injectable()
export class HubTimeService implements OnModuleInit {
  private readonly logger = new Logger(HubTimeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eligibility: HubEligibilityService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  onModuleInit() {
    // Hub work stopping (a consent taken back, staff pausing): any timer stops too.
    this.eligibility.onPaused(async (studentId) => {
      await this.stopFor(studentId, 'SYSTEM');
    });
  }

  /** The student's rules (null when they have no country: no hub work then). */
  async rulesFor(studentId: string, db: Db = this.prisma): Promise<HubRules | null> {
    const student = await db.user.findUnique({
      where: { id: studentId },
      select: { country: { select: COUNTRY_HUB_SELECT } },
    });
    return student?.country ? rulesOf(student.country) : null;
  }

  /**
   * When a timer started at `startedAt` stops at the latest: the end of the allowed
   * time then, or when the week's minutes run out.
   */
  private stopsAt(startedAt: Date, rules: HubRules, leftAtStart: number): Date {
    const windowEnd = hubWindowEnd(startedAt, rules) ?? startedAt;
    const capEnd = new Date(startedAt.getTime() + leftAtStart * MINUTE);
    return windowEnd < capEnd ? windowEnd : capEnd;
  }

  /** Minutes logged in a week, without the running timer. */
  private async loggedMinutes(studentId: string, weekKey: string, db: Db, exceptId?: string) {
    const sum = await db.hubTimeEntry.aggregate({
      where: {
        studentId,
        weekKey,
        endedAt: { not: null },
        ...(exceptId ? { id: { not: exceptId } } : {}),
      },
      _sum: { minutes: true },
    });
    return sum._sum.minutes ?? 0;
  }

  async usage(studentId: string, now = new Date(), db: Db = this.prisma): Promise<TimeUsage> {
    const rules = await this.rulesFor(studentId, db);
    if (!rules) {
      return {
        weekKey: '',
        capMinutes: 0,
        usedMinutes: 0,
        leftMinutes: 0,
        allowedNow: false,
        windowEnd: null,
        nextWindow: null,
        running: null,
      };
    }
    const weekKey = hubWeekAt(now, rules.timeZone);
    const logged = await this.loggedMinutes(studentId, weekKey, db);
    const runningRow = await db.hubTimeEntry.findFirst({ where: { studentId, endedAt: null } });
    let running: TimeUsage['running'] = null;
    let runningMinutes = 0;
    if (runningRow) {
      const before =
        runningRow.weekKey === weekKey
          ? logged
          : await this.loggedMinutes(studentId, runningRow.weekKey, db);
      const stopsAt = this.stopsAt(
        runningRow.startedAt,
        rules,
        Math.max(0, rules.weeklyMinutes - before),
      );
      running = { ...runningRow, stopsAt };
      if (runningRow.weekKey === weekKey) {
        runningMinutes = minutesBetween(runningRow.startedAt, now < stopsAt ? now : stopsAt);
      }
    }
    const used = logged + runningMinutes;
    const allowedNow = hubWorkAllowedAt(now, rules);
    return {
      weekKey,
      capMinutes: rules.weeklyMinutes,
      usedMinutes: used,
      leftMinutes: Math.max(0, rules.weeklyMinutes - used),
      allowedNow,
      windowEnd: allowedNow ? hubWindowEnd(now, rules) : null,
      nextWindow: nextHubWindow(now, rules),
      running,
    };
  }

  /** Starts the timer on one of the student's tasks. */
  async start(user: AuthUser, taskId: string, now = new Date()): Promise<TimeUsage> {
    const task = await this.prisma.hubTask.findUnique({
      where: { id: taskId },
      include: {
        quote: { select: { status: true, acceptedAt: true } },
        project: { select: { id: true, status: true } },
      },
    });
    if (!task || task.assigneeId !== user.id) {
      throw new NotFoundException({ error: 'TASK_NOT_FOUND', message: 'No such task.' });
    }
    const member = await this.prisma.hubMember.findUnique({
      where: { projectId_studentId: { projectId: task.projectId, studentId: user.id } },
    });
    if (member?.status !== 'APPROVED') {
      throw new NotFoundException({ error: 'TASK_NOT_FOUND', message: 'No such task.' });
    }
    if (
      !['ACTIVE', 'DELIVERED'].includes(task.project.status) ||
      task.quote.status !== 'APPROVED' ||
      task.quote.acceptedAt ||
      task.status === 'DONE' ||
      task.status === 'CANCELLED'
    ) {
      throw new ConflictException({
        error: 'TASK_NOT_OPEN',
        message: 'This task isn’t open for work.',
      });
    }
    if (!(await this.eligibility.isEligible(user.id, now))) {
      throw new ConflictException({ error: 'HUB_PAUSED', message: 'Your hub work is paused.' });
    }
    const usage = await this.usage(user.id, now);
    if (usage.running) {
      throw new ConflictException({
        error: 'TIMER_RUNNING',
        message: 'Your timer is running already.',
      });
    }
    if (!usage.allowedNow) {
      throw new ConflictException({
        error: 'OUTSIDE_HOURS',
        message: 'Hub work isn’t allowed at this time.',
        details: { nextWindow: usage.nextWindow?.toISOString() ?? '' },
      });
    }
    if (usage.leftMinutes <= 0) {
      throw new ConflictException({
        error: 'WEEKLY_CAP',
        message: 'You’ve used this week’s hub hours.',
      });
    }
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.hubTimeEntry.create({
          data: {
            projectId: task.projectId,
            taskId,
            studentId: user.id,
            startedAt: now,
            weekKey: usage.weekKey,
          },
        });
        if (task.status === 'TODO') {
          await tx.hubTask.update({ where: { id: taskId }, data: { status: 'IN_PROGRESS' } });
        }
      });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        throw new ConflictException({
          error: 'TIMER_RUNNING',
          message: 'Your timer is running already.',
        });
      }
      throw error;
    }
    return this.usage(user.id, now);
  }

  /** Stops the student's running timer, counting only the minutes allowed. */
  async stop(user: AuthUser, now = new Date()): Promise<TimeUsage> {
    await this.stopFor(user.id, 'STUDENT', now);
    return this.usage(user.id, now);
  }

  /** Stops a student's timer (if one runs): by them, the cap, the hours, the lead or the system. */
  async stopFor(
    studentId: string,
    by: 'STUDENT' | 'CAP' | 'HOURS' | 'LEAD' | 'SYSTEM',
    now = new Date(),
  ): Promise<HubTimeEntry | null> {
    return this.prisma.$transaction(async (tx) => {
      const entry = await tx.hubTimeEntry.findFirst({ where: { studentId, endedAt: null } });
      if (!entry) return null;
      await tx.$queryRaw`SELECT id FROM hub_time_entries WHERE id = ${entry.id}::uuid FOR UPDATE`;
      const rules = await this.rulesFor(studentId, tx);
      const before = await this.loggedMinutes(studentId, entry.weekKey, tx, entry.id);
      const stopsAt = rules
        ? this.stopsAt(entry.startedAt, rules, Math.max(0, rules.weeklyMinutes - before))
        : entry.startedAt;
      const endedAt = now < stopsAt ? now : stopsAt;
      const reason =
        by === 'STUDENT' && now >= stopsAt ? this.why(entry, stopsAt, rules, before) : by;
      const updated = await tx.hubTimeEntry.updateMany({
        where: { id: entry.id, endedAt: null },
        data: { endedAt, minutes: minutesBetween(entry.startedAt, endedAt), stoppedBy: reason },
      });
      return updated.count ? { ...entry, endedAt } : null;
    });
  }

  /** Why a timer stopped by itself: the weekly cap, or the allowed time ending. */
  private why(entry: HubTimeEntry, stopsAt: Date, rules: HubRules | null, before: number) {
    if (!rules) return 'SYSTEM';
    const capEnd = new Date(entry.startedAt.getTime() + (rules.weeklyMinutes - before) * MINUTE);
    return capEnd <= stopsAt ? 'CAP' : 'HOURS';
  }

  /** Timers past their stopping time are closed (every few minutes). */
  async settleDue(now = new Date()): Promise<number> {
    const running = await this.prisma.hubTimeEntry.findMany({
      where: { endedAt: null },
      take: 1000,
    });
    let stopped = 0;
    for (const entry of running) {
      const rules = await this.rulesFor(entry.studentId);
      const before = await this.loggedMinutes(
        entry.studentId,
        entry.weekKey,
        this.prisma,
        entry.id,
      );
      const stopsAt = rules
        ? this.stopsAt(entry.startedAt, rules, Math.max(0, rules.weeklyMinutes - before))
        : entry.startedAt;
      if (now < stopsAt) continue;
      const done = await this.stopFor(
        entry.studentId,
        this.why(entry, stopsAt, rules, before) as 'CAP',
        now,
      );
      if (done) stopped += 1;
    }
    return stopped;
  }

  @Cron('*/5 * * * *', { name: 'hub-timers', timeZone: 'UTC' })
  async settleScheduled() {
    try {
      if (this.redis.status === 'wait') await this.redis.connect();
      if (!(await this.redis.set('hubjob:timers', '1', 'EX', LOCK_SECONDS, 'NX'))) return;
      try {
        const stopped = await this.settleDue();
        if (stopped) this.logger.log(`${stopped} hub timers stopped at their limit`);
      } finally {
        await this.redis.del('hubjob:timers');
      }
    } catch (error) {
      this.logger.error(`Hub timer job failed: ${(error as Error).message}`);
    }
  }

  /** Whether the student's timer is running on this project right now (pushes need it). */
  async runningOn(studentId: string, projectId: string, now = new Date()): Promise<boolean> {
    const usage = await this.usage(studentId, now);
    return Boolean(
      usage.running && usage.running.projectId === projectId && now < usage.running.stopsAt,
    );
  }

  /** Minutes each student logged on a project. */
  async minutesOnProject(projectId: string): Promise<Map<string, number>> {
    const rows = await this.prisma.hubTimeEntry.groupBy({
      by: ['studentId'],
      where: { projectId },
      _sum: { minutes: true },
    });
    return new Map(rows.map((r) => [r.studentId, r._sum.minutes ?? 0]));
  }
}
