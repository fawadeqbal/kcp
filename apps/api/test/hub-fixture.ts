import { MENTOR_CODE_OF_CONDUCT_VERSION } from '@kcp/database';
import { HUB_AGREEMENTS } from '@kcp/shared';
import { totp } from '../src/common/crypto/totp.js';
import type { TestContext } from './helpers.js';
import { lastMailTo, PASSWORD, tokenFrom, webTwoFactorLogin } from './helpers.js';
import { auth, family } from './learning-fixture.js';

/** Opens (or closes) the hub in a country for a test; returns how it was. */
export async function setHubCountry(t: TestContext, code: string, enabled: boolean) {
  const before = await t.prisma.country.findUniqueOrThrow({
    where: { code },
    select: { hubEnabled: true },
  });
  await t.prisma.country.update({ where: { code }, data: { hubEnabled: enabled } });
  return before.hubEnabled;
}

/** A mentor ready to work (code of conduct signed, check passed), optionally a lead developer. */
export async function readyMentor(t: TestContext, admin: string, lead = false) {
  const mentor = await webTwoFactorLogin(t, 'mentor');
  await t
    .http()
    .post('/v1/mentor/code-of-conduct')
    .set(auth(mentor.token))
    .send({ version: MENTOR_CODE_OF_CONDUCT_VERSION })
    .expect(204);
  await t
    .http()
    .patch(`/v1/admin/mentors/${mentor.user.id}`)
    .set(auth(admin))
    .send({
      backgroundCheck: 'PASSED',
      languages: ['en', 'ur'],
      ...(lead ? { isLead: true } : {}),
      reason: 'Check came back clear',
    })
    .expect(204);
  return mentor;
}

/** Marks every Pro track lesson done for a student. */
export async function finishPro(t: TestContext, userId: string) {
  const lessons = await t.prisma.lesson.findMany({
    where: { isActive: true, module: { trackId: 'pro', isActive: true } },
    select: { id: true },
  });
  await t.prisma.lessonProgress.createMany({
    data: lessons.map((l) => ({
      userId,
      lessonId: l.id,
      status: 'COMPLETED' as const,
      completedAt: new Date(),
    })),
    skipDuplicates: true,
  });
}

/** A 16-year-old in Pakistan who finished the Pro track and passed the readiness check. */
export async function passedStudent(t: TestContext) {
  const person = await family(t, { birthYear: new Date().getUTCFullYear() - 16 });
  await finishPro(t, person.child.id);
  const now = new Date();
  await t.prisma.readinessCheck.create({
    data: {
      studentId: person.child.id,
      status: 'PASSED',
      startedAt: new Date(now.getTime() - 4 * 3_600_000),
      dueAt: new Date(now.getTime() - 3_600_000),
      submittedAt: new Date(now.getTime() - 2 * 3_600_000),
      decidedAt: now,
      passedAt: now,
      score: 12,
    },
  });
  return person;
}

/** A student every step done for: signed off by the lead, the parent consented. */
export async function eligibleStudent(t: TestContext, lead: string) {
  const person = await passedStudent(t);
  await t
    .http()
    .post(`/v1/mentor/hub/candidates/${person.child.id}/sign-off`)
    .set(auth(lead))
    .send({ note: 'Clean code, careful with forms.' })
    .expect(204);
  await t
    .http()
    .post(`/v1/children/${person.child.id}/hub/consent`)
    .set(auth(person.parent.accessToken))
    .send({ version: HUB_AGREEMENTS.parent, agree: true })
    .expect(200);
  return person;
}

/** An invited adult chooses a password from the email, then signs in to the web app with two-factor login. */
export async function acceptInvite(t: TestContext, email: string) {
  await t
    .http()
    .post('/v1/auth/password/reset')
    .send({ token: tokenFrom(lastMailTo(t.mail, email)), password: PASSWORD })
    .expect(200);
  const login = await t
    .http()
    .post('/v1/auth/login')
    .send({ email, password: PASSWORD, app: 'web' })
    .expect(200);
  const setup = await t
    .http()
    .post('/v1/auth/mfa/setup')
    .send({ mfaToken: login.body.mfaToken })
    .expect(200);
  const done = await t
    .http()
    .post('/v1/auth/mfa/verify')
    .send({ mfaToken: login.body.mfaToken, code: totp(setup.body.secret), app: 'web' })
    .expect(200);
  const user = await t.prisma.user.findUniqueOrThrow({ where: { email } });
  return { user, token: done.body.accessToken as string };
}

let requestCount = 0;

/** A request from the "Hire our students" page, confirmed by email (in the admin queue). */
export async function siteIntake(t: TestContext, overrides: Record<string, unknown> = {}) {
  requestCount += 1;
  const contactEmail =
    (overrides['contactEmail'] as string | undefined) ??
    `client-${Date.now()}-${requestCount}@business.test`;
  await t
    .http()
    .post('/v1/public/hub/intake')
    .send({
      contactName: 'Sara Ahmed',
      contactEmail,
      company: 'Green Leaf Bakery',
      countryCode: 'PK',
      languageCode: 'en',
      title: 'A website for our bakery',
      brief: 'We need a small website with our menu, opening hours and a contact form for orders.',
      budget: 'FROM_500',
      deadline: '2030-03-01',
      ...overrides,
    })
    .expect(202);
  const mail = lastMailTo(t.mail, contactEmail);
  await t
    .http()
    .post('/v1/public/hub/intake/confirm')
    .send({ token: tokenFrom(mail) })
    .expect(200);
  const intake = await t.prisma.hubIntake.findFirstOrThrow({ where: { contactEmail } });
  return { contactEmail, intake };
}

/**
 * A client with an accepted project: a site request accepted for the lead, the
 * client signed in (two-factor) and the client agreement signed.
 */
export async function clientProject(t: TestContext, admin: string, leadId: string) {
  const { contactEmail, intake } = await siteIntake(t);
  const accepted = await t
    .http()
    .post(`/v1/admin/hub/intakes/${intake.id}/accept`)
    .set(auth(admin))
    .send({ leadId, currency: 'USD' })
    .expect(200);
  const client = await acceptInvite(t, contactEmail);
  await t
    .http()
    .post('/v1/client/agreement')
    .set(auth(client.token))
    .send({ version: HUB_AGREEMENTS.client, agree: true })
    .expect(200);
  return {
    client,
    contactEmail,
    projectId: accepted.body.projectId as string,
    orgId: accepted.body.orgId as string,
  };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Waits for something that happens a moment later (the mock's webhooks). */
export async function until<T>(read: () => Promise<T>, done: (value: T) => boolean): Promise<T> {
  for (let i = 0; i < 100; i++) {
    const value = await read();
    if (done(value)) return value;
    await sleep(50);
  }
  throw new Error('Timed out waiting');
}

/** Three tasks for a quote: 50%, 30% and 20% of the students' pool. */
export const THREE_TASKS = [
  {
    title: 'Home page with the menu',
    spec: 'Build index.html with the bakery menu from the brief, using the colours given.',
    skillTags: ['html', 'css'],
    estimateMinutes: 240,
    shareBp: 5000,
  },
  {
    title: 'Opening hours and map',
    spec: 'A section with the opening hours table and a picture of the map with the address.',
    skillTags: ['html'],
    estimateMinutes: 120,
    shareBp: 3000,
  },
  {
    title: 'Order form',
    spec: 'A form with name, phone, cake and date; it checks the fields before sending.',
    skillTags: ['javascript', 'forms'],
    estimateMinutes: 180,
    shareBp: 2000,
  },
];

/** The lead scopes the project (three tasks), sends the main quote and the client approves it. */
export async function approvedProject(
  t: TestContext,
  lead: string,
  client: string,
  projectId: string,
  priceMinor = 120_000,
) {
  const draft = await t
    .http()
    .post(`/v1/mentor/hub/projects/${projectId}/quotes`)
    .set(auth(lead))
    .send({ kind: 'MAIN', priceMinor })
    .expect(201);
  const quoteId = draft.body.quotes.at(-1).id as string;
  for (const task of THREE_TASKS) {
    await t
      .http()
      .post(`/v1/mentor/hub/quotes/${quoteId}/tasks`)
      .set(auth(lead))
      .send(task)
      .expect(201);
  }
  await t.http().post(`/v1/mentor/hub/quotes/${quoteId}/send`).set(auth(lead)).expect(200);
  const approved = await t
    .http()
    .post(`/v1/client/projects/${projectId}/quotes/${quoteId}/approve`)
    .set(auth(client))
    .send({ sowVersion: HUB_AGREEMENTS.sow, agree: true })
    .expect(200);
  return { quoteId, project: approved.body };
}

/** The client pays an invoice on the (mock) card page, and the webhook arrives. */
export async function payByCard(t: TestContext, client: string, invoiceId: string) {
  const checkout = await t
    .http()
    .post(`/v1/client/invoices/${invoiceId}/checkout?locale=en`)
    .set(auth(client))
    .expect(200);
  const url = new URL(checkout.body.url as string);
  await t.http().post(`${url.pathname}/pay`).expect(303);
  return until(
    async () => (await t.http().get(`/v1/client/invoices/${invoiceId}`).set(auth(client))).body,
    (invoice: { status: string; payments: { provider: string; amountMinor: number }[] }) =>
      invoice.status === 'PAID',
  );
}
