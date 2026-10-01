import { expect, test } from './fixtures';
import { celebrate, createStudent, logInAsStudent, MESSAGES } from './helpers';

/*
 * Pro: git lessons in a practice repository. Commands typed in the terminal and edits
 * in the files are replayed by the same simulator here and on the server.
 */

const m = MESSAGES.en;
const fill = (template: string, values: Record<string, string | number>) =>
  template.replaceAll(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''));

test('a student starts a repository, commits, then changes a file and commits again', async ({
  page,
  request,
}) => {
  const student = await createStudent(request);
  await logInAsStudent(page, 'en', student.username);
  await page.goto('/en/learn/pro-m01-l01');
  await page.getByRole('button', { name: m.lesson.startSteps }).click();

  const terminal = page.getByRole('region', { name: m.gitLesson.terminal });
  const command = terminal.getByRole('textbox', { name: m.gitLesson.commandLabel });
  const output = terminal.getByRole('log');
  const run = async (line: string) => {
    await command.fill(line);
    await command.press('Enter');
    await expect(command).toHaveValue('');
  };

  await run('git status');
  await expect(output).toContainText('fatal: not a git repository');
  // Checking too early: hints in the list.
  await page.getByRole('button', { name: m.gitLesson.check }).click();
  await expect(page.getByText(fill(m.lesson.someFailed, { passed: 0, total: 3 }))).toBeVisible();

  await run('git init');
  await run('git status');
  await expect(output).toContainText('Untracked files:');
  await run('git add index.html');
  await run('git commit -m "Add my hobbies page"');
  await expect(output).toContainText('(root-commit)');
  await expect(terminal.getByText('main', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: m.gitLesson.check }).click();
  await expect(page.getByText(m.lesson.allPassed)).toBeVisible();
  await celebrate(page, m, ['first-steps']);

  // Step 2: edit the page, look at the diff, commit again.
  await page.getByRole('button', { name: m.lesson.nextStep }).click();
  const editor = page.getByRole('textbox', {
    name: fill(m.lesson.editorLabel, { file: 'index.html' }),
  });
  await editor.click();
  await page.keyboard.press('ControlOrMeta+End');
  await page.keyboard.insertText('\n<ul>\n  <li>Drawing robots</li>\n</ul>\n');
  await run('git diff');
  await expect(output).toContainText('+<ul>');
  await run('git commit -am "Add a list of hobbies"');
  await run('git log --oneline');
  await expect(output).toContainText('(HEAD -> main) Add a list of hobbies');
  await page.getByRole('button', { name: m.gitLesson.check }).click();
  await expect(page.getByText(m.lesson.allPassed)).toBeVisible();
});
