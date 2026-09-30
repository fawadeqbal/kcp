/**
 * Many students at once: each signs in (from its own IP address, as families do),
 * opens the lesson map and a lesson, then keeps submitting challenges, reading
 * leaderboards and checking its progress, with a few seconds' thought in between.
 * Prints latency percentiles and errors per kind of request, and writes them as JSON.
 *
 *   node src/seed.ts --students=1000        (once)
 *   node src/run.ts --students=1000 --ramp=60 --duration=180 --out=results.json
 *
 * API_URL (default http://localhost:3000). Run the API with rate limits as in
 * production; each student has its own X-Forwarded-For address (TRUST_PROXY_HOPS=1).
 * A submission counts as an error unless the solution passes ("wrong answer").
 */
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'yaml';
import { assertNotProduction, option, PASSWORD, username } from './shared.ts';

const API = process.env['API_URL'] ?? 'http://localhost:3000';
assertNotProduction(API);

const STUDENTS = option('students', 1000);
const RAMP_SECONDS = option('ramp', 60);
const DURATION_SECONDS = option('duration', 180);
const THINK_MIN_MS = option('think-min', 3000);
const THINK_MAX_MS = option('think-max', 8000);
const OUT = process.argv.find((a) => a.startsWith('--out='))?.slice(6);

interface Challenge {
  id: string;
  lessonId: string;
  solution: Record<string, string>;
  checks: { id: string }[];
}

/** Module 1's challenges and their solutions, from content/ (so they really pass). */
async function loadChallenges(): Promise<Challenge[]> {
  const root = path.resolve(import.meta.dirname, '../../../content/builder/m01-first-website');
  const challenges: Challenge[] = [];
  for (const lesson of (await readdir(root, { withFileTypes: true })).filter((d) =>
    d.isDirectory(),
  )) {
    const lessonFile = parse(await readFile(path.join(root, lesson.name, 'lesson.yaml'), 'utf8'));
    const dir = path.join(root, lesson.name, 'challenges');
    for (const file of (await readdir(dir)).filter((name) => /^c\d+\.yaml$/.test(name))) {
      const data = parse(await readFile(path.join(dir, file), 'utf8')) as Omit<
        Challenge,
        'lessonId'
      >;
      challenges.push({ ...data, lessonId: (lessonFile as { id: string }).id });
    }
  }
  return challenges;
}

// ── Measuring ────────────────────────────────────────────────────────────────

const samples = new Map<string, number[]>();
const failures = new Map<string, Map<string, number>>();

function record(name: string, ms: number, status: number | string, ok: boolean) {
  if (!samples.has(name)) samples.set(name, []);
  samples.get(name)!.push(ms);
  if (!ok) {
    const byStatus = failures.get(name) ?? new Map<string, number>();
    byStatus.set(String(status), (byStatus.get(String(status)) ?? 0) + 1);
    failures.set(name, byStatus);
  }
}

async function call(
  name: string,
  method: 'GET' | 'POST',
  url: string,
  ip: string,
  token?: string,
  body?: unknown,
  /** For answers that can be 200 and still wrong: what makes them right. */
  expect?: (data: unknown) => boolean,
): Promise<unknown> {
  const started = performance.now();
  try {
    const response = await fetch(`${API}${url}`, {
      method,
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': ip,
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      ...(method === 'POST' ? { body: JSON.stringify(body ?? {}) } : {}),
      signal: AbortSignal.timeout(30_000),
    });
    const data = response.headers.get('content-type')?.includes('json')
      ? await response.json()
      : await response.text();
    const right = response.ok && (!expect || expect(data));
    record(
      name,
      performance.now() - started,
      response.ok && !right ? 'wrong answer' : response.status,
      right,
    );
    return right ? data : null;
  } catch (error) {
    record(name, performance.now() - started, (error as Error).name, false);
    return null;
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const think = () => sleep(THINK_MIN_MS + Math.random() * (THINK_MAX_MS - THINK_MIN_MS));
const pick = <T>(items: readonly T[]) => items[Math.floor(Math.random() * items.length)]!;

// ── One student ──────────────────────────────────────────────────────────────

async function student(index: number, challenges: Challenge[], endsAt: number) {
  const ip = `10.${(index >> 16) & 255}.${(index >> 8) & 255}.${index & 255}`;
  const login = (await call('login', 'POST', '/v1/auth/students/login', ip, undefined, {
    username: username(index),
    password: PASSWORD,
    tokenDelivery: 'body',
  })) as { accessToken?: string } | null;
  const token = login?.accessToken;
  if (!token) return;
  await call('lesson map', 'GET', '/v1/learning/tracks?lang=ur', ip, token);
  await call('lesson', 'GET', `/v1/learning/lessons/${pick(challenges).lessonId}`, ip, token);
  while (Date.now() < endsAt) {
    await think();
    if (Date.now() >= endsAt) break;
    const roll = Math.random();
    if (roll < 0.4) {
      const challenge = pick(challenges);
      await call(
        'submit challenge',
        'POST',
        `/v1/learning/challenges/${challenge.id}/submissions`,
        ip,
        token,
        {
          code: challenge.solution,
          results: challenge.checks.map((check) => ({ id: check.id, passed: true })),
        },
        // The real solution must pass (the server re-checks HTML and CSS).
        (data) => (data as { passed?: boolean }).passed === true,
      );
    } else if (roll < 0.75) {
      const scope = pick(['global', 'country', 'region', 'city'] as const);
      const period = pick(['week', 'week', 'season', 'all'] as const);
      await call(
        'leaderboard',
        'GET',
        `/v1/leaderboards?scope=${scope}&period=${period}`,
        ip,
        token,
      );
    } else if (roll < 0.9) {
      await call('progress', 'GET', '/v1/progress', ip, token);
    } else {
      await call('lesson map', 'GET', '/v1/learning/tracks?lang=ur', ip, token);
    }
  }
}

// ── Report ───────────────────────────────────────────────────────────────────

const percentile = (sorted: number[], p: number) =>
  sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))]! : 0;

function report(seconds: number) {
  const rows = [...samples.entries()].map(([name, values]) => {
    const sorted = values.toSorted((a, b) => a - b);
    const failed = [...(failures.get(name)?.values() ?? [])].reduce((a, b) => a + b, 0);
    return {
      request: name,
      count: values.length,
      perSecond: Math.round((values.length / seconds) * 10) / 10,
      p50: Math.round(percentile(sorted, 50)),
      p95: Math.round(percentile(sorted, 95)),
      p99: Math.round(percentile(sorted, 99)),
      max: Math.round(sorted.at(-1) ?? 0),
      errors: failed,
      errorsByStatus: Object.fromEntries(failures.get(name) ?? []),
    };
  });
  const total = rows.reduce((sum, r) => sum + r.count, 0);
  const errors = rows.reduce((sum, r) => sum + r.errors, 0);
  console.log(
    `\n${STUDENTS} students, ${RAMP_SECONDS} s ramp-up, ${DURATION_SECONDS} s in all: ` +
      `${total} requests (${Math.round(total / seconds)}/s), ${errors} errors (${((errors / Math.max(1, total)) * 100).toFixed(2)}%)\n`,
  );
  console.log('| Request | Count | Per second | p50 ms | p95 ms | p99 ms | Max ms | Errors |');
  console.log('| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |');
  for (const r of rows) {
    console.log(
      `| ${r.request} | ${r.count} | ${r.perSecond} | ${r.p50} | ${r.p95} | ${r.p99} | ${r.max} | ${r.errors}${r.errors ? ` ${JSON.stringify(r.errorsByStatus)}` : ''} |`,
    );
  }
  return {
    students: STUDENTS,
    rampSeconds: RAMP_SECONDS,
    durationSeconds: seconds,
    total,
    errors,
    rows,
  };
}

const challenges = await loadChallenges();
const started = Date.now();
const endsAt = started + DURATION_SECONDS * 1000;
console.log(`Load test: ${STUDENTS} students against ${API} for ${DURATION_SECONDS} s…`);
const running: Promise<void>[] = [];
for (let i = 1; i <= STUDENTS; i++) {
  running.push(student(i, challenges, endsAt));
  // Students arrive over the ramp-up, not all in the same millisecond.
  await sleep((RAMP_SECONDS * 1000) / STUDENTS);
}
await Promise.all(running);
const result = report((Date.now() - started) / 1000);
if (OUT) await writeFile(OUT, `${JSON.stringify(result, null, 2)}\n`);
