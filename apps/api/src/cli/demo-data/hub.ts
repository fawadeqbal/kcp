import { randomUUID } from 'node:crypto';
import { type Prisma, ROLE_KEYS } from '@kcp/database';
import { HUB_AGREEMENTS, hubWeekAt } from '@kcp/shared';
import { hashPassword } from '../../common/crypto/passwords.js';
import { SecretBox } from '../../common/crypto/secret-box.js';
import { randomToken, sha256 } from '../../common/crypto/tokens.js';
import { reference } from '../../hub/clients.service.js';
import { statementOfWork } from '../../hub/contracts.js';
import type { HubEarningsService } from '../../hub/earnings.service.js';
import type { LedgerService } from '../../hub/ledger/ledger.service.js';
import type { StorageService } from '../../storage/storage.service.js';
import { PASSWORDS } from './cast.js';
import type { DemoChild, DemoContext, DemoFamily, DemoStaff } from './context.js';
import { demoEmail } from './people.js';
import type { WebAdults } from './phase2.js';
import { plusDays, plusMinutes } from './timeline.js';

export interface HubServices {
  ledger: LedgerService;
  earnings: HubEarningsService;
  storage: StorageService;
  encryptionKey: string;
}

const TZ = 'Asia/Karachi';
const PREVIEW_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Green Leaf Bakery</title>
    <link rel="stylesheet" href="style.css" />
  </head>
  <body>
    <header><h1>Green Leaf Bakery</h1><p>Fresh bread every morning.</p></header>
    <section id="menu"><h2>Menu</h2><ul><li>Naan — 30</li><li>Cake slice — 250</li><li>Buns (6) — 180</li></ul></section>
    <section id="hours"><h2>Opening hours</h2><table><tr><td>Mon–Sat</td><td>7:00–21:00</td></tr></table></section>
    <form id="order"><label>Name <input required /></label><label>Phone <input required /></label><button>Order</button></form>
    <script src="script.js"></script>
  </body>
</html>
`;
const PREVIEW_CSS =
  'body { font-family: system-ui, sans-serif; margin: 0 auto; max-width: 42rem; padding: 1rem; }\nheader { background: #e8f5e9; padding: 1rem; border-radius: 12px; }\n';
const PREVIEW_JS =
  "document.getElementById('order').addEventListener('submit', (e) => { e.preventDefault(); alert('Thank you!'); });\n";
const CLINIC_HTML = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Marina Dental Clinic</title><link rel="stylesheet" href="style.css" /></head>
  <body><h1>Book a visit</h1><form><label>Name <input /></label><label>Day <input type="date" /></label><button>Ask for a time</button></form></body>
</html>
`;

interface Person {
  child: DemoChild;
  family: DemoFamily;
}

/** Staff-like auth for a demo adult made here. */
const adultId = async (
  ctx: DemoContext,
  roleKey: string,
  email: string,
  name: string,
  countryCode: string,
  createdAt: Date,
  passwordHash: string,
) => {
  const role = await ctx.prisma.role.findUniqueOrThrow({ where: { key: roleKey } });
  const user = await ctx.prisma.user.create({
    data: {
      kind: 'ADULT',
      status: 'ACTIVE',
      roleId: role.id,
      email: demoEmail(email),
      emailVerifiedAt: createdAt,
      displayName: name,
      passwordHash,
      languageCode: 'en',
      countryCode,
      createdAt,
      updatedAt: createdAt,
    },
  });
  return user.id;
};

/**
 * The real-world hub: Pakistan's hub opened (in this local database), a lead developer,
 * four eligible teenagers, two client businesses, requests in every state, a finished
 * project (paid, shared out, paid to a parent by hand), one in progress with a milestone
 * waiting for the client, one being scoped, payout accounts and batches, the ledger,
 * and stories for the site.
 */
export async function createHub(
  ctx: DemoContext,
  services: HubServices,
  families: DemoFamily[],
  staff: DemoStaff[],
  adults: WebAdults,
) {
  const { prisma } = ctx;
  const ago = (days: number, hour = 11, minute = 0) => ctx.clock.ago(days, hour, minute);
  const admin = staff.find((s) => s.role === ROLE_KEYS.ADMIN)!;
  const supers = staff.filter((s) => s.role === ROLE_KEYS.SUPER_ADMIN);
  const lead = adults.mentor;
  const box = new SecretBox(services.encryptionKey);

  await prisma.country.update({ where: { code: 'PK' }, data: { hubEnabled: true } });
  await prisma.mentorProfile.update({ where: { userId: lead.id }, data: { isLead: true } });

  // ── Four eligible students (surely 15: born 16 years ago, in Pakistan) ────
  const teens: Person[] = families
    .flatMap((family) => family.children.map((child) => ({ child, family })))
    .filter(
      ({ child }) =>
        child.countryCode === 'PK' && (child.spec.age ?? 0) >= 16 && child.pattern !== 'idle',
    )
    .slice(0, 4);
  if (teens.length < 4) throw new Error('The demo cast needs four teenagers in Pakistan.');
  const pro = await prisma.lesson.findMany({
    where: { isActive: true, module: { trackId: 'pro', isActive: true } },
    select: { id: true },
  });
  for (const [index, { child, family }] of teens.entries()) {
    for (const lesson of pro) {
      await prisma.lessonProgress.upsert({
        where: { userId_lessonId: { userId: child.id, lessonId: lesson.id } },
        create: {
          userId: child.id,
          lessonId: lesson.id,
          status: 'COMPLETED',
          startedAt: ago(80 - index),
          completedAt: ago(75 - index),
        },
        update: {},
      });
    }
    let readiness = await prisma.readinessCheck.findFirst({
      where: { studentId: child.id, status: 'PASSED' },
    });
    if (!readiness) {
      readiness = await prisma.readinessCheck.create({
        data: {
          studentId: child.id,
          status: 'PASSED',
          startedAt: ago(70 - index, 14),
          dueAt: plusMinutes(ago(70 - index, 14), 180),
          files: { html: '<h1>My shop</h1>', css: 'h1 { color: teal; }', js: '' },
          submittedAt: plusMinutes(ago(70 - index, 14), 150),
          score: 13,
          decidedAt: ago(69 - index),
          passedAt: ago(69 - index),
        },
      });
    }
    await prisma.premiumGrant.create({
      data: {
        userId: child.id,
        grantedById: admin.id,
        reason: 'Hub pilot (demo)',
        startsAt: ago(70),
        endsAt: plusDays(ctx.clock.now, 300),
        createdAt: ago(70),
      },
    });
    await prisma.hubEligibility.create({
      data: {
        studentId: child.id,
        readinessId: readiness.id,
        signedOffById: lead.id,
        signedOffAt: ago(66 - index),
        signOffNote: 'Careful with forms, explains their code well.',
        eligibleAt: ago(65 - index),
        createdAt: ago(66 - index),
      },
    });
    for (const type of ['HUB_WORK', 'EARNINGS'] as const) {
      await prisma.consentRecord.create({
        data: {
          parentId: family.parentId,
          childId: child.id,
          type,
          policyVersion: HUB_AGREEMENTS.parent,
          method: 'EMAIL_CONFIRMATION',
          grantedAt: ago(65 - index),
        },
      });
    }
  }
  const [h1, h2, h3, h4] = teens as [Person, Person, Person, Person];

  // ── Clients ──────────────────────────────────────────────────────────────
  const passwordHash = await hashPassword(PASSWORDS.staff);
  const bakeryOwner = await adultId(
    ctx,
    ROLE_KEYS.CLIENT,
    'client.bakery',
    'Sana Malik',
    'PK',
    ago(62),
    passwordHash,
  );
  const bakeryStaff = await adultId(
    ctx,
    ROLE_KEYS.CLIENT,
    'client.bakery.staff',
    'Omar Sheikh',
    'PK',
    ago(40),
    passwordHash,
  );
  const clinicOwner = await adultId(
    ctx,
    ROLE_KEYS.CLIENT,
    'client.clinic',
    'Dr Layla Haddad',
    'AE',
    ago(45),
    passwordHash,
  );
  const bakery = await prisma.clientOrg.create({
    data: {
      name: 'Green Leaf Bakery',
      countryCode: 'PK',
      billingName: 'Green Leaf Bakery (Pvt) Ltd',
      billingAddress: '12 Mall Road, Lahore',
      contractVersion: HUB_AGREEMENTS.client,
      contractSignedAt: ago(61),
      contractSignedById: bakeryOwner,
      createdAt: ago(62),
      members: {
        create: [
          { userId: bakeryOwner, role: 'OWNER', createdAt: ago(62) },
          { userId: bakeryStaff, role: 'MEMBER', createdAt: ago(40) },
        ],
      },
    },
  });
  const clinic = await prisma.clientOrg.create({
    data: {
      name: 'Marina Dental Clinic',
      countryCode: 'AE',
      contractVersion: HUB_AGREEMENTS.client,
      contractSignedAt: ago(44),
      contractSignedById: clinicOwner,
      createdAt: ago(45),
      members: { create: [{ userId: clinicOwner, role: 'OWNER', createdAt: ago(45) }] },
    },
  });

  // ── Requests in every state ──────────────────────────────────────────────
  const intake = (data: Omit<Prisma.HubIntakeUncheckedCreateInput, 'languageCode'>) =>
    prisma.hubIntake.create({ data: { languageCode: 'en', ...data } });
  const bakeryRequest = await intake({
    source: 'SITE',
    status: 'ACCEPTED',
    orgId: bakery.id,
    contactName: 'Sana Malik',
    contactEmail: demoEmail('client.bakery'),
    company: 'Green Leaf Bakery',
    countryCode: 'PK',
    title: 'A website for our bakery',
    brief: 'We need a small website with our menu, opening hours and a form for cake orders.',
    budget: 'FROM_500',
    deadline: plusDays(ago(20), 0),
    decidedById: admin.id,
    decidedAt: ago(61),
    createdAt: ago(63),
  });
  const clinicRequest = await intake({
    source: 'SITE',
    status: 'ACCEPTED',
    orgId: clinic.id,
    contactName: 'Dr Layla Haddad',
    contactEmail: demoEmail('client.clinic'),
    company: 'Marina Dental Clinic',
    countryCode: 'AE',
    title: 'Online appointment requests',
    brief: 'A page where patients ask for an appointment time, and a page about our doctors.',
    budget: 'FROM_500',
    decidedById: admin.id,
    decidedAt: ago(44),
    createdAt: ago(46),
  });
  const secondBakeryRequest = await intake({
    source: 'PORTAL',
    status: 'ACCEPTED',
    orgId: bakery.id,
    createdById: bakeryOwner,
    contactName: 'Sana Malik',
    contactEmail: demoEmail('client.bakery'),
    company: 'Green Leaf Bakery',
    countryCode: 'PK',
    title: 'Weekly specials page',
    brief: 'A page we update each week with special cakes, with pictures we send you.',
    budget: 'UNDER_500',
    decidedById: admin.id,
    decidedAt: ago(2),
    createdAt: ago(3),
  });
  const waiting = await intake({
    source: 'SITE',
    status: 'NEW',
    contactName: 'Imran Qureshi',
    contactEmail: demoEmail('imran.tuition'),
    company: 'Bright Path Tuition Centre',
    countryCode: 'PK',
    title: 'Class timetable page',
    brief:
      'Parents keep asking for our timetable. We want a simple page showing classes by day and teacher.',
    budget: 'UNDER_500',
    deadline: plusDays(ctx.clock.now, 40),
    createdAt: ago(1),
  });
  const brief = Buffer.from('Classes: Maths (Mon, Wed), English (Tue, Thu), Science (Sat).\n');
  const fileId = randomUUID();
  const key = `hub/intakes/${waiting.id}/${fileId}`;
  let storageWarning: string | null = null;
  try {
    await services.storage.putBinary(key, brief, 'text/plain');
    await prisma.hubIntake.update({
      where: { id: waiting.id },
      data: {
        files: [{ id: fileId, key, name: 'timetable.txt', size: brief.length, type: 'text/plain' }],
      },
    });
  } catch (error) {
    storageWarning = (error as Error).message;
  }
  await intake({
    source: 'SITE',
    status: 'DECLINED',
    contactName: 'Kamran Ali',
    contactEmail: demoEmail('kamran.trading'),
    company: 'KA Trading',
    countryCode: 'PK',
    title: 'Crypto trading bot',
    brief: 'A bot that buys and sells coins automatically on an exchange.',
    budget: 'FROM_2000',
    decidedById: admin.id,
    decidedAt: ago(9),
    declineReason: 'Trading tools handle people’s money: not something our students can build.',
    createdAt: ago(10),
  });
  await intake({
    source: 'SITE',
    status: 'UNCONFIRMED',
    contactName: 'Hina Javed',
    contactEmail: demoEmail('hina.boutique'),
    company: 'Hina’s Boutique',
    countryCode: 'PK',
    title: 'Shop catalogue',
    brief: 'A catalogue page for our dresses with prices.',
    budget: 'UNSURE',
    tokenHash: sha256(randomToken()),
    tokenExpiresAt: plusDays(ctx.clock.now, 6),
    createdAt: ago(0, 6),
  });

  // ── Ledger helpers (the same postings the services make) ─────────────────
  const issue = async (
    invoice: { id: string; number: number; amountMinor: number },
    orgId: string,
    projectId: string,
    title: string,
  ) =>
    services.ledger.post({
      kind: 'invoice.issued',
      memo: `Invoice ${reference('H', invoice.number)} for ${title}`,
      currency: 'USD',
      refType: 'HubInvoice',
      refId: invoice.id,
      idempotencyKey: `hub-invoice:${invoice.id}:issued`,
      lines: [
        {
          type: 'CLIENT_RECEIVABLE',
          owner: orgId,
          side: 'DEBIT',
          amountMinor: invoice.amountMinor,
        },
        {
          type: 'PROJECT_FUNDS',
          owner: projectId,
          side: 'CREDIT',
          amountMinor: invoice.amountMinor,
        },
      ],
    });
  const pay = async (
    invoice: { id: string; number: number; amountMinor: number },
    orgId: string,
    title: string,
    paidAt: Date,
    by: { card: string } | { bank: string },
  ) => {
    await prisma.hubPayment.create({
      data:
        'card' in by
          ? {
              invoiceId: invoice.id,
              provider: 'STRIPE',
              providerPaymentId: by.card,
              currency: 'USD',
              amountMinor: invoice.amountMinor,
              paidAt,
            }
          : {
              invoiceId: invoice.id,
              provider: 'MANUAL',
              currency: 'USD',
              amountMinor: invoice.amountMinor,
              method: 'Bank transfer',
              reference: by.bank,
              recordedById: admin.id,
              paidAt,
            },
    });
    await prisma.hubInvoice.update({ where: { id: invoice.id }, data: { status: 'PAID', paidAt } });
    await services.ledger.post({
      kind: 'invoice.paid',
      memo: `Payment of invoice ${reference('H', invoice.number)} for ${title}`,
      currency: 'USD',
      refType: 'HubInvoice',
      refId: invoice.id,
      idempotencyKey: `hub-invoice:${invoice.id}:paid`,
      lines: [
        { type: 'CASH', side: 'DEBIT', amountMinor: invoice.amountMinor },
        {
          type: 'CLIENT_RECEIVABLE',
          owner: orgId,
          side: 'CREDIT',
          amountMinor: invoice.amountMinor,
        },
      ],
    });
  };
  const preview = async (deliveryId: string, files: [string, string, string][]) => {
    try {
      for (const [path, body, type] of files) {
        await services.storage.putBinary(
          `hub/previews/${deliveryId}/${path}`,
          Buffer.from(body),
          type,
        );
      }
    } catch (error) {
      storageWarning = (error as Error).message;
    }
    return files.map(([path, body, type]) => ({ path, size: Buffer.byteLength(body), type }));
  };
  const room = async (
    projectId: string,
    title: string,
    people: string[],
    messages: [string, string, Date][],
  ) => {
    const made = await prisma.chatRoom.create({
      data: {
        kind: 'HUB',
        refId: projectId,
        name: title,
        createdAt: messages[0]?.[2] ?? ago(30),
        members: {
          create: [
            { userId: lead.id, role: 'ADULT' },
            ...people.map((userId) => ({ userId, role: 'MEMBER' as const })),
          ],
        },
      },
    });
    for (const [authorId, text, at] of messages) {
      await prisma.chatMessage.create({
        data: { roomId: made.id, authorId, kind: 'TEXT', text, createdAt: at },
      });
    }
  };
  const timeEntries = async (
    projectId: string,
    taskId: string,
    studentId: string,
    days: number[],
  ) => {
    for (const day of days) {
      const startedAt = ago(day, 11, 20); // 16:20 in Pakistan
      const minutes = 40 + ((day * 7) % 50);
      await prisma.hubTimeEntry.create({
        data: {
          projectId,
          taskId,
          studentId,
          startedAt,
          endedAt: plusMinutes(startedAt, minutes),
          minutes,
          weekKey: hubWeekAt(startedAt, TZ),
          stoppedBy: day % 3 === 0 ? 'HOURS' : 'STUDENT',
          createdAt: startedAt,
        },
      });
    }
  };

  // ── Project 1: the bakery's website — finished, paid, shared out ─────────
  const bakeryProject = await prisma.hubProject.create({
    data: {
      orgId: bakery.id,
      intakeId: bakeryRequest.id,
      title: 'A website for our bakery',
      summary:
        'A small website for Green Leaf Bakery: the menu, opening hours with a map, and a cake order form that checks its fields.',
      status: 'ACTIVE',
      leadId: lead.id,
      currency: 'USD',
      studentPercent: 50,
      leadPercent: 25,
      platformPercent: 25,
      depositPercent: 30,
      deadline: plusDays(ago(20), 0),
      portfolioAllowed: true,
      createdById: admin.id,
      createdAt: ago(61),
    },
  });
  const bakeryTasks = [
    {
      title: 'Home page with the menu',
      skills: ['html', 'css'],
      minutes: 240,
      share: 5000,
      who: h1,
    },
    { title: 'Opening hours and map', skills: ['html'], minutes: 120, share: 3000, who: h2 },
    { title: 'Order form', skills: ['javascript', 'forms'], minutes: 180, share: 2000, who: h1 },
  ];
  const mainQuote = await prisma.hubQuote.create({
    data: {
      projectId: bakeryProject.id,
      version: 1,
      kind: 'MAIN',
      status: 'APPROVED',
      priceMinor: 120_000,
      depositMinor: 36_000,
      note: 'Hosting and the domain are not included.',
      sowText: statementOfWork({
        orgName: bakery.name,
        projectTitle: bakeryProject.title,
        summary: bakeryProject.summary,
        quoteVersion: 1,
        currency: 'USD',
        priceMinor: 120_000,
        depositMinor: 36_000,
        deadline: null,
        tasks: bakeryTasks.map((t) => ({ title: t.title, estimateMinutes: t.minutes })),
      }),
      sowVersion: HUB_AGREEMENTS.sow,
      sentAt: ago(56),
      approvedAt: ago(55),
      approvedById: bakeryOwner,
      acceptedAt: ago(25),
      createdById: lead.id,
      createdAt: ago(58),
    },
  });
  const tasks = [];
  for (const [index, t] of bakeryTasks.entries()) {
    tasks.push(
      await prisma.hubTask.create({
        data: {
          projectId: bakeryProject.id,
          quoteId: mainQuote.id,
          number: index + 1,
          title: t.title,
          spec: `Build: ${t.title.toLowerCase()}. Follow the brief and the colours in the README.`,
          skillTags: t.skills,
          estimateMinutes: t.minutes,
          shareBp: t.share,
          status: 'DONE',
          assigneeId: t.who.child.id,
          sortOrder: index,
          doneAt: ago(30 - index),
          createdAt: ago(57),
        },
      }),
    );
  }
  for (const [index, person] of [h1, h2].entries()) {
    await prisma.hubMember.create({
      data: {
        projectId: bakeryProject.id,
        studentId: person.child.id,
        status: 'APPROVED',
        pseudonym: `Developer ${'AB'[index]}`,
        taskId: tasks[index]!.id,
        note: 'A small site for a bakery: you’d build one page of it.',
        invitedById: lead.id,
        invitedAt: ago(54),
        answeredAt: ago(54, 15),
        parentId: person.family.parentId,
        decidedAt: ago(53),
      },
    });
  }
  await room(
    bakeryProject.id,
    bakeryProject.title,
    [h1.child.id, h2.child.id],
    [
      [lead.id, 'Welcome! Start with the README, then open your branch.', ago(53, 12)],
      [h1.child.id, 'I pushed the menu page, can you look?', ago(45, 12)],
      [lead.id, 'Looks good. Make the prices line up on phones.', ago(44, 12)],
      [h2.child.id, 'Opening hours table is done.', ago(38, 12)],
    ],
  );
  await timeEntries(bakeryProject.id, tasks[0]!.id, h1.child.id, [50, 48, 46, 45]);
  await timeEntries(bakeryProject.id, tasks[1]!.id, h2.child.id, [42, 40, 38]);
  await timeEntries(bakeryProject.id, tasks[2]!.id, h1.child.id, [34, 32, 31]);
  for (const [index, task] of tasks.entries()) {
    const studentId = task.assigneeId!;
    if (index === 0) {
      await prisma.hubCodeReview.create({
        data: {
          projectId: bakeryProject.id,
          taskId: task.id,
          studentId,
          reviewerId: lead.id,
          pullNumber: 1,
          commit: randomToken(20).slice(0, 40),
          decision: 'CHANGES_REQUESTED',
          score: 3,
          comment: 'Prices wrap on small phones: use a grid.',
          createdAt: ago(44),
        },
      });
    }
    await prisma.hubCodeReview.create({
      data: {
        projectId: bakeryProject.id,
        taskId: task.id,
        studentId,
        reviewerId: lead.id,
        pullNumber: index + 1,
        commit: randomToken(20).slice(0, 40),
        decision: 'APPROVED',
        score: [4, 5, 4][index]!,
        comment: [
          'Clean and readable.',
          'Exactly what the client asked for.',
          'Good checks on every field.',
        ][index]!,
        createdAt: ago(43 - index * 6),
      },
    });
  }
  const deposit = await prisma.hubInvoice.create({
    data: {
      projectId: bakeryProject.id,
      orgId: bakery.id,
      quoteId: mainQuote.id,
      kind: 'DEPOSIT',
      currency: 'USD',
      amountMinor: 36_000,
      issuedAt: ago(55),
      dueAt: plusDays(ago(55), 14),
    },
  });
  await issue(deposit, bakery.id, bakeryProject.id, bakeryProject.title);
  await pay(deposit, bakery.id, bakeryProject.title, ago(54), {
    card: `pi_demo_${randomToken(9)}`,
  });
  const firstLook = await prisma.hubDelivery.create({
    data: {
      projectId: bakeryProject.id,
      quoteId: mainQuote.id,
      number: 1,
      title: 'First look: menu and opening hours',
      notes: 'The menu and the opening hours. The order form comes next.',
      commit: randomToken(20).slice(0, 40),
      previewToken: randomToken(),
      status: 'CHANGES_REQUESTED',
      submittedAt: ago(36),
      decidedAt: ago(35),
      decidedById: bakeryOwner,
      clientComment: 'Lovely! Could the menu show prices in bold?',
      createdById: lead.id,
    },
  });
  await prisma.hubDelivery.update({
    where: { id: firstLook.id },
    data: {
      files: await preview(firstLook.id, [
        ['index.html', PREVIEW_HTML, 'text/html'],
        ['style.css', PREVIEW_CSS, 'text/css'],
      ]),
    },
  });
  await prisma.hubChangeRequest.create({
    data: {
      projectId: bakeryProject.id,
      deliveryId: firstLook.id,
      body: 'Lovely! Could the menu show prices in bold?',
      status: 'IN_SCOPE',
      createdById: bakeryOwner,
      createdAt: ago(35),
      decidedById: lead.id,
      decidedAt: ago(34),
      note: 'Part of the menu task: done in the next milestone.',
    },
  });
  const finalSite = await prisma.hubDelivery.create({
    data: {
      projectId: bakeryProject.id,
      quoteId: mainQuote.id,
      number: 2,
      title: 'The finished site',
      notes: 'Everything in the statement of work, with bold prices.',
      final: true,
      commit: randomToken(20).slice(0, 40),
      previewToken: randomToken(),
      status: 'ACCEPTED',
      submittedAt: ago(26),
      decidedAt: ago(25),
      decidedById: bakeryOwner,
      createdById: lead.id,
    },
  });
  await prisma.hubDelivery.update({
    where: { id: finalSite.id },
    data: {
      files: await preview(finalSite.id, [
        ['index.html', PREVIEW_HTML, 'text/html'],
        ['style.css', PREVIEW_CSS, 'text/css'],
        ['script.js', PREVIEW_JS, 'text/javascript'],
      ]),
    },
  });
  for (const [authorId, body, at, deliveryId] of [
    [bakeryOwner, 'Hello! We’re excited. Our colours are green and cream.', ago(55, 9), null],
    [lead.id, 'Thank you, noted. The first milestone is planned for next week.', ago(55, 12), null],
    [bakeryOwner, 'Prices in bold please, otherwise perfect.', ago(35, 10), firstLook.id],
    [
      admin.id,
      'From the platform team: your final invoice is attached to the project.',
      ago(25, 14),
      null,
    ],
  ] as const) {
    await prisma.hubComment.create({
      data: { projectId: bakeryProject.id, authorId, body, createdAt: at, deliveryId },
    });
  }
  const finalInvoice = await prisma.hubInvoice.create({
    data: {
      projectId: bakeryProject.id,
      orgId: bakery.id,
      quoteId: mainQuote.id,
      kind: 'FINAL',
      currency: 'USD',
      amountMinor: 84_000,
      issuedAt: ago(25),
      dueAt: plusDays(ago(25), 14),
    },
  });
  await issue(finalInvoice, bakery.id, bakeryProject.id, bakeryProject.title);
  await pay(finalInvoice, bakery.id, bakeryProject.title, ago(22), { bank: 'MEZN-881204' });
  // Shared out when paid and accepted (the hold is 14 days: over by now).
  await services.earnings.distributeInvoice(deposit.id, ago(25));
  await services.earnings.distributeInvoice(finalInvoice.id, ago(22));
  await services.earnings.releaseDue(ctx.clock.now);

  // ── Project 2: the clinic — in progress, a milestone waiting ─────────────
  const clinicProject = await prisma.hubProject.create({
    data: {
      orgId: clinic.id,
      intakeId: clinicRequest.id,
      title: 'Online appointment requests',
      summary: 'A booking request form for patients and a page about the clinic’s doctors.',
      status: 'ACTIVE',
      leadId: lead.id,
      currency: 'USD',
      studentPercent: 50,
      leadPercent: 25,
      platformPercent: 25,
      depositPercent: 30,
      createdById: admin.id,
      createdAt: ago(44),
    },
  });
  const clinicSpec = [
    {
      title: 'Booking request form',
      skills: ['html', 'forms'],
      minutes: 240,
      share: 5000,
      who: h3,
      status: 'IN_REVIEW' as const,
    },
    {
      title: 'Our doctors page',
      skills: ['html', 'css'],
      minutes: 180,
      share: 3000,
      who: h2,
      status: 'IN_PROGRESS' as const,
    },
    {
      title: 'Contact and map',
      skills: ['html'],
      minutes: 90,
      share: 2000,
      who: null,
      status: 'TODO' as const,
    },
  ];
  const clinicQuote = await prisma.hubQuote.create({
    data: {
      projectId: clinicProject.id,
      version: 1,
      kind: 'MAIN',
      status: 'APPROVED',
      priceMinor: 90_000,
      depositMinor: 27_000,
      sowText: statementOfWork({
        orgName: clinic.name,
        projectTitle: clinicProject.title,
        summary: clinicProject.summary,
        quoteVersion: 1,
        currency: 'USD',
        priceMinor: 90_000,
        depositMinor: 27_000,
        deadline: null,
        tasks: clinicSpec.map((t) => ({ title: t.title, estimateMinutes: t.minutes })),
      }),
      sowVersion: HUB_AGREEMENTS.sow,
      sentAt: ago(40),
      approvedAt: ago(39),
      approvedById: clinicOwner,
      createdById: lead.id,
      createdAt: ago(41),
    },
  });
  const clinicTasks = [];
  for (const [index, t] of clinicSpec.entries()) {
    clinicTasks.push(
      await prisma.hubTask.create({
        data: {
          projectId: clinicProject.id,
          quoteId: clinicQuote.id,
          number: index + 1,
          title: t.title,
          spec: `Build: ${t.title.toLowerCase()}.`,
          skillTags: t.skills,
          estimateMinutes: t.minutes,
          shareBp: t.share,
          status: t.status,
          assigneeId: t.who?.child.id ?? null,
          sortOrder: index,
          createdAt: ago(41),
        },
      }),
    );
  }
  for (const [index, person] of [h3, h2].entries()) {
    await prisma.hubMember.create({
      data: {
        projectId: clinicProject.id,
        studentId: person.child.id,
        status: 'APPROVED',
        pseudonym: `Developer ${'AB'[index]}`,
        taskId: clinicTasks[index]!.id,
        invitedById: lead.id,
        invitedAt: ago(37),
        answeredAt: ago(37, 16),
        parentId: person.family.parentId,
        decidedAt: ago(36),
      },
    });
  }
  // The fourth student said yes; their parent hasn't answered yet.
  await prisma.hubMember.create({
    data: {
      projectId: clinicProject.id,
      studentId: h4.child.id,
      status: 'ACCEPTED',
      pseudonym: 'Developer C',
      taskId: clinicTasks[2]!.id,
      note: 'A contact section with a map picture for a dental clinic.',
      invitedById: lead.id,
      invitedAt: ago(2),
      answeredAt: ago(1),
    },
  });
  await room(
    clinicProject.id,
    clinicProject.title,
    [h3.child.id, h2.child.id],
    [
      [lead.id, 'Welcome to the clinic project!', ago(36, 12)],
      [h3.child.id, 'The form checks the date now.', ago(3, 12)],
    ],
  );
  await timeEntries(clinicProject.id, clinicTasks[0]!.id, h3.child.id, [20, 13, 6, 2, 1]);
  await timeEntries(clinicProject.id, clinicTasks[1]!.id, h2.child.id, [12, 5, 1]);
  await prisma.hubCodeReview.create({
    data: {
      projectId: clinicProject.id,
      taskId: clinicTasks[0]!.id,
      studentId: h3.child.id,
      reviewerId: lead.id,
      pullNumber: 1,
      commit: randomToken(20).slice(0, 40),
      decision: 'CHANGES_REQUESTED',
      score: 3,
      comment: 'Check that the day isn’t in the past.',
      createdAt: ago(2),
    },
  });
  const clinicDeposit = await prisma.hubInvoice.create({
    data: {
      projectId: clinicProject.id,
      orgId: clinic.id,
      quoteId: clinicQuote.id,
      kind: 'DEPOSIT',
      currency: 'USD',
      amountMinor: 27_000,
      issuedAt: ago(39),
      dueAt: plusDays(ago(39), 14),
    },
  });
  await issue(clinicDeposit, clinic.id, clinicProject.id, clinicProject.title);
  await pay(clinicDeposit, clinic.id, clinicProject.title, ago(38), {
    card: `pi_demo_${randomToken(9)}`,
  });
  const clinicMilestone = await prisma.hubDelivery.create({
    data: {
      projectId: clinicProject.id,
      quoteId: clinicQuote.id,
      number: 1,
      title: 'The booking form',
      notes: 'Try asking for a time: the form checks every field.',
      commit: randomToken(20).slice(0, 40),
      previewToken: randomToken(),
      submittedAt: ago(1),
      createdById: lead.id,
    },
  });
  await prisma.hubDelivery.update({
    where: { id: clinicMilestone.id },
    data: {
      files: await preview(clinicMilestone.id, [
        ['index.html', CLINIC_HTML, 'text/html'],
        ['style.css', PREVIEW_CSS, 'text/css'],
      ]),
    },
  });
  await prisma.hubComment.create({
    data: {
      projectId: clinicProject.id,
      authorId: lead.id,
      body: 'The booking form is ready for you to try.',
      createdAt: ago(1),
      deliveryId: clinicMilestone.id,
    },
  });
  await prisma.hubChangeRequest.create({
    data: {
      projectId: clinicProject.id,
      body: 'Could patients also choose a doctor?',
      createdById: clinicOwner,
      createdAt: ago(0, 5),
    },
  });

  // ── Project 3: the bakery's specials page — being scoped ─────────────────
  const scoping = await prisma.hubProject.create({
    data: {
      orgId: bakery.id,
      intakeId: secondBakeryRequest.id,
      title: 'Weekly specials page',
      summary: 'A page the bakery updates each week with special cakes and their pictures.',
      status: 'SCOPING',
      leadId: lead.id,
      currency: 'USD',
      studentPercent: 50,
      leadPercent: 25,
      platformPercent: 25,
      createdById: admin.id,
      createdAt: ago(2),
    },
  });
  const draft = await prisma.hubQuote.create({
    data: {
      projectId: scoping.id,
      version: 1,
      kind: 'MAIN',
      priceMinor: 40_000,
      createdById: lead.id,
      createdAt: ago(1),
    },
  });
  await prisma.hubTask.create({
    data: {
      projectId: scoping.id,
      quoteId: draft.id,
      number: 1,
      title: 'Specials page with pictures',
      spec: 'A grid of this week’s cakes, each with a picture, name and price.',
      skillTags: ['html', 'css'],
      estimateMinutes: 180,
      shareBp: 10_000,
      createdAt: ago(1),
    },
  });

  // ── Payout accounts, payouts and the lead's pay ──────────────────────────
  const account = async (
    person: Person,
    kind: 'IBAN' | 'OTHER',
    details: object,
    last4: string,
    currency: string,
    createdAt: Date,
    checked: boolean,
  ) =>
    prisma.payoutAccount.create({
      data: {
        parentId: person.family.parentId,
        kind,
        currency,
        countryCode: 'PK',
        detailsCipher: box.encrypt(JSON.stringify(details)),
        last4,
        usableFrom: plusDays(createdAt, 2),
        verifiedAt: checked ? plusDays(createdAt, 3) : null,
        verifiedById: checked ? admin.id : null,
        createdAt,
      },
    });
  const h1Account = await account(
    h1,
    'IBAN',
    { holderName: h1.family.name, iban: 'PK36SCBL0000001123456702' },
    '6702',
    'PKR',
    ago(20),
    true,
  );
  const h2Account = await account(
    h2,
    'OTHER',
    { holderName: h2.family.name, details: 'JazzCash 0300 1234567' },
    '4567',
    'PKR',
    ago(15),
    true,
  );
  await account(
    h3,
    'IBAN',
    { holderName: h3.family.name, iban: 'PK24MEZN0001234567890123' },
    '0123',
    'PKR',
    ago(0, 4),
    false,
  );

  const payable = async (studentId: string) =>
    services.ledger.balance('STUDENT_PAYABLE', 'USD', studentId);
  const paidBatch = await prisma.payoutBatch.create({
    data: {
      currency: 'USD',
      provider: 'MANUAL',
      status: 'SENT',
      note: 'First hub payouts (by bank transfer).',
      createdById: admin.id,
      firstApprovedById: supers[0]!.id,
      firstApprovedAt: ago(5, 9),
      secondApprovedById: supers[1]!.id,
      secondApprovedAt: ago(5, 13),
      sentAt: ago(4),
      createdAt: ago(6),
    },
  });
  const h1Amount = await payable(h1.child.id);
  const paidPayout = await prisma.payout.create({
    data: {
      batchId: paidBatch.id,
      studentId: h1.child.id,
      parentId: h1.family.parentId,
      accountId: h1Account.id,
      currency: 'USD',
      amountMinor: h1Amount,
      netMinor: h1Amount,
      status: 'PAID',
      parentConfirmedAt: ago(6, 15),
      method: 'Bank transfer',
      reference: 'MEZN-990311',
      recordedById: admin.id,
      sentAt: ago(3),
      paidAt: ago(3),
      createdAt: ago(6),
    },
  });
  for (const [kind, lines] of [
    [
      'payout.sent',
      [
        {
          type: 'STUDENT_PAYABLE' as const,
          owner: h1.child.id,
          side: 'DEBIT' as const,
          amountMinor: h1Amount,
        },
        { type: 'PAYOUT_CLEARING' as const, side: 'CREDIT' as const, amountMinor: h1Amount },
      ],
    ],
    [
      'payout.paid',
      [
        { type: 'PAYOUT_CLEARING' as const, side: 'DEBIT' as const, amountMinor: h1Amount },
        { type: 'CASH' as const, side: 'CREDIT' as const, amountMinor: h1Amount },
      ],
    ],
  ] as const) {
    await services.ledger.post({
      kind,
      memo: `${reference('PO', paidPayout.number)} ${kind === 'payout.sent' ? 'sent' : 'paid'}`,
      currency: 'USD',
      refType: 'Payout',
      refId: paidPayout.id,
      idempotencyKey: `${kind}:${paidPayout.id}`,
      lines: [...lines],
    });
  }
  // The next round: made, one super admin approved, the parent hasn't confirmed yet.
  const nextBatch = await prisma.payoutBatch.create({
    data: {
      currency: 'USD',
      provider: 'MANUAL',
      createdById: admin.id,
      firstApprovedById: supers[0]!.id,
      firstApprovedAt: ago(0, 5),
      createdAt: ago(0, 4),
    },
  });
  const h2Amount = await payable(h2.child.id);
  await prisma.payout.create({
    data: {
      batchId: nextBatch.id,
      studentId: h2.child.id,
      parentId: h2.family.parentId,
      accountId: h2Account.id,
      currency: 'USD',
      amountMinor: h2Amount,
      netMinor: h2Amount,
      createdAt: ago(0, 4),
    },
  });
  await services.ledger.post({
    kind: 'lead.paid',
    memo: 'Paid by hand: bank transfer HBL-445120',
    currency: 'USD',
    refType: 'User',
    refId: lead.id,
    idempotencyKey: `lead.paid:${randomUUID()}`,
    createdById: admin.id,
    lines: [
      { type: 'LEAD_PAYABLE', owner: lead.id, side: 'DEBIT', amountMinor: 15_000 },
      { type: 'CASH', side: 'CREDIT', amountMinor: 15_000 },
    ],
  });

  // ── Stories for the site ─────────────────────────────────────────────────
  await prisma.hubStory.create({
    data: {
      studentId: h1.child.id,
      parentId: h1.family.parentId,
      projectId: bakeryProject.id,
      languageCode: 'en',
      firstName: 'Zara',
      headline: 'Built the menu and order form for a real bakery',
      body: 'Working with a lead developer, they built the menu page and the cake order form of a bakery’s website — reviewed, accepted by the client, and paid.',
      status: 'PUBLISHED',
      parentAnsweredAt: ago(10),
      publishedAt: ago(9),
      createdById: admin.id,
      createdAt: ago(12),
    },
  });
  await prisma.hubStory.create({
    data: {
      studentId: h2.child.id,
      parentId: h2.family.parentId,
      projectId: bakeryProject.id,
      languageCode: 'en',
      firstName: 'Ahmed',
      headline: 'Opening hours and a map for a bakery',
      body: 'Their first paid project: the opening hours table and the map section, built in a few short sessions after school.',
      createdById: admin.id,
      createdAt: ago(1),
    },
  });

  return {
    students: teens.map((t) => t.child.username),
    projects: [bakeryProject.title, clinicProject.title, scoping.title],
    storageWarning,
    clients: [
      demoEmail('client.bakery'),
      demoEmail('client.bakery.staff'),
      demoEmail('client.clinic'),
    ],
  };
}

/** The demo's hub records, for removing them again (`--fresh`). */
export async function hubDemoIds(ctx: DemoContext, adults: string[], students: string[]) {
  const orgs = (
    await ctx.prisma.clientMember.findMany({
      where: { userId: { in: adults } },
      select: { orgId: true },
    })
  ).map((m) => m.orgId);
  const projects = (
    await ctx.prisma.hubProject.findMany({ where: { orgId: { in: orgs } }, select: { id: true } })
  ).map((p) => p.id);
  const invoices = (
    await ctx.prisma.hubInvoice.findMany({
      where: { projectId: { in: projects } },
      select: { id: true },
    })
  ).map((i) => i.id);
  const earnings = (
    await ctx.prisma.hubEarning.findMany({
      where: { OR: [{ studentId: { in: students } }, { projectId: { in: projects } }] },
      select: { id: true },
    })
  ).map((e) => e.id);
  const payouts = (
    await ctx.prisma.payout.findMany({
      where: { OR: [{ studentId: { in: students } }, { parentId: { in: adults } }] },
      select: { id: true },
    })
  ).map((p) => p.id);
  const deliveries = (
    await ctx.prisma.hubDelivery.findMany({
      where: { projectId: { in: projects } },
      select: { id: true },
    })
  ).map((d) => d.id);
  const intakes = (
    await ctx.prisma.hubIntake.findMany({
      where: { OR: [{ orgId: { in: orgs } }, { contactEmail: { endsWith: '@kcp-demo.test' } }] },
      select: { id: true },
    })
  ).map((i) => i.id);
  return { orgs, projects, invoices, earnings, payouts, deliveries, intakes };
}
