import { LOCALES } from '@kcp/i18n';
import { readFileSync } from 'node:fs';

type Tree = { [key: string]: string | Tree };

const load = (locale: string): Tree =>
  JSON.parse(
    readFileSync(new URL(`../../messages/${locale}.json`, import.meta.url), 'utf8'),
  ) as Tree;

/** Flattens { a: { b: 'x' } } into { 'a.b': 'x' }. */
function flatten(tree: Tree, prefix = ''): Record<string, string> {
  return Object.entries(tree).reduce<Record<string, string>>((acc, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === 'string'
      ? { ...acc, [path]: value }
      : { ...acc, ...flatten(value, path) };
  }, {});
}

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).toSorted();

describe('site messages', () => {
  const english = flatten(load('en'));
  const others = LOCALES.filter((locale) => locale !== 'en');

  it.each(others)('%s has exactly the same keys as English', (locale) => {
    expect(Object.keys(flatten(load(locale))).toSorted()).toEqual(Object.keys(english).toSorted());
  });

  it.each(LOCALES)('%s has no empty texts', (locale) => {
    const empty = Object.entries(flatten(load(locale)))
      .filter(([, text]) => !text.trim())
      .map(([key]) => key);
    expect(empty).toEqual([]);
  });

  it.each(others)('%s keeps every {placeholder} from English', (locale) => {
    const translated = flatten(load(locale));
    const mismatched = Object.entries(english)
      .filter(
        ([key, text]) => placeholders(translated[key] ?? '').join() !== placeholders(text).join(),
      )
      .map(([key]) => key);
    expect(mismatched).toEqual([]);
  });

  it.each(others)(
    '%s is written in its own script (no untranslated English sentences)',
    (locale) => {
      // Code words (HTML, Python, XP…) stay in English, but whole sentences must not.
      const untranslated = Object.entries(flatten(load(locale)))
        .filter(([, text]) => /[A-Za-z]{3,} [a-z]{3,} [a-z]{3,}/.test(text))
        .map(([key]) => key);
      expect(untranslated).toEqual([]);
    },
  );

  it.each(others)('%s uses Western digits, like prices and dates', (locale) => {
    const easternDigits = Object.entries(flatten(load(locale)))
      .filter(([, text]) => /[\u0660-\u0669\u06F0-\u06F9]/.test(text))
      .map(([key]) => key);
    expect(easternDigits).toEqual([]);
  });
});
