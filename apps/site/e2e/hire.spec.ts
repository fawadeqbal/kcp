import { expect, test } from '@playwright/test';
import { collectErrors, MESSAGES, mockApi } from './helpers';

const BRIEF = 'A small website for our bakery: the menu, opening hours and a map to find us.';

test('a business asks for a project, and confirms its email', async ({ page }) => {
  const m = MESSAGES.en.hire.form;
  const errors = collectErrors(page);
  const sent: unknown[] = [];
  await mockApi(page, '/v1/public/hub/intake', (body) => {
    sent.push(body);
    return 202;
  });
  await page.goto('/en/hire');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(MESSAGES.en.hire.title);

  // Nothing filled in: each field says what it needs, and nothing is sent.
  await page.getByRole('button', { name: m.send }).click();
  await expect(page.getByText(m.errors.name)).toBeVisible();
  await expect(page.getByText(m.errors.email)).toBeVisible();
  await expect(page.getByText(m.errors.brief)).toBeVisible();
  await expect(page.getByLabel(m.name)).toBeFocused();
  expect(sent).toEqual([]);

  await page.getByLabel(m.name).fill('Sara Ahmed');
  await page.getByLabel(m.email).fill('sara@bakery.example');
  await page.getByLabel(m.company).fill('Green Leaf Bakery');
  await page.getByLabel(m.country).selectOption('PK');
  await page.getByLabel(m.title).fill('A website for our bakery');
  await page.getByLabel(m.brief).fill(BRIEF);
  await page.getByLabel(m.budget).selectOption('FROM_2000');
  await page.getByRole('button', { name: m.send }).click();

  await expect(page.getByText(m.sentTitle)).toBeVisible();
  await expect(page.getByText('sara@bakery.example')).toBeVisible();
  expect(sent).toEqual([
    {
      contactName: 'Sara Ahmed',
      contactEmail: 'sara@bakery.example',
      company: 'Green Leaf Bakery',
      countryCode: 'PK',
      languageCode: 'en',
      title: 'A website for our bakery',
      brief: BRIEF,
      budget: 'FROM_2000',
      website: '',
    },
  ]);
  expect(errors).toEqual([]);
});

test('too many requests: the business is asked to wait', async ({ page }) => {
  const m = MESSAGES.ur.hire.form;
  await mockApi(page, '/v1/public/hub/intake', () => 429);
  await page.goto('/ur/hire');
  await page.getByLabel(m.name).fill('Sara Ahmed');
  await page.getByLabel(m.email).fill('sara@bakery.example');
  await page.getByLabel(m.company).fill('Green Leaf Bakery');
  await page.getByLabel(m.title).fill('A website for our bakery');
  await page.getByLabel(m.brief).fill(BRIEF);
  await page.getByRole('button', { name: m.send }).click();
  await expect(page.getByRole('main').getByRole('alert')).toHaveText(m.problems.tooMany);
  await expect(page.getByRole('button', { name: m.send })).toBeEnabled();
});

test('the link from the email confirms the request', async ({ page }) => {
  const m = MESSAGES.ar.hire.confirm;
  const tokens: unknown[] = [];
  await mockApi(page, '/v1/public/hub/intake/confirm', (body) => {
    tokens.push(body);
    return 200;
  });
  await page.goto('/ar/hire/confirm?token=abc-123-abc-123-abc-123');
  await expect(page.getByText(m.confirmedTitle)).toBeVisible();
  expect(tokens).toEqual([{ token: 'abc-123-abc-123-abc-123' }]);
});

test('an old link says it has expired, and leads back to the form', async ({ page }) => {
  const m = MESSAGES.en.hire.confirm;
  await mockApi(page, '/v1/public/hub/intake/confirm', () => 410);
  await page.goto('/en/hire/confirm?token=old-old-old-old-old-old');
  await expect(page.getByText(m.expiredTitle)).toBeVisible();
  await page.getByRole('main').getByRole('link', { name: m.again }).click();
  await expect(page).toHaveURL(/\/en\/hire$/);
});
