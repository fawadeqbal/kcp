import { HUB_AGREEMENTS } from '@kcp/shared';
import {
  createTestApp,
  lastMailTo,
  resetRateLimits,
  signUpAndLogin,
  staffLogin,
  type TestContext,
  tokenFrom,
} from './helpers.js';
import { acceptInvite, readyMentor, siteIntake } from './hub-fixture.js';
import { auth } from './learning-fixture.js';

const PDF = Buffer.from('%PDF-1.4\n1 0 obj << >> endobj\ntrailer << >>\n%%EOF\n');

describe('the client portal and project requests (e2e)', () => {
  let t: TestContext;
  let admin: string;
  let lead: { user: { id: string }; token: string };

  beforeAll(async () => {
    t = await createTestApp();
    admin = (await staffLogin(t, 'admin')).token;
    lead = await readyMentor(t, admin, true);
  });

  beforeEach(async () => {
    await resetRateLimits(t.redis);
  });

  afterAll(async () => {
    await t.app.close();
  });

  it('takes a request from the site, confirmed by email, into the admin Hub queue', async () => {
    // A bot fills the hidden field: nothing is kept.
    await t
      .http()
      .post('/v1/public/hub/intake')
      .send({
        contactName: 'Bot',
        contactEmail: 'bot@spam.test',
        company: 'Spam',
        languageCode: 'en',
        title: 'Buy now',
        brief: 'This is a long enough message that a bot would send to every form.',
        budget: 'UNSURE',
        website: 'http://spam.test',
      })
      .expect(202);
    expect(await t.prisma.hubIntake.count({ where: { contactEmail: 'bot@spam.test' } })).toBe(0);

    const email = `owner-${Date.now()}@bakery.test`;
    await t
      .http()
      .post('/v1/public/hub/intake')
      .send({
        contactName: 'Sara Ahmed',
        contactEmail: email,
        company: 'Green Leaf Bakery',
        countryCode: 'PK',
        languageCode: 'ur',
        title: 'A website for our bakery',
        brief:
          'We need a small website with our menu, opening hours and a contact form for orders.',
        budget: 'FROM_500',
      })
      .expect(202);
    const mail = lastMailTo(t.mail, email);
    expect(mail?.template).toBe('hubIntakeConfirm');
    expect(mail?.language).toBe('ur');
    // Not in the queue until confirmed.
    const before = await t.http().get('/v1/admin/hub/intakes').set(auth(admin)).expect(200);
    expect(before.body.some((i: { contactEmail: string }) => i.contactEmail === email)).toBe(false);
    await t
      .http()
      .post('/v1/public/hub/intake/confirm')
      .send({ token: 'x'.repeat(40) })
      .expect(404);
    await t
      .http()
      .post('/v1/public/hub/intake/confirm')
      .send({ token: tokenFrom(mail) })
      .expect(200);
    const queue = await t
      .http()
      .get('/v1/admin/hub/intakes?status=NEW')
      .set(auth(admin))
      .expect(200);
    const row = queue.body.find((i: { contactEmail: string }) => i.contactEmail === email);
    expect(row).toMatchObject({ source: 'SITE', status: 'NEW', company: 'Green Leaf Bakery' });
    expect(row.reference).toMatch(/^R-\d{4,}$/);
  });

  it('accepts a request: a project for the lead, and a client account with two-factor login', async () => {
    const { contactEmail, intake } = await siteIntake(t);
    // Only a ready lead developer can take it.
    const notLead = await readyMentor(t, admin, false);
    const refused = await t
      .http()
      .post(`/v1/admin/hub/intakes/${intake.id}/accept`)
      .set(auth(admin))
      .send({ leadId: notLead.user.id, currency: 'USD' })
      .expect(400);
    expect(refused.body.error).toBe('NOT_LEAD');
    const accepted = await t
      .http()
      .post(`/v1/admin/hub/intakes/${intake.id}/accept`)
      .set(auth(admin))
      .send({ leadId: lead.user.id, currency: 'USD', title: 'Green Leaf website' })
      .expect(200);
    expect(accepted.body.invited).toBe(true);
    await t
      .http()
      .post(`/v1/admin/hub/intakes/${intake.id}/decline`)
      .set(auth(admin))
      .send({ reason: 'Too late now' })
      .expect(409);
    const project = await t.prisma.hubProject.findUniqueOrThrow({
      where: { id: accepted.body.projectId },
    });
    expect(project).toMatchObject({
      status: 'SCOPING',
      leadId: lead.user.id,
      currency: 'USD',
      title: 'Green Leaf website',
      studentPercent: 50,
      leadPercent: 25,
      platformPercent: 25,
      depositPercent: 30,
    });
    expect(lastMailTo(t.mail, contactEmail)?.template).toBe('clientInvite');

    // The client signs in (two-factor), signs the agreement, and adds a request.
    const client = await acceptInvite(t, contactEmail);
    const me = await t.http().get('/v1/client/me').set(auth(client.token)).expect(200);
    expect(me.body).toMatchObject({ role: 'OWNER', needsAgreement: true });
    expect(me.body.org.name).toBe('Green Leaf Bakery');
    const early = await t
      .http()
      .post('/v1/client/intakes')
      .set(auth(client.token))
      .send({
        title: 'Online orders',
        brief: 'Customers should be able to order cakes online and pay when they collect them.',
        budget: 'FROM_2000',
      })
      .expect(409);
    expect(early.body.error).toBe('AGREEMENT_NEEDED');
    const agreement = await t.http().get('/v1/hub/contracts/client').expect(200);
    await t
      .http()
      .post('/v1/client/agreement')
      .set(auth(client.token))
      .send({ version: agreement.body.version, agree: true })
      .expect(200);
    const made = await t
      .http()
      .post('/v1/client/intakes')
      .set(auth(client.token))
      .send({
        title: 'Online orders',
        brief: 'Customers should be able to order cakes online and pay when they collect them.',
        budget: 'FROM_2000',
        deadline: '2030-06-01',
      })
      .expect(201);
    expect(made.body).toMatchObject({ source: 'PORTAL', status: 'NEW', files: [] });

    // Files: a PDF is kept (by its bytes, not its name); anything else is refused.
    const withFile = await t
      .http()
      .post(`/v1/client/intakes/${made.body.id}/files`)
      .set(auth(client.token))
      .set('Content-Type', 'application/octet-stream')
      .set('X-File-Name', encodeURIComponent('../Menu (2026).pdf'))
      .send(PDF)
      .expect(200);
    expect(withFile.body.files).toEqual([
      expect.objectContaining({
        name: 'Menu (2026).pdf',
        type: 'application/pdf',
        size: PDF.length,
      }),
    ]);
    const bad = await t
      .http()
      .post(`/v1/client/intakes/${made.body.id}/files`)
      .set(auth(client.token))
      .set('Content-Type', 'application/octet-stream')
      .set('X-File-Name', 'virus.pdf')
      .send(Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00]))
      .expect(400);
    expect(bad.body.error).toBe('FILE_TYPE');
    const fileId = withFile.body.files[0].id as string;
    const download = await t
      .http()
      .get(`/v1/client/intakes/${made.body.id}/files/${fileId}`)
      .set(auth(client.token))
      .expect(200);
    expect(download.headers['content-disposition']).toContain('attachment');
    expect(download.headers['content-type']).toContain('application/pdf');

    // Staff see it in the queue (with the file), and decline it with a reason.
    const adminView = await t
      .http()
      .get(`/v1/admin/hub/intakes/${made.body.id}`)
      .set(auth(admin))
      .expect(200);
    expect(adminView.body).toMatchObject({ source: 'PORTAL', orgName: 'Green Leaf Bakery' });
    await t
      .http()
      .get(`/v1/admin/hub/intakes/${made.body.id}/files/${fileId}`)
      .set(auth(admin))
      .expect(200);
    await t
      .http()
      .post(`/v1/admin/hub/intakes/${made.body.id}/decline`)
      .set(auth(admin))
      .send({ reason: 'Online payments need a licence we can’t offer yet.' })
      .expect(204);
    expect(lastMailTo(t.mail, contactEmail)?.template).toBe('hubIntakeDeclined');
    const declined = await t
      .http()
      .get(`/v1/client/intakes/${made.body.id}`)
      .set(auth(client.token))
      .expect(200);
    expect(declined.body).toMatchObject({
      status: 'DECLINED',
      declineReason: 'Online payments need a licence we can’t offer yet.',
    });
    // Decided: no more files.
    await t
      .http()
      .post(`/v1/client/intakes/${made.body.id}/files`)
      .set(auth(client.token))
      .set('Content-Type', 'application/octet-stream')
      .send(PDF)
      .expect(409);

    // A colleague joins as a member; only the owner signs or invites.
    const colleagueEmail = `colleague-${Date.now()}@bakery.test`;
    const invited = await t
      .http()
      .post('/v1/client/colleagues')
      .set(auth(client.token))
      .send({ email: colleagueEmail, displayName: 'Bilal' })
      .expect(200);
    expect(invited.body.colleagues).toHaveLength(2);
    const colleague = await acceptInvite(t, colleagueEmail);
    const memberView = await t.http().get('/v1/client/me').set(auth(colleague.token)).expect(200);
    expect(memberView.body).toMatchObject({ role: 'MEMBER', needsAgreement: false });
    const notOwner = await t
      .http()
      .post('/v1/client/agreement')
      .set(auth(colleague.token))
      .send({ version: HUB_AGREEMENTS.client, agree: true })
      .expect(403);
    expect(notOwner.body.error).toBe('OWNER_ONLY');
    // The colleague sees the organisation's requests too.
    const shared = await t.http().get('/v1/client/intakes').set(auth(colleague.token)).expect(200);
    expect(shared.body.map((i: { id: string }) => i.id)).toContain(made.body.id);

    // Another client never sees them.
    const other = await siteIntake(t, { company: 'Blue Fish Cafe' });
    await t
      .http()
      .post(`/v1/admin/hub/intakes/${other.intake.id}/accept`)
      .set(auth(admin))
      .send({ leadId: lead.user.id, currency: 'PKR' })
      .expect(200);
    const stranger = await acceptInvite(t, other.contactEmail);
    await t.http().get(`/v1/client/intakes/${made.body.id}`).set(auth(stranger.token)).expect(404);
    await t
      .http()
      .get(`/v1/client/intakes/${made.body.id}/files/${fileId}`)
      .set(auth(stranger.token))
      .expect(404);

    // Staff see the clients with their people.
    const clients = await t.http().get('/v1/admin/hub/clients').set(auth(admin)).expect(200);
    const org = clients.body.find((c: { id: string }) => c.id === me.body.org.id);
    expect(org.people).toHaveLength(2);
    expect(org.contract.version).toBe(HUB_AGREEMENTS.client);
  });

  it('keeps the client portal for clients, and clients away from families’ routes', async () => {
    const parent = await signUpAndLogin(t);
    await t.http().get('/v1/client/me').set(auth(parent.accessToken)).expect(403);
    const { contactEmail, intake } = await siteIntake(t);
    await t
      .http()
      .post(`/v1/admin/hub/intakes/${intake.id}/accept`)
      .set(auth(admin))
      .send({ leadId: lead.user.id, currency: 'USD' })
      .expect(200);
    const client = await acceptInvite(t, contactEmail);
    for (const path of ['/v1/children', '/v1/hub/family', '/v1/rooms', '/v1/admin/hub/intakes']) {
      await t.http().get(path).set(auth(client.token)).expect(403);
    }
    // A site request from someone who already has an account can't make a second one.
    const taken = await siteIntake(t, { contactEmail: parent.email });
    const conflict = await t
      .http()
      .post(`/v1/admin/hub/intakes/${taken.intake.id}/accept`)
      .set(auth(admin))
      .send({ leadId: lead.user.id, currency: 'USD' })
      .expect(409);
    expect(conflict.body.error).toBe('EMAIL_TAKEN');
  });
});
