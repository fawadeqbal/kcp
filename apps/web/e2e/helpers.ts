import type { Locale } from '@kcp/i18n';
import ar from '@kcp/i18n/messages/ar.json' with { type: 'json' };
import en from '@kcp/i18n/messages/en.json' with { type: 'json' };
import ur from '@kcp/i18n/messages/ur.json' with { type: 'json' };
import { type APIRequestContext, expect, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { createHmac } from 'node:crypto';
import path from 'node:path';
import { waitForEmail } from './mailpit';

export type Messages = typeof en;
export const MESSAGES: Record<Locale, Messages> = { en, ar, ur };

export const API_URL = process.env.API_URL ?? 'http://localhost:3000';
export const PARENT_PASSWORD = 'a long enough password 123';

/** Wraps text the way the app does inside sentences (Unicode isolates). */
export const isolate = (text: string) => `⁨${text}⁩`;

export const uniqueEmail = (label: string) =>
  `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@browser.test`;

/** A confirmed parent account, created through the API (the sign-up page has its own tests). */
export async function createParent(
  request: APIRequestContext,
  { locale = 'en', name = 'Test Parent' }: { locale?: Locale; name?: string } = {},
) {
  const email = uniqueEmail(`parent-${locale}`);
  const signUp = await request.post(`${API_URL}/v1/auth/parents/sign-up`, {
    data: {
      displayName: name,
      email,
      password: PARENT_PASSWORD,
      countryCode: 'PK',
      languageCode: locale,
      acceptTerms: true,
    },
  });
  expect(signUp.status()).toBe(202);
  const mail = await waitForEmail(request, email);
  const token = mail.text.match(/verify-email\?token=([\w%-]+)/)?.[1];
  if (!token) throw new Error('No confirmation link in email');
  const verify = await request.post(`${API_URL}/v1/auth/email/verify`, {
    data: { token: decodeURIComponent(token) },
  });
  expect(verify.ok()).toBe(true);
  return { email, name };
}

export async function logInAsParent(page: Page, locale: Locale, email: string) {
  const m = MESSAGES[locale];
  await page.goto(`/${locale}/login`);
  await page.getByLabel(m.auth.email).fill(email);
  await page.getByRole('textbox', { name: m.auth.password, exact: true }).fill(PARENT_PASSWORD);
  await page.getByRole('main').getByRole('button', { name: m.auth.login.submit }).click();
  await expect(page).toHaveURL(new RegExp(`/${locale}/dashboard$`));
}

export const STUDENT_PASSWORD = 'kid pass 42';

/** A child account made by a new parent through the API, ready to log in. */
export async function createStudent(
  request: APIRequestContext,
  {
    locale = 'en',
    consents = {},
  }: {
    locale?: Locale;
    consents?: { publicLeaderboards?: boolean; publicPortfolio?: boolean };
  } = {},
) {
  const parent = await createParent(request, { locale });
  const login = await request.post(`${API_URL}/v1/auth/login`, {
    data: { email: parent.email, password: PARENT_PASSWORD, tokenDelivery: 'body' },
  });
  expect(login.ok()).toBe(true);
  const { accessToken } = (await login.json()) as { accessToken: string };
  const nickname = `Coder${Math.floor(10 + Math.random() * 90)}`;
  const created = await request.post(`${API_URL}/v1/children`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    data: {
      nickname,
      avatarKey: 'rocket',
      // Accounts for under-13s open later (Phase 2, with verified parental consent).
      birthYear: new Date().getUTCFullYear() - 14,
      countryCode: 'PK',
      languageCode: locale,
      password: STUDENT_PASSWORD,
      consents: { publicLeaderboards: false, publicPortfolio: false, ...consents },
    },
  });
  expect(created.status(), await created.text()).toBe(201);
  const { username } = (await created.json()) as { username: string };
  return { parentToken: accessToken, email: parent.email, nickname, username };
}

export async function logInAsStudent(page: Page, locale: Locale, username: string) {
  const m = MESSAGES[locale];
  await page.goto(`/${locale}/login/student`);
  await page.getByLabel(m.auth.student.username).fill(username);
  await page.getByRole('textbox', { name: m.auth.password, exact: true }).fill(STUDENT_PASSWORD);
  await page.getByRole('button', { name: m.auth.student.submit }).click();
  await expect(page).toHaveURL(new RegExp(`/${locale}/learn$`));
}

/** Closes the "New badge!" celebrations for these badges, which show one at a time. */
export async function celebrate(page: Page, m: Messages, keys: string[]) {
  const names = m.badges as unknown as Record<string, { name: string }>;
  const dialog = page.getByRole('dialog', { name: m.badges.celebrateTitle });
  for (const key of keys) {
    await expect(dialog.getByText(names[key]?.name ?? key, { exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: m.badges.celebrateClose }).click();
  }
  await expect(dialog).toHaveCount(0);
}

/**
 * A mentor or teacher account, made with the same CLI people use (`pnpm staff:create`).
 * They sign in to the web app with a password and a two-factor code.
 */
export function createAdult(role: 'mentor' | 'teacher') {
  const email = uniqueEmail(role);
  const output = execFileSync(
    'node',
    ['dist/cli/create-staff.js', '--email', email, '--name', `Test ${role}`, '--role', role],
    { cwd: path.resolve(import.meta.dirname, '../../api'), encoding: 'utf8' },
  );
  const password = output.match(/Temporary password: (\S+)/)?.[1];
  if (!password) throw new Error(`No password in the CLI output:\n${output}`);
  return { email, password };
}

/**
 * Logs a mentor or teacher in for the first time: password, then setting up the
 * authenticator app (the secret is read off the page), landing on their home.
 */
export async function firstTwoFactorLogin(
  page: Page,
  locale: Locale,
  account: { email: string; password: string },
) {
  const m = MESSAGES[locale];
  await page.goto(`/${locale}/login`);
  await page.getByLabel(m.auth.email).fill(account.email);
  await page.getByRole('textbox', { name: m.auth.password, exact: true }).fill(account.password);
  await page.getByRole('main').getByRole('button', { name: m.auth.login.submit }).click();
  await expect(page.getByRole('heading', { name: m.auth.twoFactor.setupTitle })).toBeVisible();
  await expect(page.getByRole('img', { name: m.auth.twoFactor.qrAlt })).toBeVisible();
  const secret = (await page.getByTestId('mfa-secret').textContent())?.replaceAll(' ', '') ?? '';
  await page.getByLabel(m.auth.twoFactor.codeLabel).fill(totp(secret));
  await page.getByRole('button', { name: m.auth.twoFactor.setupSubmit }).click();
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
  counter.writeBigUInt64BE(BigInt(Math.floor(atMs / 1000 / 30)));
  const hmac = createHmac('sha1', base32Decode(secret)).update(counter).digest();
  const offset = hmac[hmac.length - 1]! & 0xf;
  const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return String(code).padStart(6, '0');
}

/** A student's access token (API login), for setting things up without the browser. */
export async function studentToken(request: APIRequestContext, username: string) {
  const login = await request.post(`${API_URL}/v1/auth/students/login`, {
    data: { username, password: STUDENT_PASSWORD, tokenDelivery: 'body' },
  });
  expect(login.ok()).toBe(true);
  return ((await login.json()) as { accessToken: string }).accessToken;
}
