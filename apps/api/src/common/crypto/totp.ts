import { createHmac, randomBytes } from 'node:crypto';

/**
 * Time-based one-time passwords (RFC 6238) for staff two-factor login, compatible
 * with Google Authenticator, Microsoft Authenticator, 1Password and similar apps.
 */

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export const TOTP_PERIOD_SECONDS = 30;
export const TOTP_DIGITS = 6;

export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

export function base32Decode(input: string): Buffer {
  const clean = input.replace(/=+$/, '').replace(/\s+/g, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of clean) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) {
      throw new Error(`Invalid base32 character: ${char}`);
    }
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/** A new random secret (160 bits, as RFC 4226 recommends), base32-encoded. */
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

export function timeStep(atMs: number = Date.now()): number {
  return Math.floor(atMs / 1000 / TOTP_PERIOD_SECONDS);
}

/** HOTP (RFC 4226) for a counter value. */
export function hotp(secret: Buffer, counter: number, digits = TOTP_DIGITS): string {
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac('sha1', secret).update(message).digest();
  const offset = digest[digest.length - 1]! & 0x0f;
  const binary =
    ((digest[offset]! & 0x7f) << 24) |
    (digest[offset + 1]! << 16) |
    (digest[offset + 2]! << 8) |
    digest[offset + 3]!;
  return String(binary % 10 ** digits).padStart(digits, '0');
}

export function totp(base32Secret: string, atMs: number = Date.now()): string {
  return hotp(base32Decode(base32Secret), timeStep(atMs));
}

/**
 * Checks a code against the current time step and one step either side (to allow
 * for clock drift). Returns the matching time step, or null. Callers must reject a
 * step that was already used, so a code can't be replayed.
 */
export function verifyTotp(
  base32Secret: string,
  code: string,
  atMs: number = Date.now(),
): number | null {
  if (!/^\d{6}$/.test(code)) {
    return null;
  }
  const secret = base32Decode(base32Secret);
  const current = timeStep(atMs);
  for (const step of [current, current - 1, current + 1]) {
    if (hotp(secret, step) === code) {
      return step;
    }
  }
  return null;
}

/** The otpauth:// link authenticator apps read from a QR code. */
export function otpauthUrl(options: { secret: string; account: string; issuer: string }): string {
  const label = encodeURIComponent(`${options.issuer}:${options.account}`);
  const params = new URLSearchParams({
    secret: options.secret,
    issuer: options.issuer,
    algorithm: 'SHA1',
    digits: String(TOTP_DIGITS),
    period: String(TOTP_PERIOD_SECONDS),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}
