import { expect, type Page, test } from '@playwright/test';
import { endTrial, giveCertificate, joinWaitlist } from './database';
import { API_URL, createFamily, createStaff, earnXp, payByCard, totp } from './helpers';

/** First login of a new staff account: password, then setting up the authenticator. */
async function firstLogin(page: Page, staff: { email: string; password: string }) {
  await page.goto('/login');
  await page.getByLabel('Email address').fill(staff.email);
  await page.getByLabel('Password', { exact: true }).fill(staff.password);
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(
    page.getByRole('heading', { name: 'Set up two-factor authentication' }),
  ).toBeVisible();
  await expect(page.getByRole('img', { name: 'QR code for your authenticator app' })).toBeVisible();
  const secret = (await page.getByTestId('mfa-secret').textContent())?.replaceAll(' ', '') ?? '';
  await page.getByLabel('6-digit code').fill(totp(secret));
  await page.getByRole('button', { name: 'Turn on and log in' }).click();
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();
}

test('an admin sets up two-factor, suspends a parent and finds it in the audit log', async ({
  page,
  request,
}) => {
  const admin = createStaff('admin');
  const { parent, child, parentPassword } = await createFamily(request);

  await firstLogin(page, admin);
  await page.screenshot({ path: 'test-results/screens/overview.png', fullPage: true });

  // Find the parent.
  await page
    .getByRole('navigation', { name: 'Admin' })
    .getByRole('link', { name: 'Users' })
    .click();
  await page.getByLabel('Search').fill(parent.email);
  await page.getByRole('button', { name: 'Apply' }).click();
  // Searches stay out of the URL: they can hold an email or a child's username.
  await expect(page.getByRole('table').getByRole('link')).toHaveCount(1);
  expect(page.url()).not.toContain('search');
  await page.getByRole('link', { name: parent.name }).click();
  await expect(page.getByRole('heading', { name: parent.name })).toBeVisible();

  // The family links to the child, who appears by nickname only.
  await expect(page.getByRole('link', { name: child.nickname })).toBeVisible();

  // Suspend, with a reason.
  await page.getByRole('button', { name: 'Suspend account' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Reason').fill('Browser test: reported by another parent');
  await dialog.getByRole('button', { name: 'Suspend' }).click();
  await expect(page.getByText('Account suspended and signed out everywhere.')).toBeVisible();
  await expect(page.getByRole('heading', { name: parent.name })).toContainText('Suspended');
  await expect(page.getByRole('cell', { name: 'user.suspend' })).toBeVisible();
  await page.screenshot({ path: 'test-results/screens/user-suspended.png', fullPage: true });

  // The parent can't log in while suspended.
  const blocked = await request.post(`${API_URL}/v1/auth/login`, {
    data: { email: parent.email, password: parentPassword },
  });
  expect(blocked.ok()).toBe(false);
  expect(((await blocked.json()) as { error: string }).error).toBe('ACCOUNT_DISABLED');

  await page.getByRole('button', { name: 'Reactivate account' }).click();
  await dialog.getByLabel('Reason').fill('Browser test: resolved');
  await dialog.getByRole('button', { name: 'Reactivate' }).click();
  await expect(page.getByText('Account reactivated.')).toBeVisible();

  // The child's account consent is on record.
  await page
    .getByRole('navigation', { name: 'Admin' })
    .getByRole('link', { name: 'Parental consent' })
    .click();
  await page.getByLabel('Search').fill(child.username);
  await page.getByRole('button', { name: 'Apply' }).click();
  const row = page.getByRole('row').filter({ hasText: child.username });
  await expect(row).toHaveCount(1);
  await expect(row).toContainText('Account');
  await expect(row).toContainText('Active');
  await expect(row).toContainText(parent.email);
  await page.screenshot({ path: 'test-results/screens/consents.png', fullPage: true });

  // Both status changes are in the audit log, and the session survives a reload.
  await page
    .getByRole('navigation', { name: 'Admin' })
    .getByRole('link', { name: 'Audit log' })
    .click();
  await page.getByLabel('Action').fill('user.');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.getByRole('cell', { name: 'user.suspend' }).first()).toBeVisible();
  await expect(page.getByRole('cell', { name: 'user.reactivate' }).first()).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Audit log' })).toBeVisible();
  await expect(page.getByLabel('Action')).toHaveValue('user.');
  await page.screenshot({ path: 'test-results/screens/audit.png', fullPage: true });

  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/users');
  await expect(page).toHaveURL(/\/login$/);
});

test('moderators get fewer tools, and parents none', async ({ page, request }) => {
  const moderator = createStaff('moderator');
  await firstLogin(page, moderator);
  const nav = page.getByRole('navigation', { name: 'Admin' });
  await expect(nav.getByRole('link', { name: 'Users' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Audit log' })).toHaveCount(0);
  await expect(nav.getByRole('link', { name: 'Parental consent' })).toHaveCount(0);
  await expect(nav.getByRole('link', { name: 'Pilot numbers' })).toHaveCount(0);
  await expect(nav.getByRole('link', { name: 'Feedback' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Recent activity' })).toHaveCount(0);

  // Moderators can't suspend other staff: the button isn't offered.
  await page.goto('/users?role=admin');
  await page.getByRole('table').getByRole('link').first().click();
  await expect(page.getByRole('heading', { name: 'Account' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Suspend account' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Premium' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Log out' }).click();

  // Parents are turned away at the door.
  const { parent, parentPassword } = await createFamily(request);
  await page.goto('/login');
  await page.getByLabel('Email address').fill(parent.email);
  await page.getByLabel('Password', { exact: true }).fill(parentPassword);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'can’t use the admin panel' }),
  ).toBeVisible();
});

test('an admin runs the pilot: feedback, premium by hand and the five numbers', async ({
  page,
  request,
}) => {
  const admin = createStaff('admin');
  const { parent, child, parentPassword } = await createFamily(request);

  // The parent sends feedback from the main site.
  const login = await request.post(`${API_URL}/v1/auth/login`, {
    data: { email: parent.email, password: parentPassword, tokenDelivery: 'body' },
  });
  const { accessToken } = (await login.json()) as { accessToken: string };
  const message = `Browser test ${Date.now()}: my son loves the project page!`;
  const sent = await request.post(`${API_URL}/v1/feedback`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    data: { kind: 'PRAISE', message, pagePath: '/en/dashboard', languageCode: 'en' },
  });
  expect(sent.status()).toBe(201);

  await firstLogin(page, admin);
  const nav = page.getByRole('navigation', { name: 'Admin' });

  // Feedback: new messages first, marked read once handled.
  await nav.getByRole('link', { name: 'Feedback' }).click();
  await page.getByLabel('Status').selectOption('NEW');
  await page.getByRole('button', { name: 'Apply' }).click();
  const row = page.getByRole('row').filter({ hasText: message });
  await expect(row).toContainText('Praise');
  await expect(row.getByRole('link', { name: parent.name })).toBeVisible();
  await page.screenshot({ path: 'test-results/screens/feedback.png', fullPage: true });
  await row.getByRole('button', { name: /^Mark read/ }).click();
  await expect(row).toHaveCount(0);
  await page.getByLabel('Status').selectOption('READ');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.getByRole('row').filter({ hasText: message })).toContainText('Read');

  // Premium by hand: granted to the family's children, then revoked, with reasons.
  await nav.getByRole('link', { name: 'Users' }).click();
  await page.getByLabel('Search').fill(parent.email);
  await page.getByRole('button', { name: 'Apply' }).click();
  await page.getByRole('link', { name: parent.name }).click();
  const premium = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Premium', exact: true }) });
  await expect(premium.getByText('No premium yet.')).toBeVisible();
  await premium.getByLabel('Length').selectOption('3');
  await premium.getByLabel('Reason').fill('Pilot family (browser test)');
  await premium.getByRole('button', { name: 'Grant premium to every child' }).click();
  await expect(page.getByText('Premium granted for 3 months to every child.')).toBeVisible();
  await expect(premium.getByText(child.nickname)).toBeVisible();
  await expect(premium.getByText('Active', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/screens/premium.png', fullPage: true });
  await premium.getByRole('button', { name: 'Revoke' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Reason').fill('Left the pilot (browser test)');
  await dialog.getByRole('button', { name: 'Revoke' }).click();
  await expect(page.getByText('Premium revoked.')).toBeVisible();
  await expect(premium.getByText('Revoked', { exact: true })).toBeVisible();

  // The five numbers: today's new family is counted.
  await nav.getByRole('link', { name: 'Pilot numbers' }).click();
  await expect(page.getByRole('heading', { name: 'Pilot numbers' })).toBeVisible();
  const totals = page.getByRole('region', { name: /^Totals/ });
  await expect(totals.getByText('New families')).toBeVisible();
  await expect(totals.getByText('Weekly active students')).toBeVisible();
  await page.getByLabel('Country').selectOption('PK');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page).toHaveURL(/country=PK/);
  const signUps = Number(
    (await totals
      .locator('div')
      .filter({ hasText: 'New families' })
      .locator('p')
      .nth(1)
      .textContent()) ?? '0',
  );
  expect(signUps).toBeGreaterThanOrEqual(1);
  await page.getByRole('button', { name: 'Work out again' }).click();
  await expect(page.getByRole('table', { name: 'The five numbers per day' })).toBeVisible();
  await page.screenshot({ path: 'test-results/screens/pilot-numbers.png', fullPage: true });
});

test('an admin runs a season, checks the boards and takes a cheater’s XP away', async ({
  page,
  request,
}) => {
  const admin = createStaff('admin');
  const { child } = await createFamily(request, { publicLeaderboards: true });
  const earned = await earnXp(request, child.username);
  expect(earned).toBeGreaterThan(0);

  await firstLogin(page, admin);
  const nav = page.getByRole('navigation', { name: 'Admin' });
  await nav.getByRole('link', { name: 'Leaderboards' }).click();
  await expect(page.getByRole('heading', { name: 'Leaderboards', level: 1 })).toBeVisible();

  // The student's XP shows on this week's board within seconds, with their username.
  const boards = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Boards', exact: true }) });
  const row = boards.getByRole('row').filter({ hasText: child.username });
  await expect(row).toContainText(child.nickname);
  await expect(row).toContainText(String(earned));
  await boards.getByLabel('Board').selectOption('country');
  await expect(boards.getByRole('row').filter({ hasText: child.username })).toBeVisible();
  await boards.getByRole('button', { name: 'Rebuild from database' }).click();
  await expect(page.getByText('Every current board was rebuilt from the database.')).toBeVisible();
  await expect(boards.getByRole('row').filter({ hasText: child.username })).toBeVisible();

  // Seasons: one runs at a time; ending it keeps its final top 10.
  const seasons = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Seasons', exact: true }) });
  const endRunning = seasons.getByRole('button', { name: 'End now' });
  if (await endRunning.isVisible()) {
    await endRunning.click();
    await page.getByRole('dialog').getByRole('button', { name: 'End season' }).click();
    await expect(page.getByText(/ended\. Its final top 10s/)).toBeVisible();
  }
  const name = `Browser Cup ${Date.now() % 10_000}`;
  await seasons.getByLabel('Name').fill(name);
  await seasons.getByRole('button', { name: 'Start season' }).click();
  await expect(page.getByText(`Season “${name}” started.`)).toBeVisible();
  await expect(seasons.getByRole('row').filter({ hasText: name })).toContainText('Active');
  await page.screenshot({ path: 'test-results/screens/leaderboards.png', fullPage: true });
  await seasons
    .getByRole('row')
    .filter({ hasText: name })
    .getByRole('button', { name: 'End now' })
    .click();
  await page.getByRole('dialog').getByRole('button', { name: 'End season' }).click();
  await expect(seasons.getByRole('row').filter({ hasText: name })).toContainText('Ended');

  // A cheating report: XP comes off the student's total and the boards, with a reason.
  await row.getByRole('link', { name: child.nickname }).click();
  const card = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'XP and badges', exact: true }) });
  await expect(card.getByText(`${earned} XP`, { exact: true })).toBeVisible();
  await card.getByRole('button', { name: 'Remove XP' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('XP to remove').fill(String(earned));
  await dialog.getByLabel('Reason').fill('Copied answers (browser test)');
  await dialog.getByRole('button', { name: 'Remove XP' }).click();
  await expect(page.getByText(`${earned} XP removed.`)).toBeVisible();
  await expect(card.getByText('0 XP', { exact: true })).toBeVisible();
  await card.getByText(/XP history/).click();
  await expect(card.getByText('Copied answers (browser test)', { exact: false })).toBeVisible();

  // Badges staff give by hand, like "Helper", with a reason.
  await card.getByRole('button', { name: 'Give “Helper” badge' }).click();
  await page.getByRole('dialog').getByLabel('Reason').fill('Helped classmates (browser test)');
  await page.getByRole('dialog').getByRole('button', { name: 'Give badge' }).click();
  await expect(page.getByText('Badge given.')).toBeVisible();
  await card.getByRole('button', { name: 'Take back “Helper”' }).click();
  await page.getByRole('dialog').getByLabel('Reason').fill('Given by mistake (browser test)');
  await page.getByRole('dialog').getByRole('button', { name: 'Take back' }).click();
  await expect(page.getByText('Badge taken back.')).toBeVisible();

  // Off the board once the XP is gone.
  await nav.getByRole('link', { name: 'Leaderboards' }).click();
  await expect(page.getByRole('row').filter({ hasText: child.username })).toHaveCount(0);
});

test('an admin refunds a card payment (premium ends) and records a bank transfer', async ({
  page,
  request,
}) => {
  const admin = createStaff('admin');
  const { parent, child } = await createFamily(request);
  await endTrial(child.username);
  await payByCard(request, parent.email);

  await firstLogin(page, admin);
  const nav = page.getByRole('navigation', { name: 'Admin' });
  await nav.getByRole('link', { name: 'Payments' }).click();
  await page.getByLabel('Parent’s email').fill(parent.email);
  await page.getByRole('button', { name: 'Apply' }).click();
  const planRow = page.getByRole('row').filter({ hasText: parent.email });
  await expect(planRow).toContainText('Active');
  await expect(planRow).toContainText(/PKR\s1,500\.00/);
  await planRow.getByRole('link', { name: parent.email }).click();

  const card = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Plan and payments', exact: true }) });
  await expect(card.getByText('Premium (subscription)')).toBeVisible();
  await page.screenshot({ path: 'test-results/screens/family-billing.png', fullPage: true });

  // A full refund through Stripe (the mock) ends premium straight away.
  await card.getByRole('button', { name: 'Refund' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Reason').fill('Charged by mistake (browser test)');
  await dialog.getByRole('button', { name: 'Refund' }).click();
  await expect(page.getByText('Refunded in full. Premium ended.')).toBeVisible();
  await expect(card.getByText('No premium')).toBeVisible();
  await expect(card.getByText(/Charged by mistake \(browser test\)/)).toBeVisible();
  await expect(card.getByText('No plan running.')).toBeVisible();

  // A bank transfer: premium for three months.
  await card.getByLabel('Months').selectOption('3');
  await card.getByLabel('Reference').fill('HBL-778899');
  await card.getByRole('button', { name: 'Record payment' }).click();
  await expect(page.getByText('Payment recorded. Premium is on for the family.')).toBeVisible();
  await expect(card.getByText('Premium (subscription)')).toBeVisible();
  await expect(card.getByText(/PKR\s4,500\.00/).first()).toBeVisible();
  await expect(card.getByText(/HBL-778899/)).toBeVisible();
});

test('an admin reads the waitlist and revokes a certificate', async ({ page, request }) => {
  const admin = createStaff('admin');
  const email = `waiting-${Date.now()}@e2e.test`;
  await joinWaitlist(email, 'EG');
  const { child } = await createFamily(request);
  const code = `KCP-${1000 + (Date.now() % 9000)}-TEST`;
  await giveCertificate(child.username, code);

  await firstLogin(page, admin);
  const nav = page.getByRole('navigation', { name: 'Admin' });
  await nav.getByRole('link', { name: 'Waitlist' }).click();
  await expect(page.getByRole('heading', { name: 'Waitlist', level: 1 })).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: 'Egypt (EG)' })).toBeVisible();
  const entry = page.getByRole('row').filter({ hasText: email });
  await expect(entry).toContainText('9–12');
  await expect(entry).toContainText('Arabic');

  // On the student's page: the certificate, revoked with a reason.
  await page.goto(`/users/${child.id}`);
  const card = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Certificates', exact: true }) });
  await expect(card.getByRole('link', { name: code })).toBeVisible();
  await card.getByRole('button', { name: 'Revoke' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Revoke' }).click();
  await expect(dialog.getByText('Write a short reason')).toBeVisible();
  await dialog.getByLabel('Reason').fill('Copied project (browser test)');
  await dialog.getByRole('button', { name: 'Revoke' }).click();
  await expect(page.getByText(`Certificate ${code} revoked.`)).toBeVisible();
  await expect(card.getByText('Revoked')).toBeVisible();

  const verified = await request.get(`${API_URL}/v1/public/certificates/${code}`);
  expect(((await verified.json()) as { valid: boolean }).valid).toBe(false);
});

test('an admin previews and publishes content, opens a country and switches a flag', async ({
  page,
}) => {
  const admin = createStaff('admin');
  await firstLogin(page, admin);
  const nav = page.getByRole('navigation', { name: 'Admin' });

  // Content: Module 1 is published; the preview reads in Arabic too.
  await nav.getByRole('link', { name: 'Content' }).click();
  const row = page.getByRole('row').filter({ hasText: 'builder-m01' });
  await expect(row).toContainText('Published');
  await row.getByRole('link', { name: 'Preview' }).click();
  await expect(page.getByRole('heading', { name: 'Your first website', level: 1 })).toBeVisible();
  await page.getByLabel('Preview in').selectOption('ar');
  await expect(
    page.getByRole('heading', { name: 'موقعك الإلكتروني الأول', level: 1 }),
  ).toBeVisible();
  await page.screenshot({ path: 'test-results/screens/content-preview.png', fullPage: false });
  // Hide it and publish it again (the audit log keeps both).
  await page.getByRole('button', { name: 'Hide from students' }).click();
  await page.getByRole('dialog').getByLabel('Reason (optional)').fill('Browser test');
  await page.getByRole('dialog').getByRole('button', { name: 'Hide' }).click();
  await expect(page.getByText('Hidden from students.')).toBeVisible();
  await page.getByRole('button', { name: 'Publish' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Publish' }).click();
  await expect(page.getByText('Published: students see it now.')).toBeVisible();

  // Countries: prices are shown per country; a country without prices can't open.
  await nav.getByRole('link', { name: 'Countries and languages' }).click();
  const pakistan = page.getByRole('row').filter({ hasText: 'Pakistan' });
  await expect(pakistan).toContainText(/PKR\s1,500\.00/);
  await expect(page.getByRole('switch', { name: 'English on' })).toBeChecked();
  await page.getByRole('switch', { name: 'English on' }).click();
  await expect(page.getByText('English stays on: every text falls back to it.')).toBeVisible();

  // Feature flags: switch one for a country, with a reason, then back.
  await nav.getByRole('link', { name: 'Feature flags' }).click();
  const card = page.locator('section').filter({ hasText: 'under_13_accounts' });
  await card.getByRole('button', { name: 'Change' }).click();
  let dialog = page.getByRole('dialog');
  await dialog.getByLabel('On', { exact: true }).check();
  await dialog.getByLabel('In every country').uncheck();
  await dialog.getByLabel('EG').check();
  await dialog.getByLabel('Reason').fill('Browser test');
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(card).toContainText('in EG only');
  await card.getByRole('button', { name: 'Change' }).click();
  dialog = page.getByRole('dialog');
  // Back as it was: every country, and off.
  await dialog.getByLabel('In every country').check();
  await dialog.getByLabel('On', { exact: true }).uncheck();
  await dialog.getByLabel('Reason').fill('Browser test done');
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(card.getByText('Off', { exact: true })).toBeVisible();
  await expect(card).not.toContainText('EG only');
});
