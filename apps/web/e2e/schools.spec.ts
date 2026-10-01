import { AxeBuilder } from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import {
  closeWaitingReviews,
  finishProTrack,
  passBackgroundCheck,
  schoolWithTeacher,
  select,
} from './database';
import { expect, test } from './fixtures';
import {
  createAdult,
  createStudent,
  firstTwoFactorLogin,
  isolate,
  logInAsParent,
  logInAsStudent,
  MESSAGES,
} from './helpers';

/*
 * Schools: a teacher makes a class, a student joins with its code, a parent approves,
 * the teacher sets a lesson and sees progress. And the hub readiness check: a student
 * who finished the Pro track builds the brief in time, and a mentor passes it.
 */

const m = MESSAGES.en;
const fill = (template: string, values: Record<string, string | number>) =>
  template.replaceAll(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''));

async function expectAccessible(page: Page) {
  await page.waitForLoadState('networkidle');
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .exclude('iframe')
    .analyze();
  const serious = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );
  expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`)).toEqual([]);
}

test('a teacher runs a class: a code, a parent’s OK, a lesson set, and progress', async ({
  page,
  browser,
  request,
}) => {
  test.setTimeout(120_000);
  const teacher = createAdult('teacher');
  const school = await schoolWithTeacher(teacher.email, 30);
  const student = await createStudent(request);
  const [lesson] = await select<{ id: string; title: string }>(
    `SELECT l.id, t.title FROM lessons l JOIN lesson_translations t ON t.lesson_id = l.id
     WHERE l.module_id = 'builder-m01' AND t.language_code = 'en' ORDER BY l.sort_order LIMIT 1`,
    [],
  );

  // The teacher makes the class.
  await firstTwoFactorLogin(page, 'en', teacher);
  await expect(page).toHaveURL(/\/en\/teacher$/);
  await expect(page.getByRole('heading', { level: 1, name: m.teacher.title })).toBeVisible();
  await page.getByLabel(m.teacher.className).fill('Grade 7 Blue');
  await page.getByLabel(m.teacher.track).selectOption('builder');
  await page.getByRole('button', { name: m.teacher.make }).click();
  await expect(
    page.getByText(fill(m.teacher.made, { className: isolate('Grade 7 Blue') })),
  ).toBeVisible();
  await page.getByRole('link', { name: /Grade 7 Blue/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Grade 7 Blue' })).toBeVisible();
  await expect(page.getByText(school.name).first()).toBeVisible();
  const [row] = await select<{ join_code: string }>(
    `SELECT c.join_code FROM classes c JOIN users u ON u.id = c.teacher_id
     WHERE u.email = $1 ORDER BY c.created_at DESC LIMIT 1`,
    [teacher.email],
  );
  const code = row!.join_code;
  await expect(page.getByText(code, { exact: true })).toBeVisible();

  // The student joins with the code (lowercase works too) and waits for a parent.
  const kidContext = await browser.newContext();
  const kid = await kidContext.newPage();
  await logInAsStudent(kid, 'en', student.username);
  await kid.getByRole('link', { name: m.nav.friends }).click();
  await kid
    .getByRole('navigation', { name: m.rooms.tabsLabel })
    .getByRole('link', { name: m.rooms.tabClasses })
    .click();
  await expect(kid.getByRole('heading', { level: 1, name: m.classes.title })).toBeVisible();
  await kid.getByLabel(m.classes.codeLabel).fill(code.toLowerCase());
  await kid.getByRole('button', { name: m.classes.join }).click();
  await expect(
    kid.getByText(fill(m.classes.joinSent, { className: isolate('Grade 7 Blue') })),
  ).toBeVisible();
  await expect(kid.getByText(m.classes.waitingParent)).toBeVisible();

  // The parent approves on the dashboard.
  const parentContext = await browser.newContext();
  const parent = await parentContext.newPage();
  await logInAsParent(parent, 'en', student.email);
  await expect(parent.getByRole('heading', { name: m.parentClasses.title })).toBeVisible();
  await parent.getByRole('button', { name: m.parentClasses.approve }).click();
  await expect(
    parent.getByText(
      fill(m.parentClasses.approved, {
        nickname: isolate(student.nickname),
        className: isolate('Grade 7 Blue'),
      }),
    ),
  ).toBeVisible();
  await parentContext.close();

  // The teacher sees the student (with the school's premium) and sets a lesson.
  await page.reload();
  await expect(page.getByText(student.nickname).first()).toBeVisible();
  await expect(page.getByText(m.teacher.premiumBadge)).toBeVisible();
  await page.getByLabel(m.teacher.lesson).selectOption(lesson!.id);
  await page.getByLabel(m.teacher.dueDate).fill('2030-06-15');
  await page.getByRole('button', { name: m.teacher.assign }).click();
  await expect(page.getByText(m.teacher.assigned)).toBeVisible();
  await expect(page.getByText(fill(m.teacher.doneCount, { done: 0, total: 1 }))).toBeVisible();
  await expect(page.getByRole('table', { name: m.teacher.progressCaption })).toContainText(
    m.teacher.state.NOT_STARTED,
  );
  await expectAccessible(page);
  await page.screenshot({ path: 'test-results/screens/teacher-class.png', fullPage: true });

  // The student finds the lesson on the learn home and on the classes page.
  await kid.goto('/en/learn');
  const fromTeacher = kid.getByRole('region', { name: m.classes.fromTeacher });
  await expect(fromTeacher.getByRole('link', { name: new RegExp(lesson!.title) })).toBeVisible();
  await kid.goto('/en/learn/classes');
  await expect(kid.getByRole('heading', { name: m.classes.assignments })).toBeVisible();
  await expect(kid.getByRole('list', { name: m.classes.board })).toContainText(student.nickname);
  await expect(kid.getByRole('link', { name: m.classes.room })).toBeVisible();
  await kidContext.close();

  // Back on the class list.
  await page.getByRole('link', { name: m.teacher.back }).click();
  await expect(page.getByRole('link', { name: /Grade 7 Blue/ })).toBeVisible();
  await expectAccessible(page);
});

test('a student takes the hub readiness check in time, and a mentor passes it', async ({
  page,
  browser,
  request,
}) => {
  test.setTimeout(120_000);
  await closeWaitingReviews();
  const student = await createStudent(request);
  await logInAsStudent(page, 'en', student.username);
  await page.goto('/en/learn/readiness');
  await expect(page.getByRole('heading', { level: 1, name: m.readiness.title })).toBeVisible();
  await expect(page.getByText(/Finish the Pro track first/)).toBeVisible();
  await expect(page.getByRole('button', { name: m.readiness.start })).toHaveCount(0);

  await finishProTrack(student.username);
  await page.reload();
  await page.getByRole('button', { name: m.readiness.start }).click();
  await page
    .getByRole('dialog', { name: m.readiness.startConfirmTitle })
    .getByRole('button', { name: m.readiness.start })
    .click();
  await expect(page.getByRole('timer')).toContainText(/Time left: 2:59:/);

  // Build the page; it saves as the student types.
  const editor = page.getByRole('textbox', {
    name: fill(m.readiness.editorLabel, { file: 'index.html' }),
  });
  await editor.click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.insertText(
    '<header><h1>Crumbs Bakery</h1><p>Fresh bread every morning.</p></header>\n<ul><li>Bread: 100</li><li>Cake: 900</li><li>Buns: 50</li></ul>\n',
  );
  await expect(page.getByText(m.readiness.save.saved, { exact: true })).toBeVisible({
    timeout: 10_000,
  });
  await page.reload();
  await expect(page.getByRole('timer')).toBeVisible();
  await expect(page.getByText('Crumbs Bakery').first()).toBeVisible();
  await page.screenshot({ path: 'test-results/screens/readiness.png', fullPage: true });

  await page.getByRole('button', { name: m.readiness.handIn }).click();
  await page
    .getByRole('dialog', { name: m.readiness.handInConfirmTitle })
    .getByRole('button', { name: m.readiness.handIn })
    .click();
  await expect(page.getByText(m.readiness.handedIn)).toBeVisible();
  await expect(page.getByRole('heading', { name: m.readiness.waitingTitle })).toBeVisible();

  // A mentor grades it in the mentor console.
  const mentor = createAdult('mentor');
  await passBackgroundCheck(mentor.email, ['en', 'ar', 'ur']);
  const mentorContext = await browser.newContext();
  const desk = await mentorContext.newPage();
  await firstTwoFactorLogin(desk, 'en', mentor);
  await desk.getByRole('link', { name: m.mentor.conductNeeded }).click();
  await desk.getByLabel(m.mentor.conductAgree).check();
  await desk.getByRole('button', { name: m.mentor.conductSign }).click();
  const row = desk.getByRole('listitem').filter({ hasText: student.nickname });
  await expect(row).toContainText(m.mentor.readinessKind);
  await row.getByRole('button', { name: m.mentor.take }).click();
  await expect(desk.getByText('Crumbs Bakery').first()).toBeVisible();
  for (const criterion of ['works', 'code', 'design', 'independence'] as const) {
    await desk
      .getByRole('group', { name: new RegExp(m.review.criteria[criterion]) })
      .getByText(`3 · ${m.mentor.score3}`)
      .click();
  }
  await desk.getByLabel(m.mentor.summaryLabel).fill('Ready: a clear page, built on your own.');
  await desk.getByRole('button', { name: m.mentor.pass }).click();
  await expect(desk).toHaveURL(/\/en\/mentor$/);
  await mentorContext.close();

  // The student sees the result.
  await page.reload();
  await expect(page.getByText(m.readiness.blockers.PASSED)).toBeVisible();
  await expect(page.getByText(m.readiness.status.PASSED, { exact: true })).toBeVisible();
  await page.getByRole('link', { name: m.readiness.seeResult }).click();
  await expect(page.getByText('Ready: a clear page, built on your own.')).toBeVisible();
  await expect(page.getByText(m.review.readinessPassed)).toBeVisible();
});
