import { type Browser, type Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { createStudent, logInAsStudent, MESSAGES } from './helpers';

/*
 * Performance budgets for families on mid-range phones and slow connections:
 * - the JavaScript each page downloads (compressed), so the app stays light;
 * - the time until a page can be used on "slow 3G" with a 4× slower processor.
 * The numbers and how they were measured are in docs/performance.md. Raise a budget
 * only on purpose, in the same change that needs it.
 */

const WEB_ORIGIN = new URL(process.env.WEB_URL ?? 'http://localhost:3001').origin;
const KB = 1024;

/** Budgets for the JavaScript each page loads on a first visit (compressed). */
const JS_BUDGET: Record<string, number> = {
  home: 200 * KB,
  'student login': 200 * KB,
  // Logging in, then the lesson map: both pages' code.
  'login and learn': 430 * KB,
  lesson: 280 * KB,
};

/** Compressed JavaScript bytes the web app sends while `open` runs, nothing cached. */
async function javascriptBytes(page: Page, open: () => Promise<void>) {
  let bytes = 0;
  const pending: Promise<void>[] = [];
  const onResponse = (response: import('@playwright/test').Response) => {
    if (!response.url().startsWith(WEB_ORIGIN)) return;
    if (response.request().resourceType() !== 'script') return;
    pending.push(
      response
        .request()
        .sizes()
        .then((sizes) => {
          bytes += Math.max(0, sizes.responseBodySize);
        }),
    );
  };
  page.on('response', onResponse);
  await open();
  await page.waitForLoadState('networkidle');
  await Promise.all(pending);
  page.off('response', onResponse);
  return bytes;
}

async function measure(browser: Browser, open: (page: Page) => Promise<void>) {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    return await javascriptBytes(page, () => open(page));
  } finally {
    await context.close();
  }
}

test('pages stay within their JavaScript budget', async ({ browser, request }) => {
  const student = await createStudent(request, { locale: 'en' });
  const sizes: Record<string, number> = {
    home: await measure(browser, async (page) => {
      await page.goto('/en');
    }),
    'student login': await measure(browser, async (page) => {
      await page.goto('/en/login/student');
    }),
    'login and learn': await measure(browser, (page) =>
      logInAsStudent(page, 'en', student.username),
    ),
  };
  // The lesson page on a first visit: log in (not counted), then open it.
  const context = await browser.newContext();
  const page = await context.newPage();
  await logInAsStudent(page, 'en', student.username);
  await context.clearCookies();
  const cold = await browser.newContext({ storageState: await context.storageState() });
  await context.close();
  const lesson = await cold.newPage();
  await logInAsStudent(lesson, 'en', student.username);
  sizes['lesson'] = await javascriptBytes(lesson, async () => {
    await lesson.goto('/en/learn/builder-m01-l01');
  });
  await cold.close();

  test.info().annotations.push({
    type: 'JavaScript per page (compressed)',
    description: `${Object.entries(sizes)
      .map(([name, bytes]) => `${name} ${Math.round(bytes / KB)} KB`)
      .join(', ')}`,
  });
  for (const [name, budget] of Object.entries(JS_BUDGET)) {
    expect(sizes[name], `${name}: ${Math.round(sizes[name]! / KB)} KB`).toBeLessThanOrEqual(budget);
    expect(sizes[name]).toBeGreaterThan(10 * KB);
  }
});

/**
 * "Slow 3G" for a page: every response waits 400 ms, and all of them share about
 * 50 KB/s of bandwidth (text counts at a third of its size, as it's compressed).
 */
async function slow3g(page: Page) {
  let nextFree = Date.now();
  await page.route('**/*', async (route) => {
    const response = await route.fetch();
    const body = await response.body();
    const type = response.headers()['content-type'] ?? '';
    const onWire = /text|javascript|json|css|svg/.test(type) ? body.length / 3 : body.length;
    nextFree = Math.max(Date.now() + 400, nextFree) + (onWire / (50 * KB)) * 1000;
    await new Promise((resolve) => setTimeout(resolve, nextFree - Date.now()));
    await route.fulfill({ response, body });
  });
}

test('the student login page is usable within 10 seconds on slow 3G and a mid-range phone', async ({
  page,
}) => {
  test.setTimeout(90_000);
  const m = MESSAGES.en;
  await slow3g(page);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const started = Date.now();
  await page.goto('/en/login/student', { waitUntil: 'commit', timeout: 60_000 });
  // Usable: the page's code has started (hydrated), so its buttons respond. "Show
  // password" only works once it has.
  const password = page.getByLabel(m.auth.password, { exact: true });
  await expect(password).toBeVisible({ timeout: 30_000 });
  await expect(async () => {
    await page.getByRole('button', { name: m.auth.showPassword }).click({ timeout: 1000 });
    await expect(password).toHaveAttribute('type', 'text', { timeout: 500 });
  }).toPass({ timeout: 30_000 });
  const seconds = (Date.now() - started) / 1000;
  test.info().annotations.push({
    type: 'Slow 3G',
    description: `Student login usable after ${seconds.toFixed(1)} s`,
  });
  expect(seconds).toBeLessThan(10);
});
