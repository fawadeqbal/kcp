import { createHash, randomBytes } from 'node:crypto';
import { type FeedbackKind, type FeedbackStatus, ROLE_KEYS } from '@kcp/database';
import type { MetricsService } from '../../metrics/metrics.service.js';
import type { BadgesService } from '../../progress/badges.service.js';
import type { ProgressService } from '../../progress/progress.service.js';
import { backdateBadges } from './activity.js';
import { DEMO_DOMAIN, WAITLIST } from './cast.js';
import {
  type DemoContext,
  type DemoFamily,
  type DemoStaff,
  demoIp,
  type PremiumCalendar,
  USER_AGENTS,
} from './context.js';
import { DAY_MS, HISTORY_DAYS, plusDays, plusMinutes } from './timeline.js';

const staffOf = (staff: DemoStaff[], role: string) =>
  staff.find((s) => s.role === role) ?? staff[0]!;

const request = (ctx: DemoContext) => ({
  ip: demoIp(ctx.rng),
  userAgent: USER_AGENTS.mac,
  requestId: undefined,
});

interface FeedbackSpec {
  from: 'parent' | 'child';
  kind: FeedbackKind;
  message: string;
  page: string;
  status: FeedbackStatus;
  daysAgo: number;
}

const FEEDBACK: FeedbackSpec[] = [
  {
    from: 'parent',
    kind: 'SAFETY',
    message:
      'Another child on the leaderboard has a nickname that looks like a real name. Can you check it?',
    page: '/learn/leaderboard',
    status: 'NEW',
    daysAgo: 1,
  },
  {
    from: 'child',
    kind: 'BUG',
    message: 'The preview stayed white after I pressed Run on the boxes lesson.',
    page: '/learn/builder-m01-l05',
    status: 'DONE',
    daysAgo: 30,
  },
  {
    from: 'child',
    kind: 'BUG',
    message: 'When I switch to Urdu the Check button text goes out of the box on my tablet.',
    page: '/learn/builder-m01-l02',
    status: 'DONE',
    daysAgo: 24,
  },
  {
    from: 'child',
    kind: 'IDEA',
    message: 'Can we have a dark theme for the editor? My eyes hurt at night.',
    page: '/learn',
    status: 'READ',
    daysAgo: 18,
  },
  {
    from: 'parent',
    kind: 'PRAISE',
    message: 'My son shows me his website every evening now. Thank you!',
    page: '/dashboard',
    status: 'READ',
    daysAgo: 12,
  },
  {
    from: 'parent',
    kind: 'OTHER',
    message: 'Can we pay for three months at once by bank transfer?',
    page: '/billing',
    status: 'DONE',
    daysAgo: 40,
  },
  {
    from: 'child',
    kind: 'IDEA',
    message: 'Please add a lesson about making games in Python.',
    page: '/learn',
    status: 'NEW',
    daysAgo: 3,
  },
  {
    from: 'child',
    kind: 'BUG',
    message: 'The quiz said I was wrong but I put the lines in the same order as the answer.',
    page: '/learn/practice',
    status: 'NEW',
    daysAgo: 2,
  },
  {
    from: 'parent',
    kind: 'BUG',
    message: 'The invoice page shows the date in English although I chose Arabic.',
    page: '/billing/invoices',
    status: 'READ',
    daysAgo: 9,
  },
  {
    from: 'child',
    kind: 'PRAISE',
    message: 'I got the Top 10 badge!!! Best week ever.',
    page: '/learn/badges',
    status: 'NEW',
    daysAgo: 0,
  },
  {
    from: 'parent',
    kind: 'SAFETY',
    message:
      'Is my daughter’s portfolio link visible on Google? I only want her grandparents to see it.',
    page: '/dashboard',
    status: 'DONE',
    daysAgo: 15,
  },
  {
    from: 'child',
    kind: 'OTHER',
    message: 'How do I change my avatar?',
    page: '/learn/me',
    status: 'READ',
    daysAgo: 6,
  },
];

/**
 * Feedback from families in every state; the team's replies are status changes in the
 * audit log. Children whose bug report was fixed get the "Bug hunter" badge, dated then.
 */
export async function createFeedback(
  ctx: DemoContext,
  families: DemoFamily[],
  staff: DemoStaff[],
  badges: BadgesService,
) {
  const moderator = staffOf(staff, ROLE_KEYS.MODERATOR);
  for (const [index, item] of FEEDBACK.entries()) {
    const createdAt = ctx.clock.ago(item.daysAgo, 14, ctx.rng.int(0, 59));
    // Someone whose account existed (and had been used) by then.
    const existed = (at: Date) => at.getTime() < createdAt.getTime();
    const parents = families.filter((f) => existed(f.createdAt));
    const children = families
      .flatMap((f) => f.children)
      .filter((c) => c.lastActive && existed(c.createdAt));
    const family = parents[(index * 7) % parents.length] ?? families[0]!;
    const child = children[(index * 5) % children.length];
    const author =
      item.from === 'parent' || !child
        ? { id: family.parentId, language: family.spec.language, child: null }
        : { id: child.id, language: child.family.spec.language, child };
    const handledAt = ctx.clock.cap(plusDays(createdAt, item.status === 'DONE' ? 3 : 1));
    const feedback = await ctx.prisma.feedback.create({
      data: {
        userId: author.id,
        kind: item.kind,
        message: item.message,
        pagePath: `/${author.language}${item.page}`,
        languageCode: author.language,
        status: item.status,
        createdAt,
        updatedAt: item.status === 'NEW' ? createdAt : handledAt,
      },
    });
    const changes: [FeedbackStatus, FeedbackStatus, Date][] = [];
    if (item.status !== 'NEW') changes.push(['NEW', 'READ', plusMinutes(createdAt, 90)]);
    if (item.status === 'DONE') changes.push(['READ', 'DONE', handledAt]);
    for (const [before, after, at] of changes) {
      await ctx.prisma.auditLog.create({
        data: {
          actorId: moderator.id,
          actorRole: moderator.role,
          action: 'feedback.status',
          entityType: 'Feedback',
          entityId: feedback.id,
          before: { status: before },
          after: { status: after },
          ipAddress: demoIp(ctx.rng),
          userAgent: USER_AGENTS.mac,
          createdAt: ctx.clock.cap(at),
        },
      });
    }
    if (author.child && item.status === 'DONE') {
      const since = Date.now();
      const earned = await badges.check(author.child.id);
      if (earned.length) await backdateBadges(ctx, author.child.id, earned, since, handledAt);
    }
  }
  return FEEDBACK.length;
}

/**
 * What staff did about students: a suspension, XP taken away (with the reason), a
 * "Helper" badge given by hand, a certificate revoked.
 */
export async function staffActions(
  ctx: DemoContext,
  families: DemoFamily[],
  staff: DemoStaff[],
  services: { progress: ProgressService; badges: BadgesService },
  certificates: { id: string; childId: string }[],
) {
  const moderator = staffOf(staff, ROLE_KEYS.MODERATOR);
  const admin = staffOf(staff, ROLE_KEYS.ADMIN);
  const children = families.flatMap((f) => f.children);
  const done: string[] = [];

  const suspended = children.find((c) => c.family.spec.email === 'samina.yousaf');
  if (suspended) {
    const at = ctx.clock.ago(5, 11, 20);
    const reason = 'Shared their login in a public group chat; waiting for the parent to reply';
    await ctx.prisma.user.update({
      where: { id: suspended.id },
      data: { status: 'SUSPENDED', updatedAt: at },
    });
    await ctx.prisma.auditLog.create({
      data: {
        actorId: moderator.id,
        actorRole: moderator.role,
        action: 'user.suspend',
        entityType: 'User',
        entityId: suspended.id,
        before: { status: 'ACTIVE' },
        after: { status: 'SUSPENDED', reason },
        ipAddress: demoIp(ctx.rng),
        userAgent: USER_AGENTS.mac,
        createdAt: at,
      },
    });
    done.push(`suspended ${suspended.username}`);
  }

  const copied = children.find(
    (c) => c.family.spec.email === 'maria.fernandes' && c.pattern === 'star',
  );
  if (copied) {
    await services.progress.removeXp(
      copied.id,
      15,
      'Quiz answers copied from a classmate in the pilot class',
      admin.auth,
      request(ctx),
    );
    done.push(`15 XP removed from ${copied.username}`);
  }

  const helper = children.find((c) => c.family.spec.email === 'ayesha.raza');
  if (helper) {
    const at = ctx.clock.ago(8, 12, 40);
    const reason = 'Helped three classmates with their first website in the pilot class';
    const since = Date.now();
    const given = await services.badges.give(helper.id, ['helper'], {
      staffId: moderator.id,
      reason,
    });
    if (given.length) {
      await backdateBadges(ctx, helper.id, given, since, at);
      await ctx.prisma.auditLog.create({
        data: {
          actorId: moderator.id,
          actorRole: moderator.role,
          action: 'badge.give',
          entityType: 'User',
          entityId: helper.id,
          after: { badgeKey: 'helper', reason },
          ipAddress: demoIp(ctx.rng),
          userAgent: USER_AGENTS.mac,
          createdAt: at,
        },
      });
      done.push(`"Helper" badge for ${helper.username}`);
    }
  }

  // A certificate for a project that turned out to be copied.
  const byPattern = (pattern: string) =>
    certificates.find((c) => children.find((child) => child.id === c.childId)?.pattern === pattern);
  const revoke = byPattern('faded') ?? byPattern('steady');
  if (revoke) {
    const certificate = await ctx.prisma.certificate.findUniqueOrThrow({
      where: { id: revoke.id },
    });
    const at = ctx.clock.cap(plusDays(certificate.issuedAt, 4));
    const reason = 'The project was copied from another student';
    await ctx.prisma.certificate.update({ where: { id: revoke.id }, data: { revokedAt: at } });
    await ctx.prisma.auditLog.create({
      data: {
        actorId: admin.id,
        actorRole: admin.role,
        action: 'certificate.revoke',
        entityType: 'Certificate',
        entityId: revoke.id,
        after: { code: certificate.code, reason },
        ipAddress: demoIp(ctx.rng),
        userAgent: USER_AGENTS.mac,
        createdAt: at,
      },
    });
    done.push(`certificate ${certificate.code} revoked`);
  }
  return done;
}

/**
 * Share links parents made for children with a public portfolio, a few days after the
 * first project shipped (as ProjectsService makes them; sharing is part of premium).
 */
export async function shareLinks(
  ctx: DemoContext,
  families: DemoFamily[],
  calendar: PremiumCalendar,
) {
  let count = 0;
  for (const family of families) {
    for (const child of family.children) {
      const [profile, first] = await Promise.all([
        ctx.prisma.studentProfile.findUnique({
          where: { userId: child.id },
          select: { publicPortfolio: true },
        }),
        ctx.prisma.portfolioItem.findFirst({
          where: { userId: child.id },
          orderBy: { createdAt: 'asc' },
          select: { createdAt: true },
        }),
      ]);
      if (!profile?.publicPortfolio || !first) continue;
      const at = ctx.clock.cap(plusDays(first.createdAt, ctx.rng.int(1, 4)));
      if (!calendar.activeAt(child, at)) continue;
      await ctx.prisma.studentProfile.update({
        where: { userId: child.id },
        data: { portfolioShareToken: randomBytes(18).toString('base64url') },
      });
      await ctx.prisma.auditLog.create({
        data: {
          actorId: family.parentId,
          actorRole: ROLE_KEYS.PARENT,
          action: 'child.portfolio_link_create',
          entityType: 'User',
          entityId: child.id,
          ipAddress: demoIp(ctx.rng),
          userAgent: USER_AGENTS.desktop,
          createdAt: at,
        },
      });
      count++;
    }
  }
  return count;
}

/**
 * "The trial ends soon" for families without a plan, as the daily job sends it two days
 * before (and remembers it did).
 */
export async function trialReminders(
  ctx: DemoContext,
  families: DemoFamily[],
  calendar: PremiumCalendar,
) {
  let count = 0;
  for (const family of families) {
    for (const child of family.children) {
      if (!child.trialEndsAt) continue;
      const sentAt = new Date(child.trialEndsAt.getTime() - 2 * DAY_MS);
      if (sentAt.getTime() > ctx.clock.now.getTime()) continue;
      if (calendar.paidOrGivenAt(child, sentAt)) continue;
      await ctx.prisma.studentProfile.update({
        where: { userId: child.id },
        data: { trialReminderSentAt: sentAt },
      });
      const parents = [family.parentId, ...(family.guardianId ? [family.guardianId] : [])];
      await ctx.prisma.notification.createMany({
        data: parents.map((userId) => ({
          userId,
          type: 'trial_ending',
          data: {
            childId: child.id,
            nickname: child.nickname,
            endsAt: child.trialEndsAt!.toISOString(),
          },
          createdAt: sentAt,
        })),
      });
      count++;
    }
  }
  return count;
}

/** Families from countries that aren't open yet, from the marketing site. */
export async function waitlist(ctx: DemoContext) {
  for (const [index, entry] of WAITLIST.entries()) {
    const createdAt = ctx.clock.ago(2 + index * 5, 16, 10 + index);
    await ctx.prisma.waitlistEntry.create({
      data: {
        email: `${entry.email}@${DEMO_DOMAIN}`,
        countryCode: entry.country,
        ageBand: entry.age,
        languageCode: entry.language,
        tokenHash: entry.confirmed
          ? null
          : createHash('sha256').update(randomBytes(32)).digest('hex'),
        tokenExpiresAt: entry.confirmed ? null : plusDays(createdAt, 7),
        confirmedAt: entry.confirmed ? plusMinutes(createdAt, ctx.rng.int(3, 90)) : null,
        createdAt,
        updatedAt: createdAt,
      },
    });
  }
  return WAITLIST.length;
}

/** Crash reports the app sent (versions end in "-demo", so they're easy to tell apart). */
export async function appCrashes(ctx: DemoContext) {
  const crashes = [
    {
      platform: 'android',
      os: 'Android 14',
      fatal: false,
      message: 'A RenderFlex overflowed by 14 pixels on the right.',
      stack:
        '#0 RenderFlex.performLayout (package:flutter/src/rendering/flex.dart)\n#1 RenderObject.layout',
    },
    {
      platform: 'android',
      os: 'Android 12',
      fatal: true,
      message: 'Null check operator used on a null value',
      stack:
        '#0 PracticeScreen.build (package:kcp_app/features/practice/practice_screen.dart)\n#1 StatefulElement.build',
    },
    {
      platform: 'ios',
      os: 'iOS 18.6',
      fatal: false,
      message: "SocketException: Failed host lookup: 'api.example.com'",
      stack: '#0 IOClient.send (package:http/src/io_client.dart)\n#1 BaseClient._sendUnstreamed',
    },
    {
      platform: 'android',
      os: 'Android 13',
      fatal: false,
      message: 'DioException [connection timeout]: The request took longer than 0:00:20',
      stack: '#0 DioMixin.fetch (package:dio/src/dio_mixin.dart)',
    },
    {
      platform: 'ios',
      os: 'iOS 17.7',
      fatal: true,
      message: 'PlatformException(storage_error, Keychain item not found, null, null)',
      stack:
        '#0 FlutterSecureStorage.read (package:flutter_secure_storage/flutter_secure_storage.dart)',
    },
    {
      platform: 'android',
      os: 'Android 14',
      fatal: false,
      message: 'A RenderFlex overflowed by 3.5 pixels on the bottom.',
      stack: '#0 RenderFlex.performLayout (package:flutter/src/rendering/flex.dart)',
    },
  ];
  for (const [index, crash] of crashes.entries()) {
    await ctx.prisma.appCrash.create({
      data: {
        appVersion: index < 3 ? '1.0.0-demo+7' : '1.0.1-demo+9',
        platform: crash.platform,
        osVersion: crash.os,
        fatal: crash.fatal,
        message: crash.message,
        stack: crash.stack,
        createdAt: ctx.clock.ago(40 - index * 7, 15, 12 + index),
      },
    });
  }
  return crashes.length;
}

/** The five numbers per day and country, as the nightly job stores them. */
export async function dailyMetrics(ctx: DemoContext, metrics: MetricsService) {
  for (let daysAgo = HISTORY_DAYS; daysAgo >= 0; daysAgo--) {
    await metrics.compute(ctx.clock.day(daysAgo));
  }
  return HISTORY_DAYS + 1;
}

/**
 * Finishing touches: most older notifications read, badges seen except the newest
 * (so the celebration shows at the next sign-in).
 */
export async function readAndSeen(ctx: DemoContext, families: DemoFamily[]) {
  const people = families.flatMap((f) => [
    f.parentId,
    ...(f.guardianId ? [f.guardianId] : []),
    ...f.children.map((c) => c.id),
  ]);
  const cutoff = new Date(ctx.clock.now.getTime() - 2 * DAY_MS);
  await ctx.prisma.$executeRaw`
    UPDATE notifications SET read_at = created_at + interval '3 hours'
    WHERE user_id = ANY(${people}::uuid[]) AND created_at < ${cutoff} AND read_at IS NULL
      AND get_byte(decode(md5(id::text), 'hex'), 0) < 210`;
  for (const child of families.flatMap((f) => f.children)) {
    if (!child.lastActive) continue;
    const lastDay = new Date(child.lastActive.getTime() - 12 * 60 * 60 * 1000);
    await ctx.prisma.$executeRaw`
      UPDATE user_badges SET seen_at = awarded_at + interval '2 minutes'
      WHERE user_id = ${child.id}::uuid AND awarded_at < ${lastDay} AND seen_at IS NULL`;
  }
}
