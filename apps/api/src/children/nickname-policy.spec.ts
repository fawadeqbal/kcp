import { STUDENT_USERNAME_PATTERN } from '@kcp/shared';
import {
  checkNickname,
  generateUsername,
  nicknameTokens,
  SUGGESTION_WORDS,
  suggestNicknames,
} from './nickname-policy.js';

describe('nickname policy', () => {
  it('splits nicknames into words', () => {
    expect(nicknameTokens('SwiftFalcon27')).toEqual(['swift', 'falcon', '27']);
    expect(nicknameTokens('code_ninja')).toEqual(['code', 'ninja']);
  });

  it('accepts safe nicknames', () => {
    expect(checkNickname('SwiftFalcon27')).toBeNull();
    expect(checkNickname('PixelWizard')).toBeNull();
    // A name inside a longer word is fine ("Ali" in "Alien").
    expect(checkNickname('AlienCoder')).toBeNull();
  });

  it('refuses real names, including the parent’s own name', () => {
    expect(checkNickname('Ayesha2014')).toBe('LOOKS_LIKE_REAL_NAME');
    expect(checkNickname('CoolAhmed')).toBe('LOOKS_LIKE_REAL_NAME');
    expect(checkNickname('RocketQureshi', 'Amina Qureshi')).toBe('LOOKS_LIKE_REAL_NAME');
  });

  it('refuses rude words and contact details', () => {
    expect(checkNickname('Kutta99')).toBe('INAPPROPRIATE');
    expect(checkNickname('InstaStar')).toBe('CONTAINS_CONTACT_INFO');
    expect(checkNickname('Coder03001234567')).toBe('CONTAINS_CONTACT_INFO');
  });

  it('refuses bad formats', () => {
    expect(checkNickname('ab')).toBe('INVALID_FORMAT');
    expect(checkNickname('has space')).toBe('INVALID_FORMAT');
    expect(checkNickname('نام')).toBe('INVALID_FORMAT');
  });

  it('only suggests nicknames that pass its own rules', () => {
    for (const adjective of SUGGESTION_WORDS.adjectives) {
      for (const noun of SUGGESTION_WORDS.nouns) {
        expect(checkNickname(`${adjective}${noun}42`)).toBeNull();
      }
    }
    const suggestions = suggestNicknames(6);
    expect(new Set(suggestions).size).toBe(6);
  });

  it('generates usernames in the student format', () => {
    for (let i = 0; i < 50; i++) {
      expect(generateUsername()).toMatch(STUDENT_USERNAME_PATTERN);
    }
  });
});
