import { expect, test } from './fixtures';
import { acceptedOldTerms } from './database';
import { createStudent, logInAsParent, MESSAGES, PARENT_PASSWORD } from './helpers';
import { waitForEmail } from './mailpit';

test('a parent changes their password, downloads the family’s data and deletes the account (en)', async ({
  page,
  request,
}) => {
  const m = MESSAGES.en;
  const family = await createStudent(request, { locale: 'en' });
  await logInAsParent(page, 'en', family.email);
  await page.getByRole('link', { name: m.dashboard.accountSettings }).click();
  await expect(page.getByRole('heading', { name: m.account.title, level: 1 })).toBeVisible();

  // Change the password: the current one is checked, and a common one refused.
  await page.getByLabel(m.account.currentPassword, { exact: true }).fill('wrong password 000');
  await page.getByLabel(m.account.newPassword, { exact: true }).fill('purple tiger jumps 7');
  await page.getByRole('button', { name: m.account.passwordSubmit }).click();
  await expect(page.getByText(m.errors.WRONG_PASSWORD)).toBeVisible();
  await page.getByLabel(m.account.currentPassword, { exact: true }).fill(PARENT_PASSWORD);
  await page.getByLabel(m.account.newPassword, { exact: true }).fill('Password2026!');
  await page.getByRole('button', { name: m.account.passwordSubmit }).click();
  await expect(page.getByText(m.errors.PASSWORD_TOO_WEAK)).toBeVisible();
  await page.getByLabel(m.account.newPassword, { exact: true }).fill('purple tiger jumps 7');
  await page.getByRole('button', { name: m.account.passwordSubmit }).click();
  await expect(page.getByText(m.account.passwordChanged)).toBeVisible();
  await expect
    .poll(async () => (await waitForEmail(request, family.email)).subject)
    .toContain('Your password was changed');

  // A copy of the family's data.
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: m.account.exportButton }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toBe('kids-coding-platform-data.json');
  const data = JSON.parse(
    await (await download.createReadStream()).toArray().then((c) => Buffer.concat(c).toString()),
  ) as { account: { email: string }; children: { studentProfile: { nickname: string } }[] };
  expect(data.account.email).toBe(family.email);
  expect(data.children[0]?.studentProfile.nickname).toBe(family.nickname);

  // Deleting everything needs the password.
  await page.getByRole('button', { name: m.account.deleteButton }).click();
  const dialog = page.getByRole('dialog', { name: m.account.deleteDialogTitle });
  await dialog.getByLabel(m.account.deletePassword, { exact: true }).fill('not my password 1');
  await dialog.getByRole('button', { name: m.account.deleteConfirm }).click();
  await expect(dialog.getByText(m.errors.WRONG_PASSWORD)).toBeVisible();
  await dialog.getByLabel(m.account.deletePassword, { exact: true }).fill('purple tiger jumps 7');
  await dialog.getByRole('button', { name: m.account.deleteConfirm }).click();
  await expect(page.getByText(m.account.deleted)).toBeVisible();

  // Gone: logging in again fails.
  await page.goto('/en/login');
  await page.getByLabel(m.auth.email).fill(family.email);
  await page.getByLabel(m.auth.password, { exact: true }).fill('purple tiger jumps 7');
  await page.getByRole('main').getByRole('button', { name: m.auth.login.submit }).click();
  await expect(page.getByText(m.errors.INVALID_CREDENTIALS)).toBeVisible();
});

test('parents accept new terms before going on (ar)', async ({ page, request }) => {
  const m = MESSAGES.ar;
  const family = await createStudent(request, { locale: 'ar' });
  await acceptedOldTerms(family.email);
  await logInAsParent(page, 'ar', family.email);
  await expect(page.getByRole('heading', { name: m.account.termsTitle })).toBeVisible();
  await expect(page.getByRole('heading', { name: m.dashboard.childrenTitle })).toHaveCount(0);

  // The terms stay readable meanwhile.
  await page.getByRole('main').getByRole('link', { name: m.legal.termsTitle }).click();
  await expect(page.getByRole('heading', { name: m.legal.termsTitle, level: 1 })).toBeVisible();
  await expect(page.getByText(/2026-10/)).toBeVisible();
  await page.goBack();
  // So does the account page: a parent who won't accept can take their data and leave.
  await page.getByRole('link', { name: m.account.termsDecline }).click();
  await expect(page.getByRole('heading', { name: m.account.title, level: 1 })).toBeVisible();
  await page.goBack();

  await page.getByRole('button', { name: m.account.termsAccept }).click();
  await expect(page.getByRole('heading', { name: m.dashboard.childrenTitle })).toBeVisible();
  // Once only.
  await page.reload();
  await expect(page.getByRole('heading', { name: m.dashboard.childrenTitle })).toBeVisible();
  await expect(page.getByRole('heading', { name: m.account.termsTitle })).toHaveCount(0);
});
