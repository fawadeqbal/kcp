import { defineConfig } from 'vitest/config';

// End-to-end tests boot the whole app against real PostgreSQL and Redis
// (start them with `pnpm services:up`; CI provides them as service containers).
export default defineConfig({
  test: {
    globals: true,
    include: ['test/**/*.e2e-spec.ts'],
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 30_000,
    env: { LOG_LEVEL: 'warn', MAIL_TRANSPORT: 'memory', PUSH_TRANSPORT: 'memory' },
  },
});
