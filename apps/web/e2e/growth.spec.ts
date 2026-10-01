import { expect, test } from './fixtures';
import { loadModule } from './content';
import { select, weeklyReportFor } from './database';
import {
  API_URL,
  createStudent,
  logInAsParent,
  logInAsStudent,
  MESSAGES,
  PARENT_PASSWORD,
  studentToken,
  uniqueEmail,
} from './helpers';

/*
 * Growing with families: invite links, the skill map and the weekly report.
 */

const m = MESSAGES.en;
const LESSONS = loadModule('explorer/m01-meet-bit');

const fill = (template: string, values: Record<string, string | number>) =>
  template.replaceAll(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''));

test('a parent invites another family with their link', async ({ page, browser }) => {
  const family = await createStudent(await page.context().request);
  await logInAsParent(page, 'en', family.email);
  const card = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: m.referral.title }) });
  const link = await card.getByLabel(m.referral.link).inputValue();
  expect(link).toMatch(/\/en\/sign-up\?ref=[2-9A-HJ-NP-Z]{8}$/);
  await expect(
    card.getByText(fill(m.referral.stats, { invited: 0, rewarded: 0, max: 5 })),
  ).toBeVisible();

  // The invited parent opens the link and signs up.
  const invited = await browser.newPage();
  await invited.goto(link.replace(/^https?:\/\/[^/]+/, ''));
  await expect(invited.getByText(m.auth.signUp.invited)).toBeVisible();
  const email = uniqueEmail('invited');
  await invited.getByLabel(m.auth.signUp.name).fill('Invited Parent');
  await invited.getByLabel(m.auth.email).fill(email);
  await invited.getByRole('textbox', { name: m.auth.password, exact: true }).fill(PARENT_PASSWORD);
  await invited.getByLabel(m.auth.signUp.country).selectOption('PK');
  await invited.getByLabel(m.auth.signUp.acceptTerms).check();
  await invited.getByRole('button', { name: m.auth.signUp.submit }).click();
  await expect(invited).toHaveURL(/\/en\/check-email$/);
  await invited.close();

  const rows = await select<{ status: string }>(
    `SELECT r.status FROM referrals r JOIN users u ON u.id = r.invitee_id WHERE u.email = $1`,
    [email],
  );
  expect(rows).toEqual([{ status: 'PENDING' }]);
  await page.reload();
  await expect(
    page.getByText(fill(m.referral.stats, { invited: 1, rewarded: 0, max: 5 })),
  ).toBeVisible();
});

test('a student sees the skills their lessons taught, and the parent reads the weekly report', async ({
  page,
  request,
}) => {
  const student = await createStudent(request);
  // The first Explorer lesson, finished through the API.
  const token = await studentToken(request, student.username);
  for (const challenge of LESSONS[0]!.challenges) {
    const done = await request.post(
      `${API_URL}/v1/learning/challenges/${challenge.id}/submissions`,
      {
        headers: { Authorization: `Bearer ${token}` },
        data: { code: { blocks: JSON.stringify(challenge.solution.blocks) }, results: [] },
      },
    );
    expect(((await done.json()) as { passed: boolean }).passed).toBe(true);
  }

  await logInAsStudent(page, 'en', student.username);
  await page.goto('/en/learn/badges');
  // The new badges are celebrated first, one at a time.
  const celebration = page.getByRole('dialog', { name: m.badges.celebrateTitle });
  await celebration.waitFor({ timeout: 10_000 });
  while (await celebration.isVisible()) {
    await celebration.getByRole('button', { name: m.badges.celebrateClose }).click();
    await page.waitForTimeout(500);
  }
  await page.getByRole('link', { name: m.skills.link }).click();
  await expect(page.getByRole('heading', { level: 1, name: m.skills.title })).toBeVisible();
  const learned = page.getByRole('listitem').filter({ hasText: 'Steps in order' });
  await expect(learned.getByText(m.skills.learned)).toBeAttached();
  const notYet = page.getByRole('listitem').filter({ hasText: 'Repeating (loops)' });
  await expect(notYet.getByText(m.skills.notYet)).toBeAttached();

  // Sunday evening: the parent's report.
  await weeklyReportFor(student.username, {
    key: '2026-W40',
    startDay: '2026-09-28',
    endDay: '2026-10-05',
  });
  await page.context().clearCookies();
  await logInAsParent(page, 'en', student.email);
  await page.getByRole('link', { name: m.reports.dashboardLink }).click();
  await expect(page.getByRole('heading', { level: 1, name: m.reports.title })).toBeVisible();
  const card = page.locator('section').filter({ hasText: student.nickname });
  await expect(card.getByText(fill(m.reports.minutes, { minutes: 42 }))).toBeVisible();
  await expect(
    card.getByText(fill(m.reports.league, { tier: m.league.tiers.silver })),
  ).toBeVisible();
  await expect(card.getByText('Steps in order')).toBeVisible();
  await page.screenshot({ path: 'test-results/screens/weekly-report-en.png', fullPage: true });
});
