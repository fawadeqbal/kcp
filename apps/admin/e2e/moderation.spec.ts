import type { APIRequestContext } from '@playwright/test';
import { query } from './database';
import { expect, test } from './fixtures';
import { API_URL, createFamily, createStaff, firstLogin } from './helpers';

const CHILD_PASSWORD = 'kid pass 42';

async function studentToken(request: APIRequestContext, username: string) {
  const login = await request.post(`${API_URL}/v1/auth/students/login`, {
    data: { username, password: CHILD_PASSWORD, tokenDelivery: 'body' },
  });
  return ((await login.json()) as { accessToken: string }).accessToken;
}

test('a moderator reads a report in context, mutes the student and removes the message', async ({
  page,
  request,
}) => {
  const one = await createFamily(request);
  const two = await createFamily(request);
  const [room] = await query<{ id: string }>(
    `INSERT INTO chat_rooms (id, kind, ref_id, name)
     VALUES (gen_random_uuid(), 'TEAM', gen_random_uuid()::text, 'Team Comet') RETURNING id`,
    [],
  );
  await query(
    `INSERT INTO chat_members (room_id, user_id) VALUES ($1::uuid, $2::uuid), ($1::uuid, $3::uuid)`,
    [room!.id, one.child.id, two.child.id],
  );
  const sender = await studentToken(request, one.child.username);
  const sent = await request.post(`${API_URL}/v1/rooms/${room!.id}/messages`, {
    headers: { Authorization: `Bearer ${sender}` },
    data: { text: 'Your part is the worst' },
  });
  expect(sent.status()).toBe(201);
  const { id: messageId } = (await sent.json()) as { id: string };
  const reporter = await studentToken(request, two.child.username);
  const reported = await request.post(`${API_URL}/v1/rooms/${room!.id}/reports`, {
    headers: { Authorization: `Bearer ${reporter}` },
    data: { messageId, reason: 'UNKIND' },
  });
  expect(reported.status()).toBe(201);
  // Only this report is open (earlier test runs leave theirs).
  await query(`UPDATE chat_reports SET status = 'RESOLVED' WHERE status = 'OPEN' AND id <> $1`, [
    ((await reported.json()) as { id: string }).id,
  ]);

  await firstLogin(page, createStaff('moderator'));
  await page.getByRole('link', { name: 'Room moderation' }).click();
  await expect(page.getByRole('heading', { name: 'Room moderation', level: 1 })).toBeVisible();
  await expect(page.getByLabel('Show')).toContainText('Open reports (1)');
  const card = page.locator('section').filter({ hasText: 'Unkind or rude' });
  await expect(card.getByText('Your part is the worst').first()).toBeVisible();
  await expect(card.getByRole('link', { name: one.child.nickname })).toBeVisible();
  await expect(card.getByText('In Team Comet (Team)')).toBeVisible();

  await card.getByRole('button', { name: 'Deal with this report' }).click();
  const dialog = page.getByRole('dialog', { name: `Report about ${one.child.nickname}` });
  await dialog.getByLabel(/^Mute/).check();
  await dialog.getByLabel('How long').selectOption('24');
  await expect(dialog.getByLabel('Also remove the message')).toBeChecked();
  await dialog.getByLabel('Reason').fill('Unkind to a teammate');
  await dialog.getByRole('button', { name: 'Mute' }).click();
  await expect(page.getByText(`Done: mute (${one.child.nickname}).`)).toBeVisible();
  await expect(page.getByText('No open reports.')).toBeVisible();

  const [message] = await query<{ hidden_at: Date | null }>(
    `SELECT hidden_at FROM chat_messages WHERE id = $1::uuid`,
    [messageId],
  );
  expect(message?.hidden_at).not.toBeNull();
  const muted = await request.post(`${API_URL}/v1/rooms/${room!.id}/messages`, {
    headers: { Authorization: `Bearer ${sender}` },
    data: { phrase: 'hello' },
  });
  expect(muted.status()).toBe(403);

  // Dealt with, on the student's page too; ending the mute early.
  await page.getByLabel('Show').selectOption('RESOLVED');
  await expect(page.getByText('Unkind to a teammate').first()).toBeVisible();
  await page.goto(`/users/${one.child.id}`);
  const rooms = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Rooms', exact: true }) });
  await expect(rooms.getByText(/Muted until/)).toBeVisible();
  await rooms.getByRole('button', { name: 'End the mute now' }).click();
  await expect(page.getByText('The mute ended.')).toBeVisible();
  await expect(rooms.getByText('Not muted.', { exact: false })).toBeVisible();
});

test('an admin blocks a word and tries a message against the filter', async ({ page }) => {
  const word = `blorp${Math.floor(Math.random() * 9)}x`.replaceAll(/\d/g, 'q');
  await query(`DELETE FROM blocked_terms WHERE term LIKE 'blorp%'`, []);
  await firstLogin(page, createStaff('admin'));
  await page.goto('/moderation/words');
  await expect(page.getByRole('heading', { name: 'Blocked words', level: 1 })).toBeVisible();

  await page.getByLabel('Text').fill(`what a ${word}`);
  await page.getByRole('button', { name: 'Check' }).click();
  await expect(page.getByText('This text would be sent.')).toBeVisible();

  await page.getByLabel('Word or phrase').fill(word);
  await page.getByLabel('Language').selectOption('any');
  await page.getByRole('button', { name: 'Add' }).click();
  await expect(page.getByText(word, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Check' }).click();
  await expect(page.getByText('Refused: a blocked word.')).toBeVisible();

  await page.getByLabel('Text').fill('see example.com');
  await page.getByRole('button', { name: 'Check' }).click();
  await expect(page.getByText('Refused: a link.')).toBeVisible();

  await page
    .locator('li')
    .filter({ hasText: word })
    .getByRole('button', { name: 'Remove' })
    .click();
  await page.getByRole('dialog').getByRole('button', { name: 'Remove' }).click();
  await expect(page.getByText(word, { exact: true })).toHaveCount(0);
});
