/**
 * The filter every typed room message passes before it is stored (13 and older; younger
 * students send ready-made phrases only). It refuses, rather than hides, so a child
 * never sees a message change: links, email addresses, phone numbers, ways to reach
 * someone outside the platform (app names), and unkind words (built-in lists in English,
 * Arabic, Urdu and Roman Urdu, plus words staff add in the admin panel).
 *
 * Text is normalised first (lower case, no accents or Arabic marks, the letter forms
 * people swap, look-alike digits and symbols, stretched letters), so "B.a.d", "baaad"
 * and "b4d" all match "bad".
 */

export type FilterProblem = 'LINK' | 'EMAIL' | 'PHONE' | 'CONTACT' | 'WORDS';

/** Eastern Arabic (٠-٩) and Persian/Urdu (۰-۹) digits as 0-9. */
function asciiDigits(text: string): string {
  return text
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

const LEET: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '8': 'b',
  '@': 'a',
  $: 's',
  '!': 'i',
  '|': 'l',
};

/** The form the filter compares: see the file's comment. */
export function normalizeForFilter(text: string): string {
  let s = asciiDigits(text).toLowerCase().normalize('NFKD');
  // Latin accents, Arabic marks (tashkeel, superscript alef) and the stretching line.
  s = s.replace(/[̀-ًͯ-ٰٟـۖ-ۭ]/g, '');
  // Arabic and Urdu letter forms people swap.
  s = s
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/[ىیۍې]/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[ہھۃ]/g, 'ه')
    .replace(/ک/g, 'ك')
    .replace(/[ؤ]/g, 'و')
    .replace(/[ئ]/g, 'ي');
  s = s.replace(/[0134578@$!|]/g, (c) => LEET[c] ?? c);
  // Stretched letters: "baaad" → "bad".
  s = s.replace(/(\p{L})\1+/gu, '$1');
  return s;
}

/** Words (runs of letters) and the whole text with everything but letters removed. */
function tokens(normalized: string): { words: string[]; joined: string } {
  const words = normalized.split(/[^\p{L}]+/u).filter(Boolean);
  return { words, joined: words.join('') };
}

const TLDS =
  'com|net|org|io|pk|eg|ae|sa|me|app|dev|co|info|xyz|gg|ly|tv|link|site|online|biz|ru|in|uk|us|to|cc|fun|club|live|store|shop';
const LINK = new RegExp(
  `(https?:|www\\.|\\b[\\p{L}\\d-]+\\s*(\\.|\\(dot\\)|\\[dot\\]|\\bdot\\b)\\s*(${TLDS})\\b)`,
  'iu',
);
const EMAIL =
  /[^\s@]+\s*(@|\(at\)|\[at\])\s*[^\s@]+\.[^\s@]+|\b(gmail|hotmail|yahoo|outlook|icloud)\b/i;
/** Seven or more digits close together (spaces, dashes, dots, brackets between). */
const PHONE = /\+?\d(?:[\s().-]*\d){6,}/;

/** Names of apps and ways to reach someone outside the platform. */
const CONTACT_WORDS = [
  'whatsapp',
  'watsap',
  'watsapp',
  'snapchat',
  'snap',
  'insta',
  'instagram',
  'telegram',
  'discord',
  'tiktok',
  'facebook',
  'messenger',
  'wechat',
  'signal',
  'skype',
  'kik',
  'roblox',
  'واتساب',
  'واتس',
  'انستا',
  'انستغرام',
  'سناب',
  'تيليجرام',
  'تلغرام',
  'فيسبوك',
  'تيك توك',
  'ٹک ٹاک',
  'فیس بک',
  'انسٹا',
  'واٹس ایپ',
].map(normalizeForFilter);

/**
 * Built-in unkind words (kept short: the moderation team adds more in the admin panel,
 * per language). Compared whole-word, after normalising.
 */
export const BUILT_IN_TERMS: Record<'en' | 'ar' | 'ur' | 'roman-ur', string[]> = {
  en: ['stupid', 'idiot', 'dumb', 'loser', 'shut up', 'hate you', 'ugly', 'moron', 'damn', 'crap'],
  ar: ['غبي', 'حمار', 'اسكت', 'كلب', 'تافه', 'اكرهك', 'قبيح'],
  ur: ['بیوقوف', 'گدھا', 'کتا', 'چپ کر', 'الو', 'پاگل', 'نفرت'],
  'roman-ur': [
    'bewakoof',
    'bewakuf',
    'gadha',
    'gadhe',
    'kutta',
    'kutte',
    'ullu',
    'pagal',
    'chup kar',
  ],
};

/** A term, normalised the way messages are (what's stored in blocked_terms). */
export function normalizeTerm(term: string): string {
  return tokens(normalizeForFilter(term)).words.join(' ');
}

const BUILT_IN = Object.values(BUILT_IN_TERMS).flat().map(normalizeTerm);

function containsTerm(words: string[], joined: string, term: string): boolean {
  const parts = term.split(' ');
  if (parts.length === 1) {
    if (words.includes(term)) return true;
    // Letters spelled out with spaces or dots ("s t u p i d"): only for longer words, so
    // short ones can't match across ordinary words.
    return term.length >= 5 && joined.includes(term) && words.some((w) => w.length === 1);
  }
  for (let i = 0; i + parts.length <= words.length; i++) {
    if (parts.every((part, j) => words[i + j] === part)) return true;
  }
  return false;
}

/** Why a typed message can't be sent, or null when it's fine. */
export function filterProblem(
  text: string,
  extraTerms: readonly string[] = [],
): FilterProblem | null {
  const plain = asciiDigits(text);
  if (EMAIL.test(plain)) return 'EMAIL';
  if (LINK.test(plain)) return 'LINK';
  if (PHONE.test(plain)) return 'PHONE';
  const { words, joined } = tokens(normalizeForFilter(text));
  const phrase = ` ${words.join(' ')} `;
  const contact = CONTACT_WORDS.some((word) => {
    const term = tokens(word).words.join(' ');
    // Longer names also split up ("whats app", "tele gram").
    return phrase.includes(` ${term} `) || (term.length >= 7 && joined.includes(term));
  });
  if (contact) return 'CONTACT';
  if ([...BUILT_IN, ...extraTerms].some((term) => term && containsTerm(words, joined, term))) {
    return 'WORDS';
  }
  return null;
}
