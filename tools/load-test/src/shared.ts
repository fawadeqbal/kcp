import path from 'node:path';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: path.resolve(import.meta.dirname, '../../../.env'), quiet: true });

/** Every load-test student has this prefix, so they can be found and removed. */
export const USERNAME_PREFIX = 'load-';
export const PASSWORD = 'load test pass 42';

export function option(name: string, fallback: number): number {
  const arg = process.argv.find((a) => a.startsWith(`--${name}=`));
  const raw = arg?.split('=')[1] ?? process.env[name.toUpperCase().replaceAll('-', '_')];
  const value = raw === undefined ? fallback : Number(raw);
  if (!Number.isFinite(value) || value < 0) throw new Error(`--${name} must be a number`);
  return value;
}

export const username = (i: number) => `${USERNAME_PREFIX}${String(i).padStart(6, '0')}`;

/**
 * Only local servers, unless LOAD_TEST_TARGET names the (non-local) server's host
 * exactly, to confirm it is a staging copy. Never production: the test creates
 * accounts and fills the boards.
 */
export function assertNotProduction(url: string) {
  const host = new URL(url).hostname;
  const local = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(host);
  if (!local && process.env['LOAD_TEST_TARGET'] !== host) {
    throw new Error(
      `Refusing to load-test ${host}: local servers only. For a staging copy, confirm its host with LOAD_TEST_TARGET=${host}.`,
    );
  }
}
