import type { APIRequestContext } from '@playwright/test';
import { expect, test } from './fixtures';
import { loadModule } from './content';
import {
  API_URL,
  createStudent,
  isolate,
  logInAsParent,
  logInAsStudent,
  MESSAGES,
  studentToken,
} from './helpers';

/*
 * Friends (a parent of each child approves) and leagues (about 30 students of the same
 * league compete on this week's XP).
 */

const m = MESSAGES.en;
const LESSONS = loadModule('explorer/m01-meet-bit');

const fill = (template: string, values: Record<string, string | number>) =>
  template.replaceAll(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''));

/** Earns a student some XP through the API: an Explorer step solved. */
async function earnXp(request: APIRequestContext, username: string) {
  const token = await studentToken(request, username);
  const challenge = LESSONS[0]!.challenges[0]!;
  const done = await request.post(`${API_URL}/v1/learning/challenges/${challenge.id}/submissions`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { code: { blocks: JSON.stringify(challenge.solution.blocks) }, results: [] },
  });
  expect(((await done.json()) as { passed: boolean }).passed).toBe(true);
}

test('two children become friends once both parents approve, and meet in their league', async ({
  page,
  browser,
  request,
}) => {
  const a = await createStudent(request);
  const b = await createStudent(request);

  // A's friend code, on the friends page.
  await logInAsStudent(page, 'en', a.username);
  await page.getByRole('link', { name: m.nav.friends }).click();
  await expect(page.getByRole('heading', { level: 1, name: m.friends.title })).toBeVisible();
  const shown = await page.getByText(/^[2-9A-Z]{3} [2-9A-Z]{3}$/).textContent();
  const code = shown!.replace(' ', '');

  // B adds A on their own friends page.
  const other = await browser.newPage();
  await logInAsStudent(other, 'en', b.username);
  await other.goto('/en/learn/friends');
  await other.getByLabel(m.friends.codeLabel).fill(code.toLowerCase());
  await other.getByRole('button', { name: m.friends.send }).click();
  await expect(
    other.getByText(fill(m.friends.sent, { nickname: isolate(a.nickname) })),
  ).toBeVisible();
  await expect(
    other.getByText(fill(m.friends.youAsked, { nickname: isolate(a.nickname) })),
  ).toBeVisible();
  await other.close();

  // A's parent approves on the dashboard; B's parent from their phone (the API).
  const parent = await browser.newPage();
  await logInAsParent(parent, 'en', a.email);
  const friendRequest = parent.getByRole('listitem').filter({
    hasText: fill(m.parentFriends.received, {
      other: isolate(b.nickname),
      child: isolate(a.nickname),
    }),
  });
  await friendRequest.getByRole('button', { name: m.parentFriends.approve }).click();
  await expect(parent.getByText(m.parentFriends.approved)).toBeVisible();
  await parent.close();
  const pending = (await (
    await request.get(`${API_URL}/v1/friend-requests`, {
      headers: { Authorization: `Bearer ${b.parentToken}` },
    })
  ).json()) as { id: string }[];
  const decided = await request.post(`${API_URL}/v1/friend-requests/${pending[0]!.id}/decision`, {
    headers: { Authorization: `Bearer ${b.parentToken}` },
    data: { approve: true },
  });
  expect(((await decided.json()) as { status: string }).status).toBe('APPROVED');

  // Friends now: both earn XP this week and meet on the friends board…
  await earnXp(request, a.username);
  await earnXp(request, b.username);
  await page.reload();
  const board = page.getByRole('region', { name: m.friends.boardTitle });
  await expect(board.getByRole('listitem')).toHaveCount(2);
  await expect(board.getByText(b.nickname, { exact: true })).toBeVisible();

  // …and in their league group, where B shows by name (a friend) though their parent
  // keeps them off public boards.
  await page.getByRole('link', { name: m.nav.league }).click();
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: fill(m.league.tierName, { tier: m.league.tiers.bronze }),
    }),
  ).toBeVisible();
  const row = page.getByRole('row').filter({ hasText: b.nickname });
  await expect(row.getByText(m.league.friend, { exact: true })).toBeVisible();
  await expect(page.locator('tr[aria-current="true"]')).toContainText(a.nickname);
  await page.screenshot({ path: 'test-results/screens/league-en.png', fullPage: true });
});
