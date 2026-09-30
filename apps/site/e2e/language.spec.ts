import { expect, test } from '@playwright/test';
import { MESSAGES } from './helpers';

test('the language switcher keeps the current page', async ({ page }) => {
  await page.goto('/en/tracks');
  const switcher = page
    .getByRole('banner')
    .getByRole('navigation', { name: MESSAGES.en.nav.language });

  await switcher.getByRole('link', { name: 'العربية' }).click();
  await expect(page).toHaveURL(/\/ar\/tracks$/);
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(MESSAGES.ar.tracks.title);

  await page
    .getByRole('banner')
    .getByRole('navigation', { name: MESSAGES.ar.nav.language })
    .getByRole('link', { name: 'اردو' })
    .click();
  await expect(page).toHaveURL(/\/ur\/tracks$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'ur');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(MESSAGES.ur.tracks.title);
});

test('switching language on a blog post opens the same post', async ({ page }) => {
  await page.goto('/ur/blog/first-website');
  await page
    .getByRole('banner')
    .getByRole('navigation', { name: MESSAGES.ur.nav.language })
    .getByRole('link', { name: 'English' })
    .click();
  await expect(page).toHaveURL(/\/en\/blog\/first-website$/);
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Module 1');
});

test('the current language is marked in the switcher', async ({ page }) => {
  await page.goto('/ar/faq');
  const current = page
    .getByRole('banner')
    .getByRole('navigation', { name: MESSAGES.ar.nav.language })
    .getByRole('link', { name: 'العربية' });
  await expect(current).toHaveAttribute('aria-current', 'true');
  await expect(current).toHaveAttribute('lang', 'ar');
});
