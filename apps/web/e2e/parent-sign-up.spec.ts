import { directionOf, type Locale, LOCALES } from '@kcp/i18n';
import ar from '@kcp/i18n/messages/ar.json' with { type: 'json' };
import en from '@kcp/i18n/messages/en.json' with { type: 'json' };
import ur from '@kcp/i18n/messages/ur.json' with { type: 'json' };
import { type Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { linkFrom, waitForEmail } from './mailpit';

const MESSAGES: Record<Locale, typeof en> = { en, ar, ur };
const PASSWORD = 'a long enough password 123';

const uniqueEmail = (locale: string) =>
  `parent-${locale}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@browser.test`;

async function fillSignUp(page: Page, m: typeof en, email: string) {
  await page.getByLabel(m.auth.signUp.name).fill('Test Parent');
  await page.getByLabel(m.auth.email).fill(email);
  await page.getByLabel(m.auth.password, { exact: true }).fill(PASSWORD);
  await page.getByLabel(m.auth.signUp.country).selectOption('PK');
  await page.getByLabel(m.auth.signUp.acceptTerms).check();
  await page.getByRole('button', { name: m.auth.signUp.submit }).click();
}

async function logIn(page: Page, m: typeof en, email: string, password = PASSWORD) {
  await page.getByLabel(m.auth.email).fill(email);
  await page.getByLabel(m.auth.password, { exact: true }).fill(password);
  await page.getByRole('main').getByRole('button', { name: m.auth.login.submit }).click();
}

for (const locale of LOCALES) {
  const m = MESSAGES[locale];

  test(`a parent signs up, confirms their email and logs in (${locale})`, async ({
    page,
    request,
  }) => {
    const email = uniqueEmail(locale);

    await page.goto(`/${locale}/sign-up`);
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(page.locator('html')).toHaveAttribute('dir', directionOf(locale));
    await expect(page.getByRole('heading', { name: m.auth.signUp.title })).toBeVisible();

    await fillSignUp(page, m, email);
    await expect(page).toHaveURL(new RegExp(`/${locale}/check-email$`));
    await expect(page.getByRole('heading', { name: m.auth.checkEmail.title })).toBeVisible();

    // The confirmation email arrives in the parent's language and links back in it.
    const mail = await waitForEmail(request, email);
    const link = linkFrom(mail.text, `/${locale}/verify-email`);
    await page.goto(link);
    await expect(page.getByText(m.auth.verify.success)).toBeVisible();

    await page.getByRole('main').getByRole('link', { name: m.nav.logIn }).click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/login$`));
    await logIn(page, m, email);

    await expect(page).toHaveURL(new RegExp(`/${locale}/dashboard$`));
    await expect(
      page.getByRole('heading', { name: m.dashboard.greeting.replace('{name}', 'Test Parent') }),
    ).toBeVisible();
    await page.screenshot({ path: `test-results/screens/dashboard-${locale}.png`, fullPage: true });

    // The session survives a reload (httpOnly refresh cookie), then logging out ends it.
    await page.reload();
    await expect(
      page.getByRole('heading', { name: m.dashboard.greeting.replace('{name}', 'Test Parent') }),
    ).toBeVisible();
    await page.getByRole('button', { name: m.nav.logOut }).click();
    await expect(page).toHaveURL(new RegExp(`/${locale}$`));
    await page.goto(`/${locale}/dashboard`);
    await expect(page).toHaveURL(new RegExp(`/${locale}/login$`));
  });
}

test('wrong passwords and unconfirmed emails get clear messages', async ({ page, request }) => {
  const m = en;
  const email = uniqueEmail('en');
  await page.goto('/en/sign-up');
  await fillSignUp(page, m, email);
  await expect(page).toHaveURL(/\/en\/check-email$/);

  await page.goto('/en/login');
  await logIn(page, m, email);
  await expect(
    page.getByRole('alert').filter({ hasText: m.errors.EMAIL_NOT_VERIFIED }),
  ).toBeVisible();

  await page.goto(linkFrom((await waitForEmail(request, email)).text, '/en/verify-email'));
  await expect(page.getByText(m.auth.verify.success)).toBeVisible();

  await page.goto('/en/login');
  await logIn(page, m, email, 'not the right password');
  await expect(
    page.getByRole('alert').filter({ hasText: m.errors.INVALID_CREDENTIALS }),
  ).toBeVisible();
});

test('a parent resets a forgotten password (ur)', async ({ page, request }) => {
  const m = ur;
  const email = uniqueEmail('ur');
  await page.goto('/ur/sign-up');
  await fillSignUp(page, m, email);
  await expect(page).toHaveURL(/\/ur\/check-email$/);
  const confirmation = await waitForEmail(request, email);

  await page.goto('/ur/forgot-password');
  await page.getByLabel(m.auth.email).fill(email);
  await page.getByRole('button', { name: m.auth.forgot.submit }).click();
  await expect(page.getByRole('status')).toBeVisible();

  // Wait for the reset email (the confirmation email arrived first).
  let resetText = '';
  await expect(async () => {
    const mail = await waitForEmail(request, email);
    expect(mail.subject).not.toBe(confirmation.subject);
    resetText = mail.text;
  }).toPass({ timeout: 15_000 });

  await page.goto(linkFrom(resetText, '/ur/reset-password'));
  const newPassword = 'another long password 789';
  await page.getByLabel(m.auth.reset.newPassword, { exact: true }).fill(newPassword);
  await page.getByRole('button', { name: m.auth.reset.submit }).click();
  await expect(page.getByText(m.auth.reset.success)).toBeVisible();

  // Opening the reset link also confirmed the email, so the parent can log in now.
  await page.getByRole('main').getByRole('link', { name: m.nav.logIn }).click();
  await logIn(page, m, email, newPassword);
  await expect(page).toHaveURL(/\/ur\/dashboard$/);
});

test('the language switcher keeps the page and mirrors the layout', async ({ page }) => {
  await page.goto('/en/login');
  await page.getByRole('button', { name: `${MESSAGES.en.nav.language}: English` }).click();
  await page.getByRole('link', { name: 'اردو' }).click();
  await expect(page).toHaveURL(/\/ur\/login$/);
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('heading', { name: ur.auth.login.title })).toBeVisible();

  // In right-to-left layouts the site name sits on the right-hand side.
  const brand = await page.getByRole('link', { name: ur.meta.title }).boundingBox();
  const viewport = page.viewportSize();
  expect(brand && viewport && brand.x > viewport.width / 2).toBe(true);
  await page.screenshot({ path: 'test-results/screens/login-ur.png' });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/ar/sign-up');
  await page.screenshot({ path: 'test-results/screens/sign-up-ar-mobile.png', fullPage: true });
});

test('visiting the site root picks a language', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/(en|ar|ur)$/);
});
