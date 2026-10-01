import { filterProblem, normalizeForFilter, normalizeTerm } from './chat-filter.js';

describe('the room text filter', () => {
  it('lets friendly messages through, in every language', () => {
    for (const text of [
      'Great job on the game!',
      'Can you check my loop? I think step 3 is wrong',
      'أحسنت! فكرة رائعة',
      'بہت اچھا کام، شاباش',
      'kal milte hain, bohat maza aya',
      'I scored 120 points in 2 minutes',
    ]) {
      expect(filterProblem(text)).toBeNull();
    }
  });

  it('refuses links, emails and phone numbers, however they are written', () => {
    expect(filterProblem('look at https://example.com')).toBe('LINK');
    expect(filterProblem('go to www.site.pk')).toBe('LINK');
    expect(filterProblem('mysite dot com')).toBe('LINK');
    expect(filterProblem('mysite.com')).toBe('LINK');
    expect(filterProblem('mail me: kid@example.com')).toBe('EMAIL');
    expect(filterProblem('kid (at) example.com')).toBe('EMAIL');
    expect(filterProblem('my gmail is kid99')).toBe('EMAIL');
    expect(filterProblem('call 0300 123 4567')).toBe('PHONE');
    expect(filterProblem('+92-300-1234567')).toBe('PHONE');
    expect(filterProblem('رقمي ٠٣٠٠١٢٣٤٥٦٧')).toBe('PHONE');
    expect(filterProblem('نمبر ۰۳۰۰۱۲۳۴۵۶۷')).toBe('PHONE');
  });

  it('refuses ways to meet outside the platform', () => {
    expect(filterProblem('add me on snap')).toBe('CONTACT');
    expect(filterProblem('whatsapp me')).toBe('CONTACT');
    expect(filterProblem('Whats App me')).toBe('CONTACT');
    // Short names only as whole words: a snapshot is fine.
    expect(filterProblem('I took a snapshot of my game')).toBeNull();
    expect(filterProblem('كلمني واتساب')).toBe('CONTACT');
    expect(filterProblem('انسٹا پر آؤ')).toBe('CONTACT');
  });

  it('refuses unkind words, disguised or not, and words staff added', () => {
    expect(filterProblem('you are STUPID')).toBe('WORDS');
    expect(filterProblem('you are stuuupid')).toBe('WORDS');
    expect(filterProblem('you are 5tup1d')).toBe('WORDS');
    expect(filterProblem('s t u p i d')).toBe('WORDS');
    expect(filterProblem('shut up now')).toBe('WORDS');
    expect(filterProblem('أنت غبيّ')).toBe('WORDS');
    expect(filterProblem('تم بیوقوف ہو')).toBe('WORDS');
    expect(filterProblem('tu gadha hai')).toBe('WORDS');
    expect(filterProblem('that was meanie', [normalizeTerm('Meanie')])).toBe('WORDS');
    // Whole words only: "class" doesn't match "ass"-like pieces, "dumbbell" isn't "dumb".
    expect(filterProblem('I lift a dumbbell')).toBeNull();
  });

  it('normalises Arabic and Urdu letter forms and marks', () => {
    expect(normalizeForFilter('أَنْتَ')).toBe(normalizeForFilter('انت'));
    expect(normalizeForFilter('کتا')).toBe(normalizeForFilter('كتا'));
  });
});
