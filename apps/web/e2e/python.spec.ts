import { type Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { loadModule } from './content';
import { celebrate, createStudent, logInAsStudent, MESSAGES, type Messages } from './helpers';

/*
 * Python lessons: Pyodide downloads once (with a progress bar), programs run in a
 * worker inside the sandbox, input() takes answers from a box, and checks run the
 * program with their own answers.
 */

const MODULE = loadModule('builder/m02-python-first-steps');

/** Replaces the program in the editor, like pasting it in. */
async function paste(page: Page, m: Messages, code: string) {
  const editor = page.getByRole('textbox', {
    name: m.lesson.editorLabel.replace('{file}', m.lesson.filePy),
  });
  await editor.click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.insertText(code);
}

/** The terminal inside the sandbox. */
const output = (page: Page, m: Messages) =>
  page.frameLocator(`iframe[title="${m.lesson.outputTitle}"]`).locator('main');

test('a student runs and checks Python programs (en)', async ({ page, request }) => {
  test.setTimeout(180_000);
  const m = MESSAGES.en;
  const student = await createStudent(request, { locale: 'en' });
  await logInAsStudent(page, 'en', student.username);
  const [lesson1, lesson2] = MODULE;
  if (!lesson1 || !lesson2) throw new Error('The Python module needs two lessons');

  await page.goto(`/en/learn/${lesson1.id}`);
  await expect(page.getByRole('tab', { name: m.lesson.filePy, exact: true })).toBeVisible();
  // Python code stays left-to-right, and gets Python highlighting.
  await expect(page.getByTestId('editor-py')).toHaveAttribute('dir', 'ltr');

  // Run: the program's output shows in the sandbox's terminal.
  const run = page.getByRole('button', { name: m.lesson.run, exact: true });
  await expect(run).not.toHaveAttribute('aria-disabled', 'true', { timeout: 60_000 });
  await paste(page, m, 'print("Hello from Python!")\nprint(6 * 7)');
  await run.click();
  await expect(output(page, m)).toContainText('Hello from Python!', { timeout: 30_000 });
  await expect(output(page, m)).toContainText('42');

  // A mistake is explained in plain words, with its line.
  await paste(page, m, 'print("hi")\nprint(score)');
  await run.click();
  await expect(page.getByText(m.lesson.pythonErrors.NameError)).toBeVisible();
  await expect(page.getByText("Line 2: NameError: name 'score' is not defined")).toBeVisible();

  // A loop that never ends is stopped, and Python starts again for the next run.
  await paste(page, m, 'while True:\n    pass');
  await run.click();
  await expect(page.getByText(m.lesson.loopError)).toBeVisible({ timeout: 20_000 });

  // Every challenge in lesson 1 passes with its solution.
  for (const [step, challenge] of lesson1.challenges.entries()) {
    if (step > 0) await page.getByRole('button', { name: m.lesson.nextStep }).click();
    await paste(page, m, challenge.solution.py ?? '');
    await page.getByRole('button', { name: m.lesson.check }).click();
    await expect(page.getByText(m.lesson.allPassed)).toBeVisible({ timeout: 30_000 });
    await celebrate(page, m, step === 0 ? ['first-steps', 'first-python'] : ['first-lesson']);
  }
  await expect(page.getByRole('heading', { name: m.lesson.lessonComplete })).toBeVisible();

  // Lesson 2, step 2: input() takes its answers from the box under the editor.
  await page.goto(`/en/learn/${lesson2.id}`);
  await page.getByRole('tab', { name: m.lesson.step.replace('{number}', '2') }).click();
  const askName = lesson2.challenges[1];
  await paste(page, m, askName?.solution.py ?? '');
  await page.getByLabel(m.lesson.pythonInput).fill('Zafir');
  await expect(run).not.toHaveAttribute('aria-disabled', 'true', { timeout: 60_000 });
  await run.click();
  await expect(output(page, m)).toContainText('Nice to meet you, Zafir!', { timeout: 30_000 });
  await page.screenshot({ path: 'test-results/screens/python-en.png', fullPage: true });

  // Without an answer, the student learns what input() needs.
  await page.getByLabel(m.lesson.pythonInput).fill('');
  await run.click();
  await expect(page.getByText(m.lesson.inputNeeded)).toBeVisible();

  // The checker types its own answers.
  await page.getByRole('button', { name: m.lesson.check }).click();
  await expect(page.getByText(m.lesson.allPassed)).toBeVisible({ timeout: 30_000 });
});
