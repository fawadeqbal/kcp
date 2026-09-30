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

/** A confirmed address on the marketing site's waitlist. */
export async function joinWaitlist(email: string, countryCode: string) {
  await run(
    `INSERT INTO waitlist_entries (id, email, country_code, age_band, language_code, confirmed_at, updated_at)
     VALUES (gen_random_uuid(), $1, $2, 'AGE_9_12', 'ar', now(), now())`,
    [email, countryCode],
  );
}

/** A certificate for Module 1, as if the student had finished it. */
export async function giveCertificate(username: string, code: string) {
  await run(
    `INSERT INTO certificates (id, code, user_id, module_id, nickname, module_titles, track_titles)
     SELECT gen_random_uuid(), $2, u.id, 'builder-m01', p.nickname,
            '{"en": "Your first web page"}', '{"en": "Builder"}'
     FROM users u JOIN student_profiles p ON p.user_id = u.id WHERE u.username = $1`,
    [username, code],
  );
}
