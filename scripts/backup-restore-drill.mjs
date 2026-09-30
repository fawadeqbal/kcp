#!/usr/bin/env node
/**
 * Backup-restore drill: dumps the database, restores the dump into a scratch
 * database next to it, and checks the copy is complete — row counts of the tables
 * that matter, the append-only triggers, and the migrations table. Then removes the
 * scratch database (unless --keep). Nothing in the source database changes.
 *
 *   pnpm db:drill                 local database (DATABASE_URL in .env)
 *   pnpm db:drill -- --keep       keep kcp_restore_drill to look around
 *
 * Uses pg_dump / pg_restore / psql when they're installed, otherwise runs them inside
 * the docker compose "postgres" container (local databases only, then).
 *
 * Only a local database, unless DRILL_TARGET=staging says the (non-local) server in
 * DATABASE_URL is a staging copy; that needs the PostgreSQL tools installed, and
 * creates and drops a scratch database on that server. Never point it at production
 * from a laptop: the dump holds children's data.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');

function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  try {
    const line = readFileSync(path.join(root, '.env'), 'utf8')
      .split('\n')
      .find((l) => l.startsWith('DATABASE_URL='));
    if (line) return line.slice('DATABASE_URL='.length).trim().replace(/^"|"$/g, '');
  } catch {
    // No .env: the default below.
  }
  return 'postgresql://kcp:kcp@localhost:5432/kcp';
}

const source = new URL(databaseUrl());
const sourceDb = source.pathname.slice(1).split('?')[0];
const scratchDb = `${sourceDb}_restore_drill`;
const scratch = new URL(source);
scratch.pathname = `/${scratchDb}`;
const keep = process.argv.includes('--keep');

const local = spawnSync('pg_dump', ['--version'], { encoding: 'utf8' }).status === 0;

const isLocalHost = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(source.hostname);
if (!isLocalHost && process.env.DRILL_TARGET !== 'staging') {
  console.error(
    `Refusing to drill ${source.hostname}: local databases only (set DRILL_TARGET=staging for a staging copy).`,
  );
  process.exit(1);
}
if (!isLocalHost && !local) {
  // Inside the compose container, "localhost" is the local database, not this server.
  console.error(`Drilling ${source.hostname} needs pg_dump, pg_restore and psql installed.`);
  process.exit(1);
}

/** Runs a PostgreSQL tool locally, or in the compose container; returns its output. */
function pg(tool, args, { input, binary = false } = {}) {
  const command = local
    ? [tool, args]
    : ['docker', ['compose', 'exec', '-T', 'postgres', tool, ...args]];
  const result = spawnSync(command[0], command[1], {
    cwd: root,
    input,
    maxBuffer: 1024 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(`${tool} failed: ${result.stderr?.toString() ?? ''}`);
  }
  return binary ? result.stdout : result.stdout.toString('utf8');
}

/** A connection string the tool can use (inside the container, the host is localhost). */
const conn = (url) => {
  if (local) return url.toString();
  const inside = new URL(url);
  inside.hostname = 'localhost';
  inside.port = '5432';
  return inside.toString();
};
const sql = (url, query) =>
  pg('psql', [conn(url), '-At', '-v', 'ON_ERROR_STOP=1', '-c', query]).trim();

const TABLES = [
  'users',
  'student_profiles',
  'parent_child_links',
  'consent_records',
  'audit_logs',
  'lesson_progress',
  'submissions',
  'projects',
  'portfolio_items',
  'xp_events',
  'subscriptions',
  'payments',
  'invoices',
  'payment_events',
  'certificates',
  'modules',
  'lessons',
];

const started = Date.now();
const work = mkdtempSync(path.join(tmpdir(), 'kcp-drill-'));
const dumpFile = path.join(work, 'kcp.dump');
try {
  console.log(
    `Drill on ${source.hostname}:${source.port || 5432}: ${sourceDb} → ${scratchDb} (${local ? 'local tools' : 'docker compose'})`,
  );

  // 1. Back up: the custom format, as managed backups and `pg_dump -Fc` produce.
  const dump = pg('pg_dump', ['-Fc', '--no-owner', '--no-privileges', conn(source)], {
    binary: true,
  });
  // Written through Node so it works the same with docker exec.
  writeFileSync(dumpFile, dump);
  const backupSeconds = (Date.now() - started) / 1000;

  // 2. Restore into a fresh scratch database.
  const admin = new URL(source);
  admin.pathname = '/postgres';
  sql(admin, `DROP DATABASE IF EXISTS "${scratchDb}"`);
  sql(admin, `CREATE DATABASE "${scratchDb}"`);
  const restoreStarted = Date.now();
  pg('pg_restore', ['--no-owner', '--no-privileges', '--exit-on-error', '-d', conn(scratch)], {
    input: readFileSync(dumpFile),
  });
  const restoreSeconds = (Date.now() - restoreStarted) / 1000;

  // 3. Check: the same rows, the triggers that protect records, the migrations.
  const problems = [];
  const rows = [];
  for (const table of TABLES) {
    const a = Number(sql(source, `SELECT count(*) FROM "${table}"`));
    const b = Number(sql(scratch, `SELECT count(*) FROM "${table}"`));
    rows.push({ table, source: a, restored: b });
    if (a !== b) problems.push(`${table}: ${a} rows, restored ${b}`);
  }
  const triggers = (url) =>
    sql(
      url,
      `SELECT count(*) FROM pg_trigger WHERE NOT tgisinternal AND tgrelid::regclass::text IN ('audit_logs','consent_records','payment_events','xp_events')`,
    );
  if (triggers(source) !== triggers(scratch)) problems.push('append-only triggers missing');
  const migrations = (url) =>
    sql(url, `SELECT count(*) FROM _prisma_migrations WHERE finished_at IS NOT NULL`);
  if (migrations(source) !== migrations(scratch)) problems.push('migrations table differs');

  console.table(rows);
  console.log(
    `Backup ${backupSeconds.toFixed(1)} s (${(statSync(dumpFile).size / 1024 / 1024).toFixed(1)} MB), ` +
      `restore ${restoreSeconds.toFixed(1)} s, triggers ${triggers(scratch)}, migrations ${migrations(scratch)}.`,
  );
  if (problems.length) {
    console.error(`Drill FAILED:\n- ${problems.join('\n- ')}`);
    process.exitCode = 1;
  } else {
    console.log('Drill passed: the restored copy is complete.');
  }
  if (!keep) sql(admin, `DROP DATABASE IF EXISTS "${scratchDb}"`);
  else console.log(`Kept ${scratchDb} (drop it when you're done).`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
