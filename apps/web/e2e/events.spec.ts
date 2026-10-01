import type { APIRequestContext } from '@playwright/test';
import { eventWith, setEventStatus, teamCode } from './database';
import { expect, test } from './fixtures';
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
 * Hackathons: a student makes a team, a parent approves, a friend joins with the code;
 * then the team works in its repository in the browser (isomorphic-git through the
 * API's git proxy to Forgejo), opens a pull request, a teammate approves, it merges.
 */

const m = MESSAGES.en;
const fill = (template: string, values: Record<string, string | number>) =>
  template.replaceAll(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''));

async function approveAsParent(
  request: APIRequestContext,
  parentToken: string,
  teamId: string,
  username: string,
) {
  const children = (await (
    await request.get(`${API_URL}/v1/children`, {
      headers: { Authorization: `Bearer ${parentToken}` },
    })
  ).json()) as { id: string; username: string }[];
  const child = children.find((c) => c.username === username)!;
  const decided = await request.post(`${API_URL}/v1/event-requests/${teamId}/decision`, {
    headers: { Authorization: `Bearer ${parentToken}` },
    data: { childId: child.id, approve: true },
  });
  expect(decided.ok()).toBe(true);
}

test('a student makes a team, their parent approves, and a friend joins with the code', async ({
  page,
  request,
}) => {
  const event = await eventWith('OPEN');
  const captain = await createStudent(request);
  const friend = await createStudent(request);

  await logInAsStudent(page, 'en', captain.username);
  await page.getByRole('link', { name: m.nav.friends }).click();
  await page
    .getByRole('navigation', { name: m.rooms.tabsLabel })
    .getByRole('link', { name: m.rooms.tabEvents })
    .click();
  await expect(page.getByRole('heading', { level: 1, name: m.events.title })).toBeVisible();
  await page.getByRole('link', { name: new RegExp(event.slug.slice(-4)) }).click();
  await page.getByLabel(m.events.teamName).fill('Code Comets');
  await page.getByRole('button', { name: m.events.make }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Code Comets' })).toBeVisible();
  await expect(page.getByText(m.events.waitingParentLong)).toBeVisible();

  // The parent approves on the dashboard.
  const parentPage = await page.context().browser()!.newPage();
  await logInAsParent(parentPage, 'en', captain.email);
  await expect(parentPage.getByRole('heading', { name: m.parentEvents.title })).toBeVisible();
  await parentPage.getByRole('button', { name: m.parentEvents.approve }).click();
  await expect(
    parentPage.getByText(
      fill(m.parentEvents.approved, {
        nickname: isolate(captain.nickname),
        team: isolate('Code Comets'),
      }),
    ),
  ).toBeVisible();
  await parentPage.close();

  // Now in: the code to share, and the team room.
  await page.reload();
  const { id: teamId, joinCode } = await teamCode(event.slug);
  await expect(page.getByText(joinCode, { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: m.events.teamRoom })).toBeVisible();

  // The friend joins with the code (lowercase works too).
  const other = await page.context().browser()!.newPage();
  await logInAsStudent(other, 'en', friend.username);
  await other.goto(`/en/learn/events/${event.slug}`);
  await other.getByLabel(m.events.code).fill(joinCode.toLowerCase());
  await other.getByRole('button', { name: m.events.join }).click();
  await expect(other.getByRole('heading', { level: 2, name: 'Code Comets' })).toBeVisible();
  await approveAsParent(request, friend.parentToken, teamId, friend.username);
  await other.reload();
  await expect(
    other.getByText(fill(m.events.you, { nickname: isolate(friend.nickname) })),
  ).toBeVisible();
  await other.close();
});

test('the team edits in the browser, opens a pull request, a teammate approves, and it merges', async ({
  page,
  browser,
  request,
}) => {
  test.setTimeout(180_000);
  const event = await eventWith('OPEN');
  const a = await createStudent(request);
  const b = await createStudent(request);
  // The team, made through the API.
  const tokenA = await studentToken(request, a.username);
  // Only when the API has a git server (FORGEJO_URL and FORGEJO_TOKEN in its .env).
  const detail = (await (
    await request.get(`${API_URL}/v1/events/${event.slug}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    })
  ).json()) as { gitEnabled: boolean };
  test.skip(!detail.gitEnabled, 'The API has no git server (Forgejo) set up');
  const made = await request.post(`${API_URL}/v1/events/${event.slug}/teams`, {
    headers: { Authorization: `Bearer ${tokenA}` },
    data: { name: 'Pixel Pals' },
  });
  expect(made.ok()).toBe(true);
  const { id: teamId, joinCode } = await teamCode(event.slug);
  await approveAsParent(request, a.parentToken, teamId, a.username);
  const tokenB = await studentToken(request, b.username);
  expect(
    (
      await request.post(`${API_URL}/v1/events/${event.slug}/join`, {
        headers: { Authorization: `Bearer ${tokenB}` },
        data: { code: joinCode },
      })
    ).ok(),
  ).toBe(true);
  await approveAsParent(request, b.parentToken, teamId, b.username);
  await setEventStatus(event.id, 'RUNNING');

  // A edits the page in the workspace, commits and sends the branch.
  await logInAsStudent(page, 'en', a.username);
  await page.goto(`/en/learn/events/${event.slug}`);
  await page.getByRole('link', { name: m.events.workspace }).click();
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: fill(m.workspace.title, { team: isolate('Pixel Pals') }),
    }),
  ).toBeVisible({
    timeout: 30_000,
  });
  const editor = page.getByRole('textbox', {
    name: fill(m.workspace.editorLabel, { file: 'index.html' }),
  });
  await editor.click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.insertText('<h1>Pixel Pals</h1>\n<p>Our pixel art gallery.</p>\n');
  await expect(page.getByText(m.workspace.change.modified)).toBeVisible();
  await page.getByLabel(m.workspace.commitMessage).fill('Name the gallery');
  await page.getByRole('button', { name: m.workspace.commit, exact: true }).click();
  await expect(page.getByText(m.workspace.committed)).toBeVisible();
  await page.getByRole('button', { name: /Send 1 commit to the team/ }).click();
  await expect(page.getByText(m.workspace.pushed)).toBeVisible({ timeout: 30_000 });

  // A pull request.
  await page.getByLabel(m.workspace.pullName).fill('Name the gallery');
  await page.getByRole('button', { name: m.workspace.openPull }).click();
  await expect(page.getByRole('heading', { level: 1, name: /Name the gallery/ })).toBeVisible();
  await expect(page.getByText('<p>Our pixel art gallery.</p>')).toBeVisible();
  await expect(page.getByText(m.pulls.blockedReason.APPROVAL_NEEDED)).toBeVisible();
  const pullUrl = page.url();

  // B approves it.
  const other = await browser.newPage();
  await logInAsStudent(other, 'en', b.username);
  await other.goto(pullUrl.replace(/^https?:\/\/[^/]+/, ''));
  await other.getByLabel(m.pulls.commentLabel).fill('Looks great!');
  await other.getByRole('button', { name: m.pulls.approve }).click();
  await expect(other.getByText(m.pulls.approvedDone)).toBeVisible();
  await other.close();

  // A merges.
  await page.reload();
  await expect(page.getByText('Looks great!')).toBeVisible();
  await page.getByRole('button', { name: m.pulls.merge }).click();
  await expect(page.getByText(m.pulls.merged)).toBeVisible();
  await expect(page.getByText(m.events.pullState.merged, { exact: true })).toBeVisible();

  // And hands the work in.
  await page.getByRole('link', { name: m.pulls.back }).click();
  await page.getByLabel(m.events.projectTitle).fill('Pixel Pals gallery');
  await page
    .getByLabel(m.events.projectDescription)
    .fill('A gallery of our pixel art, made together.');
  await page.getByRole('button', { name: m.events.submit }).click();
  await expect(page.getByText(m.events.submitted)).toBeVisible();
});
