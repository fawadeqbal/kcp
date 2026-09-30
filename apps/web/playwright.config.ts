import { defineConfig, devices } from '@playwright/test';

/**
 * Browser tests for the web app against the real API, PostgreSQL, Redis and Mailpit.
 *   pnpm services:up && pnpm build && pnpm content:import && pnpm --filter @kcp/web test:browser
 * The API, web app and code sandbox are started automatically (or reused if already
 * running locally).
 */
const WEB_URL = process.env.WEB_URL ?? 'http://localhost:3001';
const API_URL = process.env.API_URL ?? 'http://localhost:3000';
const SANDBOX_URL = process.env.NEXT_PUBLIC_SANDBOX_URL ?? 'http://localhost:3004';

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
    baseURL: WEB_URL,
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
    // Lessons must also work on a tablet, by touch (an iPad Air-sized screen, in Chromium).
    {
      name: 'tablet',
      testMatch: 'lessons.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 820, height: 1180 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
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
      command: 'node node_modules/next/dist/bin/next start --port 3001',
      url: `${WEB_URL}/en`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      gracefulShutdown: { signal: 'SIGTERM', timeout: 5_000 },
    },
    {
      command: 'node scripts/serve.mjs',
      cwd: '../sandbox',
      url: `${SANDBOX_URL}/`,
      env: { SANDBOX_FRAME_ANCESTORS: WEB_URL },
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
      gracefulShutdown: { signal: 'SIGTERM', timeout: 5_000 },
    },
  ],
});
