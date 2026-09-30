import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/** A URL-safe random token with 256 bits of entropy (refresh tokens, email links). */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/** Tokens are stored only as SHA-256 hashes, so a database leak does not leak live tokens. */
export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
