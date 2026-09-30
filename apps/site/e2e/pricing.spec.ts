import { expect, test } from '@playwright/test';
import { COUNTRY_CODES, countrySlug } from '../src/lib/countries';
import { currencySymbol } from '../src/lib/format';
import { FALLBACK_PRICING } from '../src/lib/pricing';
import { LOCALES, MESSAGES } from './helpers';

const CURRENCY = Object.fromEntries(FALLBACK_PRICING.countries.map((c) => [c.code, c.currency]));
const EASTERN_DIGITS = /[\u0660-\u0669\u06F0-\u06F9]/;

for (const locale of LOCALES) {
  test(`each country shows its own currency, with Western digits, in ${locale}`, async ({
    page,
  }) => {
    for (const code of COUNTRY_CODES) {
      await page.goto(`/${locale}/pricing/${countrySlug(code)}`);
      const price = page.getByTestId('monthly-price');
      const currency = CURRENCY[code] ?? '';
      await expect(price).toContainText(currencySymbol(currency, locale));
      await expect(price).toContainText(/\d/);
      expect(await price.textContent()).not.toMatch(EASTERN_DIGITS);
    }
  });
}

test('without a country, pricing shows Pakistan', async ({ page }) => {
  await page.goto('/en/pricing');
  await expect(page.getByTestId('monthly-price')).toContainText('PKR');
  const pakistan = page
    .getByRole('navigation', { name: MESSAGES.en.pricing.countries })
    .getByRole('link', { name: 'Pakistan' });
  await expect(pakistan).toHaveAttribute('aria-current', 'true');
});

test('?country= picks the country', async ({ page }) => {
  await page.goto('/ar/pricing?country=ae');
  await expect(page).toHaveURL(/\/ar\/pricing\/ae$/);
  await expect(page.getByTestId('monthly-price')).toContainText(currencySymbol('AED', 'ar'));
});

test('the country picker links to each country', async ({ page }) => {
  await page.goto('/en/pricing');
  const countries = page.getByRole('navigation', { name: MESSAGES.en.pricing.countries });
  await countries.getByRole('link', { name: 'Egypt' }).click();
  await expect(page).toHaveURL(/\/en\/pricing\/eg$/);
  await expect(page.getByTestId('monthly-price')).toContainText('EGP');
  await expect(countries.getByRole('link', { name: 'Egypt' })).toHaveAttribute(
    'aria-current',
    'page',
  );
});

test('an unknown country is not a page', async ({ page }) => {
  const response = await page.goto('/en/pricing/fr');
  expect(response?.status()).toBe(404);
});
