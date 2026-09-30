import { hashPassword, verifyPassword } from './passwords.js';
import { SecretBox } from './secret-box.js';
import { randomToken, safeEqual, sha256 } from './tokens.js';
import { base32Decode, base32Encode, hotp, otpauthUrl, totp, verifyTotp } from './totp.js';

describe('passwords', () => {
  it('hashes with Argon2id and verifies only the right password', async () => {
    const hashed = await hashPassword('correct horse battery staple');
    expect(hashed).toMatch(/^\$argon2id\$/);
    await expect(verifyPassword(hashed, 'correct horse battery staple')).resolves.toBe(true);
    await expect(verifyPassword(hashed, 'wrong password')).resolves.toBe(false);
    await expect(verifyPassword('not-a-hash', 'anything')).resolves.toBe(false);
  });
});

describe('tokens', () => {
  it('creates unique URL-safe tokens and stable hashes', () => {
    const a = randomToken();
    const b = randomToken();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[\w-]{43}$/);
    expect(sha256('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(safeEqual('same', 'same')).toBe(true);
    expect(safeEqual('same', 'diff')).toBe(false);
  });
});

describe('SecretBox', () => {
  const box = new SecretBox(Buffer.alloc(32, 7).toString('base64'));

  it('round-trips a secret and never produces the same ciphertext twice', () => {
    const a = box.encrypt('JBSWY3DPEHPK3PXP');
    const b = box.encrypt('JBSWY3DPEHPK3PXP');
    expect(a).not.toBe(b);
    expect(box.decrypt(a)).toBe('JBSWY3DPEHPK3PXP');
  });

  it('rejects tampered data and the wrong key', () => {
    const encrypted = box.encrypt('secret');
    const parts = encrypted.split('.');
    parts[3] = Buffer.from('tampered').toString('base64url');
    expect(() => box.decrypt(parts.join('.'))).toThrow(/auth|decrypt/i);
    const other = new SecretBox(Buffer.alloc(32, 9).toString('base64'));
    expect(() => other.decrypt(encrypted)).toThrow(/auth|decrypt/i);
  });
});

describe('TOTP', () => {
  // RFC 4226 appendix D and RFC 6238 appendix B test vectors (SHA-1).
  const rfcSecret = Buffer.from('12345678901234567890');

  it('matches the RFC 4226 HOTP test vectors', () => {
    const expected = ['755224', '287082', '359152', '969429', '338314', '254676'];
    expected.forEach((code, counter) => expect(hotp(rfcSecret, counter)).toBe(code));
  });

  it('matches the RFC 6238 TOTP test vectors', () => {
    const secret = base32Encode(rfcSecret);
    // RFC values are 8 digits; the 6-digit code is their last six digits.
    expect(totp(secret, 59_000)).toBe('287082');
    expect(totp(secret, 1_111_111_109_000)).toBe('081804');
    expect(totp(secret, 1_234_567_890_000)).toBe('005924');
    expect(totp(secret, 2_000_000_000_000)).toBe('279037');
  });

  it('round-trips base32', () => {
    expect(base32Decode(base32Encode(rfcSecret)).equals(rfcSecret)).toBe(true);
    expect(base32Encode(Buffer.from('foobar'))).toBe('MZXW6YTBOI');
  });

  it('accepts the current code and one step of drift, nothing more', () => {
    const secret = base32Encode(rfcSecret);
    const now = 1_700_000_000_000;
    expect(verifyTotp(secret, totp(secret, now), now)).not.toBeNull();
    expect(verifyTotp(secret, totp(secret, now - 30_000), now)).not.toBeNull();
    expect(verifyTotp(secret, totp(secret, now - 90_000), now)).toBeNull();
    expect(verifyTotp(secret, 'abcdef', now)).toBeNull();
  });

  it('builds an otpauth link for authenticator apps', () => {
    const url = otpauthUrl({ secret: 'ABC', account: 'fawad@example.com', issuer: 'KCP Admin' });
    expect(url).toMatch(
      /^otpauth:\/\/totp\/KCP%20Admin%3Afawad%40example\.com\?secret=ABC&issuer=KCP/,
    );
  });
});
