import { AxeBuilder } from '@axe-core/playwright';
import type { Locale } from '@kcp/i18n';
import { type APIRequestContext, type Page } from '@playwright/test';
import { roomWith } from './database';
import { expect, test } from './fixtures';
import { createStudent, logInAsParent, logInAsStudent, MESSAGES } from './helpers';

/*
 * Automated accessibility checks (axe-core, WCAG 2.1 A and AA) on the main pages, in
 * English, Arabic and Urdu, plus the right-to-left layout on a small phone. Automated
 * checks find about a third of real problems: the review notes in
 * docs/accessibility.md list what was checked by hand.
 */

const LOCALES: Locale[] = ['en', 'ar', 'ur'];
const PUBLIC_PAGES = [
  '',
  '/login',
  '/login/student',
  '/sign-up',
  '/safety',
  '/terms',
  '/privacy',
  '/no-such-page',
];
const PARENT_PAGES = ['/dashboard', '/children/new', '/billing', '/account'];
const STUDENT_PAGES = [
  '/learn',
  '/learn/builder-m01-l01',
  '/learn/projects/builder-m01-project',
  '/learn/explorer-m01-l01',
  // The block editor (Blockly) and Bit's world.
  '/learn/projects/explorer-m01-project',
  '/learn/portfolio',
  '/learn/leaderboard',
  '/learn/league',
  '/learn/friends',
  '/learn/rooms',
  '/learn/classes',
  '/learn/readiness',
  '/learn/badges',
];

/**
 * Blockly's toolbox (the block editor, Explorer lessons) is a list whose options sit
 * inside presentational groups, which axe doesn't accept. It is Blockly's own markup
 * (v13); docs/accessibility.md notes how the editor was checked by hand.
 */
const blocklyToolbox = (rule: string, html: string) =>
  rule === 'aria-required-children' && html.includes('blocklyBlockCanvas');

async function audit(page: Page, path: string) {
  // Let the page settle (data loads, fonts) before checking it.
  await page.waitForLoadState('networkidle');
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    // The code preview and videos are separate documents on other sites.
    .exclude('iframe')
    .options({ iframes: false })
    .analyze();
  const serious = results.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => ({ ...v, nodes: v.nodes.filter((n) => !blocklyToolbox(v.id, n.html)) }))
    .filter((v) => v.nodes.length > 0)
    .map(
      (v) =>
        `${path}: ${v.id} (${v.impact}) — ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
    );
  return serious;
}

/** Every public, parent and student page in one language, as a new family would see it. */
async function auditAll(page: Page, request: APIRequestContext, locale: Locale) {
  const problems: string[] = [];
  for (const path of PUBLIC_PAGES) {
    await page.goto(`/${locale}${path}`);
    problems.push(...(await audit(page, `${locale}${path}`)));
  }

  const student = await createStudent(request, { locale });
  // A team room, so the rooms page shows a room (phrases and the text box).
  await roomWith('Team Audit', [student.username]);
  await logInAsParent(page, locale, student.email);
  for (const path of PARENT_PAGES) {
    await page.goto(`/${locale}${path}`);
    problems.push(...(await audit(page, `${locale}${path}`)));
  }

  await page.context().clearCookies();
  await logInAsStudent(page, locale, student.username);
  for (const path of STUDENT_PAGES) {
    await page.goto(`/${locale}${path}`);
    problems.push(...(await audit(page, `${locale}${path}`)));
  }
  return problems;
}

for (const locale of LOCALES) {
  test(`pages pass automated accessibility checks (${locale})`, async ({ page, request }) => {
    test.setTimeout(180_000);
    expect(await auditAll(page, request, locale)).toEqual([]);
  });
}

// The colours follow the device's light or dark setting: the dark ones must pass too.
test.describe('dark mode', () => {
  test.use({ colorScheme: 'dark' });

  test('pages pass automated accessibility checks (en, dark)', async ({ page, request }) => {
    test.setTimeout(180_000);
    await page.goto('/en');
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).not.toBe(
      'rgb(245, 234, 216)',
    );
    expect(await auditAll(page, request, 'en')).toEqual([]);
  });
});

test.describe('right to left, on a small phone', () => {
  test.use({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true });

  for (const locale of ['ar', 'ur'] as const) {
    test(`mirrors the layout and never scrolls sideways (${locale})`, async ({ page, request }) => {
      const m = MESSAGES[locale];
      const student = await createStudent(request, { locale });
      const pages: string[] = [];
      const check = async (path: string) => {
        await page.goto(`/${locale}${path}`);
        await page.waitForLoadState('networkidle');
        await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        );
        if (overflow > 1) pages.push(`${path}: ${overflow}px too wide`);
      };
      for (const path of ['', '/login', '/sign-up', '/terms']) await check(path);
      await logInAsParent(page, locale, student.email);
      for (const path of PARENT_PAGES) await check(path);
      await page.context().clearCookies();
      await logInAsStudent(page, locale, student.username);
      await roomWith('Team RTL', [student.username]);
      for (const path of ['/learn', '/learn/portfolio', '/learn/leaderboard', '/learn/rooms']) {
        await check(path);
      }
      expect(pages).toEqual([]);

      if (locale === 'ur') {
        // Nastaliq is tall: Urdu text needs about twice its size between lines.
        await page.goto('/ur/terms');
        const ratio = await page
          .getByRole('main')
          .locator('p')
          .nth(2)
          .evaluate((p) => {
            const style = getComputedStyle(p);
            return Number.parseFloat(style.lineHeight) / Number.parseFloat(style.fontSize);
          });
        expect(ratio).toBeGreaterThanOrEqual(1.9);
      }
      expect(m.nav.logOut).toBeTruthy();
    });
  }
});
