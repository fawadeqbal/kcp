import { expect, test } from './fixtures';
import { createStaff, firstLogin } from './helpers';

test('an admin invites a mentor and records a passed background check', async ({ page }) => {
  const admin = createStaff('admin');
  await firstLogin(page, admin);
  await page.getByRole('link', { name: 'Mentors and tutors' }).click();
  await expect(page.getByRole('heading', { name: 'Mentors and tutors' })).toBeVisible();

  const stamp = Date.now();
  const email = `mentor-${stamp}@browser.test`;
  const name = `Sara ${stamp}`;
  await page.getByRole('button', { name: 'Invite a mentor' }).click();
  const invite = page.getByRole('dialog', { name: 'Invite a mentor' });
  await invite.getByLabel('Email address').fill(email);
  await invite.getByLabel('Name').fill(name);
  await invite.getByLabel('Arabic').check();
  await invite.getByRole('button', { name: 'Send the invitation' }).click();
  await expect(page.getByText(`Invitation sent to ${email}.`)).toBeVisible();

  const row = page.getByRole('row', { name: new RegExp(name) });
  await expect(row.getByText('Invited', { exact: true })).toBeVisible();
  await expect(row.getByText('Not ready')).toBeVisible();
  await row.getByRole('button', { name: 'Edit' }).click();
  const edit = page.getByRole('dialog', { name: `Edit ${name}` });
  await edit.getByLabel('Background check').selectOption('PASSED');
  await edit.getByLabel('Check note (provider, reference)').fill('Provider ref 1234');
  await edit.getByLabel('Reason').fill('Check came back clear');
  await edit.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText(`${name} was updated.`)).toBeVisible();
  await expect(row.getByText('Passed')).toBeVisible();
  // Still not reviewing: the code of conduct isn't signed yet.
  await expect(row.getByText('Code of conduct not signed')).toBeVisible();
  await page.screenshot({ path: 'test-results/screens/mentors.png', fullPage: true });
});
