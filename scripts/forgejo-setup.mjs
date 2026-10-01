#!/usr/bin/env node
/**
 * Sets up the local Forgejo server (docker compose service "forgejo") for team
 * repositories: makes the admin account the API uses and an access token for it, then
 * prints the two lines to add to .env. Safe to run again: it makes a new token.
 *
 *   pnpm services:up && pnpm forgejo:setup
 */
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';

const ADMIN = 'kcp-admin';
const run = (args, { quiet = false } = {}) =>
  execFileSync('docker', ['compose', 'exec', '-T', '-u', 'git', 'forgejo', 'forgejo', ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', quiet ? 'ignore' : 'inherit'],
  }).trim();

const users = run(['admin', 'user', 'list', '--admin']);
if (!users.split('\n').some((line) => line.split(/\s+/)[1] === ADMIN)) {
  run([
    'admin',
    'user',
    'create',
    '--admin',
    '--username',
    ADMIN,
    '--email',
    `${ADMIN}@forgejo.localhost`,
    '--password',
    randomBytes(24).toString('base64url'),
    '--must-change-password=false',
  ]);
  console.info(`Made the admin account "${ADMIN}".`);
}
const token = run([
  'admin',
  'user',
  'generate-access-token',
  '--username',
  ADMIN,
  '--token-name',
  `kcp-api-${Date.now()}`,
  '--scopes',
  'all',
  '--raw',
]);
console.info('\nAdd these lines to .env, then restart the API:\n');
console.info('FORGEJO_URL=http://localhost:3005');
console.info(`FORGEJO_TOKEN=${token}`);
