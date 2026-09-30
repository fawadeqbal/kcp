import { isEmail, isNickname } from './validation';

describe('isEmail', () => {
  it('accepts normal addresses and rejects obvious mistakes', () => {
    expect(isEmail('parent@example.com')).toBe(true);
    expect(isEmail(' parent@example.com ')).toBe(true);
    expect(isEmail('parent@example')).toBe(false);
    expect(isEmail('parent example.com')).toBe(false);
    expect(isEmail('')).toBe(false);
  });
});

describe('isNickname', () => {
  it('follows the API rule: 3 to 20 letters, digits or _, starting with a letter', () => {
    expect(isNickname('SwiftFalcon27')).toBe(true);
    expect(isNickname(' Code_Cat ')).toBe(true);
    expect(isNickname('ab')).toBe(false);
    expect(isNickname('7Falcons')).toBe(false);
    expect(isNickname('has space')).toBe(false);
    expect(isNickname('a'.repeat(21))).toBe(false);
  });
});
