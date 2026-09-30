import { defineConfig } from 'vitest/config';

// Imports content into the real database (needs `pnpm services:up` and migrations).
export default defineConfig({
  test: {
    globals: true,
    include: ['src/**/*.e2e-spec.ts'],
    testTimeout: 60_000,
  },
});
