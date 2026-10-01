import type { Prisma } from '@kcp/database';
import {
  ACTIVITY_HEARTBEAT_SECONDS,
  LEAGUE_TIERS,
  MAX_ACTIVITY_MINUTES_PER_DAY,
  SKILL_CATEGORIES,
} from '@kcp/shared';
import { ForbiddenException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import type { Redis } from 'ioredis';
import { formatDate } from '../common/format.js';
import { AppConfigService } from '../config/app-config.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { MailService } from '../mail/mail.service.js';
import { MAIL_COPY, toMailLanguage } from '../mail/templates.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import type { AuthUser } from '../permissions/auth-user.js';
import { ProgressService } from '../progress/progress.service.js';
import { addDays, localDay, weekOfDay } from '../progress/xp-rules.js';
import { REDIS } from '../redis/redis.constants.js';
import type { ParentReportDto, ReportChildDto, SkillMapDto } from './reports.dto.js';

const LOCK_SECONDS = 50 * 60;
/** Reports go out on Sunday from this hour (each country's time). */
const REPORT_HOUR = 17;
const REPORTS_SHOWN = 8;

const asDate = (day: string) => new Date(`${day}T00:00:00Z`);
const asDay = (date: Date) => date.toISOString().slice(0, 10);

/** The hour and weekday (0 = Sunday) somewhere, now. */
export function localClock(now: Date, timeZone: string): { hour: number; weekday: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    hourCycle: 'h23',
    weekday: 'short',
  }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(
    parts.find((p) => p.type === 'weekday')?.value ?? 'Sun',
  );
  return { hour, weekday };
}

/** Reports are due from Sunday REPORT_HOUR:00 until the week ends (the place's time). */
export function reportDue(now: Date, timeZone: string): boolean {
  const clock = localClock(now, timeZone);
  return clock.weekday === 0 && clock.hour >= REPORT_HOUR;
}

/**
 * How families see learning over time:
 * - minutes: the apps send a heartbeat every minute while a student works; each counts
 *   as a minute of that day (the student's date), at most MAX_ACTIVITY_MINUTES_PER_DAY;
 * - the skill map: what the lessons a student finished teach (content/skills.yaml);
 * - the weekly report: on Sunday evening (each country's time), every parent gets
 *   their children's week, on the dashboard and (unless switched off) by email.
 */
@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly progress: ProgressService,
    private readonly mail: MailService,
    private readonly notifications: NotificationsService,
    private readonly config: AppConfigService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  // ── Minutes ──────────────────────────────────────────────────────────────

  /** A student is working: counts a minute of today, once per heartbeat period. */
  async heartbeat(user: AuthUser, now = new Date()): Promise<void> {
    if (user.kind !== 'STUDENT') {
      throw new ForbiddenException({ error: 'STUDENTS_ONLY', message: 'For students only.' });
    }
    if (this.redis.status === 'wait') await this.redis.connect();
    // Several tabs or devices at once still count one minute a minute.
    const fresh = await this.redis.set(
      `activity:${user.id}`,
      '1',
      'EX',
      ACTIVITY_HEARTBEAT_SECONDS - 10,
      'NX',
    );
    if (!fresh) return;
    const student = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { country: { select: { timezone: true } } },
    });
    const day = asDate(localDay(now, student.country?.timezone ?? 'UTC'));
    await this.prisma.$executeRaw`
      INSERT INTO student_activity_days (user_id, day, minutes, updated_at)
      VALUES (${user.id}::uuid, ${day}, 1, now())
      ON CONFLICT (user_id, day) DO UPDATE
      SET minutes = LEAST(student_activity_days.minutes + 1, ${MAX_ACTIVITY_MINUTES_PER_DAY}),
          updated_at = now()`;
  }

  // ── Skills ───────────────────────────────────────────────────────────────

  private skillName(names: Prisma.JsonValue, language: string): string {
    const map = (names ?? {}) as Record<string, string>;
    return map[language] ?? map['en'] ?? '';
  }

  /** The skill map: every skill, and how much of it the student has learned. */
  async skillMap(studentId: string, language: string): Promise<SkillMapDto> {
    const [skills, lessons, done] = await Promise.all([
      this.prisma.skill.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }),
      this.prisma.lesson.findMany({
        where: { isActive: true, module: { isActive: true } },
        select: { id: true, skills: true },
      }),
      this.prisma.lessonProgress.findMany({
        where: { userId: studentId, status: 'COMPLETED' },
        select: { lessonId: true },
      }),
    ]);
    const finished = new Set(done.map((d) => d.lessonId));
    const categories = SKILL_CATEGORIES.map((key) => ({
      key,
      skills: skills
        .filter((skill) => skill.category === key)
        .map((skill) => {
          const teaching = lessons.filter((l) => l.skills.includes(skill.key));
          const lessonsDone = teaching.filter((l) => finished.has(l.id)).length;
          return {
            key: skill.key,
            name: this.skillName(skill.names, language),
            lessonsDone,
            lessonsTotal: teaching.length,
            learned: lessonsDone > 0,
          };
        })
        .filter((skill) => skill.lessonsTotal > 0),
    })).filter((category) => category.skills.length > 0);
    const all = categories.flatMap((c) => c.skills);
    return { categories, learned: all.filter((s) => s.learned).length, total: all.length };
  }

  private async assertChildOf(parent: AuthUser, childId: string) {
    if (parent.roleKey !== 'parent') {
      throw new ForbiddenException({ error: 'PARENTS_ONLY', message: 'For parents only.' });
    }
    const link = await this.prisma.parentChildLink.findFirst({
      where: { parentId: parent.id, childId, child: { status: { not: 'DELETED' } } },
    });
    if (!link) throw new NotFoundException('Child not found.');
  }

  async childSkillMap(parent: AuthUser, childId: string, language: string) {
    await this.assertChildOf(parent, childId);
    return this.skillMap(childId, language);
  }

  async studentSkillMap(user: AuthUser, language: string) {
    if (user.kind !== 'STUDENT') {
      throw new ForbiddenException({ error: 'STUDENTS_ONLY', message: 'For students only.' });
    }
    return this.skillMap(user.id, language);
  }

  // ── Weekly reports ───────────────────────────────────────────────────────

  /** One child's week (days are the week's dates, Monday first). */
  async childWeek(
    child: { id: string; nickname: string; avatarKey: string; timeZone: string },
    startDay: string,
    endDay: string,
    now: Date,
  ): Promise<ReportChildDto> {
    const from = asDate(startDay);
    const to = asDate(endDay);
    const [activity, xp, finished, earlier, projects, badges, profile, streak] = await Promise.all([
      this.prisma.studentActivityDay.findMany({
        where: { userId: child.id, day: { gte: from, lt: to } },
        select: { day: true, minutes: true },
      }),
      this.prisma.xpEvent.aggregate({
        where: { userId: child.id, day: { gte: from, lt: to } },
        _sum: { amount: true },
      }),
      this.prisma.lessonProgress.findMany({
        where: { userId: child.id, status: 'COMPLETED', completedAt: { gte: from, lt: to } },
        select: { lesson: { select: { skills: true } } },
      }),
      this.prisma.lessonProgress.findMany({
        where: { userId: child.id, status: 'COMPLETED', completedAt: { lt: from } },
        select: { lesson: { select: { skills: true } } },
      }),
      this.prisma.project.count({
        where: { userId: child.id, shippedAt: { gte: from, lt: to } },
      }),
      this.prisma.userBadge.count({
        where: { userId: child.id, awardedAt: { gte: from, lt: to } },
      }),
      this.prisma.studentProfile.findUnique({
        where: { userId: child.id },
        select: { leagueTier: true },
      }),
      this.prisma.streak.findUnique({ where: { userId: child.id } }),
    ]);
    const known = new Set(earlier.flatMap((p) => p.lesson.skills));
    const learned = [...new Set(finished.flatMap((p) => p.lesson.skills))].filter(
      (key) => !known.has(key),
    );
    const byDay = new Map(activity.map((a) => [asDay(a.day), a.minutes]));
    const days = Array.from({ length: 7 }, (_, i) => byDay.get(addDays(startDay, i)) ?? 0);
    return {
      childId: child.id,
      nickname: child.nickname,
      avatarKey: child.avatarKey,
      minutes: days.reduce((sum, m) => sum + m, 0),
      xp: Math.max(0, xp._sum.amount ?? 0),
      lessons: finished.length,
      projects,
      badges,
      streak: this.progress.streakToday(streak, child.timeZone, now).current,
      league: LEAGUE_TIERS[profile?.leagueTier ?? 0] ?? 'bronze',
      skills: learned,
      days,
    };
  }

  /**
   * Makes (once) a parent's report for the week that ends this Sunday, their time.
   * Returns null when they have no children.
   */
  async buildFor(parentId: string, now = new Date()) {
    const parent = await this.prisma.user.findUniqueOrThrow({
      where: { id: parentId },
      select: {
        id: true,
        email: true,
        displayName: true,
        languageCode: true,
        weeklyReportEmails: true,
        country: { select: { timezone: true } },
        childLinks: {
          where: { child: { status: 'ACTIVE' } },
          select: {
            child: {
              select: {
                id: true,
                country: { select: { timezone: true } },
                studentProfile: { select: { nickname: true, avatarKey: true } },
              },
            },
          },
        },
      },
    });
    const timeZone = parent.country?.timezone ?? 'UTC';
    const week = weekOfDay(localDay(now, timeZone));
    const existing = await this.prisma.parentReport.findUnique({
      where: { parentId_weekKey: { parentId, weekKey: week.key } },
    });
    if (existing) return { report: existing, created: false };
    const kids = parent.childLinks.map((l) => l.child).filter((c) => c.studentProfile);
    if (kids.length === 0) return null;
    const children = [];
    for (const child of kids) {
      children.push(
        await this.childWeek(
          {
            id: child.id,
            nickname: child.studentProfile!.nickname,
            avatarKey: child.studentProfile!.avatarKey,
            timeZone: child.country?.timezone ?? timeZone,
          },
          week.startDay,
          week.endDay,
          now,
        ),
      );
    }
    const data = { startDay: week.startDay, endDay: week.endDay, children };
    let report;
    try {
      report = await this.prisma.parentReport.create({
        data: { parentId, weekKey: week.key, data: data as unknown as Prisma.InputJsonObject },
      });
    } catch {
      // Made at the same moment by another server.
      return null;
    }
    await this.notifications.notify([parentId], 'weekly_report', { weekKey: week.key });
    if (parent.weeklyReportEmails && parent.email) {
      await this.email(parent, report.id, week, children);
    }
    return { report, created: true };
  }

  private async email(
    parent: { id: string; email: string | null; displayName: string | null; languageCode: string },
    reportId: string,
    week: { startDay: string; endDay: string },
    children: ReportChildDto[],
  ) {
    try {
      const language = toMailLanguage(parent.languageCode);
      const skills = await this.prisma.skill.findMany({
        where: { key: { in: [...new Set(children.flatMap((c) => c.skills))] } },
      });
      const names = new Map(skills.map((s) => [s.key, this.skillName(s.names, language)]));
      const range = `${formatDate(language, asDate(week.startDay))} – ${formatDate(
        language,
        asDate(addDays(week.endDay, -1)),
      )}`;
      await this.mail.send({
        to: parent.email!,
        template: 'weeklyReport',
        language,
        params: {
          name: parent.displayName ?? '',
          actionUrl: `${this.config.get('WEB_APP_URL')}/${language}/reports`,
          vars: { week: range },
          lines: children.map((child) =>
            MAIL_COPY[language].childWeek({
              ...child,
              skills: child.skills.map((key) => names.get(key) ?? key),
            }),
          ),
        },
      });
      await this.prisma.parentReport.update({
        where: { id: reportId },
        data: { emailedAt: new Date() },
      });
    } catch (error) {
      this.logger.warn(`Weekly report email not sent: ${(error as Error).message}`);
    }
  }

  /** Every Sunday evening, each country's parents get their report (each hour, a check). */
  @Cron('7 * * * *', { name: 'weekly-reports', timeZone: 'UTC' })
  async scheduled() {
    try {
      if (this.redis.status === 'wait') await this.redis.connect();
      if (!(await this.redis.set('reportsjob:weekly', '1', 'EX', LOCK_SECONDS, 'NX'))) return;
      try {
        const sent = await this.sendDue();
        if (sent) this.logger.log(`${sent} weekly reports made`);
      } finally {
        await this.redis.del('reportsjob:weekly');
      }
    } catch (error) {
      this.logger.error(`Weekly reports failed: ${(error as Error).message}`);
    }
  }

  /** Makes the reports that are due now (Sunday from 17:00 in the parent's country). */
  async sendDue(now = new Date()): Promise<number> {
    const countries = await this.prisma.country.findMany({
      where: { isActive: true },
      select: { code: true, timezone: true },
    });
    let made = 0;
    for (const country of countries) {
      if (!reportDue(now, country.timezone)) continue;
      const weekKey = weekOfDay(localDay(now, country.timezone)).key;
      const parents = await this.prisma.user.findMany({
        where: {
          countryCode: country.code,
          status: 'ACTIVE',
          role: { key: 'parent' },
          childLinks: { some: { child: { status: 'ACTIVE' } } },
          parentReports: { none: { weekKey } },
        },
        select: { id: true },
        take: 5000,
      });
      for (const parent of parents) {
        try {
          if ((await this.buildFor(parent.id, now))?.created) made++;
        } catch (error) {
          this.logger.warn(`Report for ${parent.id} not made: ${(error as Error).message}`);
        }
      }
    }
    return made;
  }

  /** The parent's last reports, with skill names in their language. */
  async forParent(parent: AuthUser, language: string): Promise<ParentReportDto[]> {
    if (parent.roleKey !== 'parent') {
      throw new ForbiddenException({ error: 'PARENTS_ONLY', message: 'For parents only.' });
    }
    const reports = await this.prisma.parentReport.findMany({
      where: { parentId: parent.id },
      orderBy: { weekKey: 'desc' },
      take: REPORTS_SHOWN,
    });
    const keys = new Set<string>();
    for (const report of reports) {
      const data = report.data as unknown as { children: ReportChildDto[] };
      for (const child of data.children ?? []) for (const key of child.skills) keys.add(key);
    }
    const skills = await this.prisma.skill.findMany({ where: { key: { in: [...keys] } } });
    const skillNames = Object.fromEntries(
      skills.map((s) => [s.key, this.skillName(s.names, language)]),
    );
    return reports.map((report) => {
      const data = report.data as unknown as {
        startDay: string;
        endDay: string;
        children: ReportChildDto[];
      };
      return {
        weekKey: report.weekKey,
        startDay: data.startDay,
        endDay: data.endDay,
        createdAt: report.createdAt,
        children: data.children ?? [],
        skillNames,
      };
    });
  }
}
