import { defineConfig } from 'vitest/config';

// Runs against a real, migrated PostgreSQL (pnpm services:up && pnpm db:deploy).
export default defineConfig({
  test: {
    globals: true,
    include: ['prisma/**/*.e2e-spec.ts'],
    fileParallelism: false,
  },
});
