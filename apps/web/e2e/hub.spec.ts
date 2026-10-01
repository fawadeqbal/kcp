import type { Page } from '@playwright/test';
import { setAge } from './database';
import { expect, test } from './fixtures';
import { createStudent, logInAsParent, logInAsStudent, MESSAGES } from './helpers';

const SANDBOX_URL = process.env.NEXT_PUBLIC_SANDBOX_URL ?? 'http://localhost:3004';
const TOKEN = 'preview-token-for-the-browser-test';
/** A 1×1 PNG. */
const DOT =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

const text = (path: string, type: string, body: string) => ({
  path,
  type,
  text: body,
  base64: null,
});

/** A milestone's site, as the API sends it: two pages, a stylesheet, a script, a picture. */
const PREVIEW = {
  projectTitle: 'A website for our bakery',
  title: 'The finished site',
  reference: 'M-2',
  submittedAt: '2026-09-05T10:00:00.000Z',
  files: [
    text(
      'index.html',
      'text/html',
      `<!doctype html><html><head><link rel="stylesheet" href="css/site.css"></head>
<body><h1 id="title">Green Leaf Bakery</h1><img id="logo" src="img/dot.png" alt="Logo">
<a href="about.html">About us</a><p id="net">waiting</p><script src="js/app.js"></script>
<script src="js/missing.js"></script><img src="img/gone.png" alt=""></body></html>`,
    ),
    text('about.html', 'text/html', '<h1 id="about">About the bakery</h1><a href="./">Home</a>'),
    text('css/site.css', 'text/css', 'h1 { color: rgb(0, 128, 0); }'),
    // The site tries to reach a server: the sandbox stops it.
    text(
      'js/app.js',
      'text/javascript',
      `const net = document.getElementById('net');
net.textContent = 'trying';
fetch('https://example.com/').then(() => { net.textContent = 'reached'; }, () => { net.textContent = 'blocked'; });`,
    ),
    { path: 'img/dot.png', type: 'image/png', text: null, base64: DOT },
  ],
};

async function servePreview(page: Page, status = 200) {
  await page.route('**/v1/shared/previews/**', (route) =>
    route.fulfill({
      status,
      headers: { 'access-control-allow-origin': '*' },
      contentType: 'application/json',
      body: JSON.stringify(status === 200 ? PREVIEW : { error: 'PREVIEW_NOT_FOUND' }),
    }),
  );
}

test('the client’s preview shows the site with its styles, pictures and pages, cut off from the network', async ({
  page,
}) => {
  const m = MESSAGES.en.hubPreview;
  const asked: string[] = [];
  page.on('request', (request) => asked.push(request.url()));
  await servePreview(page);
  await page.goto(`${SANDBOX_URL}/preview/?lang=en#${TOKEN}`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(PREVIEW.projectTitle);
  await expect(page.getByText('M-2 · The finished site')).toBeVisible();
  await expect(page.getByText(m.note)).toBeVisible();

  const site = page.frameLocator('iframe[sandbox]').frameLocator('iframe');
  await expect(site.locator('#title')).toHaveText('Green Leaf Bakery');
  // The stylesheet and the script were inlined; the picture is a data: URL.
  await expect(site.locator('#title')).toHaveCSS('color', 'rgb(0, 128, 0)');
  await expect
    .poll(() => site.locator('#logo').evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBe(1);
  await expect(site.locator('#net')).toHaveText('blocked');
  // Files the site names but doesn't have aren't asked of the sandbox's domain.
  expect(asked.filter((url) => /missing\.js|gone\.png/.test(url))).toEqual([]);

  // A link to another page of the site switches the preview's page.
  await site.getByRole('link', { name: 'About us' }).click();
  await expect(site.locator('#about')).toHaveText('About the bakery');
  await expect(page.getByLabel(m.page)).toHaveValue('about.html');
  await page.getByLabel(m.page).selectOption('index.html');
  await expect(site.locator('#title')).toBeVisible();
});

test('a link that no longer works says so, in the client’s language', async ({ page }) => {
  await servePreview(page, 404);
  await page.goto(`${SANDBOX_URL}/preview/?lang=ar#${TOKEN}`);
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByText(MESSAGES.ar.hubPreview.notFound)).toBeVisible();
});

test('a 16-year-old sees their way into the hub, and their parent sees them on the family page', async ({
  page,
  request,
}) => {
  const m = MESSAGES.en.hub;
  const student = await createStudent(request);
  await setAge(student.username, 16);

  await logInAsStudent(page, 'en', student.username);
  await page.getByRole('navigation').getByRole('link', { name: MESSAGES.en.nav.hub }).click();
  await expect(page.getByRole('heading', { level: 1, name: m.title })).toBeVisible();
  await expect(page.getByRole('heading', { name: m.stepsTitle })).toBeVisible();
  await expect(page.getByText(m.steps.AGE.title)).toBeVisible();
  await expect(page.getByText(m.steps.READINESS.title)).toBeVisible();
  await page.context().clearCookies();

  await logInAsParent(page, 'en', student.email);
  await page.goto('/en/hub');
  await expect(page.getByRole('heading', { level: 1, name: m.family.title })).toBeVisible();
  await expect(page.getByText(student.nickname)).toBeVisible();
  await page.getByRole('link', { name: m.family.open }).click();
  await expect(page).toHaveURL(/\/en\/children\/[\w-]+\/hub$/);
});
