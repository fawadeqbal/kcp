import { generateKeyPairSync, createVerify } from 'node:crypto';
import { FcmClient, InvalidTokenError, parseServiceAccount, signedJwt } from './fcm.js';
import { localHour, needsStreakReminder } from './push-jobs.service.js';
import {
  PUSH_LANGUAGES,
  type PushKind,
  pushCopyForTests,
  renderPush,
  toPushLanguage,
} from './push-copy.js';

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const account = {
  project_id: 'kcp-test',
  client_email: 'push@kcp-test.iam.gserviceaccount.com',
  private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
};

const placeholders = (text: string) => (text.match(/\{\w+\}/g) ?? []).toSorted();

describe('push texts', () => {
  it('has every notification in every app language, with the same placeholders', () => {
    for (const language of PUSH_LANGUAGES) {
      for (const kind of Object.keys(pushCopyForTests.en) as PushKind[]) {
        const copy = pushCopyForTests.en[kind];
        const translated = pushCopyForTests[language][kind];
        expect(placeholders(translated.title)).toEqual(placeholders(copy.title));
        expect(placeholders(translated.body)).toEqual(placeholders(copy.body));
      }
    }
  });

  it('fills in the values and falls back to English', () => {
    expect(renderPush('streakReminder', 'en', { days: 4 }).title).toBe('Your streak: 4 days');
    expect(toPushLanguage('fr')).toBe('en');
    expect(toPushLanguage('ur')).toBe('ur');
  });
});

describe('Firebase Cloud Messaging', () => {
  it('reads the service account as JSON or base64', () => {
    const json = JSON.stringify(account);
    expect(parseServiceAccount(json).project_id).toBe('kcp-test');
    expect(parseServiceAccount(Buffer.from(json).toString('base64')).client_email).toBe(
      account.client_email,
    );
    expect(() => parseServiceAccount('{"project_id":"x"}')).toThrow(/private_key/);
  });

  it('signs the token request with the service account key', () => {
    const [header, claims, signature] = signedJwt(account, 1_700_000_000_000).split('.');
    const verifier = createVerify('RSA-SHA256');
    verifier.update(`${header}.${claims}`);
    expect(verifier.verify(publicKey, Buffer.from(signature!, 'base64url'))).toBe(true);
    const body = JSON.parse(Buffer.from(claims!, 'base64url').toString()) as Record<
      string,
      unknown
    >;
    expect(body).toMatchObject({
      iss: account.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      iat: 1_700_000_000,
      exp: 1_700_003_600,
    });
  });

  it('sends one message per phone and spots tokens that stopped working', async () => {
    const calls: { url: string; body: string }[] = [];
    let answer = { status: 200, text: '{}' };
    const fetcher = (async (url: string, init: RequestInit) => {
      calls.push({ url, body: String(init.body) });
      if (url.includes('oauth2')) {
        return new Response(JSON.stringify({ access_token: 'at', expires_in: 3600 }));
      }
      return new Response(answer.text, { status: answer.status });
    }) as typeof fetch;
    const client = new FcmClient(account, fetcher);
    await client.send({ token: 'phone-1', title: 'T', body: 'B', data: { route: '/practice' } });
    await client.send({ token: 'phone-2', title: 'T', body: 'B', data: {} });
    // One OAuth token, reused.
    expect(calls.filter((c) => c.url.includes('oauth2'))).toHaveLength(1);
    const message = JSON.parse(calls[1]!.body) as { message: Record<string, unknown> };
    expect(calls[1]!.url).toBe('https://fcm.googleapis.com/v1/projects/kcp-test/messages:send');
    expect(message.message).toMatchObject({
      token: 'phone-1',
      notification: { title: 'T', body: 'B' },
      data: { route: '/practice' },
    });

    answer = {
      status: 404,
      text: '{"error":{"status":"NOT_FOUND","details":[{"errorCode":"UNREGISTERED"}]}}',
    };
    await expect(
      client.send({ token: 'gone', title: 'T', body: 'B', data: {} }),
    ).rejects.toBeInstanceOf(InvalidTokenError);
    answer = { status: 500, text: 'oops' };
    await expect(client.send({ token: 'x', title: 'T', body: 'B', data: {} })).rejects.toThrow(
      /500/,
    );
  });
});

describe('streak reminders', () => {
  it('works out the local hour', () => {
    const at = new Date('2026-10-01T13:05:00Z');
    expect(localHour(at, 'Asia/Karachi')).toBe(18);
    expect(localHour(at, 'Asia/Dubai')).toBe(17);
    expect(localHour(at, 'UTC')).toBe(13);
    expect(localHour(at, 'Not/AZone')).toBe(13);
  });

  it('reminds only students whose streak is alive and not kept today', () => {
    const streak = { current: 5, longest: 5, lastGoalDay: '2026-09-30', freezes: 0 };
    expect(needsStreakReminder(streak, '2026-10-01')).toBe(true);
    expect(needsStreakReminder(streak, '2026-09-30')).toBe(false);
    // Broken: missed a day without a freeze.
    expect(needsStreakReminder(streak, '2026-10-02')).toBe(false);
    // A freeze keeps it alive.
    expect(needsStreakReminder({ ...streak, freezes: 1 }, '2026-10-02')).toBe(true);
    expect(needsStreakReminder({ ...streak, lastGoalDay: null }, '2026-10-01')).toBe(false);
  });
});
