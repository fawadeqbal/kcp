import { directionOf } from '@kcp/i18n';
import { type Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { API_URL, createParent, isolate, logInAsParent, MESSAGES } from './helpers';

const CHILD_PASSWORD = 'kid pass 42';
const WEB_URL = process.env.WEB_URL ?? 'http://localhost:3001';

/** A nickname that passes the policy and is unique enough for repeated runs. */
const nickname = (word: string) => `${word}${Math.floor(10 + Math.random() * 90)}`;

async function readUsername(page: Page): Promise<string> {
  const username = (await page.getByTestId('child-username').textContent())?.trim() ?? '';
  expect(username).toMatch(/^[a-z]+-[a-z]+-\d{4}$/);
  return username;
}

test('a parent adds two children with different sharing settings, and a child logs in', async ({
  page,
  request,
}) => {
  const m = MESSAGES.en;
  const parent = await createParent(request);
  await logInAsParent(page, 'en', parent.email);
  await expect(page.getByText(m.dashboard.emptyTitle)).toBeVisible();
  await page.getByRole('link', { name: m.dashboard.addChild }).click();
  await expect(page).toHaveURL(/\/en\/children\/new$/);

  // First child: a suggested nickname, a robot avatar, a city, public leaderboards on.
  // The ideas load after the page: wait for them (not the "More ideas" button).
  const suggestion = page
    .getByRole('group', { name: m.addChild.ideas })
    .getByRole('button', { pressed: false })
    .first();
  await expect(suggestion).toBeVisible();
  const first = (await suggestion.textContent())?.trim() ?? '';
  await suggestion.click();
  await expect(page.getByLabel(m.addChild.nickname)).toHaveValue(first);
  await page.getByRole('radio', { name: m.avatars.robot }).check();
  await page.getByLabel(m.addChild.birthYear).selectOption({ index: 1 });
  await expect(page.getByLabel(m.addChild.country)).toHaveValue('PK');
  await page.getByLabel(m.addChild.region).selectOption({ index: 1 });
  await page.getByLabel(m.addChild.city).selectOption({ index: 1 });
  await page.getByLabel(m.addChild.password, { exact: true }).fill(CHILD_PASSWORD);
  const leaderboards = page.getByRole('switch', { name: m.consents.publicLeaderboards });
  await leaderboards.click();
  await expect(leaderboards).toHaveAttribute('aria-checked', 'true');
  await page.screenshot({ path: 'test-results/screens/add-child-en.png', fullPage: true });
  await page.getByRole('button', { name: m.addChild.submit }).click();

  await expect(
    page.getByRole('heading', {
      name: m.addChild.createdTitle.replace('{nickname}', isolate(first)),
    }),
  ).toBeVisible();
  const firstUsername = await readUsername(page);
  await page.screenshot({ path: 'test-results/screens/login-card-en.png', fullPage: true });

  // Second child: a typed nickname, nothing shared.
  await page.getByRole('button', { name: m.addChild.addAnother }).click();
  const second = nickname('CometCoder');
  await page.getByLabel(m.addChild.nickname).fill(second);
  await page.getByRole('radio', { name: m.avatars.planet }).check();
  await page.getByLabel(m.addChild.birthYear).selectOption({ index: 2 });
  await page.getByLabel(m.addChild.password, { exact: true }).fill(CHILD_PASSWORD);
  await page.getByRole('button', { name: m.addChild.submit }).click();
  await expect(
    page.getByRole('heading', {
      name: m.addChild.createdTitle.replace('{nickname}', isolate(second)),
    }),
  ).toBeVisible();

  // The dashboard shows both, each with their own settings.
  await page.getByRole('link', { name: m.addChild.backToDashboard }).click();
  const firstCard = page.getByRole('article', { name: first, exact: true });
  const secondCard = page.getByRole('article', { name: second, exact: true });
  await expect(firstCard.getByText(firstUsername)).toBeVisible();
  await firstCard.getByRole('button', { name: m.dashboard.manage }).click();
  await expect(
    firstCard.getByRole('switch', { name: m.consents.publicLeaderboards }),
  ).toHaveAttribute('aria-checked', 'true');
  await expect(firstCard.getByRole('switch', { name: m.consents.publicPortfolio })).toHaveAttribute(
    'aria-checked',
    'false',
  );
  await secondCard.getByRole('button', { name: m.dashboard.manage }).click();
  await expect(
    secondCard.getByRole('switch', { name: m.consents.publicLeaderboards }),
  ).toHaveAttribute('aria-checked', 'false');
  await secondCard.getByRole('switch', { name: m.consents.publicPortfolio }).click();
  await expect(secondCard.getByText(m.dashboard.saved)).toBeVisible();
  await page.screenshot({ path: 'test-results/screens/dashboard-children-en.png', fullPage: true });

  // Switches take effect immediately: they survive a reload.
  await page.reload();
  await secondCard.getByRole('button', { name: m.dashboard.manage }).click();
  await expect(
    secondCard.getByRole('switch', { name: m.consents.publicPortfolio }),
  ).toHaveAttribute('aria-checked', 'true');

  // On a shared family computer, the parent logs out before the child logs in.
  await page.goto('/en/login/student');
  await expect(
    page.getByText(m.auth.student.someoneSignedIn.replace('{name}', parent.name)),
  ).toBeVisible();
  await page.getByRole('main').getByRole('button', { name: m.auth.student.logOutFirst }).click();
  await page.getByLabel(m.auth.student.username).fill(firstUsername.toUpperCase());
  await page.getByLabel(m.auth.password, { exact: true }).fill(CHILD_PASSWORD);
  await page.getByRole('button', { name: m.auth.student.submit }).click();
  await expect(page).toHaveURL(/\/en\/learn$/);
  await expect(
    page.getByRole('heading', { name: m.learn.greeting.replace('{nickname}', isolate(first)) }),
  ).toBeVisible();
  await page.screenshot({ path: 'test-results/screens/learn-en.png', fullPage: true });

  // Children can't open the parent area.
  await page.goto('/en/dashboard');
  await expect(page).toHaveURL(/\/en\/learn$/);
});

test('in Urdu, a parent changes a child’s password and deletes the account', async ({
  page,
  request,
  browser,
}) => {
  const m = MESSAGES.ur;
  const parent = await createParent(request, { locale: 'ur' });
  await logInAsParent(page, 'ur', parent.email);
  await page.getByRole('link', { name: m.dashboard.addChild }).first().click();

  const child = nickname('StarCoder');
  await page.getByLabel(m.addChild.nickname).fill(child);
  await page.getByRole('radio', { name: m.avatars.moon }).check();
  await page.getByLabel(m.addChild.birthYear).selectOption({ index: 2 });
  await page.getByLabel(m.addChild.password, { exact: true }).fill(CHILD_PASSWORD);
  await expect(page.locator('html')).toHaveAttribute('dir', directionOf('ur'));
  await page.screenshot({ path: 'test-results/screens/add-child-ur.png', fullPage: true });
  await page.getByRole('button', { name: m.addChild.submit }).click();
  const username = await readUsername(page);
  await page.getByRole('link', { name: m.addChild.backToDashboard }).click();

  // A new password signs the child out everywhere.
  const card = page.getByRole('article', { name: child, exact: true });
  await card.getByRole('button', { name: m.dashboard.manage }).click();
  await card.getByRole('button', { name: m.dashboard.passwordTitle }).click();
  const passwordDialog = page.getByRole('dialog', { name: m.dashboard.passwordTitle });
  const newPassword = 'new kid pass 9';
  await passwordDialog.getByLabel(m.addChild.password, { exact: true }).fill(newPassword);
  await passwordDialog.getByRole('button', { name: m.dashboard.passwordSubmit }).click();
  await expect(
    passwordDialog.getByText(m.dashboard.passwordChanged.replace('{nickname}', isolate(child))),
  ).toBeVisible();
  await page.screenshot({ path: 'test-results/screens/dashboard-manage-ur.png', fullPage: true });
  await passwordDialog.getByRole('button', { name: m.dashboard.close }).click();
  await expect(passwordDialog).toBeHidden();

  // The child, on their own device: the old password no longer works.
  const kid = await browser.newContext({ baseURL: WEB_URL });
  const kidPage = await kid.newPage();
  await kidPage.goto('/ur/login/student');
  await kidPage.getByLabel(m.auth.student.username).fill(username);
  await kidPage.getByLabel(m.auth.password, { exact: true }).fill(CHILD_PASSWORD);
  await kidPage.getByRole('button', { name: m.auth.student.submit }).click();
  await expect(
    kidPage.getByRole('alert').filter({ hasText: m.auth.student.invalid }),
  ).toBeVisible();
  await kidPage.getByLabel(m.auth.password, { exact: true }).fill(newPassword);
  await kidPage.getByRole('button', { name: m.auth.student.submit }).click();
  await expect(kidPage).toHaveURL(/\/ur\/learn$/);
  await expect(
    kidPage.getByRole('heading', { name: m.learn.greeting.replace('{nickname}', isolate(child)) }),
  ).toBeVisible();
  await kidPage.screenshot({ path: 'test-results/screens/learn-ur.png', fullPage: true });
  await kid.close();

  // Deleting needs the nickname typed exactly (letter case aside).
  await card.getByRole('button', { name: m.dashboard.deleteButton }).click();
  const dialog = page.getByRole('dialog', {
    name: m.dashboard.deleteDialogTitle.replace('{nickname}', isolate(child)),
  });
  const confirm = dialog.getByLabel(
    m.dashboard.deleteConfirmLabel.replace('{nickname}', isolate(child)),
  );
  await confirm.fill('SomeoneElse');
  await dialog.getByRole('button', { name: m.dashboard.deleteConfirm }).click();
  await expect(dialog.getByText(m.validation.confirmMismatch)).toBeVisible();
  await page.screenshot({ path: 'test-results/screens/delete-dialog-ur.png' });
  await confirm.fill(child.toLowerCase());
  await dialog.getByRole('button', { name: m.dashboard.deleteConfirm }).click();
  await expect(
    page.getByText(m.dashboard.deleted.replace('{nickname}', isolate(child))),
  ).toBeVisible();
  await expect(page.getByText(m.dashboard.emptyTitle)).toBeVisible();

  // The deleted account can't log in any more.
  const login = await request.post(`${API_URL}/v1/auth/students/login`, {
    data: { username, password: newPassword },
  });
  expect(login.status()).toBe(401);
});

test('the nickname policy explains itself next to the field (ar)', async ({ page, request }) => {
  const m = MESSAGES.ar;
  const parent = await createParent(request, { locale: 'ar' });
  await logInAsParent(page, 'ar', parent.email);
  await page.goto('/ar/children/new');

  await page.getByLabel(m.addChild.nickname).fill('ab');
  await page.getByLabel(m.addChild.birthYear).selectOption({ index: 1 });
  await page.getByLabel(m.addChild.password, { exact: true }).fill(CHILD_PASSWORD);
  await page.getByRole('button', { name: m.addChild.submit }).click();
  await expect(page.getByText(m.validation.nickname)).toBeVisible();

  // A real first name is refused by the API, and the message lands on the same field.
  await page.getByLabel(m.addChild.nickname).fill('Ahmed');
  await page.getByRole('button', { name: m.addChild.submit }).click();
  await expect(page.getByText(m.errors.NICKNAME_LOOKS_LIKE_REAL_NAME)).toBeVisible();
  await expect(page.getByLabel(m.addChild.nickname)).toHaveAttribute('aria-invalid', 'true');
  await page.screenshot({ path: 'test-results/screens/nickname-error-ar.png', fullPage: true });
});
