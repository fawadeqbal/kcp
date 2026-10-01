import { expect, type Locator, type Page } from '@playwright/test';

/** Width and height of the page's window (while full screen, of the whole screen). */
const windowSize = (page: Page) =>
  page.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight }));

/**
 * "Full screen" (inside `scope`) makes `frame` fill almost the whole screen, and "Exit
 * full screen" puts it back where it was, at the same size.
 */
export async function checkFullScreen(
  page: Page,
  {
    scope,
    frame,
    enter,
    exit,
    press = (target) => target.click(),
  }: {
    scope: Locator;
    frame: Locator;
    enter: string;
    exit: string;
    /** Click, or tap on touch screens. */
    press?: (target: Locator) => Promise<void>;
  },
) {
  const before = await frame.boundingBox();
  expect(before).not.toBeNull();
  await press(scope.getByRole('button', { name: enter, exact: true }));
  const exitButton = page.getByRole('button', { name: exit, exact: true });
  await expect(exitButton).toBeVisible();
  const screen = await windowSize(page);
  // A little room for the pane's edge and its buttons, nothing more.
  await expect
    .poll(async () => (await frame.boundingBox())?.height ?? 0)
    .toBeGreaterThan(screen.height - 140);
  expect((await frame.boundingBox())?.width ?? 0).toBeGreaterThan(screen.width - 60);
  await press(exitButton);
  await expect(scope.getByRole('button', { name: enter, exact: true })).toBeVisible();
  await expect
    .poll(async () => Math.round((await frame.boundingBox())?.height ?? 0))
    .toBe(Math.round(before!.height));
}
