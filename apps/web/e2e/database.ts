import { readFileSync } from 'node:fs';
import path from 'node:path';
import { Client } from 'pg';

/**
 * Direct database access for test setup only (like "14 days have passed"). Uses the
 * same database as the API under test: DATABASE_URL, or the one in the repo's .env.
 */
function databaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  try {
    const env = readFileSync(path.resolve(import.meta.dirname, '../../../.env'), 'utf8');
    const line = env.split('\n').find((l) => l.startsWith('DATABASE_URL='));
    if (line) return line.slice('DATABASE_URL='.length).trim().replace(/^"|"$/g, '');
  } catch {
    // No .env: the default below.
  }
  return 'postgresql://kcp:kcp@localhost:5432/kcp';
}

async function run(sql: string, values: unknown[]) {
  const client = new Client({ connectionString: databaseUrl() });
  await client.connect();
  try {
    await client.query(sql, values);
  } finally {
    await client.end();
  }
}

/** Ends a student's free trial, as if 14 days had passed. */
export async function endTrial(username: string) {
  await run(
    `UPDATE student_profiles SET trial_ends_at = now() - interval '1 second'
     WHERE user_id = (SELECT id FROM users WHERE username = $1)`,
    [username],
  );
}

/**
 * A module finished, as if the student had done every lesson and shipped its project
 * (the lessons and projects specs do that step by step in the browser).
 */
export async function finishModule(username: string, moduleId: string) {
  await run(
    `INSERT INTO lesson_progress (user_id, lesson_id, status, completed_at, updated_at)
     SELECT u.id, l.id, 'COMPLETED', now(), now()
     FROM users u, lessons l
     WHERE u.username = $1 AND l.module_id = $2 AND l.is_active
     ON CONFLICT (user_id, lesson_id) DO UPDATE SET status = 'COMPLETED', completed_at = now()`,
    [username, moduleId],
  );
  await run(
    `INSERT INTO projects (id, user_id, brief_id, files, status, shipped_at, updated_at)
     SELECT gen_random_uuid(), u.id, b.id, '{"html": "<h1>Me</h1>"}', 'SHIPPED', now(), now()
     FROM users u, project_briefs b
     WHERE u.username = $1 AND b.module_id = $2
     ON CONFLICT (user_id, brief_id) DO UPDATE SET status = 'SHIPPED'`,
    [username, moduleId],
  );
}

/** As if the parent had accepted an older version of the terms. */
export async function acceptedOldTerms(email: string) {
  await run(`UPDATE users SET terms_version = '2020-01' WHERE email = $1`, [email]);
}
