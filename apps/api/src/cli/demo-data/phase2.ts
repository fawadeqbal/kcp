import { createHash, randomBytes } from 'node:crypto';
import { MENTOR_CODE_OF_CONDUCT_VERSION, type Prisma, ROLE_KEYS } from '@kcp/database';
import { AVATAR_KEYS, FRIEND_CODE_ALPHABET, TERMS_VERSION } from '@kcp/shared';
import { hashPassword } from '../../common/crypto/passwords.js';
import type { ReportsService } from '../../reports/reports.service.js';
import { PASSWORDS } from './cast.js';
import {
  type DemoChild,
  type DemoContext,
  type DemoFamily,
  type DemoStaff,
  demoIp,
  USER_AGENTS,
} from './context.js';
import { demoEmail } from './people.js';
import { plusDays, plusMinutes } from './timeline.js';

/*
 * Phase 2 in the demo: a mentor console with reviews, a younger child with verified
 * parental consent and a paired tablet, friends and referrals, weekly reports, team
 * rooms with a report a moderator dealt with, two hackathons, a school with a paid
 * licence and a class, and hub readiness checks.
 */

/** Adults who work with children in the web app (two-factor login the first time). */
export const WEB_ADULTS = [
  { name: 'Sara Ahmed', email: 'mentor', role: 'mentor', checked: true },
  { name: 'Bilal Hussain', email: 'mentor.new', role: 'mentor', checked: false },
  { name: 'Ayesha Tariq', email: 'teacher', role: 'teacher', checked: true },
] as const;

export interface WebAdults {
  mentor: DemoStaff;
  newMentor: DemoStaff;
  teacher: DemoStaff;
}

const hash = () => createHash('sha256').update(randomBytes(32)).digest('hex');
const code = (ctx: DemoContext) =>
  Array.from({ length: 6 }, () => ctx.rng.pick(FRIEND_CODE_ALPHABET.split(''))).join('');
const ordered = (a: string, b: string) => (a < b ? [a, b] : [b, a]) as [string, string];

const BAKERY = {
  html: [
    '<!-- A page for a made-up bakery -->',
    '<header>',
    '  <h1>Crumbs Bakery</h1>',
    '  <p>Fresh bread every morning, baked in our own oven.</p>',
    '</header>',
    '<ul class="menu">',
    '  <li>Naan: 30</li>',
    '  <li>Cake slice: 250</li>',
    '  <li>Buns (6): 180</li>',
    '</ul>',
    '<button id="hours-button">Opening hours</button>',
    '<table id="hours" hidden><tr><td>Mon–Sat</td><td>7:00–21:00</td></tr></table>',
    '<form><label>Name <input></label><label>Message <textarea></textarea></label><button>Send</button></form>',
  ].join('\n'),
  css: 'body { font-family: system-ui, sans-serif; margin: 0 auto; max-width: 40rem; padding: 1rem; }\n@media (max-width: 30rem) { .menu { padding: 0; } }\n',
  js: "// Shows or hides the opening hours.\ndocument.querySelector('#hours-button').addEventListener('click', () => {\n  const hours = document.querySelector('#hours');\n  hours.hidden = !hours.hidden;\n});\n",
};

export async function createWebAdults(ctx: DemoContext): Promise<WebAdults> {
  const roles = await ctx.prisma.role.findMany({ select: { id: true, key: true } });
  const roleId = (key: string) => roles.find((r) => r.key === key)!.id;
  const passwordHash = await hashPassword(PASSWORDS.staff);
  const made: DemoStaff[] = [];
  for (const [index, adult] of WEB_ADULTS.entries()) {
    const createdAt = ctx.clock.ago(40 - index * 3, 9, 15);
    const user = await ctx.prisma.user.create({
      data: {
        kind: 'ADULT',
        status: 'ACTIVE',
        roleId: roleId(adult.role),
        email: demoEmail(adult.email),
        emailVerifiedAt: createdAt,
        displayName: adult.name,
        passwordHash,
        languageCode: 'en',
        countryCode: 'PK',
        createdAt,
        updatedAt: createdAt,
      },
    });
    if (adult.role === ROLE_KEYS.MENTOR) {
      await ctx.prisma.mentorProfile.create({
        data: {
          userId: user.id,
          backgroundCheck: adult.checked ? 'PASSED' : 'PENDING',
          backgroundCheckedAt: adult.checked ? plusDays(createdAt, 2) : null,
          backgroundCheckNote: adult.checked ? 'Demo provider, ref 2026-0917' : null,
          codeOfConductVersion: adult.checked ? MENTOR_CODE_OF_CONDUCT_VERSION : null,
          codeOfConductSignedAt: adult.checked ? plusDays(createdAt, 1) : null,
          languages: ['en', 'ur', 'ar'],
          capacity: 6,
        },
      });
    }
    made.push({
      id: user.id,
      email: user.email!,
      name: adult.name,
      role: adult.role,
      auth: {
        id: user.id,
        sessionId: 'demo-data',
        roleId: roleId(adult.role),
        roleKey: adult.role,
        kind: 'ADULT',
        isStaff: false,
      },
    });
  }
  return { mentor: made[0]!, newMentor: made[1]!, teacher: made[2]! };
}

/** Project reviews in the mentor console: one approved, one with changes asked, one waiting. */
async function mentorReviews(ctx: DemoContext, children: DemoChild[], adults: WebAdults) {
  const items = await ctx.prisma.portfolioItem.findMany({
    where: { userId: { in: children.map((c) => c.id) } },
    orderBy: { publishedAt: 'asc' },
    take: 3,
  });
  const decisions = ['APPROVED', 'CHANGES_REQUESTED', 'WAITING'] as const;
  for (const [index, item] of items.entries()) {
    const child = children.find((c) => c.id === item.userId)!;
    const status = decisions[index]!;
    const requestedAt = item.publishedAt;
    const decided = status !== 'WAITING';
    const decidedAt = decided ? ctx.clock.cap(plusDays(requestedAt, 1)) : null;
    const review = await ctx.prisma.review.create({
      data: {
        kind: 'PROJECT',
        studentId: item.userId,
        projectId: item.projectId,
        version: item.version,
        files: item.files as Prisma.InputJsonObject,
        languageCode: child.family.spec.language,
        status,
        mentorId: decided ? adults.mentor.id : null,
        requestedAt,
        claimedAt: decided ? plusMinutes(requestedAt, 600) : null,
        decidedAt,
        turnaroundHours: decidedAt
          ? Math.round(((decidedAt.getTime() - requestedAt.getTime()) / 3_600_000) * 10) / 10
          : null,
        scores: decided
          ? status === 'APPROVED'
            ? { works: 4, code: 3, design: 3, creativity: 4 }
            : { works: 2, code: 2, design: 3, creativity: 3 }
          : {},
        summary:
          status === 'APPROVED'
            ? 'A clear, friendly page. Next time, try a second colour for the headings.'
            : status === 'CHANGES_REQUESTED'
              ? 'Good start! The list needs closing tags, then it will look right.'
              : null,
        createdAt: requestedAt,
      },
    });
    if (decided) {
      await ctx.prisma.reviewComment.create({
        data: {
          reviewId: review.id,
          authorId: adults.mentor.id,
          file: 'html',
          line: 1,
          body:
            status === 'APPROVED'
              ? 'Great first line: the heading says what the page is.'
              : 'Close each <li> here, like the first one.',
          createdAt: plusMinutes(requestedAt, 620),
        },
      });
    }
    if (index === 0) {
      await ctx.prisma.mentorNote.create({
        data: {
          studentId: item.userId,
          authorId: adults.mentor.id,
          body: 'Works fast and neatly. Suggest the Pro track next.',
          createdAt: plusMinutes(requestedAt, 640),
        },
      });
    }
  }
  return items.length;
}

/** A translation waiting for review in the content studio. */
async function contentDraft(ctx: DemoContext, staff: DemoStaff[]) {
  const creator = staff.find((s) => s.role === 'content_creator') ?? staff[0]!;
  const lesson = await ctx.prisma.lessonTranslation.findFirst({
    where: { languageCode: 'ur', lesson: { module: { trackId: 'builder' } } },
    orderBy: { lessonId: 'asc' },
  });
  if (!lesson) return;
  await ctx.prisma.contentDraft.create({
    data: {
      entityType: 'LESSON',
      entityId: lesson.lessonId,
      languageCode: 'ur',
      data: {
        title: lesson.title,
        summary: lesson.summary,
        body: `${lesson.body}\n\nیاد رکھیں: ہر ٹیگ کو بند کرنا نہ بھولیں۔`,
        videoProvider: lesson.videoProvider,
        videoId: lesson.videoId,
      },
      status: 'IN_REVIEW',
      editedById: creator.id,
      submittedAt: ctx.clock.ago(2, 11),
      createdAt: ctx.clock.ago(3, 10),
    },
  });
}

/** A 10-year-old in the first family: verified consent (email plus) and a paired tablet. */
async function youngLearner(ctx: DemoContext, family: DemoFamily) {
  const student = await ctx.prisma.role.findUniqueOrThrow({ where: { key: ROLE_KEYS.STUDENT } });
  const createdAt = ctx.clock.ago(6, 8, 30);
  const username = `demo-young-${ctx.rng.hex(4)}`;
  const user = await ctx.prisma.user.create({
    data: {
      kind: 'STUDENT',
      status: 'ACTIVE',
      roleId: student.id,
      username,
      passwordHash: await hashPassword(PASSWORDS.child),
      languageCode: family.spec.language,
      countryCode: family.spec.country,
      createdAt,
      updatedAt: createdAt,
      studentProfile: {
        create: {
          nickname: 'LittleComet',
          avatarKey: ctx.rng.pick(AVATAR_KEYS),
          birthYear: ctx.clock.now.getUTCFullYear() - 10,
          showOnPublicBoards: false,
          createdAt,
          updatedAt: createdAt,
        },
      },
      parentLinks: { create: { parentId: family.parentId, isPrimary: true, createdAt } },
    },
  });
  const ip = demoIp(ctx.rng);
  await ctx.prisma.consentRecord.create({
    data: {
      parentId: family.parentId,
      childId: user.id,
      type: 'ACCOUNT',
      policyVersion: TERMS_VERSION,
      method: 'EMAIL_CONFIRMATION',
      grantedAt: createdAt,
      ipAddress: ip,
      userAgent: USER_AGENTS.desktop,
    },
  });
  await ctx.prisma.parentalConsentRequest.create({
    data: {
      parentId: family.parentId,
      childId: user.id,
      method: 'EMAIL_PLUS',
      status: 'VERIFIED',
      policyVersion: TERMS_VERSION,
      emailConfirmedAt: plusMinutes(createdAt, 12),
      followUpSentAt: plusDays(createdAt, 1),
      decidedAt: plusDays(createdAt, 2),
      ipAddress: ip,
      userAgent: USER_AGENTS.desktop,
      createdAt,
    },
  });
  const pairedAt = ctx.clock.ago(4, 15, 10);
  await ctx.prisma.devicePairing.create({
    data: {
      codeHash: hash(),
      secretHash: hash(),
      userAgent: USER_AGENTS.android,
      ipAddress: demoIp(ctx.rng),
      childId: user.id,
      approvedById: family.parentId,
      approvedAt: plusMinutes(pairedAt, 1),
      claimedAt: plusMinutes(pairedAt, 2),
      expiresAt: plusMinutes(pairedAt, 10),
      createdAt: pairedAt,
    },
  });
  return { id: user.id, username };
}

/** Two pairs of friends in Lahore (one waiting for the other family), and referrals. */
async function friendsAndReferrals(ctx: DemoContext, families: DemoFamily[], teens: DemoChild[]) {
  const lahore = teens.filter((c) => c.spec.city === 'lahore');
  const pairs = [
    [lahore[0], lahore[2], 'APPROVED'],
    [lahore[1], lahore[3], 'PENDING'],
  ] as const;
  for (const [from, to, status] of pairs) {
    if (!from || !to || from.family === to.family) continue;
    const createdAt = ctx.clock.ago(status === 'APPROVED' ? 20 : 2, 14, 5);
    const request = await ctx.prisma.friendRequest.create({
      data: {
        fromId: from.id,
        toId: to.id,
        status,
        fromParentId: from.family.parentId,
        fromParentApprovedAt: plusMinutes(createdAt, 90),
        toParentId: status === 'APPROVED' ? to.family.parentId : null,
        toParentApprovedAt: status === 'APPROVED' ? plusMinutes(createdAt, 300) : null,
        decidedAt: status === 'APPROVED' ? plusMinutes(createdAt, 300) : null,
        createdAt,
      },
    });
    if (status === 'APPROVED') {
      const [a, b] = ordered(from.id, to.id);
      await ctx.prisma.friendship.create({
        data: {
          userAId: a,
          userBId: b,
          requestId: request.id,
          createdAt: plusMinutes(createdAt, 300),
        },
      });
    }
  }

  // One family invited another whose child shipped a project (rewarded); one is pending.
  const withKids = families.filter((f) => f.children.length > 0);
  const referrals = [
    [withKids[1], withKids[7], 'REWARDED'],
    [withKids[2], withKids[8], 'PENDING'],
  ] as const;
  for (const [referrer, invitee, status] of referrals) {
    if (!referrer || !invitee) continue;
    const decidedAt = status === 'REWARDED' ? ctx.clock.ago(10, 12) : null;
    const referral = await ctx.prisma.referral.create({
      data: {
        referrerId: referrer.parentId,
        inviteeId: invitee.parentId,
        status,
        rewardDays: status === 'REWARDED' ? 30 : null,
        decidedAt,
        inviteeNetworkHash: hash().slice(0, 32),
        createdAt: invitee.createdAt,
      },
    });
    if (decidedAt) {
      await ctx.prisma.premiumGrant.createMany({
        data: referrer.children.map((child) => ({
          userId: child.id,
          source: 'REFERRAL' as const,
          referralId: referral.id,
          reason: 'Referral reward',
          startsAt: decidedAt,
          endsAt: plusDays(decidedAt, 30),
          createdAt: decidedAt,
        })),
      });
    }
  }
}

/** Minutes of learning on each day a child earned XP (the heartbeat's numbers). */
async function activityDays(ctx: DemoContext, children: DemoChild[]) {
  await ctx.prisma.$executeRaw`
    INSERT INTO student_activity_days (user_id, day, minutes, updated_at)
    SELECT user_id, day, 8 + (abs(hashtext(user_id::text || day::text)) % 48), now()
    FROM (SELECT DISTINCT user_id, day FROM xp_events
          WHERE user_id = ANY(${children.map((c) => c.id)}::uuid[])) AS days
    ON CONFLICT DO NOTHING`;
}

/** Last week's report for each family (as the Sunday job makes them). */
async function weeklyReports(ctx: DemoContext, families: DemoFamily[], reports: ReportsService) {
  let made = 0;
  const lastWeek = plusDays(ctx.clock.now, -7);
  for (const family of families) {
    if (family.children.length === 0) continue;
    const result = await reports.buildFor(family.parentId, lastWeek);
    if (result?.created) made += 1;
  }
  return made;
}

interface RoomMember {
  userId: string;
  role?: 'MEMBER' | 'ADULT';
}

async function room(
  ctx: DemoContext,
  kind: 'TEAM' | 'CLASS' | 'EVENT',
  refId: string,
  name: string,
  members: RoomMember[],
  createdAt: Date,
  archived = false,
) {
  const made = await ctx.prisma.chatRoom.create({
    data: { kind, refId, name, isArchived: archived, createdAt },
  });
  await ctx.prisma.chatMember.createMany({
    data: members.map((m) => ({
      roomId: made.id,
      userId: m.userId,
      role: m.role ?? 'MEMBER',
      joinedAt: createdAt,
      lastReadAt: createdAt,
    })),
    skipDuplicates: true,
  });
  return made.id;
}

async function say(
  ctx: DemoContext,
  roomId: string,
  authorId: string,
  at: Date,
  message: { phrase: string } | { text: string },
) {
  return ctx.prisma.chatMessage.create({
    data: {
      roomId,
      authorId,
      kind: 'phrase' in message ? 'PHRASE' : 'TEXT',
      phraseKey: 'phrase' in message ? message.phrase : null,
      text: 'text' in message ? message.text : null,
      createdAt: at,
    },
  });
}

/** Two hackathons: one finished with results, one open with a team forming. */
async function hackathons(
  ctx: DemoContext,
  staff: DemoStaff[],
  adults: WebAdults,
  teens: DemoChild[],
) {
  const admin = staff.find((s) => s.role === 'admin') ?? staff[0]!;
  const moderator = staff.find((s) => s.role === 'moderator') ?? staff[0]!;
  const rubric = [
    { key: 'idea', label: 'Idea', max: 5 },
    { key: 'code', label: 'Code', max: 5 },
    { key: 'design', label: 'Design', max: 5 },
    { key: 'teamwork', label: 'Teamwork', max: 5 },
  ];
  const starter = { 'index.html': '<h1>Our project</h1>\n', 'style.css': '', 'script.js': '' };
  const startsAt = ctx.clock.ago(30, 9);
  const finished = await ctx.prisma.event.create({
    data: {
      slug: 'demo-spring-jam',
      title: 'Spring Jam',
      description: 'Build a website for a school club in a weekend, as a team of three.',
      status: 'FINISHED',
      startsAt,
      endsAt: plusDays(startsAt, 3),
      teamSize: 3,
      minAge: 13,
      rubric,
      starter,
      createdById: admin.id,
      createdAt: plusDays(startsAt, -10),
    },
  });
  await ctx.prisma.eventJudge.create({ data: { eventId: finished.id, userId: adults.mentor.id } });

  const teams = [
    {
      name: 'Pixel Pals',
      members: teens.slice(0, 3),
      scores: { idea: 5, code: 4, design: 4, teamwork: 5 },
    },
    {
      name: 'Code Comets',
      members: teens.slice(3, 5),
      scores: { idea: 4, code: 3, design: 4, teamwork: 3 },
    },
  ];
  const eventMembers = teams.flatMap((t) => t.members.map((m) => ({ userId: m.id })));
  const eventRoom = await room(
    ctx,
    'EVENT',
    finished.id,
    'Spring Jam',
    eventMembers,
    startsAt,
    true,
  );
  await say(ctx, eventRoom, teams[0]!.members[0]!.id, plusMinutes(startsAt, 30), {
    phrase: 'hello',
  });
  let reportDone = false;
  for (const [index, team] of teams.entries()) {
    const total = Object.values(team.scores).reduce((a, b) => a + b, 0);
    const made = await ctx.prisma.eventTeam.create({
      data: {
        eventId: finished.id,
        name: team.name,
        joinCode: code(ctx),
        mentorId: adults.mentor.id,
        rank: index + 1,
        score: total,
        createdAt: plusDays(startsAt, -5),
      },
    });
    for (const [position, member] of team.members.entries()) {
      await ctx.prisma.eventTeamMember.create({
        data: {
          teamId: made.id,
          userId: member.id,
          eventId: finished.id,
          status: 'APPROVED',
          isCaptain: position === 0,
          approvedById: member.family.parentId,
          approvedAt: plusDays(startsAt, -4),
          joinedAt: plusDays(startsAt, -5),
        },
      });
      await ctx.prisma.gitAccount.upsert({
        where: { userId: member.id },
        // gitId 0: not on a git server yet (made the first time a git server is set up).
        create: {
          userId: member.id,
          username: `kcp-${member.id.replaceAll('-', '').slice(-12)}`,
          gitId: 0,
        },
        update: {},
      });
    }
    await ctx.prisma.eventSubmission.create({
      data: {
        teamId: made.id,
        title: index === 0 ? 'Chess club website' : 'Science club page',
        description:
          index === 0
            ? 'Meeting times, a puzzle of the week and a sign-up form for the chess club.'
            : 'Experiments of the month with photos and a quiz.',
        submittedById: team.members[0]!.id,
        submittedAt: plusDays(startsAt, 2),
      },
    });
    await ctx.prisma.eventScore.create({
      data: {
        teamId: made.id,
        judgeId: adults.mentor.id,
        scores: team.scores,
        comment:
          index === 0
            ? 'A great puzzle idea, and clear teamwork.'
            : 'Nice quiz: add more pages next time.',
        createdAt: plusDays(startsAt, 4),
      },
    });
    const teamRoom = await room(
      ctx,
      'TEAM',
      made.id,
      `Spring Jam: ${team.name}`,
      [...team.members.map((m) => ({ userId: m.id })), { userId: adults.mentor.id, role: 'ADULT' }],
      plusDays(startsAt, -4),
      true,
    );
    const [first, second] = team.members;
    await say(ctx, teamRoom, first!.id, plusMinutes(startsAt, 60), { phrase: 'lets-go' });
    await say(ctx, teamRoom, adults.mentor.id, plusMinutes(startsAt, 75), {
      text: 'Welcome! Open a pull request for each part, and I’ll review it.',
    });
    if (second) {
      await say(ctx, teamRoom, second.id, plusMinutes(startsAt, 90), { phrase: 'i-have-an-idea' });
    }
    if (!reportDone && second) {
      // A rude message, reported by a teammate; a moderator warned the author.
      const rude = await say(ctx, teamRoom, second.id, plusMinutes(startsAt, 200), {
        text: 'your part is so slow, hurry up',
      });
      const reportedAt = plusMinutes(startsAt, 210);
      const report = await ctx.prisma.chatReport.create({
        data: {
          reporterId: first!.id,
          roomId: teamRoom,
          messageId: rude.id,
          subjectId: second.id,
          reason: 'UNKIND',
          snapshot: 'your part is so slow, hurry up',
          status: 'RESOLVED',
          resolvedById: moderator.id,
          resolvedAt: plusMinutes(reportedAt, 240),
          createdAt: reportedAt,
        },
      });
      await ctx.prisma.moderationAction.create({
        data: {
          kind: 'WARN',
          subjectId: second.id,
          reportId: report.id,
          messageId: rude.id,
          staffId: moderator.id,
          reason: 'Unkind to a teammate: reminded of the room rules.',
          createdAt: plusMinutes(reportedAt, 240),
        },
      });
      reportDone = true;
    }
  }

  // Open: a team forming, one place waiting for a parent.
  const opens = plusDays(ctx.clock.now, 6);
  const open = await ctx.prisma.event.create({
    data: {
      slug: 'demo-autumn-jam',
      title: 'Autumn Jam',
      description: 'Make a website that helps your neighbourhood: a map, a guide or a game.',
      status: 'OPEN',
      startsAt: opens,
      endsAt: plusDays(opens, 2),
      teamSize: 3,
      minAge: 13,
      rubric,
      starter,
      createdById: admin.id,
      createdAt: ctx.clock.ago(8, 10),
    },
  });
  const [captain, friend] = [teens[5], teens[6]];
  if (captain && friend) {
    const team = await ctx.prisma.eventTeam.create({
      data: {
        eventId: open.id,
        name: 'Night Owls',
        joinCode: code(ctx),
        createdAt: ctx.clock.ago(3, 16),
      },
    });
    await ctx.prisma.eventTeamMember.createMany({
      data: [
        {
          teamId: team.id,
          userId: captain.id,
          eventId: open.id,
          status: 'APPROVED',
          isCaptain: true,
          approvedById: captain.family.parentId,
          approvedAt: ctx.clock.ago(3, 18),
          joinedAt: ctx.clock.ago(3, 16),
        },
        {
          teamId: team.id,
          userId: friend.id,
          eventId: open.id,
          status: 'PENDING',
          joinedAt: ctx.clock.ago(1, 17),
        },
      ],
    });
    await room(
      ctx,
      'TEAM',
      team.id,
      `Autumn Jam: Night Owls`,
      [{ userId: captain.id }],
      ctx.clock.ago(3, 18),
    );
    await room(ctx, 'EVENT', open.id, 'Autumn Jam', [{ userId: captain.id }], ctx.clock.ago(3, 18));
    await ctx.prisma.notification.create({
      data: {
        userId: friend.family.parentId,
        type: 'event_join_request',
        data: {
          teamId: team.id,
          childId: friend.id,
          nickname: friend.nickname,
          event: 'Autumn Jam',
          team: 'Night Owls',
        },
        createdAt: ctx.clock.ago(1, 17),
      },
    });
  }

  await ctx.prisma.blockedTerm.create({
    data: { term: 'noob', language: 'en', createdById: admin.id, createdAt: ctx.clock.ago(25, 9) },
  });
}

/** A school with a paid licence, the teacher's class, lessons set, and its room. */
async function school(ctx: DemoContext, adults: WebAdults, lahore: DemoChild[]) {
  const made = await ctx.prisma.school.create({
    data: {
      name: 'Crescent Model School',
      countryCode: 'PK',
      city: 'Lahore',
      contactName: 'Principal Farah Naz',
      contactEmail: demoEmail('school'),
      createdAt: ctx.clock.ago(21, 9),
    },
  });
  await ctx.prisma.schoolTeacher.create({
    data: { schoolId: made.id, userId: adults.teacher.id, addedAt: ctx.clock.ago(20, 9) },
  });
  const paid = await ctx.prisma.schoolLicense.create({
    data: {
      schoolId: made.id,
      seats: 30,
      startsAt: ctx.clock.ago(15, 0),
      endsAt: plusDays(ctx.clock.ago(15, 0), 365),
      invoiceNumber: 'DEMO-2026-001',
      amountMinor: 4_500_000,
      currency: 'PKR',
      paidAt: ctx.clock.ago(12, 11),
      paymentReference: 'HBL 104577',
      createdAt: ctx.clock.ago(20, 10),
    },
  });
  await ctx.prisma.schoolLicense.create({
    data: {
      schoolId: made.id,
      seats: 40,
      startsAt: plusDays(ctx.clock.ago(15, 0), 365),
      endsAt: plusDays(ctx.clock.ago(15, 0), 730),
      invoiceNumber: 'DEMO-2027-001',
      amountMinor: 6_000_000,
      currency: 'PKR',
      createdAt: ctx.clock.ago(2, 10),
    },
  });

  const classCreated = ctx.clock.ago(6, 8);
  const cls = await ctx.prisma.schoolClass.create({
    data: {
      schoolId: made.id,
      teacherId: adults.teacher.id,
      name: 'Grade 8 Coders',
      joinCode: code(ctx),
      trackId: 'builder',
      createdAt: classCreated,
    },
  });
  const students = lahore.slice(0, 5);
  const approvedAt = ctx.clock.ago(5, 16);
  for (const [index, child] of students.entries()) {
    const approved = index < 4;
    await ctx.prisma.classMember.create({
      data: {
        classId: cls.id,
        userId: child.id,
        status: approved ? 'APPROVED' : 'PENDING',
        requestedAt: plusMinutes(classCreated, 60 + index * 7),
        approvedById: approved ? child.family.parentId : null,
        approvedAt: approved ? approvedAt : null,
      },
    });
    if (approved) {
      await ctx.prisma.premiumGrant.create({
        data: {
          userId: child.id,
          source: 'SCHOOL',
          licenseId: paid.id,
          reason: `School licence ${paid.invoiceNumber}`,
          startsAt: approvedAt,
          endsAt: paid.endsAt,
          createdAt: approvedAt,
        },
      });
    } else {
      await ctx.prisma.notification.create({
        data: {
          userId: child.family.parentId,
          type: 'class_join_request',
          data: {
            classId: cls.id,
            childId: child.id,
            nickname: child.nickname,
            className: 'Grade 8 Coders',
            school: 'Crescent Model School',
          },
          createdAt: plusMinutes(classCreated, 60 + index * 7),
        },
      });
    }
  }
  const lessons = await ctx.prisma.lesson.findMany({
    where: { moduleId: 'builder-m01', isActive: true },
    orderBy: { sortOrder: 'asc' },
    take: 2,
  });
  for (const [index, lesson] of lessons.entries()) {
    await ctx.prisma.assignment.create({
      data: {
        classId: cls.id,
        lessonId: lesson.id,
        dueAt: index === 0 ? ctx.clock.ago(1, 18) : plusDays(ctx.clock.now, 5),
        createdById: adults.teacher.id,
        createdAt: plusMinutes(approvedAt, 120 + index),
      },
    });
  }
  const classRoom = await room(
    ctx,
    'CLASS',
    cls.id,
    'Crescent Model School: Grade 8 Coders',
    [
      { userId: adults.teacher.id, role: 'ADULT' },
      ...students.slice(0, 4).map((c) => ({ userId: c.id })),
    ],
    classCreated,
  );
  await say(ctx, classRoom, adults.teacher.id, plusMinutes(approvedAt, 130), {
    text: 'Welcome to Grade 8 Coders! This week: the first two lessons of Builder.',
  });
  if (students[0]) {
    await say(ctx, classRoom, students[0].id, plusMinutes(approvedAt, 150), { phrase: 'thanks' });
  }
  if (students[1]) {
    const message = await say(ctx, classRoom, students[1].id, plusMinutes(approvedAt, 170), {
      text: 'stop copying my code!!!',
    });
    if (students[2]) {
      // Waiting in the moderation queue.
      await ctx.prisma.chatReport.create({
        data: {
          reporterId: students[2].id,
          roomId: classRoom,
          messageId: message.id,
          subjectId: students[1].id,
          reason: 'UNKIND',
          snapshot: 'stop copying my code!!!',
          createdAt: plusMinutes(approvedAt, 180),
        },
      });
    }
  }
  return made.id;
}

/** Hub readiness: one student passed (graded by the mentor), one waits for a mentor. */
async function readiness(ctx: DemoContext, adults: WebAdults, teens: DemoChild[]) {
  const pro = await ctx.prisma.lesson.findMany({
    where: { isActive: true, module: { trackId: 'pro', isActive: true } },
    select: { id: true },
  });
  const [passer, waiter] = teens.filter((c) => c.pattern === 'star');
  const takers = [
    { child: passer, daysAgo: 12, passed: true },
    { child: waiter, daysAgo: 1, passed: false },
  ];
  for (const { child, daysAgo, passed } of takers) {
    if (!child) continue;
    const startedAt = ctx.clock.ago(daysAgo, 13, 5);
    for (const lesson of pro) {
      await ctx.prisma.lessonProgress.upsert({
        where: { userId_lessonId: { userId: child.id, lessonId: lesson.id } },
        create: {
          userId: child.id,
          lessonId: lesson.id,
          status: 'COMPLETED',
          startedAt: plusDays(startedAt, -6),
          completedAt: plusDays(startedAt, -4),
        },
        update: {},
      });
    }
    const submittedAt = plusMinutes(startedAt, 160);
    const decidedAt = passed ? plusDays(submittedAt, 1) : null;
    const scores = { works: 4, code: 3, design: 3, independence: 4 };
    const review = await ctx.prisma.review.create({
      data: {
        kind: 'READINESS',
        studentId: child.id,
        version: 1,
        files: BAKERY,
        languageCode: child.family.spec.language,
        status: passed ? 'APPROVED' : 'WAITING',
        mentorId: passed ? adults.mentor.id : null,
        requestedAt: submittedAt,
        claimedAt: passed ? plusMinutes(submittedAt, 300) : null,
        decidedAt,
        turnaroundHours: passed ? 24 : null,
        scores: passed ? scores : {},
        summary: passed ? 'Ready: a clear page, built on your own, and it works on a phone.' : null,
        createdAt: submittedAt,
      },
    });
    if (passed) {
      await ctx.prisma.reviewComment.create({
        data: {
          reviewId: review.id,
          authorId: adults.mentor.id,
          file: 'js',
          line: 1,
          body: 'A comment that says what the code does: very helpful.',
          createdAt: plusMinutes(submittedAt, 320),
        },
      });
    }
    await ctx.prisma.readinessCheck.create({
      data: {
        studentId: child.id,
        status: passed ? 'PASSED' : 'SUBMITTED',
        startedAt,
        dueAt: plusMinutes(startedAt, 180),
        files: BAKERY,
        submittedAt,
        reviewId: review.id,
        score: passed ? 14 : null,
        decidedAt,
        passedAt: decidedAt,
      },
    });
  }
}

/** All of Phase 2's demo data. */
export async function createPhase2(
  ctx: DemoContext,
  services: { reports: ReportsService },
  families: DemoFamily[],
  staff: DemoStaff[],
  adults: WebAdults,
) {
  const children = families.flatMap((f) => f.children);
  const teens = children.filter((c) => c.pattern !== 'idle');
  await mentorReviews(ctx, children, adults);
  await contentDraft(ctx, staff);
  const young = await youngLearner(ctx, families[0]!);
  await friendsAndReferrals(ctx, families, teens);
  await activityDays(ctx, children);
  const reports = await weeklyReports(ctx, families, services.reports);
  await hackathons(ctx, staff, adults, teens);
  const lahore = teens.filter((c) => c.spec.city === 'lahore' && c.countryCode === 'PK');
  await school(ctx, adults, lahore.slice(4));
  await readiness(ctx, adults, teens);
  return { young, reports };
}
