import { expect, test } from './fixtures';
import { loadProject } from './content';
import { closeWaitingReviews, passBackgroundCheck } from './database';
import {
  API_URL,
  createAdult,
  createStudent,
  firstTwoFactorLogin,
  logInAsStudent,
  MESSAGES,
  studentToken,
} from './helpers';

const PROJECT = loadProject('builder/m01-first-website');
const fill = (template: string, values: Record<string, string | number>) =>
  template.replaceAll(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''));

test('a mentor reviews a premium project, and the student reads it in Arabic', async ({
  page,
  browser,
  request,
}) => {
  const m = MESSAGES.en;
  const ar = MESSAGES.ar;
  await closeWaitingReviews();

  // A premium student (free trial) ships the Module 1 project.
  const student = await createStudent(request, { locale: 'ar' });
  const token = await studentToken(request, student.username);
  const shipped = await request.post(`${API_URL}/v1/projects/${PROJECT.id}/ship`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      code: PROJECT.solution,
      results: PROJECT.checks.map((id) => ({ id, passed: true })),
    },
  });
  expect(((await shipped.json()) as { shipped: boolean }).shipped).toBe(true);

  // A new mentor: two-factor login, then the code of conduct before any review.
  const mentor = createAdult('mentor');
  await passBackgroundCheck(mentor.email, ['en', 'ar', 'ur']);
  await firstTwoFactorLogin(page, 'en', mentor);
  await expect(page).toHaveURL(/\/en\/mentor$/);
  await expect(page.getByRole('heading', { name: m.mentor.onboardingTitle })).toBeVisible();
  await page.getByRole('link', { name: m.mentor.conductNeeded }).click();
  await page.getByLabel(m.mentor.conductAgree).check();
  await page.getByRole('button', { name: m.mentor.conductSign }).click();
  await expect(page).toHaveURL(/\/en\/mentor$/);

  // The project waits in the queue, by nickname only.
  const row = page.getByRole('listitem').filter({ hasText: student.nickname });
  await expect(row).toBeVisible();
  await expect(page.getByText(student.username)).toHaveCount(0);
  await row.getByRole('button', { name: m.mentor.take }).click();
  await expect(page).toHaveURL(/\/en\/mentor\/reviews\/[0-9a-f-]{36}$/);

  // A comment on line 1, the rubric and a message, in the student's language.
  await page
    .getByRole('button', { name: fill(m.mentor.commentOn, { line: 1 }), exact: true })
    .click();
  await page
    .getByRole('textbox', { name: fill(m.mentor.commentOn, { line: 1 }), exact: true })
    .fill('بداية رائعة لصفحتك!');
  await page.getByRole('button', { name: m.mentor.addComment }).click();
  await expect(page.getByText('بداية رائعة لصفحتك!')).toBeVisible();
  for (const criterion of ['works', 'code', 'design', 'creativity'] as const) {
    await page
      .getByRole('group', { name: new RegExp(m.review.criteria[criterion]) })
      .getByText(`4 · ${m.mentor.score4}`)
      .click();
  }
  await page.getByLabel(m.mentor.summaryLabel).fill('أحسنت! صفحتك واضحة وجميلة.');
  await page.screenshot({ path: 'test-results/screens/mentor-review.png', fullPage: true });
  await page.getByRole('button', { name: m.mentor.approve }).click();
  await expect(page).toHaveURL(/\/en\/mentor$/);
  await expect(page.getByRole('heading', { name: m.mentor.decidedTitle })).toBeVisible();

  // The student sees it on the project page and reads it.
  const context = await browser.newContext();
  const kid = await context.newPage();
  await logInAsStudent(kid, 'ar', student.username);
  await kid.goto(`/ar/learn/projects/${PROJECT.id}`);
  await expect(kid.getByText(ar.review.status.APPROVED)).toBeVisible();
  await kid.getByRole('link', { name: ar.review.open }).click();
  await expect(kid.getByText('أحسنت! صفحتك واضحة وجميلة.')).toBeVisible();
  await expect(kid.getByText('بداية رائعة لصفحتك!')).toBeVisible();
  await expect(kid.getByText(fill(ar.review.scoreOf, { score: 4 })).first()).toBeVisible();
  await kid.screenshot({ path: 'test-results/screens/review-ar.png', fullPage: true });
  await context.close();
});
