import { expect, test } from './fixtures';
import { query } from './database';
import { API_URL, createFamily, createStaff, firstLogin } from './helpers';

/** A tiny valid PNG (1×1), as a photo of the signed form. */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

test('an admin sets the consent methods of a country and approves a signed form', async ({
  page,
  request,
}) => {
  const [before] = await query<{ methods: string }>(
    `SELECT under13_consent_methods::text AS methods FROM countries WHERE code = 'PK'`,
    [],
  );
  const admin = createStaff('admin');
  await firstLogin(page, admin);

  // Countries: Pakistan accepts signed forms (the lawyer's choice, per country).
  await page.getByRole('link', { name: 'Countries and languages' }).click();
  const pakistan = page.getByRole('row', { name: /Pakistan/ });
  await pakistan.getByRole('button', { name: 'Change' }).click();
  const dialog = page.getByRole('dialog', { name: /Under-13 consent in Pakistan/ });
  await dialog.getByLabel('Signed form').check();
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(
    page.getByText(/Parents in Pakistan can confirm consent by: .*Signed form/),
  ).toBeVisible();

  try {
    // A family whose child waits for consent, with a signed form uploaded.
    const { parent, child } = await createFamily(request);
    await query(`UPDATE users SET status = 'PENDING_CONSENT' WHERE id = $1`, [child.id]);
    await query(
      `INSERT INTO parental_consent_requests (id, parent_id, child_id, policy_version, updated_at)
       SELECT gen_random_uuid(), l.parent_id, l.child_id, '2026-10', now()
       FROM parent_child_links l WHERE l.child_id = $1`,
      [child.id],
    );
    const login = await request.post(`${API_URL}/v1/auth/login`, {
      data: { email: parent.email, password: 'a long enough password 123', tokenDelivery: 'body' },
    });
    const { accessToken } = (await login.json()) as { accessToken: string };
    const upload = await request.post(`${API_URL}/v1/children/${child.id}/parental-consent/form`, {
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'image/png' },
      data: PNG,
    });
    expect(upload.status(), await upload.text()).toBe(200);

    await page.getByRole('link', { name: 'Parental consent' }).click();
    const row = page.getByRole('row', { name: new RegExp(child.nickname) });
    await expect(row.getByText('Form to check')).toBeVisible();
    const download = page.waitForEvent('download');
    await row.getByRole('button', { name: 'Download form' }).click();
    expect((await download).suggestedFilename()).toBe(`consent-${child.nickname}.png`);
    await row.getByRole('button', { name: 'Approve' }).click();
    await expect(
      page.getByText(`${child.nickname}'s account is open. The parent was emailed.`),
    ).toBeVisible();
    const [user] = await query<{ status: string }>(`SELECT status FROM users WHERE id = $1`, [
      child.id,
    ]);
    expect(user?.status).toBe('ACTIVE');
  } finally {
    await query(
      `UPDATE countries SET under13_consent_methods = $1::"Under13ConsentMethod"[] WHERE code = 'PK'`,
      [before?.methods ?? '{}'],
    );
  }
});
