import { ProjectsService } from '../src/projects/projects.service.js';
import { StorageService } from '../src/storage/storage.service.js';
import { createTestApp, resetRateLimits, signUpAndLogin, type TestContext } from './helpers.js';
import {
  auth,
  family,
  hideLearningFixture,
  PROJECT_CHECKS,
  seedLearningFixture,
  seedProjectFixture,
} from './learning-fixture.js';

const BRIEF = 'e2e-m01-project';
const allPassed = PROJECT_CHECKS.map((check) => ({ id: check.id, passed: true }));
const PAGE = { html: '<h1>Me</h1><p>مرحبا! I like space.</p>', css: 'h1 { color: navy; }', js: '' };

describe('projects and portfolio (e2e)', () => {
  let t: TestContext;
  let storage: StorageService;

  beforeAll(async () => {
    t = await createTestApp();
    storage = t.app.get(StorageService);
    await seedLearningFixture(t.prisma);
    await seedProjectFixture(t.prisma);
  });

  beforeEach(async () => {
    await resetRateLimits(t.redis);
  });

  afterAll(async () => {
    await hideLearningFixture(t.prisma);
    await t.app.close();
  });

  const ship = (token: string, code = PAGE, results = allPassed) =>
    t
      .http()
      .post(`/v1/projects/${BRIEF}/ship`)
      .set(auth(token))
      .send({ code, results })
      .expect(200);

  it('saves a draft, ships only when every requirement passes, and keeps the latest version', async () => {
    const { student, child } = await family(t);
    const brief = await t
      .http()
      .get(`/v1/projects/${BRIEF}?lang=ar`)
      .set(auth(student))
      .expect(200);
    expect(brief.body).toMatchObject({
      id: BRIEF,
      moduleId: 'e2e-m01',
      title: 'صفحتي',
      language: 'ar',
      xp: 100,
      files: ['html', 'css', 'js'],
      status: 'NOT_STARTED',
      draft: null,
      version: null,
    });
    // Arabic hints first, English for the rest.
    expect(brief.body.hints).toEqual({ add_h1: 'Use h1', add_p: 'استخدم p' });

    await t
      .http()
      .put(`/v1/projects/${BRIEF}/draft`)
      .set(auth(student))
      .send({ code: { html: '<h1>Draft</h1>', python: 'x' } })
      .expect(400);
    await t
      .http()
      .put(`/v1/projects/${BRIEF}/draft`)
      .set(auth(student))
      .send({ code: { html: '<h1>Draft</h1>' } })
      .expect(204);
    const drafted = await t.http().get(`/v1/projects/${BRIEF}`).set(auth(student)).expect(200);
    expect(drafted.body).toMatchObject({ status: 'DRAFT', draft: { html: '<h1>Draft</h1>' } });

    // A requirement not met (or not reported) means nothing is published.
    const notYet = await ship(student, PAGE, [{ id: 'has-h1', passed: true }]);
    expect(notYet.body).toMatchObject({ shipped: false, xpAwarded: 0, portfolioItemId: null });
    expect(notYet.body.results).toEqual([
      { id: 'has-h1', passed: true },
      { id: 'has-p', passed: false },
    ]);

    const first = await ship(student);
    expect(first.body).toMatchObject({ shipped: true, version: 1, xpAwarded: 100 });
    const key = `projects/${child.id}`;
    const project = await t.prisma.project.findFirstOrThrow({ where: { userId: child.id } });
    expect(project.status).toBe('SHIPPED');
    expect(await storage.getText(`${key}/${project.id}/v1/index.html`)).toBe(PAGE.html);
    expect(await storage.getText(`${key}/${project.id}/v1/style.css`)).toBe(PAGE.css);

    // Shipping again makes version 2, gives no more XP, and removes version 1.
    const changed = { ...PAGE, html: '<h1>Me again</h1><p>Updated</p>' };
    const second = await ship(student, changed);
    expect(second.body).toMatchObject({ shipped: true, version: 2, xpAwarded: 0 });
    expect(second.body.portfolioItemId).toBe(first.body.portfolioItemId);
    expect(await storage.getText(`${key}/${project.id}/v1/index.html`)).toBeNull();
    expect(await storage.getText(`${key}/${project.id}/v2/index.html`)).toBe(changed.html);

    const portfolio = await t.http().get('/v1/portfolio').set(auth(student)).expect(200);
    expect(portfolio.body.items).toEqual([
      expect.objectContaining({
        id: first.body.portfolioItemId,
        title: 'My page',
        moduleTitle: 'Module one',
        version: 2,
        files: changed,
      }),
    ]);

    const overview = await t.http().get('/v1/learning/tracks').set(auth(student)).expect(200);
    const track = overview.body.tracks.find((tr: { id: string }) => tr.id === 'e2e');
    expect(track.modules[0].project).toMatchObject({ id: BRIEF, xp: 100, status: 'SHIPPED' });

    const progress = await t.http().get('/v1/progress').set(auth(student)).expect(200);
    expect(progress.body.xpTotal).toBe(100);
  });

  it('lets the parent see the portfolio, and share it only while "Public projects" is on', async () => {
    const { student, parent, child } = await family(t);
    await ship(student);
    const asParent = auth(parent.accessToken);

    const own = await t.http().get(`/v1/children/${child.id}/portfolio`).set(asParent).expect(200);
    expect(own.body.items).toHaveLength(1);
    expect(own.body.share).toEqual({ allowed: false, token: null });
    const refused = await t
      .http()
      .post(`/v1/children/${child.id}/portfolio/share-link`)
      .set(asParent)
      .expect(409);
    expect(refused.body.error).toBe('PORTFOLIO_NOT_PUBLIC');

    const setPublic = (on: boolean) =>
      t
        .http()
        .put(`/v1/children/${child.id}/consents`)
        .set(asParent)
        .send({ publicLeaderboards: false, publicPortfolio: on })
        .expect(200);
    await setPublic(true);
    const link = await t
      .http()
      .post(`/v1/children/${child.id}/portfolio/share-link`)
      .set(asParent)
      .expect(200);
    expect(link.body).toEqual({ allowed: true, token: expect.stringMatching(/^[\w-]{24}$/) });
    const token = link.body.token as string;

    // Anyone with the link sees nickname, avatar and projects — nothing else.
    const shared = await t.http().get(`/v1/shared/portfolios/${token}?lang=en`).expect(200);
    expect(shared.headers['cache-control']).toBe('no-store');
    expect(Object.keys(shared.body).toSorted()).toEqual(['avatarKey', 'items', 'nickname']);
    expect(shared.body).toMatchObject({ nickname: child.nickname, avatarKey: 'rocket' });
    expect(shared.body.items[0].files).toEqual(PAGE);
    expect(JSON.stringify(shared.body)).not.toContain(child.username);

    // "Public projects" off: the link stops working, and doesn't come back when it's on again.
    await setPublic(false);
    await t.http().get(`/v1/shared/portfolios/${token}`).expect(404);
    await setPublic(true);
    await t.http().get(`/v1/shared/portfolios/${token}`).expect(404);
    const after = await t
      .http()
      .get(`/v1/children/${child.id}/portfolio`)
      .set(asParent)
      .expect(200);
    expect(after.body.share).toEqual({ allowed: true, token: null });

    // A new link replaces the old one, and can be removed.
    const newer = await t
      .http()
      .post(`/v1/children/${child.id}/portfolio/share-link`)
      .set(asParent)
      .expect(200);
    await t.http().get(`/v1/shared/portfolios/${newer.body.token}`).expect(200);
    await t
      .http()
      .delete(`/v1/children/${child.id}/portfolio/share-link`)
      .set(asParent)
      .expect(204);
    await t.http().get(`/v1/shared/portfolios/${newer.body.token}`).expect(404);
    await t.http().get('/v1/shared/portfolios/not-a-token').expect(404);

    // Nobody else's parent can see or share it.
    const stranger = await signUpAndLogin(t);
    await t
      .http()
      .get(`/v1/children/${child.id}/portfolio`)
      .set(auth(stranger.accessToken))
      .expect(404);
    await t
      .http()
      .post(`/v1/children/${child.id}/portfolio/share-link`)
      .set(auth(stranger.accessToken))
      .expect(404);
  });

  it('removes shipped files when the child account is deleted', async () => {
    const { student, parent, child } = await family(t);
    await ship(student);
    const project = await t.prisma.project.findFirstOrThrow({ where: { userId: child.id } });
    expect(
      await storage.getText(`projects/${child.id}/${project.id}/v1/index.html`),
    ).not.toBeNull();
    await t
      .http()
      .delete(`/v1/children/${child.id}`)
      .set(auth(parent.accessToken))
      .send({ nickname: child.nickname })
      .expect(204);
    expect(await storage.getText(`projects/${child.id}/${project.id}/v1/index.html`)).toBeNull();
    expect(await t.prisma.portfolioItem.count({ where: { userId: child.id } })).toBe(0);
    // XP history stays, anonymous.
    expect(await t.prisma.xpEvent.count({ where: { userId: child.id } })).toBe(1);
  });

  it('ships one at a time, keeps only the latest version, and sweeps up after deleted students', async () => {
    const { student, parent, child } = await family(t);
    const attempts = await Promise.all(
      [0, 1, 2].map(() =>
        t
          .http()
          .post(`/v1/projects/${BRIEF}/ship`)
          .set(auth(student))
          .send({ code: PAGE, results: allPassed }),
      ),
    );
    expect(attempts.map((r) => r.status)).toContain(200);
    for (const attempt of attempts) {
      if (attempt.status !== 200) {
        expect(attempt.status).toBe(409);
        expect(attempt.body.error).toBe('SHIP_IN_PROGRESS');
      }
    }
    const project = await t.prisma.project.findFirstOrThrow({ where: { userId: child.id } });
    const item = await t.prisma.portfolioItem.findUniqueOrThrow({
      where: { projectId: project.id },
    });
    // Only the version the portfolio shows is in storage.
    for (let version = 1; version <= 3; version++) {
      const text = await storage.getText(
        `projects/${child.id}/${project.id}/v${version}/index.html`,
      );
      expect(text === null).toBe(version !== item.version);
    }

    // Files from a ship still running when the account was deleted: the sweep removes them.
    await t
      .http()
      .delete(`/v1/children/${child.id}`)
      .set(auth(parent.accessToken))
      .send({ nickname: child.nickname })
      .expect(204);
    const late = `projects/${child.id}/${project.id}/v9/index.html`;
    await storage.putText(late, '<h1>Late</h1>', 'text/html; charset=utf-8');
    expect(await t.app.get(ProjectsService).sweepDeletedStudents()).toBeGreaterThanOrEqual(1);
    expect(await storage.getText(late)).toBeNull();
  });

  it('keeps projects for students only', async () => {
    const { parent } = await family(t);
    const asParent = auth(parent.accessToken);
    await t.http().get(`/v1/projects/${BRIEF}`).set(asParent).expect(403);
    await t
      .http()
      .post(`/v1/projects/${BRIEF}/ship`)
      .set(asParent)
      .send({ code: PAGE, results: allPassed })
      .expect(403);
    await t.http().get('/v1/portfolio').set(asParent).expect(403);
    const { student } = await family(t);
    await t.http().get('/v1/projects/missing-project').set(auth(student)).expect(404);
    await t.http().get('/v1/projects/Bad_Id').set(auth(student)).expect(400);
  });
});
