import { BadRequestException } from '@nestjs/common';

/**
 * Passwords that meet the length rule but are still among the first an attacker
 * tries: common words with digits, keyboard rows, counting, one repeated character,
 * or the person's own email or name. Checked when a password is set (sign-up, reset,
 * change, a child's password), never when logging in.
 */

/** Words (and the digits people add to them) that top every leaked-password list. */
const COMMON_WORDS = [
  'password',
  'passw0rd',
  'qwerty',
  'azerty',
  'asdfgh',
  'zxcvbn',
  'letmein',
  'welcome',
  'iloveyou',
  'admin',
  'administrator',
  'login',
  'monkey',
  'dragon',
  'football',
  'baseball',
  'cricket',
  'sunshine',
  'princess',
  'master',
  'shadow',
  'superman',
  'batman',
  'starwars',
  'pokemon',
  'minecraft',
  'roblox',
  'secret',
  'changeme',
  'default',
  'abc',
  'test',
  'kids',
  'coding',
  'kidscoding',
  'kidscodingplatform',
  'pakistan',
  'karachi',
  'lahore',
  'islamabad',
  'egypt',
  'cairo',
  'dubai',
  'emirates',
  'saudi',
  'riyadh',
  'jeddah',
  'allah',
  'bismillah',
  'mashallah',
  'insha',
  'inshallah',
  'muhammad',
  'mohammed',
];

const KEYBOARD_ROWS = [
  '1234567890',
  'qwertyuiop',
  'asdfghjkl',
  'zxcvbnm',
  'abcdefghijklmnopqrstuvwxyz',
];

/** "Password2026!" → "password": letters only, lower case, common swaps undone. */
function core(value: string): string {
  return value
    .toLowerCase()
    .replaceAll('@', 'a')
    .replaceAll('$', 's')
    .replaceAll('0', 'o')
    .replaceAll('1', 'i')
    .replaceAll('3', 'e')
    .replace(/[^a-z]/g, '');
}

/** Whether every step to the next character follows a keyboard row or counting. */
function isSequence(value: string): boolean {
  const text = value.toLowerCase().replace(/\s/g, '');
  if (text.length < 4) return false;
  return KEYBOARD_ROWS.some((row) => {
    const forward = row + row;
    const backward = [...forward].toReversed().join('');
    return forward.includes(text) || backward.includes(text);
  });
}

export interface PasswordContext {
  email?: string | null;
  name?: string | null;
  username?: string | null;
  nickname?: string | null;
}

/** Why this password is too easy to guess, or null when it's fine. */
export function weakPasswordReason(password: string, context: PasswordContext = {}): string | null {
  const lower = password.toLowerCase();
  const compact = lower.replace(/\s/g, '');
  if (new Set(compact).size < 4) return 'It repeats the same few characters.';
  if (isSequence(compact) || /^(\d)\1*$|^(\d+)\2+$/.test(compact)) {
    return 'It follows the keyboard or counts up.';
  }
  // Digits and symbols around a word ("Password2026!") don't make it any harder.
  const word = compact.replace(/^[^\p{L}]+/u, '').replace(/[^\p{L}]+$/u, '');
  if (isSequence(word)) return 'It follows the keyboard or counts up.';
  const letters = core(word);
  // The letters are nothing but common words (in any order), with digits and symbols around.
  const remaining = COMMON_WORDS.toSorted((a, b) => b.length - a.length).reduce(
    (rest, common) => rest.replaceAll(common, ''),
    letters,
  );
  if (letters.length > 0 && remaining.length === 0) return 'It is a very common password.';
  if (letters.length === 0 && /^\d+$/.test(compact)) return 'It is only digits.';
  const personal = [
    context.email?.split('@')[0],
    context.username,
    context.nickname,
    ...(context.name?.split(/\s+/) ?? []),
  ]
    .map((part) => (part ?? '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, ''))
    .filter((part) => part.length >= 4);
  if (personal.some((part) => compact.replace(/[^\p{L}\p{N}]/gu, '').includes(part))) {
    return 'It contains your name, email or username.';
  }
  return null;
}

/** Refuses a weak password with 400 PASSWORD_TOO_WEAK (the apps explain it). */
export function assertStrongPassword(password: string, context: PasswordContext = {}): void {
  const reason = weakPasswordReason(password, context);
  if (reason) {
    throw new BadRequestException({
      error: 'PASSWORD_TOO_WEAK',
      message: `Please choose a harder password. ${reason}`,
    });
  }
}
