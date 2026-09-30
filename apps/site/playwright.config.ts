import { defineConfig, devices } from '@playwright/test';

/**
 * Browser tests for the marketing site. They need no API: prices fall back to the bundled
 * ones at build time, and the waitlist calls are answered by the tests (page.route).
 *   pnpm --filter @kcp/site build && pnpm --filter @kcp/site test:browser
 * The site is started automatically (or reused if it already runs locally).
 */
const SITE_URL = process.env.SITE_URL ?? 'http://localhost:3003';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  workers: process.env.CI ? 2 : undefined,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: SITE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // Lets environments with a preinstalled browser skip `playwright install`.
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined },
  },
  projects: [
    {
      name: 'laptop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: {
    // Started with node directly (not through pnpm) so it shuts down cleanly afterwards.
    command: 'node node_modules/next/dist/bin/next start --port 3003',
    url: `${SITE_URL}/en`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    gracefulShutdown: { signal: 'SIGTERM', timeout: 5_000 },
  },
});
