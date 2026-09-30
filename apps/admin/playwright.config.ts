import { defineConfig, devices } from '@playwright/test';

/**
 * Browser tests for the admin panel against the real API, PostgreSQL, Redis and Mailpit.
 *   pnpm services:up && pnpm build && pnpm --filter @kcp/admin test:browser
 * The API and admin panel are started automatically (or reused if already running locally).
 */
const ADMIN_URL = process.env.ADMIN_URL ?? 'http://localhost:3002';
const API_URL = process.env.API_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: ADMIN_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // Lets environments with a preinstalled browser skip `playwright install`.
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    // Started with node directly (not through pnpm) so they shut down cleanly afterwards.
    {
      command: 'node dist/main.js',
      cwd: '../api',
      url: `${API_URL}/v1/health/ready`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      gracefulShutdown: { signal: 'SIGTERM', timeout: 5_000 },
    },
    {
      command: 'node node_modules/next/dist/bin/next start --port 3002',
      url: `${ADMIN_URL}/login`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      gracefulShutdown: { signal: 'SIGTERM', timeout: 5_000 },
    },
  ],
});
