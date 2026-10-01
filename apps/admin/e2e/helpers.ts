import { execFileSync } from 'node:child_process';
import { createHmac, randomUUID } from 'node:crypto';
import path from 'node:path';
import { type APIRequestContext, expect, type Page } from '@playwright/test';

export const API_URL = process.env.API_URL ?? 'http://localhost:3000';
const MAILPIT_URL = process.env.MAILPIT_URL ?? 'http://localhost:8025';
const PARENT_PASSWORD = 'a long enough password 123';
const CHILD_PASSWORD = 'kid pass 42';

const unique = (label: string) => `${label}-${randomUUID().slice(0, 8)}@browser.test`;

/** A staff account made with the same CLI people use (`pnpm staff:create`). */
export function createStaff(
  role: 'admin' | 'moderator' | 'super_admin' | 'content_creator' | 'mentor',
  name = `Test ${role}`,
) {
  const email = unique(role);
  const output = execFileSync(
    'node',
    ['dist/cli/create-staff.js', '--email', email, '--name', name, '--role', role],
    { cwd: path.resolve(import.meta.dirname, '../../api'), encoding: 'utf8' },
  );
  const password = output.match(/Temporary password: (\S+)/)?.[1];
  if (!password) throw new Error(`No password in staff CLI output:\n${output}`);
  return { email, name, password };
}

/** The token in the last email to this address, from a link like `…/path?token=…`. */
export async function emailToken(
  request: APIRequestContext,
  email: string,
  link = /verify-email\?token=([\w%-]+)/,
): Promise<string> {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const search = await request.get(`${MAILPIT_URL}/api/v1/search`, {
      params: { query: `to:"${email}"`, limit: '1' },
    });
    const { messages } = (await search.json()) as { messages: { ID: string }[] };
    if (messages[0]) {
      const message = await request.get(`${MAILPIT_URL}/api/v1/message/${messages[0].ID}`);
      const { Text } = (await message.json()) as { Text: string };
      const token = Text.match(link)?.[1];
      if (token) return decodeURIComponent(token);
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`No email with a link to ${email}`);
}

/** A confirmed parent with one child (account consent only), made through the API. */
export async function createFamily(
  request: APIRequestContext,
  { publicLeaderboards = false }: { publicLeaderboards?: boolean } = {},
) {
  const parent = { email: unique('parent'), name: 'Admin Test Parent' };
  const signUp = await request.post(`${API_URL}/v1/auth/parents/sign-up`, {
    data: {
      displayName: parent.name,
      email: parent.email,
      password: PARENT_PASSWORD,
      countryCode: 'PK',
      languageCode: 'en',
      acceptTerms: true,
    },
  });
  expect(signUp.status()).toBe(202);
  const token = await emailToken(request, parent.email);
  expect((await request.post(`${API_URL}/v1/auth/email/verify`, { data: { token } })).ok()).toBe(
    true,
  );

  const login = await request.post(`${API_URL}/v1/auth/login`, {
    data: { email: parent.email, password: PARENT_PASSWORD, tokenDelivery: 'body' },
  });
  const { accessToken } = (await login.json()) as { accessToken: string };
  const created = await request.post(`${API_URL}/v1/children`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    data: {
      nickname: `PixelComet${Math.floor(10 + Math.random() * 90)}`,
      avatarKey: 'rocket',
      birthYear: new Date().getUTCFullYear() - 14,
      countryCode: 'PK',
      languageCode: 'en',
      password: CHILD_PASSWORD,
      consents: { publicLeaderboards, publicPortfolio: false },
    },
  });
  expect(created.status()).toBe(201);
  const child = (await created.json()) as { id: string; username: string; nickname: string };
  return { parent, child, parentPassword: PARENT_PASSWORD };
}

/** The child passes the first challenge of the first lesson, earning XP. */
export async function earnXp(request: APIRequestContext, username: string) {
  const login = await request.post(`${API_URL}/v1/auth/students/login`, {
    data: { username, password: CHILD_PASSWORD, tokenDelivery: 'body' },
  });
  expect(login.ok()).toBe(true);
  const { accessToken } = (await login.json()) as { accessToken: string };
  const headers = { Authorization: `Bearer ${accessToken}` };
  const lesson = await request.get(`${API_URL}/v1/learning/lessons/builder-m01-l01`, { headers });
  expect(lesson.ok()).toBe(true);
  const { challenges } = (await lesson.json()) as {
    challenges: { id: string; starter: Record<string, string>; checks: { id: string }[] }[];
  };
  const challenge = challenges[0]!;
  const submitted = await request.post(
    `${API_URL}/v1/learning/challenges/${challenge.id}/submissions`,
    {
      headers,
      data: {
        code: { html: '<h1>Hello, world!</h1>' },
        results: challenge.checks.map((check) => ({ id: check.id, passed: true })),
      },
    },
  );
  expect(submitted.ok(), await submitted.text()).toBe(true);
  return ((await submitted.json()) as { xpAwarded: number }).xpAwarded;
}

// RFC 6238 time-based codes, as an authenticator app computes them.
function base32Decode(input: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of input.replaceAll(/[\s=]/g, '').toUpperCase()) {
    value = (value << 5) | alphabet.indexOf(char);
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

export function totp(secret: string, atMs = Date.now()): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(atMs / 30_000)));
  const hmac = createHmac('sha1', base32Decode(secret)).update(counter).digest();
  const offset = (hmac.at(-1) ?? 0) & 0x0f;
  const code = (hmac.readUInt32BE(offset) & 0x7f_ff_ff_ff) % 1_000_000;
  return code.toString().padStart(6, '0');
}

/** The parent pays by card through the development mock of Stripe Checkout. */
export async function payByCard(request: APIRequestContext, parentEmail: string) {
  const login = await request.post(`${API_URL}/v1/auth/login`, {
    data: { email: parentEmail, password: PARENT_PASSWORD, tokenDelivery: 'body' },
  });
  const { accessToken } = (await login.json()) as { accessToken: string };
  const headers = { Authorization: `Bearer ${accessToken}` };
  const checkout = await request.post(`${API_URL}/v1/billing/checkout`, {
    headers,
    data: { planKey: 'monthly', locale: 'en' },
  });
  expect(checkout.ok(), await checkout.text()).toBe(true);
  const { url } = (await checkout.json()) as { url: string };
  const paid = await request.post(`${url}/pay`, { maxRedirects: 0 });
  expect(paid.status()).toBe(303);
  // The mock's webhooks arrive a moment later.
  await expect
    .poll(
      async () => {
        const billing = await request.get(`${API_URL}/v1/billing`, { headers });
        return ((await billing.json()) as { subscription: { status: string } | null }).subscription
          ?.status;
      },
      { timeout: 15_000 },
    )
    .toBe('ACTIVE');
}

/** First login of a new staff account: password, then setting up the authenticator. */
export async function firstLogin(
  page: Page,
  staff: { email: string; password: string },
  landing = 'Overview',
) {
  await page.goto('/login');
  await page.getByLabel('Email address').fill(staff.email);
  await page.getByLabel('Password', { exact: true }).fill(staff.password);
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(
    page.getByRole('heading', { name: 'Set up two-factor authentication' }),
  ).toBeVisible();
  await expect(page.getByRole('img', { name: 'QR code for your authenticator app' })).toBeVisible();
  const secret = (await page.getByTestId('mfa-secret').textContent())?.replaceAll(' ', '') ?? '';
  await page.getByLabel('6-digit code').fill(totp(secret));
  await page.getByRole('button', { name: 'Turn on and log in' }).click();
  await expect(page.getByRole('heading', { name: landing, exact: true })).toBeVisible();
}
