// Runs `next build` with NODE_ENV=production.
// Nx hands the repository's .env to every task; an older .env with NODE_ENV=development
// would otherwise make Next.js produce a broken production build.
import { spawnSync } from 'node:child_process';

const result = spawnSync('next', ['build', ...process.argv.slice(2)], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, NODE_ENV: 'production' },
});
process.exit(result.status ?? 1);
