import { test } from '@playwright/test';

/*
 * Full-page screenshots for a visual check of layout and right-to-left pages, saved in
 * test-results/screens/ (kept after the run; test-results is not committed).
 */
const SHOTS = [
  { path: '/en', file: 'home-en' },
  { path: '/ur', file: 'home-ur' },
  { path: '/ar/pricing', file: 'pricing-ar' },
];

for (const shot of SHOTS) {
  test(`screenshot of ${shot.path}`, async ({ page }) => {
    await page.goto(shot.path);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `test-results/screens/${shot.file}.png`, fullPage: true });
  });
}
