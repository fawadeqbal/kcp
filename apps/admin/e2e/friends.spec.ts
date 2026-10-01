import type { APIRequestContext } from '@playwright/test';
import { expect, test } from './fixtures';
import { query } from './database';
import { API_URL, createFamily, createStaff, firstLogin } from './helpers';

const PARENT_PASSWORD = 'a long enough password 123';
const CHILD_PASSWORD = 'kid pass 42';

async function token(request: APIRequestContext, url: string, data: Record<string, string>) {
  const login = await request.post(`${API_URL}${url}`, {
    data: { ...data, tokenDelivery: 'body' },
  });
  return ((await login.json()) as { accessToken: string }).accessToken;
}

test('a moderator ends a reported friendship, with a reason', async ({ page, request }) => {
  const one = await createFamily(request);
  const two = await createFamily(request);
  // The two children become friends: one asks with the other's code, both parents approve.
  const asker = await token(request, '/v1/auth/students/login', {
    username: one.child.username,
    password: CHILD_PASSWORD,
  });
  const other = await token(request, '/v1/auth/students/login', {
    username: two.child.username,
    password: CHILD_PASSWORD,
  });
  const { code } = (await (
    await request.get(`${API_URL}/v1/friends`, { headers: { Authorization: `Bearer ${other}` } })
  ).json()) as { code: string };
  const sent = (await (
    await request.post(`${API_URL}/v1/friends/requests`, {
      headers: { Authorization: `Bearer ${asker}` },
      data: { code },
    })
  ).json()) as { id: string };
  for (const family of [one, two]) {
    const parent = await token(request, '/v1/auth/login', {
      email: family.parent.email,
      password: PARENT_PASSWORD,
    });
    const decided = await request.post(`${API_URL}/v1/friend-requests/${sent.id}/decision`, {
      headers: { Authorization: `Bearer ${parent}` },
      data: { approve: true },
    });
    expect(decided.ok()).toBe(true);
  }

  await firstLogin(page, createStaff('moderator'));
  await page.goto(`/users/${one.child.id}`);
  const card = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Friends', exact: true }) });
  await expect(card.getByRole('link', { name: two.child.nickname })).toBeVisible();
  await card.getByRole('button', { name: 'End friendship' }).click();
  const dialog = page.getByRole('dialog', {
    name: `End the friendship with ${two.child.nickname}?`,
  });
  await dialog.getByLabel('Reason').fill('Reported by a parent');
  await dialog.getByRole('button', { name: 'End friendship' }).click();
  await expect(page.getByText(`The friendship with ${two.child.nickname} ended.`)).toBeVisible();
  await expect(card.getByText('No friends.')).toBeVisible();
  const [log] = await query<{ after: { reason: string } }>(
    `SELECT after FROM audit_logs WHERE action = 'friendship.end' ORDER BY created_at DESC LIMIT 1`,
    [],
  );
  expect(log?.after.reason).toBe('Reported by a parent');
});
