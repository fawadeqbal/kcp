import { MAIL_COPY, renderMail, toMailLanguage } from './templates.js';

describe('mail templates', () => {
  it('has the same templates in every language', () => {
    const [en, ...others] = Object.values(MAIL_COPY).map((copy) =>
      Object.keys(copy.templates).toSorted(),
    );
    for (const keys of others) {
      expect(keys).toEqual(en);
    }
  });

  it('renders right-to-left for Arabic and Urdu', () => {
    for (const lang of ['ar', 'ur'] as const) {
      const mail = renderMail('verifyEmail', lang, { name: 'Sara', actionUrl: 'https://x.test/v' });
      expect(mail.html).toContain(`dir="rtl"`);
      expect(mail.html).toContain(`lang="${lang}"`);
    }
    expect(
      renderMail('verifyEmail', 'en', { name: 'Sara', actionUrl: 'https://x.test' }).html,
    ).toContain('dir="ltr"');
  });

  it('includes the link in text and HTML, and escapes names', () => {
    const mail = renderMail('resetPassword', 'en', {
      name: '<script>alert(1)</script>',
      actionUrl: 'https://app.test/en/reset-password?token=abc',
    });
    expect(mail.text).toContain('https://app.test/en/reset-password?token=abc');
    expect(mail.html).toContain('https://app.test/en/reset-password?token=abc');
    expect(mail.html).not.toContain('<script>');
  });

  it('falls back to English for other languages', () => {
    expect(toMailLanguage('fr')).toBe('en');
    expect(toMailLanguage('ur')).toBe('ur');
  });

  it('fills in values and lists, escaped', () => {
    const mail = renderMail('monthlySummary', 'ur', {
      name: 'Sara',
      actionUrl: 'https://app.test/ur/dashboard',
      vars: { month: 'ستمبر 2026' },
      lines: ['Rocket: <b>5</b>'],
    });
    expect(mail.subject).toContain('ستمبر 2026');
    expect(mail.html).toContain('<li');
    expect(mail.html).toContain('&#60;b&#62;5');
    expect(mail.text).toContain('- Rocket: <b>5</b>');
    const waitlist = renderMail('waitlistConfirm', 'en', { name: '', actionUrl: 'https://x' });
    expect(waitlist.text.startsWith('Hello,')).toBe(true);
  });

  it('names a child in the trial reminder in every language', () => {
    for (const lang of ['en', 'ar', 'ur'] as const) {
      const mail = renderMail('trialEnding', lang, {
        name: 'Sara',
        actionUrl: 'https://x',
        vars: { nickname: 'Rocket', date: '14 Oct' },
      });
      expect(mail.subject).toContain('Rocket');
      expect(mail.text).toContain('14 Oct');
    }
  });
});
