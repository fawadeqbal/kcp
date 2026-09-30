import { expect, test } from '@playwright/test';
import { LOCALES, MESSAGES, PAGES } from './helpers';

// The smallest phones in use: 360 CSS pixels wide.
test.use({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true });

for (const locale of LOCALES) {
  test(`no page scrolls sideways at 360px in ${locale}`, async ({ page }) => {
    for (const path of PAGES) {
      await page.goto(`/${locale}${path}`);
      await page.evaluate(() => document.fonts.ready);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `/${locale}${path} is wider than the screen`).toBeLessThanOrEqual(0);
    }
  });
}

test('the menu opens on a phone and closes after choosing a page', async ({ page }) => {
  const m = MESSAGES.ar.nav;
  await page.goto('/ar');
  const menu = page.getByRole('button', { name: m.menu });
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await page
    .getByRole('navigation', { name: m.main })
    .getByRole('link', { name: m.tracks })
    .click();
  await expect(page).toHaveURL(/\/ar\/tracks$/);
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(MESSAGES.ar.tracks.title);
});
