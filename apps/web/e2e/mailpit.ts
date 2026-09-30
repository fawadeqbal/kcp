import type { APIRequestContext } from '@playwright/test';

const MAILPIT_URL = process.env.MAILPIT_URL ?? 'http://localhost:8025';

interface MailpitMessage {
  ID: string;
  Subject: string;
}

/** Waits for the newest email to an address in Mailpit and returns its subject and text. */
export async function waitForEmail(request: APIRequestContext, to: string, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const search = await request.get(`${MAILPIT_URL}/api/v1/search`, {
      params: { query: `to:"${to}"`, limit: '1' },
    });
    const { messages } = (await search.json()) as { messages: MailpitMessage[] };
    const latest = messages[0];
    if (latest) {
      const message = await request.get(`${MAILPIT_URL}/api/v1/message/${latest.ID}`);
      const body = (await message.json()) as { Subject: string; Text: string };
      return { subject: body.Subject, text: body.Text };
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`No email to ${to} within ${timeoutMs} ms`);
}

export function linkFrom(text: string, path: string): string {
  const match = text.match(new RegExp(`https?://\\S+${path}\\?token=[\\w%-]+`));
  if (!match) throw new Error(`No ${path} link in email`);
  return match[0];
}
