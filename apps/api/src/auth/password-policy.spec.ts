import { weakPasswordReason } from './password-policy.js';

describe('weakPasswordReason', () => {
  it.each([
    'password1234',
    'Password2026!',
    'P@ssw0rd2026',
    'qwertyuiop12',
    '123456789012',
    '098765432109',
    'aaaaaaaaaaaa',
    'abababababab',
    'iloveyou2026',
    'pakistan1947',
    'welcome12345',
    'minecraft123',
    '121212121212',
  ])('refuses %s', (password) => {
    expect(weakPasswordReason(password)).not.toBeNull();
  });

  it.each([
    'a long enough password 123',
    'kid pass 42',
    'purple tiger jumps 7',
    'Correct horse battery staple',
    'مرحبا بالعالم ٢٠٢٦ كود',
  ])('accepts %s', (password) => {
    expect(weakPasswordReason(password)).toBeNull();
  });

  it("refuses the person's own email, name or username", () => {
    expect(weakPasswordReason('samira.khan2026', { email: 'samira.khan@example.com' })).toMatch(
      /name, email/,
    );
    expect(weakPasswordReason('Hassan is great 1', { name: 'Hassan Ali' })).toMatch(/name/);
    expect(weakPasswordReason('super-viking-99 go', { username: 'super-viking-99' })).toMatch(
      /username/,
    );
    expect(weakPasswordReason('a long enough password 123', { name: 'Al' })).toBeNull();
  });
});
