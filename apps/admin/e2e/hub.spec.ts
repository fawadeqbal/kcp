import { readyLead } from './database';
import { expect, test } from './fixtures';
import { API_URL, createStaff, emailToken, firstLogin } from './helpers';

test('a super admin accepts a site request for a lead developer, and the project starts', async ({
  page,
  request,
}) => {
  const stamp = Date.now().toString(36);
  const title = `A website for our bakery ${stamp}`;
  const contactEmail = `client-${stamp}@bakery.test`;
  const lead = createStaff('mentor', `Lead ${stamp}`);
  await readyLead(lead.email);

  // A business asks on the site and confirms its email (the site has its own tests).
  const sent = await request.post(`${API_URL}/v1/public/hub/intake`, {
    data: {
      contactName: 'Sara Ahmed',
      contactEmail,
      company: `Green Leaf Bakery ${stamp}`,
      countryCode: 'PK',
      languageCode: 'en',
      title,
      brief: 'A small website with our menu, opening hours and a form to order cakes.',
      budget: 'FROM_500',
    },
  });
  expect(sent.status()).toBe(202);
  const token = await emailToken(request, contactEmail, /hire\/confirm\?token=([\w%-]+)/);
  const confirmed = await request.post(`${API_URL}/v1/public/hub/intake/confirm`, {
    data: { token },
  });
  expect(confirmed.ok()).toBe(true);

  await firstLogin(page, createStaff('super_admin'));
  await page.getByRole('navigation').getByRole('link', { name: 'Hub' }).click();
  await expect(page.getByRole('heading', { name: 'Hub', level: 1 })).toBeVisible();
  await page.getByRole('link', { name: new RegExp(title) }).click();
  await expect(page.getByRole('heading', { name: new RegExp(title), level: 1 })).toBeVisible();
  await expect(page.getByText(`Sara Ahmed · ${contactEmail}`)).toBeVisible();

  await page.getByRole('button', { name: 'Accept' }).click();
  const dialog = page.getByRole('dialog', { name: /^Accept / });
  await dialog.getByLabel('Lead developer').selectOption({ label: `Lead ${stamp} (0 open)` });
  await dialog.getByLabel('Currency').selectOption('USD');
  await dialog.getByRole('button', { name: 'Accept and make the project' }).click();

  await expect(page).toHaveURL(/\/hub\/projects\/[\w-]+$/);
  await expect(page.getByRole('heading', { name: new RegExp(title), level: 1 })).toBeVisible();
  await expect(page.getByText(`lead Lead ${stamp}`, { exact: false })).toBeVisible();
  await expect(page.getByText('students 50% · lead 25% · platform 25%')).toBeVisible();
  await page.screenshot({ path: 'test-results/screens/hub-project.png', fullPage: true });

  // The request is no longer waiting.
  await page.getByRole('link', { name: 'Requests' }).click();
  await expect(page.getByRole('link', { name: new RegExp(title) })).toHaveCount(0);
});
