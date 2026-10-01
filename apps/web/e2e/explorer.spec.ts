import type { Locator, Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { loadModule, loadProject } from './content';
import { API_URL, createStudent, logInAsStudent, MESSAGES, studentToken } from './helpers';

/*
 * The Explorer track: block lessons with Blockly and Bit's world. Blocks are dragged
 * with the mouse, as a student would.
 */

const MODULE = 'explorer/m01-meet-bit';
const LESSONS = loadModule(MODULE);
const PROJECT = loadProject(MODULE);
const m = MESSAGES.en;

/** The editor's own toolbox (the flyout) and the student's blocks on the workspace. */
const flyoutBlocks = (page: Page) =>
  page.locator(
    '.blocklyFlyout:not(.blocklyTrashcanFlyout) .blocklyBlockCanvas > .blocklyDraggable',
  );
const workspaceBlocks = (page: Page) =>
  page.locator('.blocklyMainBackground ~ .blocklyBlockCanvas .blocklyDraggable');

/** Drags a toolbox block so it snaps under `target` (its top left corner meets the bottom left). */
async function dragUnder(page: Page, block: Locator, target: Locator) {
  const from = await block.boundingBox();
  const to = await target.boundingBox();
  if (!from || !to) throw new Error('blocks not on screen');
  await page.mouse.move(from.x + 12, from.y + 12);
  await page.mouse.down();
  await page.mouse.move(from.x + 40, from.y + 30, { steps: 5 });
  await page.mouse.move(to.x + 14, to.y + to.height + 10, { steps: 12 });
  await page.mouse.up();
}

test('a student guides Bit to the flag with blocks, and sees the code', async ({
  page,
  request,
}) => {
  const student = await createStudent(request);
  await logInAsStudent(page, 'en', student.username);

  const lesson = LESSONS[0]!;
  await page.goto(`/en/learn/${lesson.id}`);
  await page.getByRole('button', { name: m.lesson.startSteps }).click();

  // The block editor and Bit's world load.
  await expect(page.locator('.blocklySvg').first()).toBeVisible();
  const world = page.getByRole('img', { name: m.explorer.stage.stage });
  await expect(world).toBeVisible();
  await expect(flyoutBlocks(page)).toHaveCount(5); // "when Run", then "move" ×4 directions

  // Checking the empty program fails, with a hint.
  await page.getByRole('button', { name: m.explorer.checkBlocks }).click();
  await expect(page.getByText(lesson.challenges[0]!.hints.en!['count_squares']!)).toBeVisible();

  // Four "move right" blocks under "when Run is clicked".
  const hat = workspaceBlocks(page).first();
  await expect(hat).toContainText('Run');
  for (let i = 0; i < 4; i++) {
    const last = workspaceBlocks(page).last();
    await dragUnder(page, flyoutBlocks(page).nth(4), last);
  }
  await expect(workspaceBlocks(page)).toHaveCount(5);

  // ▶ Run plays it: Bit reaches the flag.
  await page.getByRole('button', { name: m.explorer.run, exact: true }).click();
  await expect(page.getByText(m.explorer.stage.reachedGoal)).toBeAttached({ timeout: 15_000 });

  // "Show the code": the same program in JavaScript.
  await page.getByRole('button', { name: m.explorer.showCode }).click();
  const dialog = page.getByRole('dialog', { name: m.explorer.codeTitle });
  await expect(dialog).toContainText('moveRight();');
  await expect(dialog.getByText('moveRight();')).toHaveCount(4);
  await dialog.getByRole('button', { name: m.explorer.hideCode }).click();

  // Checking passes, and the server agrees (it runs the same checks itself).
  await page.getByRole('button', { name: m.explorer.checkBlocks }).click();
  await expect(page.getByText(m.lesson.allPassed)).toBeVisible();
  await expect(page.getByRole('button', { name: m.lesson.nextStep })).toBeVisible();

  // The program is saved: it is still there after a reload.
  await page.reload();
  await page.getByRole('tab', { name: /1/ }).first().click();
  await expect(workspaceBlocks(page)).toHaveCount(5);
});

test('the server checks block programs itself', async ({ request }) => {
  const student = await createStudent(request);
  const token = await studentToken(request, student.username);
  const challenge = LESSONS[2]!.challenges[0]!;
  const headers = { Authorization: `Bearer ${token}` };
  const submit = (blocks: unknown, passed: boolean) =>
    request.post(`${API_URL}/v1/learning/challenges/${challenge.id}/submissions`, {
      headers,
      data: {
        code: { blocks: JSON.stringify(blocks) },
        results: ['reach-flag', 'uses-repeat', 'short'].map((id) => ({ id, passed })),
      },
    });

  // Claiming every check passed doesn't help: seven "move" blocks use no loop.
  const copies = [{ when: 'run', do: Array.from({ length: 7 }, () => ({ move: 'right' })) }];
  const cheat = (await (await submit(copies, true)).json()) as {
    passed: boolean;
    results: { id: string; passed: boolean }[];
  };
  expect(cheat.passed).toBe(false);
  expect(cheat.results).toEqual([
    { id: 'reach-flag', passed: true },
    { id: 'uses-repeat', passed: false },
    { id: 'short', passed: false },
  ]);

  // The solution passes, whatever the browser said.
  const solved = (await (await submit(challenge.solution.blocks, false)).json()) as {
    passed: boolean;
  };
  expect(solved.passed).toBe(true);

  // Something that isn't a program is refused as a failure, not an error.
  const broken = await request.post(
    `${API_URL}/v1/learning/challenges/${challenge.id}/submissions`,
    {
      headers,
      data: { code: { blocks: '[{"when":"run","do":[{"eval":"alert(1)"}]}]' }, results: [] },
    },
  );
  expect(((await broken.json()) as { passed: boolean }).passed).toBe(false);
});

test('blocks and Bit speak Arabic, right to left', async ({ page, request }) => {
  const ar = MESSAGES.ar;
  const student = await createStudent(request, { locale: 'ar' });
  await logInAsStudent(page, 'ar', student.username);
  await page.goto(`/ar/learn/${LESSONS[2]!.id}`);
  await page.getByRole('button', { name: ar.lesson.startSteps }).click();
  await expect(page.locator('.blocklySvg').first()).toBeVisible();
  // The toolbox shows the Arabic "repeat" block.
  await expect(page.locator('.blocklyFlyout:not(.blocklyTrashcanFlyout)')).toContainText('كرّر');
  await expect(page.getByRole('img', { name: ar.explorer.stage.stage })).toBeVisible();
});

test('a student ships the Star catcher game and plays it in the portfolio', async ({
  page,
  request,
}) => {
  const student = await createStudent(request);
  const token = await studentToken(request, student.username);
  const shipped = await request.post(`${API_URL}/v1/projects/${PROJECT.id}/ship`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      code: { blocks: JSON.stringify(PROJECT.solution.blocks) },
      results: PROJECT.checks.map((id) => ({ id, passed: true })),
    },
  });
  expect(((await shipped.json()) as { shipped: boolean }).shipped).toBe(true);

  await logInAsStudent(page, 'en', student.username);
  await page.goto('/en/learn/portfolio');
  await expect(page.getByRole('heading', { name: PROJECT.titles.en })).toBeVisible();
  await page.getByRole('button', { name: m.explorer.run, exact: true }).click();
  await expect(page.getByText('Bit says: Catch the stars!')).toBeAttached();
  // Three steps right catch the star.
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: m.explorer.stage.right, exact: true }).click();
  }
  await expect(page.getByText('Score: 1')).toBeVisible();
  await page.getByRole('button', { name: m.explorer.stop }).click();

  // The project page opens the block editor with the shipped program.
  await page.goto(`/en/learn/projects/${PROJECT.id}`);
  await expect(page.locator('.blocklySvg').first()).toBeVisible();
  await expect(workspaceBlocks(page).first()).toBeVisible();
});
