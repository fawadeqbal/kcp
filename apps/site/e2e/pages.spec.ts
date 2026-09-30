import { expect, test } from '@playwright/test';
import { collectErrors, LOCALES, MESSAGES, PAGES } from './helpers';

for (const locale of LOCALES) {
  test.describe(`pages in ${locale}`, () => {
    for (const path of PAGES) {
      test(`${path || '/'} renders with the right language and one heading`, async ({ page }) => {
        const errors = collectErrors(page);
        const response = await page.goto(`/${locale}${path}`);
        expect(response?.status()).toBe(200);

        const html = page.locator('html');
        await expect(html).toHaveAttribute('lang', locale);
        await expect(html).toHaveAttribute('dir', locale === 'en' ? 'ltr' : 'rtl');
        await expect(page.locator('h1')).toHaveCount(1);
        await expect(page.locator('h1')).toBeVisible();

        await expect(page.getByRole('banner')).toBeVisible();
        await expect(page.getByRole('main')).toBeVisible();
        await expect(page.getByRole('contentinfo')).toBeVisible();

        // hreflang for every language plus x-default, and a canonical link.
        for (const code of [...LOCALES, 'x-default']) {
          await expect(page.locator(`link[rel="alternate"][hreflang="${code}"]`)).toHaveCount(1);
        }
        await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
          'href',
          new RegExp(`/${locale}${path}$`),
        );

        // Hydration ran without errors (a script blocked by the CSP would show up here).
        await page.waitForLoadState('networkidle');
        expect(errors).toEqual([]);
      });
    }
  });
}

test('the skip link jumps to the main content', async ({ page }) => {
  await page.goto('/en/tracks');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: MESSAGES.en.nav.skipToContent });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
  await expect(skip).toHaveAttribute('href', '#main');
});

test('an unknown address shows the not-found page in that language', async ({ page }) => {
  const response = await page.goto('/ur/no-such-page');
  expect(response?.status()).toBe(404);
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(MESSAGES.ur.notFound.title);
});

test('an address without a language goes to one', async ({ page }) => {
  await page.goto('/safety');
  await expect(page).toHaveURL(/\/(en|ar|ur)\/safety$/);
});

test('sends security headers, including a Content-Security-Policy', async ({ request }) => {
  const response = await request.get('/en');
  const headers = response.headers();
  expect(headers['content-security-policy']).toContain("script-src 'self' 'unsafe-inline'");
  expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(headers['content-security-policy']).not.toContain('unsafe-eval');
  expect(headers['x-frame-options']).toBe('DENY');
  expect(headers['x-content-type-options']).toBe('nosniff');
});

test('the sitemap lists every page in every language, and robots.txt points to it', async ({
  request,
}) => {
  const sitemap = await (await request.get('/sitemap.xml')).text();
  for (const locale of LOCALES) {
    for (const path of ['/how-it-works', '/pricing/eg', '/blog/first-website', '/waitlist']) {
      expect(sitemap).toContain(`/${locale}${path}</loc>`);
    }
  }
  expect(sitemap).toContain('hreflang="x-default"');
  expect(sitemap).not.toContain('/waitlist/confirm');
  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toContain('Sitemap: ');
  expect(robots).toContain('Disallow: /*/waitlist/confirm');
});
