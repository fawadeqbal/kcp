import { expect, test } from '@playwright/test';
import { collectErrors, MESSAGES, mockApi } from './helpers';

test('a parent joins the waitlist', async ({ page }) => {
  const m = MESSAGES.ur.waitlist;
  const errors = collectErrors(page);
  const sent: unknown[] = [];
  await mockApi(page, '/v1/waitlist', (body) => {
    sent.push(body);
    return 202;
  });
  await page.goto('/ur/waitlist');

  // Nothing filled in: every field says what it needs, and nothing is sent.
  await page.getByRole('button', { name: m.submit }).click();
  await expect(page.getByText(m.emailRequired)).toBeVisible();
  await expect(page.getByText(m.countryRequired)).toBeVisible();
  await expect(page.getByText(m.ageRequired)).toBeVisible();
  await expect(page.getByLabel(m.email)).toBeFocused();
  expect(sent).toEqual([]);

  await page.getByLabel(m.email).fill('parent@example.com');
  await page.getByLabel(m.country).selectOption('EG');
  await page.getByLabel(m.age1316).check();
  await page.getByRole('button', { name: m.submit }).click();

  await expect(page.getByText(m.successTitle)).toBeVisible();
  await expect(page.getByText('parent@example.com')).toBeVisible();
  expect(sent).toEqual([
    { email: 'parent@example.com', countryCode: 'EG', ageBand: 'AGE_13_16', languageCode: 'ur' },
  ]);
  expect(errors).toEqual([]);
});

test('too many tries: the parent is asked to wait', async ({ page }) => {
  const m = MESSAGES.en.waitlist;
  await mockApi(page, '/v1/waitlist', () => 429);
  await page.goto('/en/waitlist');
  await page.getByLabel(m.email).fill('parent@example.com');
  await page.getByLabel(m.country).selectOption('PK');
  await page.getByLabel(m.age912).check();
  await page.getByRole('button', { name: m.submit }).click();
  await expect(page.getByRole('main').getByRole('alert')).toHaveText(m.tooMany);
  // The form stays, so the parent can try again later.
  await expect(page.getByRole('button', { name: m.submit })).toBeEnabled();
});

test('the API is down: a friendly message, not a crash', async ({ page }) => {
  const m = MESSAGES.ar.waitlist;
  await page.route('**/v1/waitlist', (route) => route.abort('connectionrefused'));
  await page.goto('/ar/waitlist');
  await page.getByLabel(m.email).fill('parent@example.com');
  await page.getByLabel(m.country).selectOption('SA');
  await page.getByLabel(m.age1316).check();
  await page.getByRole('button', { name: m.submit }).click();
  await expect(page.getByRole('main').getByRole('alert')).toHaveText(m.failed);
});

test('the link from the email confirms the address', async ({ page }) => {
  const m = MESSAGES.ar.confirm;
  const tokens: unknown[] = [];
  await mockApi(page, '/v1/waitlist/confirm', (body) => {
    tokens.push(body);
    return 200;
  });
  await page.goto('/ar/waitlist/confirm?token=abc-123');
  await expect(page.getByText(m.confirmedTitle)).toBeVisible();
  expect(tokens).toEqual([{ token: 'abc-123' }]);
});

test('an old confirmation link says it has expired', async ({ page }) => {
  const m = MESSAGES.en.confirm;
  await mockApi(page, '/v1/waitlist/confirm', () => 410);
  await page.goto('/en/waitlist/confirm?token=old');
  await expect(page.getByText(m.expiredTitle)).toBeVisible();
  await expect(
    page.getByRole('main').getByRole('link', { name: MESSAGES.en.nav.waitlist }),
  ).toBeVisible();
});

test('a confirmation link without its token says it is incomplete', async ({ page }) => {
  await page.goto('/en/waitlist/confirm');
  await expect(page.getByText(MESSAGES.en.confirm.missingTitle)).toBeVisible();
});
