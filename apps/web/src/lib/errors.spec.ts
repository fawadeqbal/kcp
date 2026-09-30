import en from '@kcp/i18n/messages/en.json' with { type: 'json' };
import { errorMessageKey, isNicknameError, KNOWN_ERROR_CODES } from './errors';

describe('errorMessageKey', () => {
  it('uses the specific message for known API errors', () => {
    expect(errorMessageKey('INVALID_CREDENTIALS')).toBe('INVALID_CREDENTIALS');
  });

  it('falls back to a generic message', () => {
    expect(errorMessageKey('SOMETHING_NEW')).toBe('generic');
    expect(errorMessageKey(undefined)).toBe('generic');
  });

  it('explains network failures separately', () => {
    expect(errorMessageKey(undefined, true)).toBe('network');
  });
});

describe('isNicknameError', () => {
  it('recognises the nickname policy errors', () => {
    expect(isNicknameError('NICKNAME_LOOKS_LIKE_REAL_NAME')).toBe(true);
    expect(isNicknameError('TOO_MANY_CHILDREN')).toBe(false);
    expect(isNicknameError(undefined)).toBe(false);
  });
});

describe('error messages', () => {
  it('has an English message for every known code (other languages are checked by @kcp/i18n)', () => {
    const missing = KNOWN_ERROR_CODES.filter((code) => !(code in en.errors));
    expect(missing).toEqual([]);
  });
});
