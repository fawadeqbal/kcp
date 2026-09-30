import { ADULT_PASSWORD_MIN_LENGTH, NICKNAME_PATTERN } from '@kcp/shared';

export { CHILD_PASSWORD_MIN_LENGTH } from '@kcp/shared';

/** Parents' passwords; the same rule the API enforces. */
export const PASSWORD_MIN_LENGTH = ADULT_PASSWORD_MIN_LENGTH;

/** Same pattern as the API; the API also checks for real names and contact details. */
export function isNickname(value: string): boolean {
  return NICKNAME_PATTERN.test(value.trim());
}

// Deliberately simple: the API does the real check and sends the confirmation email.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

export const PENDING_EMAIL_KEY = 'kcp.pendingEmail';

/** Remembers the address a confirmation link was sent to, for the "check your email" page. */
export function rememberPendingEmail(email: string): void {
  try {
    sessionStorage.setItem(PENDING_EMAIL_KEY, email);
  } catch {
    // Storage can be unavailable (private mode); the page then shows a generic message.
  }
}

export function readPendingEmail(): string | null {
  try {
    return sessionStorage.getItem(PENDING_EMAIL_KEY);
  } catch {
    return null;
  }
}

/**
 * Wraps left-to-right text (emails) in Unicode isolate marks so it displays correctly
 * inside Arabic and Urdu sentences.
 */
export function isolate(text: string): string {
  return `\u2068${text}\u2069`;
}
