import type { APIRequestContext } from '@playwright/test';
import { readyMentor } from './database';
import { expect, test } from './fixtures';
import { API_URL, createFamily, createStaff, firstLogin } from './helpers';

const CHILD_PASSWORD = 'kid pass 42';

async function studentToken(request: APIRequestContext, username: string) {
  const login = await request.post(`${API_URL}/v1/auth/students/login`, {
    data: { username, password: CHILD_PASSWORD, tokenDelivery: 'body' },
  });
  return ((await login.json()) as { accessToken: string }).accessToken;
}

test('an admin plans a hackathon, gives a team a mentor, picks judges and publishes the results', async ({
  page,
  request,
}) => {
  test.setTimeout(120_000);
  const stamp = Date.now().toString(36);
  const mentor = createStaff('mentor', `Judge ${stamp}`);
  await readyMentor(mentor.email);
  const family = await createFamily(request);

  await firstLogin(page, createStaff('admin'));
  await page.getByRole('link', { name: 'Hackathons' }).click();
  await expect(page.getByRole('heading', { name: 'Hackathons', level: 1 })).toBeVisible();

  // Plan it.
  await page.getByRole('button', { name: 'Plan a hackathon' }).click();
  const form = page.getByRole('dialog', { name: 'Plan a hackathon' });
  await form.getByLabel('Title').fill(`Robot Jam ${stamp}`);
  await expect(form.getByLabel('Address')).toHaveValue(`robot-jam-${stamp}`);
  await form.getByLabel('What teams make').fill('A website about robots, made as a team.');
  await form.getByLabel('Largest team').fill('3');
  await form.getByLabel('Youngest age').fill('9');
  await form.getByRole('button', { name: 'Add a criterion' }).click();
  await form.getByRole('textbox', { name: 'Criterion 5' }).fill('Fun');
  await form.getByRole('button', { name: 'Plan it' }).click();
  await expect(page.getByRole('heading', { name: `Robot Jam ${stamp}`, level: 1 })).toBeVisible();
  await expect(page.getByText('Draft', { exact: true })).toBeVisible();
  await expect(page.getByText(/Fun \(up to 5\)/)).toBeVisible();

  // Open it: a student makes a team.
  await page.getByRole('button', { name: 'Open for teams' }).click();
  await page
    .getByRole('dialog', { name: 'Open for teams?' })
    .getByRole('button', { name: 'Open for teams' })
    .click();
  await expect(page.getByText(`Robot Jam ${stamp} is now: open for teams.`)).toBeVisible();
  const token = await studentToken(request, family.child.username);
  const made = await request.post(`${API_URL}/v1/events/robot-jam-${stamp}/teams`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { name: 'Bolt Squad' },
  });
  expect(made.ok(), await made.text()).toBe(true);
  await page.reload();
  const row = page.getByRole('row', { name: /Bolt Squad/ });
  await expect(row.getByText('Captain')).toBeVisible();
  await expect(row.getByText('Waiting for a parent')).toBeVisible();

  // A mentor for the team, and the judges.
  await row.getByRole('button', { name: 'Choose a mentor' }).click();
  const choose = page.getByRole('dialog', { name: 'Mentor for Bolt Squad' });
  await choose.getByLabel('Mentor').selectOption({ label: mentor.name });
  await choose.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText(`${mentor.name} now mentors Bolt Squad.`)).toBeVisible();
  await expect(row.getByText(mentor.name)).toBeVisible();

  await page.getByRole('button', { name: 'Start the hackathon' }).click();
  await page
    .getByRole('dialog', { name: 'Start the hackathon?' })
    .getByRole('button', { name: 'Start the hackathon' })
    .click();
  await expect(page.getByText(`Robot Jam ${stamp} is now: running.`)).toBeVisible();

  // Judging needs a judge first.
  await page.getByRole('button', { name: 'Start judging' }).click();
  const judging = page.getByRole('dialog', { name: 'Start judging?' });
  await judging.getByRole('button', { name: 'Start judging' }).click();
  await expect(judging.getByText('Add at least one judge first.')).toBeVisible();
  await judging.getByRole('button', { name: 'Cancel' }).click();
  await page.getByRole('checkbox', { name: mentor.name }).check();
  await page.getByRole('button', { name: 'Save judges' }).click();
  await expect(page.getByText('Judges saved.')).toBeVisible();
  await page.getByRole('button', { name: 'Start judging' }).click();
  await page
    .getByRole('dialog', { name: 'Start judging?' })
    .getByRole('button', { name: 'Start judging' })
    .click();
  await expect(page.getByText(`Robot Jam ${stamp} is now: judging.`)).toBeVisible();

  await page.getByRole('button', { name: 'Publish the results' }).click();
  await page
    .getByRole('dialog', { name: 'Publish the results?' })
    .getByRole('button', { name: 'Publish the results' })
    .click();
  await expect(page.getByText(`Robot Jam ${stamp} is now: finished.`)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Results' })).toBeVisible();
  await page.screenshot({ path: 'test-results/screens/hackathon.png', fullPage: true });

  // Every step is in the audit log.
  await page.getByRole('link', { name: 'Audit log' }).click();
  await expect(page.getByText('moved to the next step').first()).toBeVisible();
});

test('staff take a student out of a team, with a reason', async ({ page, request }) => {
  const stamp = Date.now().toString(36);
  const one = await createFamily(request);
  const two = await createFamily(request);
  await firstLogin(page, createStaff('admin'));
  // The signed-in admin's token, from the panel's refresh cookie.
  const refreshed = await page.request.post(`${API_URL}/v1/auth/refresh`, {
    data: { app: 'admin' },
  });
  expect(refreshed.ok()).toBe(true);
  const headers = {
    Authorization: `Bearer ${((await refreshed.json()) as { accessToken: string }).accessToken}`,
  };
  const created = await request.post(`${API_URL}/v1/admin/events`, {
    headers,
    data: {
      title: `Space Jam ${stamp}`,
      slug: `space-jam-${stamp}`,
      description: 'A website about space, made as a team.',
      startsAt: new Date().toISOString(),
      endsAt: new Date(Date.now() + 86_400_000).toISOString(),
      teamSize: 3,
      minAge: 9,
    },
  });
  expect(created.ok(), await created.text()).toBe(true);
  const { id } = (await created.json()) as { id: string };
  expect(
    (
      await request.post(`${API_URL}/v1/admin/events/${id}/status`, {
        headers,
        data: { status: 'OPEN' },
      })
    ).ok(),
  ).toBe(true);
  const tokenOne = await studentToken(request, one.child.username);
  await request.post(`${API_URL}/v1/events/space-jam-${stamp}/teams`, {
    headers: { Authorization: `Bearer ${tokenOne}` },
    data: { name: 'Star Team' },
  });
  const detail = (await (
    await request.get(`${API_URL}/v1/admin/events/${id}`, { headers })
  ).json()) as { teamList: { joinCode: string }[] };
  const code = detail.teamList[0]!.joinCode;
  const tokenTwo = await studentToken(request, two.child.username);
  const joined = await request.post(`${API_URL}/v1/events/space-jam-${stamp}/join`, {
    headers: { Authorization: `Bearer ${tokenTwo}` },
    data: { code },
  });
  expect(joined.ok(), await joined.text()).toBe(true);

  await page.goto(`/events/${id}`);
  const row = page.getByRole('row', { name: /Star Team/ });
  await row.getByRole('button', { name: `Remove ${two.child.nickname} from Star Team` }).click();
  const dialog = page.getByRole('dialog', { name: `Remove ${two.child.nickname} from Star Team?` });
  await dialog.getByRole('button', { name: 'Remove' }).click();
  await expect(dialog.getByText('Give a reason (at least 5 characters).')).toBeVisible();
  await dialog.getByLabel('Reason').fill('Asked by the parent');
  await dialog.getByRole('button', { name: 'Remove' }).click();
  await expect(page.getByText(`${two.child.nickname} was taken out of Star Team.`)).toBeVisible();
  await expect(row.getByText(two.child.nickname)).toHaveCount(0);
  await expect(row.getByText(one.child.nickname)).toBeVisible();
});
