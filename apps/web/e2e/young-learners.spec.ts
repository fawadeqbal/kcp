import { expect, test } from './fixtures';
import { under13InPakistan } from './database';
import { API_URL, createParent, isolate, logInAsParent, MESSAGES } from './helpers';
import { linkFrom, waitForEmail } from './mailpit';

/*
 * Younger children: a parent adds a 9-year-old, confirms consent by email, gives
 * them a picture password, and signs their tablet in from a phone.
 */

const m = MESSAGES.en;
const fill = (template: string, values: Record<string, string | number>) =>
  template.replaceAll(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''));
/** A tiny valid PNG (1×1), as a photo of the signed form. */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({ request }) => {
  await under13InPakistan(true);
  // The API caches feature flags for up to 30 seconds.
  const parent = await createParent(request);
  const login = await request.post(`${API_URL}/v1/auth/login`, {
    data: { email: parent.email, password: 'a long enough password 123', tokenDelivery: 'body' },
  });
  const { accessToken } = (await login.json()) as { accessToken: string };
  await expect
    .poll(
      async () => {
        const rules = await request.get(`${API_URL}/v1/children/rules`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        return ((await rules.json()) as { under13Open: boolean }).under13Open;
      },
      { timeout: 40_000, intervals: [2000] },
    )
    .toBe(true);
});

test.afterAll(async () => {
  await under13InPakistan(false);
});

test('a parent sets up a 9-year-old: consent by email, then a picture password', async ({
  page,
  request,
}) => {
  test.setTimeout(120_000);
  const parent = await createParent(request);
  await logInAsParent(page, 'en', parent.email);
  await page.goto('/en/children/new');
  const nickname = `Robo${Math.floor(Math.random() * 9000 + 1000)}`;
  await page.getByLabel(m.addChild.nickname).fill(nickname);
  await page.getByLabel(m.addChild.birthYear).selectOption(String(new Date().getUTCFullYear() - 9));
  // Under 13: nothing to share yet; the consent step comes next.
  await expect(page.getByText(m.consent.under13Next)).toBeVisible();
  await expect(page.getByText(m.addChild.sharingTitle)).toHaveCount(0);
  await page.getByLabel(m.addChild.password, { exact: true }).fill('kid pass 42');
  await page.getByRole('button', { name: m.addChild.submit }).click();

  await expect(page).toHaveURL(/\/en\/children\/[0-9a-f-]{36}\/consent$/);
  await expect(
    page.getByRole('heading', { name: fill(m.consent.title, { nickname: isolate(nickname) }) }),
  ).toBeVisible();
  await page.getByRole('button', { name: m.consent.emailButton }).click();
  await expect(page.getByText(m.consent.emailSent)).toBeVisible();
  const consentUrl = page.url();

  const mail = await waitForEmail(request, parent.email);
  await page.goto(linkFrom(mail.text, '/consent/confirm'));
  await expect(
    page.getByText(fill(m.consent.confirmedBody, { nickname: isolate(nickname) })),
  ).toBeVisible();

  // Ready: how the child signs in, and a picture password.
  await page.goto(consentUrl);
  await expect(
    page.getByRole('heading', {
      name: fill(m.consent.readyTitle, { nickname: isolate(nickname) }),
    }),
  ).toBeVisible();
  const username = (await page.getByTestId('child-username').textContent())?.trim() ?? '';
  for (const picture of ['cat', 'sun', 'tree', 'sun'] as const) {
    await page.getByRole('button', { name: m.pictures[picture], exact: true }).click();
  }
  await page.getByRole('button', { name: m.picture.save }).click();
  await expect(
    page.getByText(fill(m.picture.saved, { nickname: isolate(nickname) })),
  ).toBeVisible();

  // The child signs in with the pictures, on a device of their own.
  const tablet = await page.context().browser()!.newPage();
  await tablet.goto('/en/login/student');
  await tablet.getByRole('tab', { name: m.studentLogin.tabPictures }).click();
  await tablet.getByLabel(m.auth.student.username).fill(username);
  for (const picture of ['cat', 'sun', 'tree', 'sun'] as const) {
    await tablet.getByRole('button', { name: m.pictures[picture], exact: true }).click();
  }
  await expect(tablet).toHaveURL(/\/en\/learn$/);
  await tablet;
  await tablet.close();
});

test("a parent signs their child's tablet in from a phone", async ({ page, request, browser }) => {
  const parent = await createParent(request);
  await logInAsParent(page, 'en', parent.email);
  // A 14-year-old (no consent step), to keep this about the device.
  const login = await request.post(`${API_URL}/v1/auth/login`, {
    data: { email: parent.email, password: 'a long enough password 123', tokenDelivery: 'body' },
  });
  const { accessToken } = (await login.json()) as { accessToken: string };
  const created = await request.post(`${API_URL}/v1/children`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    data: {
      nickname: `Pairy${Math.floor(Math.random() * 9000 + 1000)}`,
      avatarKey: 'robot',
      birthYear: new Date().getUTCFullYear() - 14,
      countryCode: 'PK',
      languageCode: 'en',
      password: 'kid pass 42',
      consents: { publicLeaderboards: false, publicPortfolio: false },
    },
  });
  const child = (await created.json()) as { nickname: string };

  const tablet = await (await browser.newContext()).newPage();
  await tablet.goto('/en/login/student');
  await tablet.getByRole('tab', { name: m.studentLogin.tabPhone }).click();
  const code = (await tablet.locator('p.tracking-\\[0\\.15em\\]').textContent())?.trim() ?? '';
  expect(code).toMatch(/^[2-9A-Z]{4}-[2-9A-Z]{4}$/);
  await expect(tablet.getByRole('img', { name: m.studentLogin.pairQr })).toBeVisible();

  await page.goto(`/en/pair?code=${encodeURIComponent(code)}`);
  await expect(page.getByText(m.pair.warning)).toBeVisible();
  await page
    .getByRole('button', { name: fill(m.pair.approve, { nickname: isolate(child.nickname) }) })
    .click();
  await expect(
    page.getByText(fill(m.pair.done, { nickname: isolate(child.nickname) })),
  ).toBeVisible();

  await expect(tablet).toHaveURL(/\/en\/learn$/, { timeout: 15_000 });
  await tablet.close();
});

test('a parent sends a signed consent form for staff to check', async ({ page, request }) => {
  const parent = await createParent(request);
  await logInAsParent(page, 'en', parent.email);
  const login = await request.post(`${API_URL}/v1/auth/login`, {
    data: { email: parent.email, password: 'a long enough password 123', tokenDelivery: 'body' },
  });
  const { accessToken } = (await login.json()) as { accessToken: string };
  const created = await request.post(`${API_URL}/v1/children`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    data: {
      nickname: `Formy${Math.floor(Math.random() * 9000 + 1000)}`,
      avatarKey: 'star',
      birthYear: new Date().getUTCFullYear() - 11,
      countryCode: 'PK',
      languageCode: 'en',
      password: 'kid pass 42',
      consents: { publicLeaderboards: true, publicPortfolio: true },
    },
  });
  const child = (await created.json()) as { id: string; status: string };
  expect(child.status).toBe('PENDING_CONSENT');

  // The dashboard says what's missing.
  await page.goto('/en/dashboard');
  await expect(page.getByText(m.dashboard.consentPending)).toBeVisible();
  await page.getByRole('link', { name: m.dashboard.consentFinish }).click();
  await expect(page).toHaveURL(new RegExp(`/en/children/${child.id}/consent$`));

  // The printable form, then the upload.
  await page.getByRole('link', { name: m.consent.formOpen }).click();
  await expect(page.getByRole('heading', { name: m.consent.formPageTitle })).toBeVisible();
  await page.goBack();
  await page.getByLabel(m.consent.formFile).setInputFiles({
    name: 'form.png',
    mimeType: 'image/png',
    buffer: PNG,
  });
  await page.getByRole('button', { name: m.consent.formSend }).click();
  await expect(page.getByText(m.consent.submitted)).toBeVisible();
});
