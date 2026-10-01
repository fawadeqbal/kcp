import { expect, test } from './fixtures';
import { createStaff, firstLogin } from './helpers';

test('an admin adds a school, invites a teacher, and records a licence paid by transfer', async ({
  page,
}) => {
  const stamp = Date.now().toString(36);
  await firstLogin(page, createStaff('admin'));
  await page.getByRole('link', { name: 'Schools' }).click();
  await expect(page.getByRole('heading', { name: 'Schools', level: 1 })).toBeVisible();

  await page.getByRole('button', { name: 'Add a school' }).click();
  const form = page.getByRole('dialog', { name: 'Add a school' });
  await form.getByLabel('School name').fill(`Crescent School ${stamp}`);
  await form.getByLabel('City').fill('Lahore');
  await form.getByLabel('Contact name').fill('Mrs Aslam');
  await form.getByLabel('Contact email').fill('office@crescent.test');
  await form.getByRole('button', { name: 'Add the school' }).click();
  await expect(
    page.getByRole('heading', { name: `Crescent School ${stamp}`, level: 1 }),
  ).toBeVisible();

  // A new teacher gets an invitation.
  const email = `teacher-${stamp}@school.test`;
  await page.getByRole('button', { name: 'Add a teacher' }).click();
  const invite = page.getByRole('dialog', { name: /Add a teacher/ });
  await invite.getByLabel('Email address').fill(email);
  await invite.getByLabel('Name (for a new account)').fill('Ms Aslam');
  await invite.getByRole('button', { name: 'Add the teacher' }).click();
  await expect(page.getByText(`An invitation went to ${email}.`)).toBeVisible();
  const teacherRow = page.getByRole('row', { name: /Ms Aslam/ });
  await expect(teacherRow.getByText('Invited')).toBeVisible();

  // The licence: invoiced, then paid by bank transfer, then cancelled.
  await page.getByRole('button', { name: 'Add a licence' }).click();
  const licence = page.getByRole('dialog', { name: /Add a licence/ });
  await licence.getByLabel('Invoice number').fill(`INV-${stamp}`);
  await licence.getByLabel('Seats (students)').fill('40');
  await licence.getByLabel('Amount on the invoice').fill('150,000');
  await licence.getByRole('button', { name: 'Add the licence' }).click();
  await expect(page.getByText(`Licence INV-${stamp} added.`, { exact: false })).toBeVisible();
  const row = page.getByRole('row', { name: new RegExp(`INV-${stamp}`) });
  await expect(row.getByText('Invoiced, not paid')).toBeVisible();
  await expect(row.getByText('PKR 150,000.00')).toBeVisible();

  await row.getByRole('button', { name: `Mark INV-${stamp} paid` }).click();
  const paid = page.getByRole('dialog', { name: `Mark INV-${stamp} paid` });
  await paid.getByLabel('Bank transfer reference').fill('HBL 998877');
  await paid.getByRole('button', { name: 'Mark paid' }).click();
  await expect(page.getByText(`INV-${stamp} is paid: premium started.`)).toBeVisible();
  await expect(row.getByText('Paid', { exact: true })).toBeVisible();
  await expect(row.getByText(/HBL 998877/)).toBeVisible();

  await row.getByRole('button', { name: `Cancel INV-${stamp}` }).click();
  const cancel = page.getByRole('dialog', { name: `Cancel INV-${stamp}?` });
  await cancel.getByRole('button', { name: 'Cancel the licence' }).click();
  await expect(cancel.getByText('At least 5 characters.')).toBeVisible();
  await cancel.getByLabel('Reason').fill('The school chose another term');
  await cancel.getByRole('button', { name: 'Cancel the licence' }).click();
  await expect(page.getByText(`INV-${stamp} was cancelled.`)).toBeVisible();
  await expect(row.getByText('Cancelled')).toBeVisible();
  await page.screenshot({ path: 'test-results/screens/school.png', fullPage: true });

  await page.getByRole('link', { name: 'Schools' }).first().click();
  await expect(
    page.getByRole('row', { name: new RegExp(`Crescent School ${stamp}`) }),
  ).toContainText('No paid licence');
});
