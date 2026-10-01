import { DeliveriesService } from '../src/hub/deliveries.service.js';
import { StorageService } from '../src/storage/storage.service.js';
import {
  createTestApp,
  lastMailTo,
  resetRateLimits,
  staffLogin,
  type TestContext,
} from './helpers.js';
import {
  approvedProject,
  clientProject,
  eligibleStudent,
  payByCard,
  readyMentor,
  setHubCountry,
} from './hub-fixture.js';
import { auth } from './learning-fixture.js';

const GIT = Boolean(process.env['FORGEJO_URL'] && process.env['FORGEJO_TOKEN']);
const PRICE = 120_000;

describe('hub deliveries: milestones, previews, acceptance and messages (e2e)', () => {
  let t: TestContext;
  let admin: string;
  let lead: { user: { id: string }; token: string };
  let wasOpen: boolean;

  beforeAll(async () => {
    t = await createTestApp();
    admin = (await staffLogin(t, 'admin')).token;
    lead = await readyMentor(t, admin, true);
    wasOpen = await setHubCountry(t, 'PK', true);
  });

  beforeEach(async () => {
    await resetRateLimits(t.redis);
  });

  afterAll(async () => {
    await setHubCountry(t, 'PK', wasOpen);
    await t.app.close();
  });

  /** An active project (deposit paid). */
  async function activeProject() {
    const { client, contactEmail, projectId } = await clientProject(t, admin, lead.user.id);
    const { quoteId, project } = await approvedProject(
      t,
      lead.token,
      client.token,
      projectId,
      PRICE,
    );
    await payByCard(t, client.token, project.invoices[0].id);
    return { client, contactEmail, projectId, quoteId };
  }

  /** A milestone saved with files of its own (no git server needed). */
  async function savedDelivery(projectId: string, quoteId: string, final = false) {
    const storage = t.app.get(StorageService);
    return t.app.get(DeliveriesService).save(
      projectId,
      quoteId,
      { title: 'First look', notes: 'The menu page is ready.', final, commit: 'a'.repeat(40) },
      async (id) => {
        await storage.putBinary(
          `hub/previews/${id}/index.html`,
          Buffer.from('<h1>Green Leaf</h1>'),
          'text/html',
        );
        await storage.putBinary(
          `hub/previews/${id}/logo.png`,
          Buffer.from([137, 80, 78, 71]),
          'image/png',
        );
        return [
          { path: 'index.html', size: 19, type: 'text/html' },
          { path: 'logo.png', size: 4, type: 'image/png' },
        ];
      },
      null,
    );
  }

  it('shows a milestone’s preview to anyone with its link, until it’s withdrawn', async () => {
    const { client, projectId, quoteId } = await activeProject();
    const id = await savedDelivery(projectId, quoteId);
    const list = await t
      .http()
      .get(`/v1/client/projects/${projectId}/deliveries`)
      .set(auth(client.token))
      .expect(200);
    expect(list.body).toEqual([
      expect.objectContaining({
        id,
        reference: 'M-1',
        status: 'SUBMITTED',
        final: false,
        fileCount: 2,
      }),
    ]);
    const token = list.body[0].previewToken as string;

    const preview = await t.http().get(`/v1/shared/previews/${token}`).expect(200);
    expect(preview.headers['access-control-allow-origin']).toBe('*');
    expect(preview.headers['cache-control']).toBe('no-store');
    expect(preview.body).toMatchObject({ title: 'First look', reference: 'M-1' });
    expect(preview.body.files).toEqual([
      { path: 'index.html', type: 'text/html', text: '<h1>Green Leaf</h1>', base64: null },
      { path: 'logo.png', type: 'image/png', text: null, base64: 'iVBORw==' },
    ]);
    await t.http().get('/v1/shared/previews/not-a-real-token-at-all').expect(404);
    await t.http().get('/v1/shared/previews/x').expect(404);

    // One milestone waits for the client at a time.
    await expect(savedDelivery(projectId, quoteId)).rejects.toMatchObject({
      response: { error: 'DELIVERY_WAITING' },
    });
    await t
      .http()
      .post(`/v1/mentor/hub/deliveries/${id}/withdraw`)
      .set(auth(lead.token))
      .expect(204);
    await t.http().get(`/v1/shared/previews/${token}`).expect(404);
    const after = await t
      .http()
      .get(`/v1/client/projects/${projectId}/deliveries`)
      .set(auth(client.token))
      .expect(200);
    expect(after.body).toEqual([]);
    await t
      .http()
      .post(`/v1/mentor/hub/deliveries/${id}/withdraw`)
      .set(auth(lead.token))
      .expect(409);
  });

  it('turns “please change” into a change request the lead answers', async () => {
    const { client, projectId, quoteId } = await activeProject();
    const id = await savedDelivery(projectId, quoteId);
    await t
      .http()
      .post(`/v1/client/projects/${projectId}/deliveries/${id}/request-changes`)
      .set(auth(client.token))
      .send({ comment: 'Please make the prices bigger.' })
      .expect(204);
    await t
      .http()
      .post(`/v1/client/projects/${projectId}/deliveries/${id}/accept`)
      .set(auth(client.token))
      .send({})
      .expect(409);
    const changes = await t
      .http()
      .get(`/v1/mentor/hub/projects/${projectId}/changes`)
      .set(auth(lead.token))
      .expect(200);
    expect(changes.body).toEqual([
      expect.objectContaining({
        body: 'Please make the prices bigger.',
        status: 'OPEN',
        deliveryId: id,
      }),
    ]);
    // A change asked for directly, too.
    await t
      .http()
      .post(`/v1/client/projects/${projectId}/changes`)
      .set(auth(client.token))
      .send({ body: 'Could we add a gallery page?' })
      .expect(201);

    await t
      .http()
      .post(`/v1/mentor/hub/changes/${changes.body[0].id}/decide`)
      .set(auth(lead.token))
      .send({ decision: 'IN_SCOPE', note: 'Part of the menu task: we’ll do it.' })
      .expect(204);
    await t
      .http()
      .post(`/v1/mentor/hub/changes/${changes.body[0].id}/decide`)
      .set(auth(lead.token))
      .send({ decision: 'DECLINED', note: 'Changed my mind.' })
      .expect(409);
    const seen = await t
      .http()
      .get(`/v1/client/projects/${projectId}/changes`)
      .set(auth(client.token))
      .expect(200);
    expect(seen.body.map((c: { status: string }) => c.status).toSorted()).toEqual([
      'IN_SCOPE',
      'OPEN',
    ]);
    // A change quote must belong to this project.
    const open = seen.body.find((c: { status: string }) => c.status === 'OPEN');
    await t
      .http()
      .post(`/v1/mentor/hub/changes/${open.id}/decide`)
      .set(auth(lead.token))
      .send({ decision: 'QUOTED', note: 'Quote follows.', quoteId: quoteId })
      .expect(404);
  });

  it('keeps messages between the client and the platform (never the students)', async () => {
    const { client, contactEmail, projectId, quoteId } = await activeProject();
    const kid = await eligibleStudent(t, lead.token);
    await t
      .http()
      .post(`/v1/client/projects/${projectId}/comments`)
      .set(auth(client.token))
      .send({ body: 'Hello! Looking forward to it.' })
      .expect(201);
    const before = t.mail.outbox.length;
    const reply = await t
      .http()
      .post(`/v1/mentor/hub/projects/${projectId}/comments`)
      .set(auth(lead.token))
      .send({ body: 'Thanks, the first milestone comes next week.' })
      .expect(201);
    expect(reply.body).toEqual([
      expect.objectContaining({ from: 'client', isMine: false }),
      expect.objectContaining({ from: 'lead', isMine: true }),
    ]);
    expect(t.mail.outbox.length).toBeGreaterThan(before);
    expect(lastMailTo(t.mail, contactEmail)?.template).toBe('hubMessage');
    const staff = await t
      .http()
      .post(`/v1/admin/hub/projects/${projectId}/comments`)
      .set(auth(admin))
      .send({ body: 'Staff here: all good.' })
      .expect(201);
    expect(staff.body.at(-1)).toMatchObject({ from: 'staff', isMine: true });
    const seen = await t
      .http()
      .get(`/v1/client/projects/${projectId}/comments`)
      .set(auth(client.token))
      .expect(200);
    expect(seen.body.map((c: { from: string }) => c.from)).toEqual(['client', 'lead', 'staff']);

    // A delivery named in a message must be the project's.
    await t
      .http()
      .post(`/v1/client/projects/${projectId}/comments`)
      .set(auth(client.token))
      .send({ body: 'About this one', deliveryId: '00000000-0000-4000-8000-000000000000' })
      .expect(404);
    await savedDelivery(projectId, quoteId);

    // Students don't see the client's side at all.
    for (const path of ['comments', 'changes', 'deliveries']) {
      const res = await t
        .http()
        .get(`/v1/client/projects/${projectId}/${path}`)
        .set(auth(kid.student));
      expect([403, 404]).toContain(res.status);
    }
    const asLead = await t
      .http()
      .get(`/v1/mentor/hub/projects/${projectId}/comments`)
      .set(auth(kid.student));
    expect([403, 404]).toContain(asLead.status);
  });

  it('accepts the final milestone: the work is accepted and the final invoice issued', async () => {
    const { client, contactEmail, projectId, quoteId } = await activeProject();
    await t.prisma.hubTask.updateMany({ where: { quoteId }, data: { status: 'DONE' } });
    const id = await savedDelivery(projectId, quoteId, true);
    await t
      .http()
      .post(`/v1/client/projects/${projectId}/deliveries/${id}/accept`)
      .set(auth(client.token))
      .send({ allowPortfolio: true })
      .expect(204);
    const view = await t
      .http()
      .get(`/v1/client/projects/${projectId}`)
      .set(auth(client.token))
      .expect(200);
    expect(view.body).toMatchObject({ status: 'DELIVERED', portfolioAllowed: true });
    expect(view.body.quotes[0].acceptedAt).toBeTruthy();
    const final = view.body.invoices.find((i: { kind: string }) => i.kind === 'FINAL');
    expect(final).toMatchObject({ status: 'OPEN', amountMinor: PRICE - PRICE * 0.3 });
    expect(lastMailTo(t.mail, contactEmail)?.template).toBe('hubInvoiceIssued');
    const audit = await t.prisma.auditLog.findFirst({
      where: { action: 'hub.delivery_accept', entityId: projectId },
    });
    expect(audit?.after).toMatchObject({ deliveryId: id, final: true, allowPortfolio: true });

    // Answered once.
    await t
      .http()
      .post(`/v1/client/projects/${projectId}/deliveries/${id}/accept`)
      .set(auth(client.token))
      .send({})
      .expect(409);
  });

  describe.skipIf(!GIT)('from the project’s repository (Forgejo)', () => {
    it('keeps main’s static files as the preview, and needs every task done for the final one', async () => {
      const { client, contactEmail, projectId, quoteId } = await activeProject();
      // The lead opening the workspace makes the repository (with its starter files).
      await t
        .http()
        .get(`/v1/hub/projects/${projectId}/workspace`)
        .set(auth(lead.token))
        .expect(200);
      await t
        .http()
        .post(`/v1/mentor/hub/projects/${projectId}/deliveries`)
        .set(auth(lead.token))
        .send({ quoteId, title: 'The final site', notes: 'All done.', final: true })
        .expect(409);
      const made = await t
        .http()
        .post(`/v1/mentor/hub/projects/${projectId}/deliveries`)
        .set(auth(lead.token))
        .send({ quoteId, title: 'Starter page', notes: 'The project is set up.', final: false })
        .expect(201);
      expect(made.body).toEqual([
        expect.objectContaining({
          reference: 'M-1',
          status: 'SUBMITTED',
          commit: expect.any(String),
        }),
      ]);
      expect(lastMailTo(t.mail, contactEmail)?.template).toBe('hubDeliveryReady');
      const preview = await t
        .http()
        .get(`/v1/shared/previews/${made.body[0].previewToken}`)
        .expect(200);
      const paths = preview.body.files.map((f: { path: string }) => f.path);
      expect(paths).toEqual(['README.md', 'index.html', 'script.js', 'style.css']);
      expect(
        preview.body.files.find((f: { path: string }) => f.path === 'index.html').text,
      ).toContain('Coming soon');
      // The client only sees milestones of their own projects.
      const other = await clientProject(t, admin, lead.user.id);
      await t
        .http()
        .post(`/v1/client/projects/${projectId}/deliveries/${made.body[0].id}/accept`)
        .set(auth(other.client.token))
        .send({})
        .expect(404);
      await t
        .http()
        .post(`/v1/client/projects/${projectId}/deliveries/${made.body[0].id}/accept`)
        .set(auth(client.token))
        .send({})
        .expect(204);
    });
  });
});
