import type { CodeFileKey, CodeFiles } from '@kcp/checks';
import { directionOf, type Locale, LOCALES } from '@kcp/i18n';
import { type Browser, type Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { loadProject } from './content';
import {
  API_URL,
  createParent,
  createStudent,
  isolate,
  logInAsStudent,
  MESSAGES,
  type Messages,
  PARENT_PASSWORD,
  STUDENT_PASSWORD,
  uniqueEmail,
  celebrate,
} from './helpers';
import { linkFrom, waitForEmail } from './mailpit';

/** The Module 1 project, straight from content/. */
const PROJECT = loadProject('builder/m01-first-website');
const FILE_NAMES = {
  html: 'index.html',
  css: 'style.css',
  js: 'script.js',
  py: 'main.py',
} as const;

const SANDBOX_URL = process.env.NEXT_PUBLIC_SANDBOX_URL ?? 'http://localhost:3004';

const fill = (template: string, values: Record<string, string | number>) =>
  template.replaceAll(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''));

/** Replaces a file's code in the project editor, like pasting it in. */
async function paste(page: Page, m: Messages, file: CodeFileKey, code: string) {
  await page.getByRole('tab', { name: FILE_NAMES[file], exact: true }).click();
  const editor = page.getByRole('textbox', {
    name: fill(m.lesson.editorLabel, { file: FILE_NAMES[file] }),
  });
  await editor.click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.insertText(code);
}

async function solve(page: Page, m: Messages, solution: CodeFiles) {
  for (const [file, code] of Object.entries(solution) as [CodeFileKey, string][]) {
    if (code !== PROJECT.starter[file]) await paste(page, m, file, code);
  }
}

/** A page in a separate browser (no cookies shared), like another person's device. */
async function newDevice(browser: Browser) {
  const context = await browser.newContext();
  return context.newPage();
}

for (const locale of ['en', 'ar'] as const satisfies Locale[]) {
  test(`a new family goes from sign-up to a shipped, shared project (${locale})`, async ({
    page,
    request,
    browser,
  }) => {
    test.setTimeout(180_000);
    const m = MESSAGES[locale];
    const hints = { ...PROJECT.hints['en'], ...PROJECT.hints[locale] };
    const title = PROJECT.titles[locale] ?? '';

    // 1. The parent signs up (the policies are a click away), confirms and logs in.
    const email = uniqueEmail(`family-${locale}`);
    await page.goto(`/${locale}/sign-up`);
    await expect(
      page.getByRole('link', { name: new RegExp(`^${m.legal.termsTitle}$`, 'i') }),
    ).toHaveAttribute('href', `/${locale}/terms`);
    await page.getByLabel(m.auth.signUp.name).fill('Test Parent');
    await page.getByLabel(m.auth.email).fill(email);
    await page.getByLabel(m.auth.password, { exact: true }).fill(PARENT_PASSWORD);
    await page.getByLabel(m.auth.signUp.country).selectOption('PK');
    await page.getByLabel(m.auth.signUp.acceptTerms).check();
    await page.getByRole('button', { name: m.auth.signUp.submit }).click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/check-email$`));
    await page.goto(linkFrom((await waitForEmail(request, email)).text, `/${locale}/verify-email`));
    await expect(page.getByText(m.auth.verify.success)).toBeVisible();
    await page.goto(`/${locale}/login`);
    await page.getByLabel(m.auth.email).fill(email);
    await page.getByLabel(m.auth.password, { exact: true }).fill(PARENT_PASSWORD);
    await page.getByRole('main').getByRole('button', { name: m.auth.login.submit }).click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/dashboard$`));

    // 2. They add a child, with nothing shared yet.
    await page.getByRole('link', { name: m.dashboard.addChild }).first().click();
    const nickname = `Maker${Math.floor(10 + Math.random() * 90)}`;
    await page.getByLabel(m.addChild.nickname).fill(nickname);
    await page.getByRole('radio', { name: m.avatars.robot }).check();
    await page.getByLabel(m.addChild.birthYear).selectOption({ index: 1 });
    await page.getByLabel(m.addChild.password, { exact: true }).fill(STUDENT_PASSWORD);
    await page.getByRole('button', { name: m.addChild.submit }).click();
    await expect(
      page.getByRole('heading', {
        name: fill(m.addChild.createdTitle, { nickname: isolate(nickname) }),
      }),
    ).toBeVisible();
    const username = (await page.getByTestId('child-username').textContent())?.trim() ?? '';

    // 3. The child logs in on their own device and opens the module project.
    const kid = await newDevice(browser);
    await logInAsStudent(kid, locale, username);
    await expect(
      kid.getByText(fill(m.progress.level, { level: 1 }), { exact: true }),
    ).toBeVisible();
    await kid.getByRole('link').filter({ hasText: title }).click();
    await expect(kid).toHaveURL(new RegExp(`/${locale}/learn/projects/${PROJECT.id}$`));
    await expect(kid.getByRole('heading', { level: 1, name: title })).toBeVisible();

    // The starter code isn't enough: the hints say what's missing, and nothing ships.
    const check = kid.getByRole('button', { name: m.project.check });
    const ship = kid.getByRole('button', { name: m.project.ship });
    await expect(check).toHaveAttribute('aria-disabled', 'false');
    await check.click();
    await expect(
      kid.getByText(fill(m.project.notReady, { passed: 1, total: PROJECT.checks.length })),
    ).toBeVisible();
    await expect(kid.getByText(hints['paragraph'] ?? '', { exact: true }).last()).toBeVisible();
    await expect(ship).toHaveAttribute('aria-disabled', 'true');

    // 4. With the page built, every requirement is met and the project ships.
    await solve(kid, m, PROJECT.solution);
    await expect(ship).toHaveAttribute('aria-disabled', 'true');
    await check.click();
    await expect(kid.getByText(m.project.allMet)).toBeVisible();
    await expect(ship).toHaveAttribute('aria-disabled', 'false');
    await ship.click();
    const shipped = kid.getByRole('heading', { name: m.project.shipped });
    await celebrate(kid, m, ['first-ship']);
    // Focus is back on the result once the celebration closes.
    await expect(shipped).toBeFocused();
    await expect(shipped).toContainText(fill(m.progress.xpGained, { xp: PROJECT.xp }));
    await kid.screenshot({
      path: `test-results/screens/project-shipped-${locale}.png`,
      fullPage: true,
    });

    // 5. It's in the portfolio, and the XP counts: level 2, today's goal done.
    await kid.getByRole('link', { name: m.project.openPortfolio }).click();
    await expect(kid).toHaveURL(new RegExp(`/${locale}/learn/portfolio$`));
    await expect(kid.getByRole('heading', { name: title })).toBeVisible();
    await expect(
      kid
        .frameLocator(`iframe[title="${fill(m.portfolio.previewTitle, { title })}"]`)

        // The sandbox shows the student's page in a frame of its own.
        .frameLocator('iframe')
        .locator('h1'),
    ).toHaveText('All about me');
    await kid.screenshot({ path: `test-results/screens/portfolio-${locale}.png`, fullPage: true });
    await kid.goto(`/${locale}/learn`);
    await expect(
      kid.getByText(fill(m.progress.level, { level: 2 }), { exact: true }),
    ).toBeVisible();
    await expect(kid.getByText(m.progress.goalDone)).toBeVisible();
    await expect(kid.getByText(m.project.statusShipped, { exact: true })).toBeVisible();
    await kid.screenshot({
      path: `test-results/screens/learn-progress-${locale}.png`,
      fullPage: true,
    });

    // 6. The parent sees it, and can share it only after switching on "Public projects".
    await page.goto(`/${locale}/dashboard`);
    const card = page.getByRole('article', { name: nickname, exact: true });
    await expect(
      card.getByText(fill(m.dashboard.level, { level: 2 }), { exact: true }),
    ).toBeVisible();
    await card.getByRole('button', { name: m.dashboard.manage }).click();
    await expect(card.getByRole('heading', { name: title })).toBeVisible();
    await expect(
      card.getByText(fill(m.dashboard.shareOff, { nickname: isolate(nickname) })),
    ).toBeVisible();
    await card.getByRole('switch', { name: m.consents.publicPortfolio }).click();
    await card.getByRole('button', { name: m.dashboard.shareCreate }).click();
    const linkField = card.getByLabel(
      fill(m.dashboard.shareLabel, { nickname: isolate(nickname) }),
    );
    // The link opens the user-content domain; the key after "#" never reaches a server.
    await expect(linkField).toHaveValue(
      new RegExp(`^${SANDBOX_URL}/portfolio/\\?lang=${locale}#[\\w-]{24}$`),
    );
    const shareLink = await linkField.inputValue();
    await page.screenshot({
      path: `test-results/screens/dashboard-share-${locale}.png`,
      fullPage: true,
    });

    // 7. Anyone with the link sees the nickname and the project, nothing more.
    const friend = await newDevice(browser);
    await friend.goto(shareLink);
    await expect(
      friend.getByRole('heading', {
        name: fill(m.shared.heading, { nickname }),
      }),
    ).toBeVisible();
    await expect(friend.getByRole('heading', { name: title })).toBeVisible();
    await expect(friend.locator('html')).toHaveAttribute('dir', directionOf(locale));
    await expect(friend.getByText(username)).toHaveCount(0);
    await friend.screenshot({ path: `test-results/screens/shared-${locale}.png`, fullPage: true });

    // 8. "Stop sharing" ends the link at once.
    await card.getByRole('button', { name: m.dashboard.shareStop }).click();
    await expect(card.getByRole('button', { name: m.dashboard.shareCreate })).toBeVisible();
    await friend.reload();
    await expect(friend.getByText(m.shared.notFound)).toBeVisible();

    await kid.context().close();
    await friend.context().close();
  });
}

test('leaderboards show a student only when their family allows it', async ({ page, request }) => {
  const m = MESSAGES.en;
  const allPassed = PROJECT.checks.map((id) => ({ id, passed: true }));

  // Two students ship the project; only one family allows public leaderboards.
  const shown = await createStudent(request, { consents: { publicLeaderboards: true } });
  const hidden = await createStudent(request);
  for (const student of [shown, hidden]) {
    const login = await request.post(`${API_URL}/v1/auth/students/login`, {
      data: { username: student.username, password: STUDENT_PASSWORD, tokenDelivery: 'body' },
    });
    expect(login.ok()).toBe(true);
    const { accessToken } = (await login.json()) as { accessToken: string };
    const shipped = await request.post(`${API_URL}/v1/projects/${PROJECT.id}/ship`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: { code: PROJECT.solution, results: allPassed },
    });
    expect(shipped.ok(), await shipped.text()).toBe(true);
  }

  await logInAsStudent(page, 'en', shown.username);
  // The badge for the project shipped (through the API) is celebrated once, on arrival.
  await celebrate(page, m, ['first-ship']);
  await page
    .getByRole('navigation', { name: m.nav.main })
    .getByRole('link', { name: m.nav.leaderboard })
    .click();
  await expect(page).toHaveURL(/\/en\/learn\/leaderboard$/);
  await expect(page.getByRole('tab', { name: m.leaderboard.global, selected: true })).toBeVisible();
  await expect(
    page.getByText(new RegExp(fill(m.leaderboard.yourRank, { rank: '\\d+', xp: PROJECT.xp }))),
  ).toBeVisible();
  await page.getByRole('tab', { name: m.leaderboard.country }).click();
  await expect(
    page.getByText(new RegExp(fill(m.leaderboard.yourRank, { rank: '\\d+', xp: PROJECT.xp }))),
  ).toBeVisible();
  await page.screenshot({ path: 'test-results/screens/leaderboard-en.png', fullPage: true });

  await page.context().clearCookies();
  await logInAsStudent(page, 'en', hidden.username);
  await page.goto('/en/learn/leaderboard');
  await expect(page.getByText(fill(m.leaderboard.hidden, { xp: PROJECT.xp }))).toBeVisible();
  // They aren't on the board, even for themselves.
  await expect(page.getByText(m.leaderboard.you, { exact: true })).toHaveCount(0);
});

test('signed-in families can send feedback from any page', async ({ page, request }) => {
  const m = MESSAGES.ar;
  const student = await createStudent(request, { locale: 'ar' });
  await logInAsStudent(page, 'ar', student.username);
  await page.getByRole('button', { name: m.feedback.button }).click();
  const dialog = page.getByRole('dialog', { name: m.feedback.title });
  await dialog.getByRole('radio', { name: m.feedback.kindIDEA }).check();
  await dialog.getByLabel(m.feedback.message).fill('أريد دروسًا عن الألعاب!');
  await dialog.getByRole('button', { name: m.feedback.send }).click();
  await expect(dialog.getByText(m.feedback.thanks)).toBeVisible();
  await dialog.getByRole('button', { name: m.feedback.close }).click();
  await expect(dialog).toBeHidden();
});

for (const locale of LOCALES) {
  test(`the safety page, terms and privacy policy are public (${locale})`, async ({ page }) => {
    const m = MESSAGES[locale];
    await page.goto(`/${locale}`);
    // Nobody is signed in, so there's no feedback button.
    await expect(page.getByRole('button', { name: m.feedback.button })).toHaveCount(0);
    const footer = page.getByRole('navigation', { name: m.nav.footer });
    for (const [link, heading] of [
      [m.nav.safety, m.legal.safetyTitle],
      [m.nav.terms, m.legal.termsTitle],
      [m.nav.privacy, m.legal.privacyTitle],
    ] as const) {
      await footer.getByRole('link', { name: link }).click();
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
      await expect(page.locator('html')).toHaveAttribute('dir', directionOf(locale));
      await expect(page).toHaveTitle(new RegExp(heading));
    }
    // The policies are drafts until the lawyer has reviewed them.
    await expect(page.getByText(m.legal.draft)).toBeVisible();
    await page.screenshot({ path: `test-results/screens/privacy-${locale}.png`, fullPage: true });
  });
}

test('a parent account alone can’t open the student pages', async ({ page, request }) => {
  const parent = await createParent(request);
  await page.goto('/en/login');
  await page.getByLabel(MESSAGES.en.auth.email).fill(parent.email);
  await page.getByLabel(MESSAGES.en.auth.password, { exact: true }).fill(PARENT_PASSWORD);
  await page.getByRole('main').getByRole('button', { name: MESSAGES.en.auth.login.submit }).click();
  await expect(page).toHaveURL(/\/en\/dashboard$/);
  await page.goto(`/en/learn/projects/${PROJECT.id}`);
  await expect(page).toHaveURL(/\/en\/dashboard$/);
});
