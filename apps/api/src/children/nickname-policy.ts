import { randomInt } from 'node:crypto';
import { NICKNAME_PATTERN } from '@kcp/shared';

/**
 * Nicknames are what other children see on leaderboards, so they must never
 * reveal who a child is. Suggestions are built from safe words; custom nicknames
 * are checked against the rules below. Moderators can extend the lists.
 */

// Kid-friendly words that are not people's names.
const ADJECTIVES = [
  'Brave',
  'Clever',
  'Swift',
  'Bright',
  'Cosmic',
  'Pixel',
  'Turbo',
  'Mighty',
  'Rapid',
  'Golden',
  'Jolly',
  'Nimble',
  'Quantum',
  'Stellar',
  'Blazing',
  'Curious',
  'Daring',
  'Epic',
  'Fearless',
  'Galactic',
  'Hyper',
  'Lunar',
  'Magic',
  'Neon',
  'Ninja',
  'Orbital',
  'Polar',
  'Solar',
  'Sonic',
  'Super',
  'Thunder',
  'Ultimate',
  'Vivid',
  'Wild',
  'Zippy',
  'Atomic',
  'Crystal',
  'Electric',
  'Frosty',
];
const NOUNS = [
  'Falcon',
  'Panda',
  'Tiger',
  'Comet',
  'Rocket',
  'Robot',
  'Dolphin',
  'Eagle',
  'Otter',
  'Koala',
  'Phoenix',
  'Wizard',
  'Dragon',
  'Lion',
  'Owl',
  'Fox',
  'Whale',
  'Coder',
  'Penguin',
  'Cheetah',
  'Hawk',
  'Jaguar',
  'Lynx',
  'Meteor',
  'Nebula',
  'Octopus',
  'Panther',
  'Quasar',
  'Raven',
  'Shark',
  'Sparrow',
  'Turtle',
  'Unicorn',
  'Viking',
  'Wolf',
  'Yak',
  'Zebra',
  'Gecko',
  'Bison',
  'Beetle',
];

/**
 * Common first names in the pilot countries and in English. A nickname containing
 * one as a whole word is refused, so children don't use their real names.
 */
const COMMON_FIRST_NAMES = new Set([
  // Pakistan / South Asia
  'muhammad',
  'mohammad',
  'mohammed',
  'ahmad',
  'ahmed',
  'ali',
  'hassan',
  'hasan',
  'hussain',
  'husain',
  'usman',
  'uthman',
  'umar',
  'omar',
  'bilal',
  'hamza',
  'hamzah',
  'zain',
  'zainab',
  'ayesha',
  'aisha',
  'fatima',
  'fatimah',
  'maryam',
  'mariam',
  'hira',
  'sana',
  'noor',
  'nur',
  'amna',
  'amina',
  'aamir',
  'amir',
  'imran',
  'kashif',
  'asad',
  'saad',
  'fahad',
  'faisal',
  'haris',
  'ibrahim',
  'ismail',
  'yusuf',
  'yousuf',
  'abdullah',
  'abdul',
  'rehan',
  'rayyan',
  'ayan',
  'arham',
  'aliyan',
  'shahzaib',
  'danish',
  'waqas',
  'saima',
  'sadia',
  'mahnoor',
  'iqra',
  'anaya',
  'eman',
  'iman',
  'khadija',
  'hafsa',
  'areeba',
  'alishba',
  'dua',
  'laiba',
  'fawad',
  'tauseef',
  'meray',
  // Egypt / Gulf / Arabic
  'mohamed',
  'mahmoud',
  'mostafa',
  'mustafa',
  'youssef',
  'yousef',
  'khaled',
  'khalid',
  'karim',
  'kareem',
  'tarek',
  'tariq',
  'omer',
  'salma',
  'nour',
  'hana',
  'hanaa',
  'layla',
  'laila',
  'mona',
  'rana',
  'reem',
  'sara',
  'sarah',
  'yasmin',
  'yasmine',
  'nada',
  'dina',
  'farida',
  'jana',
  'malak',
  'rawan',
  'rahma',
  'abdelrahman',
  'ziad',
  'adam',
  'hamdan',
  'rashid',
  'saeed',
  'sultan',
  'mansour',
  'nasser',
  'fahd',
  'turki',
  'saud',
  'noura',
  'hessa',
  'latifa',
  'shamma',
  // English
  'james',
  'john',
  'robert',
  'michael',
  'william',
  'david',
  'richard',
  'joseph',
  'thomas',
  'charles',
  'daniel',
  'matthew',
  'anthony',
  'mark',
  'paul',
  'steven',
  'andrew',
  'joshua',
  'jacob',
  'ethan',
  'noah',
  'liam',
  'oliver',
  'lucas',
  'mason',
  'logan',
  'jack',
  'harry',
  'mary',
  'patricia',
  'jennifer',
  'linda',
  'elizabeth',
  'susan',
  'jessica',
  'karen',
  'emily',
  'emma',
  'olivia',
  'ava',
  'sophia',
  'isabella',
  'mia',
  'amelia',
  'grace',
  'chloe',
  'lily',
]);

/** Words that are never acceptable, in English and common transliterations. Substring match. */
const BLOCKED_FRAGMENTS = [
  'fuck',
  'shit',
  'bitch',
  'cunt',
  'dick',
  'cock',
  'pussy',
  'penis',
  'vagina',
  'sex',
  'porn',
  'nazi',
  'hitler',
  'rape',
  'slut',
  'whore',
  'nigg',
  'fag',
  'kill',
  'suicide',
  'drug',
  'weed',
  'kutta',
  'kutti',
  'harami',
  'kamina',
  'chutiya',
  'gandu',
  'bhenchod',
  'madarchod',
  'haramzada',
  'sharmoota',
  'sharmouta',
  'kalb',
  'khara',
  'zeby',
  'teez',
];

/** Things that shouldn't appear in a public name at all. */
const CONTACT_HINTS = [
  'http',
  'www',
  'insta',
  'snap',
  'tiktok',
  'whatsapp',
  'telegram',
  'discord',
  'gmail',
];

export type NicknameProblem =
  'INVALID_FORMAT' | 'INAPPROPRIATE' | 'LOOKS_LIKE_REAL_NAME' | 'CONTAINS_CONTACT_INFO';

/** Splits "SwiftFalcon_27" into ["swift", "falcon", "27"]. */
export function nicknameTokens(nickname: string): string[] {
  return nickname
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Za-z])(\d)/g, '$1 $2')
    .replace(/(\d)([A-Za-z])/g, '$1 $2')
    .split(/[\s_]+/)
    .map((token) => token.toLowerCase())
    .filter(Boolean);
}

/**
 * Returns why a nickname is not allowed, or null when it is fine. The parent's own
 * name is refused too, so a family name can't leak through the child.
 */
export function checkNickname(
  nickname: string,
  parentName?: string | null,
): NicknameProblem | null {
  if (!NICKNAME_PATTERN.test(nickname)) {
    return 'INVALID_FORMAT';
  }
  const lower = nickname.toLowerCase();
  if (BLOCKED_FRAGMENTS.some((fragment) => lower.includes(fragment))) {
    return 'INAPPROPRIATE';
  }
  if (CONTACT_HINTS.some((hint) => lower.includes(hint)) || /\d{5,}/.test(nickname)) {
    return 'CONTAINS_CONTACT_INFO';
  }
  const tokens = nicknameTokens(nickname);
  const parentTokens = new Set(
    (parentName ?? '')
      .toLowerCase()
      .split(/[^a-z]+/)
      .filter((token) => token.length >= 3),
  );
  if (tokens.some((token) => COMMON_FIRST_NAMES.has(token) || parentTokens.has(token))) {
    return 'LOOKS_LIKE_REAL_NAME';
  }
  return null;
}

const pick = <T>(items: readonly T[]): T => items[randomInt(items.length)]!;

/** "SwiftFalcon27"-style suggestions for parents to choose from. */
export function suggestNicknames(count: number): string[] {
  const suggestions = new Set<string>();
  while (suggestions.size < count) {
    suggestions.add(`${pick(ADJECTIVES)}${pick(NOUNS)}${randomInt(10, 100)}`);
  }
  return [...suggestions];
}

/** A login name that says nothing about the child, e.g. "swift-falcon-4821". */
export function generateUsername(): string {
  return `${pick(ADJECTIVES).toLowerCase()}-${pick(NOUNS).toLowerCase()}-${randomInt(1000, 10_000)}`;
}

export const SUGGESTION_WORDS = { adjectives: ADJECTIVES, nouns: NOUNS };
