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
  // …and a mentor approved the project (certificates need that).
  await run(
    `INSERT INTO reviews (id, kind, student_id, project_id, version, files, language_code, status,
                          decided_at, turnaround_hours, updated_at)
     SELECT gen_random_uuid(), 'PROJECT', p.user_id, p.id, 1, p.files, u.language_code, 'APPROVED',
            now(), 1, now()
     FROM projects p JOIN users u ON u.id = p.user_id JOIN project_briefs b ON b.id = p.brief_id
     WHERE u.username = $1 AND b.module_id = $2`,
    [username, moduleId],
  );
}

/** As if the parent had accepted an older version of the terms. */
export async function acceptedOldTerms(email: string) {
  await run(`UPDATE users SET terms_version = '2020-01' WHERE email = $1`, [email]);
}

/** A mentor whose background check passed, reviewing in these languages. */
export async function passBackgroundCheck(email: string, languages: string[]) {
  await run(
    `INSERT INTO mentor_profiles (user_id, background_check, background_checked_at, languages, updated_at)
     SELECT id, 'PASSED', now(), $2, now() FROM users WHERE email = $1
     ON CONFLICT (user_id) DO UPDATE
       SET background_check = 'PASSED', background_checked_at = now(), languages = $2`,
    [email, languages],
  );
}

/** Closes reviews other tests left waiting, so a queue shows this test's work first. */
export async function closeWaitingReviews() {
  await run(`UPDATE reviews SET status = 'CANCELLED' WHERE status IN ('WAITING', 'IN_REVIEW')`, []);
}

/**
 * Opens (or closes) accounts for children under 13 in Pakistan: the feature flag and
 * the country's consent methods. The API caches flags for up to 30 seconds.
 */
export async function under13InPakistan(open: boolean) {
  await run(
    `UPDATE feature_flags SET enabled = $1, country_codes = '{}' WHERE key = 'under_13_accounts'`,
    [open],
  );
  await run(
    `UPDATE countries SET under13_consent_methods = $1::"Under13ConsentMethod"[] WHERE code = 'PK'`,
    [open ? ['CARD_CHECK', 'SIGNED_FORM', 'EMAIL_PLUS'] : []],
  );
}

/** Rows from a query, for checking what the API stored. */
export async function select<T>(sql: string, values: unknown[]): Promise<T[]> {
  const client = new Client({ connectionString: databaseUrl() });
  await client.connect();
  try {
    return (await client.query(sql, values)).rows as T[];
  } finally {
    await client.end();
  }
}

/** A weekly report for the parent of this child, as the Sunday job writes it. */
export async function weeklyReportFor(
  username: string,
  week: { key: string; startDay: string; endDay: string },
) {
  await run(
    `INSERT INTO parent_reports (id, parent_id, week_key, data)
     SELECT gen_random_uuid(), l.parent_id, $2,
       jsonb_build_object('startDay', $3::text, 'endDay', $4::text, 'children', jsonb_build_array(
         jsonb_build_object('childId', u.id, 'nickname', p.nickname, 'avatarKey', p.avatar_key,
           'minutes', 42, 'xp', 60, 'lessons', 2, 'projects', 1, 'badges', 1, 'streak', 3,
           'league', 'silver', 'skills', jsonb_build_array('sequencing'),
           'days', jsonb_build_array(10, 0, 12, 5, 15, 0, 0))))
     FROM users u JOIN student_profiles p ON p.user_id = u.id
     JOIN parent_child_links l ON l.child_id = u.id
     WHERE u.username = $1
     ON CONFLICT (parent_id, week_key) DO NOTHING`,
    [username, week.key, week.startDay, week.endDay],
  );
}

/** A team room with these students in it (teams make rooms in the app). */
export async function roomWith(name: string, usernames: string[]): Promise<string> {
  const [room] = await select<{ id: string }>(
    `INSERT INTO chat_rooms (id, kind, ref_id, name)
     VALUES (gen_random_uuid(), 'TEAM', gen_random_uuid()::text, $1) RETURNING id`,
    [name],
  );
  await run(
    `INSERT INTO chat_members (room_id, user_id)
     SELECT $1::uuid, id FROM users WHERE username = ANY($2::text[])`,
    [room!.id, usernames],
  );
  return room!.id;
}

/** Makes a student younger (this year's age), e.g. under 13 for phrases only. */
export async function setAge(username: string, age: number) {
  await run(
    `UPDATE student_profiles SET birth_year = $2
     WHERE user_id = (SELECT id FROM users WHERE username = $1)`,
    [username, new Date().getUTCFullYear() - age],
  );
}

/** A hackathon in this state (staff make them in the admin panel). */
export async function eventWith(
  status: 'OPEN' | 'RUNNING',
  teamSize = 3,
): Promise<{ slug: string; id: string }> {
  const slug = `jam-${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
  const [event] = await select<{ id: string }>(
    `INSERT INTO events (id, slug, title, description, status, starts_at, ends_at, team_size, min_age, rubric, starter, updated_at)
     VALUES (gen_random_uuid(), $1, $2, 'Build a website for your school club in a weekend.', $3::"EventStatus",
       now(), now() + interval '3 days', $4, 13,
       '[{"key":"idea","label":"Idea","max":5},{"key":"code","label":"Code","max":5}]'::jsonb,
       jsonb_build_object('index.html', E'<h1>Our project</h1>\\n', 'style.css', E'body { padding: 16px; }\\n', 'script.js', ''),
       now())
     RETURNING id`,
    [slug, `Club Jam ${slug.slice(-4)}`, status, teamSize],
  );
  return { slug, id: event!.id };
}

export async function setEventStatus(id: string, status: string) {
  await run(`UPDATE events SET status = $2::"EventStatus" WHERE id = $1::uuid`, [id, status]);
}

export async function teamCode(slug: string): Promise<{ id: string; joinCode: string }> {
  const [team] = await select<{ id: string; join_code: string }>(
    `SELECT t.id, t.join_code FROM event_teams t JOIN events e ON e.id = t.event_id
     WHERE e.slug = $1 ORDER BY t.created_at DESC LIMIT 1`,
    [slug],
  );
  return { id: team!.id, joinCode: team!.join_code };
}

/** A school with this teacher, and a paid licence when `seats` is given. */
export async function schoolWithTeacher(
  teacherEmail: string,
  seats?: number,
): Promise<{ id: string; name: string }> {
  const name = `Crescent School ${Math.floor(Math.random() * 9000)}`;
  const [school] = await select<{ id: string }>(
    `INSERT INTO schools (id, name, country_code, city, contact_name, contact_email, updated_at)
     VALUES (gen_random_uuid(), $1, 'PK', 'Lahore', 'Mrs Aslam', 'office@crescent.test', now())
     RETURNING id`,
    [name],
  );
  await run(
    `INSERT INTO school_teachers (school_id, user_id)
     SELECT $1::uuid, id FROM users WHERE email = $2`,
    [school!.id, teacherEmail],
  );
  if (seats) {
    await run(
      `INSERT INTO school_licenses (id, school_id, seats, starts_at, ends_at, invoice_number,
                                    amount_minor, currency, paid_at, payment_reference)
       VALUES (gen_random_uuid(), $1::uuid, $2, now() - interval '1 day', now() + interval '300 days',
               'INV-' || gen_random_uuid(), 100000, 'PKR', now(), 'HBL 1')`,
      [school!.id, seats],
    );
  }
  return { id: school!.id, name };
}

/** As if the student finished every lesson of the Pro track. */
export async function finishProTrack(username: string) {
  await run(
    `INSERT INTO lesson_progress (user_id, lesson_id, status, completed_at, updated_at)
     SELECT u.id, l.id, 'COMPLETED', now(), now()
     FROM users u, lessons l JOIN modules m ON m.id = l.module_id
     WHERE u.username = $1 AND m.track_id = 'pro' AND l.is_active AND m.is_active
     ON CONFLICT (user_id, lesson_id) DO UPDATE SET status = 'COMPLETED', completed_at = now()`,
    [username],
  );
}
